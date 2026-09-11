const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert');

process.env.DATABASE_URL = 'postgresql://dummy:dummy@localhost:5432/dummy';

const prisma = require('../../src/config/prisma');
const auditService = require('../../src/services/auditService');
const { getAddisDateString } = require('../../src/utils/dateUtils');
const { subDays, format } = require('date-fns');

// Target service
const productionService = require('../../src/services/productionService');

describe('productionService - Edit Window & Role Validation', () => {
  const todayStr = getAddisDateString();
  const [y, m, d] = todayStr.split('-').map(Number);
  const todayDate = new Date(Date.UTC(y, m - 1, d));
  const yesterdayStr = format(subDays(todayDate, 1), 'yyyy-MM-dd');
  const twoDaysAgoStr = format(subDays(todayDate, 2), 'yyyy-MM-dd');
  const threeDaysAgoStr = format(subDays(todayDate, 3), 'yyyy-MM-dd');

  const mockProductBread = {
    id: 1,
    name: 'Arabic Bread',
    category: 'BREAD_AND_SWEET_BREADS',
    unitType: 'piece',
    price: 5.0,
    isActive: true,
  };

  const mockProductCake = {
    id: 2,
    name: 'Chocolate Cake',
    category: 'CREAM_CAKES',
    unitType: 'piece',
    price: 50.0,
    isActive: true,
  };

  const mockProductRetail = {
    id: 3,
    name: 'Water Bottle',
    category: 'DRINKS_AND_RETAIL_ITEMS',
    unitType: 'piece',
    price: 15.0,
    isActive: true,
  };

  const mockBranch = { id: 10, name: 'Main Branch', isActive: true };

  beforeEach(() => {
    prisma.product.findFirst = async ({ where }) => {
      if (where?.id === 1) return mockProductBread;
      if (where?.id === 2) return mockProductCake;
      if (where?.id === 3) return mockProductRetail;
      return null;
    };

    prisma.product.findUnique = async ({ where }) => {
      if (where?.id === 1) return mockProductBread;
      if (where?.id === 2) return mockProductCake;
      if (where?.id === 3) return mockProductRetail;
      return null;
    };

    prisma.branch.findUnique = async ({ where }) => {
      if (where?.id === 10) return mockBranch;
      return null;
    };

    prisma.dailyClosure.findUnique = async () => ({
      isClosed: false,
    });

    auditService.logAudit = async () => {};

    prisma.productionRecord.create = async ({ data }) => ({
      id: 999,
      ...data,
      product: mockProductBread,
      branch: mockBranch,
      creator: { id: data.createdBy, name: 'Test User' },
    });
  });

  it('BAKER can create production for 2 days ago (e.g. 8 Sep when today is 10 Sep)', async () => {
    const bakerUser = { userId: 101, role: 'BAKER', branchId: 10 };
    const record = await productionService.create(
      {
        productId: 1,
        branchId: 10,
        shift: 'DAY',
        quantity: 100,
        productionDate: twoDaysAgoStr,
      },
      bakerUser
    );

    assert.ok(record);
    assert.strictEqual(record.id, 999);
    assert.strictEqual(Number(record.quantity), 100);
  });

  it('CAKE_CHEF can create production for yesterday (1 day ago)', async () => {
    const chefUser = { userId: 102, role: 'CAKE_CHEF', branchId: 10 };
    const record = await productionService.create(
      {
        productId: 2,
        branchId: 10,
        shift: 'DAY',
        quantity: 25,
        productionDate: yesterdayStr,
      },
      chefUser
    );

    assert.ok(record);
    assert.strictEqual(record.id, 999);
  });

  it('CASHIER can create production for permitted category (DRINKS_AND_RETAIL_ITEMS) for 2 days ago', async () => {
    const cashierUser = { userId: 103, role: 'CASHIER', branchId: 10 };
    const record = await productionService.create(
      {
        productId: 3,
        branchId: 10,
        shift: 'DAY',
        quantity: 50,
        productionDate: twoDaysAgoStr,
      },
      cashierUser
    );

    assert.ok(record);
    assert.strictEqual(record.id, 999);
  });

  it('ADMIN and MANAGER can create production for 2 days ago', async () => {
    const adminUser = { userId: 1, role: 'ADMIN', branchId: null };
    const managerUser = { userId: 2, role: 'MANAGER', branchId: 10 };

    const rec1 = await productionService.create(
      { productId: 1, branchId: 10, shift: 'DAY', quantity: 50, productionDate: twoDaysAgoStr },
      adminUser
    );
    assert.ok(rec1);

    const rec2 = await productionService.create(
      { productId: 2, branchId: 10, shift: 'DAY', quantity: 30, productionDate: twoDaysAgoStr },
      managerUser
    );
    assert.ok(rec2);
  });

  it('rejects BAKER when productionDate is 3 days ago (outside 3-day window)', async () => {
    const bakerUser = { userId: 101, role: 'BAKER', branchId: 10 };
    await assert.rejects(
      async () => {
        await productionService.create(
          {
            productId: 1,
            branchId: 10,
            shift: 'DAY',
            quantity: 100,
            productionDate: threeDaysAgoStr,
          },
          bakerUser
        );
      },
      (err) => {
        assert.strictEqual(err.status, 400);
        assert.match(err.message, /within the last 2 days or today/);
        return true;
      }
    );
  });

  it('rejects BAKER when attempting to record an unpermitted category (e.g. CREAM_CAKES)', async () => {
    const bakerUser = { userId: 101, role: 'BAKER', branchId: 10 };
    await assert.rejects(
      async () => {
        await productionService.create(
          {
            productId: 2, // Cake
            branchId: 10,
            shift: 'DAY',
            quantity: 10,
            productionDate: twoDaysAgoStr,
          },
          bakerUser
        );
      },
      (err) => {
        assert.strictEqual(err.status, 403);
        assert.match(err.message, /do not have permission to record this product category/);
        return true;
      }
    );
  });

  it('rejects when day is closed via requireDayNotClosed', async () => {
    prisma.dailyClosure.findUnique = async () => ({
      isClosed: true,
    });

    const bakerUser = { userId: 101, role: 'BAKER', branchId: 10 };
    await assert.rejects(
      async () => {
        await productionService.create(
          {
            productId: 1,
            branchId: 10,
            shift: 'DAY',
            quantity: 100,
            productionDate: twoDaysAgoStr,
          },
          bakerUser
        );
      },
      (err) => {
        assert.strictEqual(err.status, 403);
        assert.match(err.message, /operational day is closed/);
        return true;
      }
    );
  });

  it('allows BAKER to update a record within the 3-day edit window', async () => {
    const [y2, m2, d2] = twoDaysAgoStr.split('-').map(Number);
    const opDate = new Date(Date.UTC(y2, m2 - 1, d2));

    prisma.productionRecord.findUnique = async ({ where }) => ({
      id: 123,
      branchId: 10,
      productId: 1,
      shift: 'DAY',
      operationalDate: opDate,
      quantity: 100,
      product: mockProductBread,
    });

    prisma.productionRecord.update = async ({ where, data }) => ({
      id: 123,
      branchId: 10,
      productId: 1,
      shift: 'DAY',
      operationalDate: opDate,
      quantity: data.quantity,
      product: mockProductBread,
      branch: mockBranch,
      creator: { id: 101, name: 'Baker' },
    });

    const bakerUser = { userId: 101, role: 'BAKER', branchId: 10 };
    const updated = await productionService.update(
      123,
      { quantity: 150 },
      bakerUser
    );

    assert.ok(updated);
    assert.strictEqual(Number(updated.quantity), 150);
  });

  it('rejects BAKER updating a record outside the 3-day edit window (4 days ago)', async () => {
    const fourDaysAgoDate = subDays(todayDate, 4);
    prisma.productionRecord.findUnique = async () => ({
      id: 124,
      branchId: 10,
      productId: 1,
      shift: 'DAY',
      operationalDate: fourDaysAgoDate,
      quantity: 100,
      product: mockProductBread,
    });

    const bakerUser = { userId: 101, role: 'BAKER', branchId: 10 };
    await assert.rejects(
      async () => {
        await productionService.update(124, { quantity: 200 }, bakerUser);
      },
      (err) => {
        assert.strictEqual(err.status, 403);
        assert.match(err.message, /within the 3-day edit window/);
        return true;
      }
    );
  });
});
