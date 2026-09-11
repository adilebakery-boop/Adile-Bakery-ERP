const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert');

process.env.DATABASE_URL = 'postgresql://dummy:dummy@localhost:5432/dummy';
process.env.FEATURE_TRANSFERS = 'true';
process.env.JWT_SECRET = 'test_jwt_secret_for_unit_tests_1234567890';

const prisma = require('../../src/config/prisma');
const { getAddisDateString } = require('../../src/utils/dateUtils');
const { subDays, addDays, format } = require('date-fns');

// Target service & router
const transferService = require('../../src/modules/transfers/transfers.service');
const transferRouter = require('../../src/modules/transfers/transfers.routes');

describe('Stock Transfer - Date Window & Role Validation', () => {
  const todayStr = getAddisDateString();
  const [y, m, d] = todayStr.split('-').map(Number);
  const todayDate = new Date(Date.UTC(y, m - 1, d));
  const yesterdayStr = format(subDays(todayDate, 1), 'yyyy-MM-dd');
  const twoDaysAgoStr = format(subDays(todayDate, 2), 'yyyy-MM-dd');
  const threeDaysAgoStr = format(subDays(todayDate, 3), 'yyyy-MM-dd');
  const fourDaysAgoStr = format(subDays(todayDate, 4), 'yyyy-MM-dd');
  const fiveDaysAgoStr = format(subDays(todayDate, 5), 'yyyy-MM-dd');
  const tomorrowStr = format(addDays(todayDate, 1), 'yyyy-MM-dd');

  const mockProduct = {
    id: 1,
    name: 'Arabic Bread',
    category: 'BREAD_AND_SWEET_BREADS',
    unitType: 'piece',
  };

  const mockSourceBranch = {
    id: 10,
    name: 'Main Factory',
    branchType: 'SOURCE',
    isActive: true,
  };

  const mockDependentBranch = {
    id: 20,
    name: 'Bole Outlet',
    branchType: 'DEPENDENT',
    sourceBranchId: 10,
    isActive: true,
  };

  beforeEach(() => {
    prisma.branch.findUnique = async ({ where }) => {
      if (where?.id === 10) return mockSourceBranch;
      if (where?.id === 20) return mockDependentBranch;
      return null;
    };

    prisma.productTransfer.create = async ({ data }) => ({
      id: 501,
      ...data,
      product: mockProduct,
      sourceBranch: mockSourceBranch,
      dependentBranch: mockDependentBranch,
      creator: { id: data.createdBy, name: 'Tester', username: 'tester' },
    });
  });

  describe('ADMIN role transfer create', () => {
    const adminUser = { userId: 1, role: 'ADMIN', branchId: null };

    it('allows today', async () => {
      const res = await transferService.create(
        { branchType: 'SOURCE', sourceBranchId: 10, dependentBranchId: 20, productId: 1, sentQuantity: 50, operationalDate: todayStr },
        adminUser.userId,
        adminUser
      );
      assert.ok(res);
      assert.strictEqual(res.id, 501);
    });

    it('allows 1 to 4 days back (e.g. 4 days ago)', async () => {
      const res = await transferService.create(
        { branchType: 'SOURCE', sourceBranchId: 10, dependentBranchId: 20, productId: 1, sentQuantity: 50, operationalDate: fourDaysAgoStr },
        adminUser.userId,
        adminUser
      );
      assert.ok(res);
    });

    it('rejects 5+ days back', async () => {
      await assert.rejects(
        async () => {
          await transferService.create(
            { branchType: 'SOURCE', sourceBranchId: 10, dependentBranchId: 20, productId: 1, sentQuantity: 50, operationalDate: fiveDaysAgoStr },
            adminUser.userId,
            adminUser
          );
        },
        (err) => {
          assert.strictEqual(err.status, 403);
          assert.match(err.message, /5-day edit window/);
          return true;
        }
      );
    });

    it('rejects future dates', async () => {
      await assert.rejects(
        async () => {
          await transferService.create(
            { branchType: 'SOURCE', sourceBranchId: 10, dependentBranchId: 20, productId: 1, sentQuantity: 50, operationalDate: tomorrowStr },
            adminUser.userId,
            adminUser
          );
        },
        (err) => {
          assert.strictEqual(err.status, 403);
          return true;
        }
      );
    });
  });

  describe('MANAGER role transfer create', () => {
    const managerUser = { userId: 2, role: 'MANAGER', branchId: 10 };

    it('allows today', async () => {
      const res = await transferService.create(
        { branchType: 'SOURCE', sourceBranchId: 10, dependentBranchId: 20, productId: 1, sentQuantity: 30, operationalDate: todayStr },
        managerUser.userId,
        managerUser
      );
      assert.ok(res);
    });

    it('allows 4 days back', async () => {
      const res = await transferService.create(
        { branchType: 'SOURCE', sourceBranchId: 10, dependentBranchId: 20, productId: 1, sentQuantity: 30, operationalDate: fourDaysAgoStr },
        managerUser.userId,
        managerUser
      );
      assert.ok(res);
    });

    it('rejects 5 days back', async () => {
      await assert.rejects(
        async () => {
          await transferService.create(
            { branchType: 'SOURCE', sourceBranchId: 10, dependentBranchId: 20, productId: 1, sentQuantity: 30, operationalDate: fiveDaysAgoStr },
            managerUser.userId,
            managerUser
          );
        },
        (err) => {
          assert.strictEqual(err.status, 403);
          assert.match(err.message, /5-day edit window/);
          return true;
        }
      );
    });

    it('rejects future date', async () => {
      await assert.rejects(
        async () => {
          await transferService.create(
            { branchType: 'SOURCE', sourceBranchId: 10, dependentBranchId: 20, productId: 1, sentQuantity: 30, operationalDate: tomorrowStr },
            managerUser.userId,
            managerUser
          );
        },
        (err) => {
          assert.strictEqual(err.status, 403);
          return true;
        }
      );
    });
  });

  describe('TRANSFER_OPERATOR role transfer create', () => {
    const operatorUser = { userId: 3, role: 'TRANSFER_OPERATOR', branchId: 10 };

    it('allows today', async () => {
      const res = await transferService.create(
        { branchType: 'SOURCE', sourceBranchId: 10, dependentBranchId: 20, productId: 1, sentQuantity: 20, operationalDate: todayStr },
        operatorUser.userId,
        operatorUser
      );
      assert.ok(res);
    });

    it('allows 1 to 2 days back (yesterday and 2 days ago)', async () => {
      const res1 = await transferService.create(
        { branchType: 'SOURCE', sourceBranchId: 10, dependentBranchId: 20, productId: 1, sentQuantity: 20, operationalDate: yesterdayStr },
        operatorUser.userId,
        operatorUser
      );
      assert.ok(res1);

      const res2 = await transferService.create(
        { branchType: 'SOURCE', sourceBranchId: 10, dependentBranchId: 20, productId: 1, sentQuantity: 20, operationalDate: twoDaysAgoStr },
        operatorUser.userId,
        operatorUser
      );
      assert.ok(res2);
    });

    it('rejects 3+ days back', async () => {
      await assert.rejects(
        async () => {
          await transferService.create(
            { branchType: 'SOURCE', sourceBranchId: 10, dependentBranchId: 20, productId: 1, sentQuantity: 20, operationalDate: threeDaysAgoStr },
            operatorUser.userId,
            operatorUser
          );
        },
        (err) => {
          assert.strictEqual(err.status, 403);
          assert.match(err.message, /3-day edit window/);
          return true;
        }
      );
    });

    it('rejects future dates', async () => {
      await assert.rejects(
        async () => {
          await transferService.create(
            { branchType: 'SOURCE', sourceBranchId: 10, dependentBranchId: 20, productId: 1, sentQuantity: 20, operationalDate: tomorrowStr },
            operatorUser.userId,
            operatorUser
          );
        },
        (err) => {
          assert.strictEqual(err.status, 403);
          return true;
        }
      );
    });
  });

  describe('Stock Transfer - updateSent and updateReceived date limits & branch ownership', () => {
    const operatorSourceUser = { userId: 3, role: 'TRANSFER_OPERATOR', branchId: 10 };
    const operatorDepUser = { userId: 4, role: 'TRANSFER_OPERATOR', branchId: 20 };
    const operatorOtherUser = { userId: 5, role: 'TRANSFER_OPERATOR', branchId: 99 };

    it('TRANSFER_OPERATOR allows updateSent within 3-day window for own source branch', async () => {
      prisma.productTransfer.findUnique = async () => ({
        id: 100,
        sourceBranchId: 10,
        dependentBranchId: 20,
        productId: 1,
        operationalDate: new Date(twoDaysAgoStr),
        sentQuantity: 25,
      });

      prisma.productTransfer.update = async ({ data }) => ({
        id: 100,
        sourceBranchId: 10,
        dependentBranchId: 20,
        productId: 1,
        operationalDate: new Date(twoDaysAgoStr),
        sentQuantity: data.sentQuantity,
      });

      const updated = await transferService.updateSent(100, { sentQuantity: 30 }, operatorSourceUser.userId, operatorSourceUser);
      assert.strictEqual(updated.sentQuantity, 30);
    });

    it('TRANSFER_OPERATOR rejects updateSent when transfer date is 3+ days back', async () => {
      prisma.productTransfer.findUnique = async () => ({
        id: 101,
        sourceBranchId: 10,
        dependentBranchId: 20,
        productId: 1,
        operationalDate: new Date(threeDaysAgoStr),
        sentQuantity: 25,
      });

      await assert.rejects(
        async () => {
          await transferService.updateSent(101, { sentQuantity: 30 }, operatorSourceUser.userId, operatorSourceUser);
        },
        (err) => {
          assert.strictEqual(err.status, 403);
          assert.match(err.message, /3-day edit window/);
          return true;
        }
      );
    });

    it('TRANSFER_OPERATOR rejects updateSent if user branch does not match source branch', async () => {
      prisma.productTransfer.findUnique = async () => ({
        id: 102,
        sourceBranchId: 10,
        dependentBranchId: 20,
        productId: 1,
        operationalDate: new Date(todayStr),
        sentQuantity: 25,
      });

      await assert.rejects(
        async () => {
          await transferService.updateSent(102, { sentQuantity: 30 }, operatorOtherUser.userId, operatorOtherUser);
        },
        (err) => {
          assert.strictEqual(err.status, 403);
          assert.match(err.message, /only update sent quantity for your own source branch/);
          return true;
        }
      );
    });

    it('TRANSFER_OPERATOR allows updateReceived within 3-day window for own dependent branch', async () => {
      prisma.productTransfer.findUnique = async () => ({
        id: 103,
        sourceBranchId: 10,
        dependentBranchId: 20,
        productId: 1,
        operationalDate: new Date(yesterdayStr),
        receivedQuantity: 20,
      });

      prisma.productTransfer.update = async ({ data }) => ({
        id: 103,
        sourceBranchId: 10,
        dependentBranchId: 20,
        productId: 1,
        operationalDate: new Date(yesterdayStr),
        receivedQuantity: data.receivedQuantity,
      });

      const updated = await transferService.updateReceived(103, { receivedQuantity: 22 }, operatorDepUser.userId, operatorDepUser);
      assert.strictEqual(updated.receivedQuantity, 22);
    });

    it('TRANSFER_OPERATOR rejects updateReceived if user branch does not match dependent branch', async () => {
      prisma.productTransfer.findUnique = async () => ({
        id: 104,
        sourceBranchId: 10,
        dependentBranchId: 20,
        productId: 1,
        operationalDate: new Date(todayStr),
        receivedQuantity: 20,
      });

      await assert.rejects(
        async () => {
          await transferService.updateReceived(104, { receivedQuantity: 22 }, operatorSourceUser.userId, operatorSourceUser);
        },
        (err) => {
          assert.strictEqual(err.status, 403);
          assert.match(err.message, /only update received quantity for your own dependent branch/);
          return true;
        }
      );
    });

    it('ADMIN can updateSent and updateReceived across 4 days back without branch restriction', async () => {
      const adminUser = { userId: 1, role: 'ADMIN', branchId: null };
      prisma.productTransfer.findUnique = async () => ({
        id: 105,
        sourceBranchId: 10,
        dependentBranchId: 20,
        productId: 1,
        operationalDate: new Date(fourDaysAgoStr),
        sentQuantity: 10,
        receivedQuantity: 10,
      });

      prisma.productTransfer.update = async ({ data }) => ({
        id: 105,
        ...data,
      });

      const updatedSent = await transferService.updateSent(105, { sentQuantity: 15 }, adminUser.userId, adminUser);
      assert.strictEqual(updatedSent.sentQuantity, 15);

      const updatedRec = await transferService.updateReceived(105, { receivedQuantity: 15 }, adminUser.userId, adminUser);
      assert.strictEqual(updatedRec.receivedQuantity, 15);
    });

    it('ADMIN cannot updateSent or updateReceived 5+ days back', async () => {
      const adminUser = { userId: 1, role: 'ADMIN', branchId: null };
      prisma.productTransfer.findUnique = async () => ({
        id: 106,
        sourceBranchId: 10,
        dependentBranchId: 20,
        productId: 1,
        operationalDate: new Date(fiveDaysAgoStr),
        sentQuantity: 10,
        receivedQuantity: 10,
      });

      await assert.rejects(
        async () => {
          await transferService.updateSent(106, { sentQuantity: 15 }, adminUser.userId, adminUser);
        },
        (err) => {
          assert.strictEqual(err.status, 403);
          assert.match(err.message, /5-day edit window/);
          return true;
        }
      );
    });
  });

  describe('Route-level role authorization', () => {
    it('transfers router rejects production roles (BAKER, CAKE_CHEF, etc.)', () => {
      const postRoute = transferRouter.stack.find(
        (layer) => layer.route && layer.route.path === '/' && layer.route.methods.post
      );
      assert.ok(postRoute, 'POST / route must exist');

      // The handlers on POST / route are: [allowRolesMiddleware, validateMiddleware, controller.create]
      // Find the handler that checks role
      const forbiddenRoles = ['BAKER', 'CAKE_CHEF', 'COOKIE_BAKER', 'FETIR_CHEF', 'CASHIER'];

      for (const role of forbiddenRoles) {
        let statusCode = null;
        let responseJson = null;
        const mockReq = { user: { role } };
        const mockRes = {
          status(code) {
            statusCode = code;
            return {
              json(payload) {
                responseJson = payload;
              },
            };
          },
        };

        // Execute route stack handlers until one stops or completes
        let stopped = false;
        for (const layer of postRoute.route.stack) {
          let nextCalled = false;
          layer.handle(mockReq, mockRes, (err) => {
            nextCalled = true;
          });
          if (!nextCalled) {
            stopped = true;
            break;
          }
        }

        assert.strictEqual(statusCode, 403, `Role ${role} must be rejected with 403`);
        assert.strictEqual(stopped, true, `Role ${role} must not proceed past role middleware`);
      }
    });

    it('transfers router allows ADMIN, MANAGER, and TRANSFER_OPERATOR past role check', () => {
      const postRoute = transferRouter.stack.find(
        (layer) => layer.route && layer.route.path === '/' && layer.route.methods.post
      );
      assert.ok(postRoute, 'POST / route must exist');

      const allowedRoles = ['ADMIN', 'MANAGER', 'TRANSFER_OPERATOR'];
      // The first route layer is the allowRoles middleware
      const roleMiddleware = postRoute.route.stack[0];

      for (const role of allowedRoles) {
        let nextCalled = false;
        const mockReq = { user: { role } };
        const mockRes = {};
        roleMiddleware.handle(mockReq, mockRes, () => {
          nextCalled = true;
        });

        assert.strictEqual(nextCalled, true, `Role ${role} must pass authorization`);
      }
    });
  });
});
