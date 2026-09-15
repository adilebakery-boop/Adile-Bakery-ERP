const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert');

process.env.DATABASE_URL = 'postgresql://dummy:dummy@localhost:5432/dummy';

const prisma = require('../../src/config/prisma');
const productionService = require('../../src/services/productionService');

describe('productionService - Category Filter', () => {
  let capturedFindManyWhere = null;
  let capturedGroupByWhere = null;

  beforeEach(() => {
    capturedFindManyWhere = null;
    capturedGroupByWhere = null;

    prisma.productionRecord.findMany = async ({ where }) => {
      capturedFindManyWhere = where;
      return [];
    };

    prisma.productionRecord.count = async ({ where }) => {
      return 0;
    };

    prisma.productionRecord.groupBy = async ({ where }) => {
      capturedGroupByWhere = where;
      return [];
    };
  });

  it('ADMIN: findAll without category filter includes all categories', async () => {
    const user = { role: 'ADMIN', userId: 1 };
    await productionService.findAll({}, user);

    assert.strictEqual(capturedFindManyWhere.product, undefined);
  });

  it('ADMIN: findAll with category filter sets where.product.category', async () => {
    const user = { role: 'ADMIN', userId: 1 };
    await productionService.findAll({ category: 'BREAD_AND_SWEET_BREADS' }, user);

    assert.deepStrictEqual(capturedFindManyWhere.product, { category: 'BREAD_AND_SWEET_BREADS' });
  });

  it('ADMIN: findAllGrouped with category filter sets where.product.category', async () => {
    const user = { role: 'ADMIN', userId: 1 };
    await productionService.findAllGrouped({ category: 'COOKIES' }, user);

    assert.deepStrictEqual(capturedGroupByWhere.product, { category: 'COOKIES' });
  });

  it('ADMIN: selecting category All (empty string) restores complete list', async () => {
    const user = { role: 'ADMIN', userId: 1 };
    await productionService.findAll({ category: '' }, user);

    assert.strictEqual(capturedFindManyWhere.product, undefined);
  });

  it('MANAGER: category filter works alongside branch restriction', async () => {
    const user = { role: 'MANAGER', userId: 2, branchId: 5 };
    await productionService.findAllGrouped({ category: 'CREAM_CAKES' }, user);

    assert.strictEqual(capturedGroupByWhere.branchId, 5);
    assert.deepStrictEqual(capturedGroupByWhere.product, { category: 'CREAM_CAKES' });
  });

  it('BAKER: cannot bypass role category restriction by requesting unallowed category', async () => {
    const user = { role: 'BAKER', userId: 3, branchId: 5 };
    // BAKER allowed categories: ['BREAD_AND_SWEET_BREADS']
    await productionService.findAll({ category: 'CREAM_CAKES' }, user);

    assert.deepStrictEqual(capturedFindManyWhere.product, { category: 'NONE' });
  });

  it('BAKER: can filter within their permitted category', async () => {
    const user = { role: 'BAKER', userId: 3, branchId: 5 };
    await productionService.findAll({ category: 'BREAD_AND_SWEET_BREADS' }, user);

    assert.deepStrictEqual(capturedFindManyWhere.product, { category: 'BREAD_AND_SWEET_BREADS' });
  });
});
