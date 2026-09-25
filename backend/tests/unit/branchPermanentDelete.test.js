const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert');

const prisma = require('../../src/config/prisma');
const branchService = require('../../src/modules/branch/branch.service');

describe('Branch Permanent Delete Unit Tests', () => {
  const actor = { employeeId: 99, name: 'Admin Officer' };

  beforeEach(() => {
    prisma.branch = {
      findUnique: async () => null,
      count: async (args) => {
        if (args?.where?.sourceBranchId !== undefined) return 0;
        return 5;
      },
      delete: async () => ({}),
    };
    prisma.employee = {
      count: async () => 0,
    };
    prisma.user = {
      count: async () => 0,
      updateMany: async () => ({ count: 0 }),
    };
    prisma.productionRecord = { count: async () => 0 };
    prisma.remainingRecord = { count: async () => 0 };
    prisma.wasteRecord = { count: async () => 0 };
    prisma.dailyClosure = { count: async () => 0 };
    prisma.productTransfer = { count: async () => 0 };
    prisma.rolloverCache = { deleteMany: async () => ({ count: 0 }) };
    prisma.auditLog = { create: async ({ data }) => ({ id: 1, ...data }) };
  });

  it('rejects if branch does not exist (404)', async () => {
    prisma.branch.findUnique = async () => null;

    await assert.rejects(
      () => branchService.permanentDelete(999, actor),
      (err) => {
        assert.strictEqual(err.status, 404);
        assert.match(err.message, /Branch not found/i);
        return true;
      }
    );
  });

  it('rejects if branch is still active (400 - must deactivate first)', async () => {
    prisma.branch.findUnique = async () => ({
      id: 10,
      name: 'Test Branch Active',
      isActive: true,
    });

    await assert.rejects(
      () => branchService.permanentDelete(10, actor),
      (err) => {
        assert.strictEqual(err.status, 400);
        assert.match(err.message, /must be deactivated before permanent removal/i);
        return true;
      }
    );
  });

  it('rejects permanent deletion of root/primary branch ID 1 (403)', async () => {
    prisma.branch.findUnique = async () => ({
      id: 1,
      name: 'Main HQ',
      isActive: false,
    });

    await assert.rejects(
      () => branchService.permanentDelete(1, actor),
      (err) => {
        assert.strictEqual(err.status, 403);
        assert.match(err.message, /primary system branch cannot be permanently deleted/i);
        return true;
      }
    );
  });

  it('rejects if this is the only branch in the system (400)', async () => {
    prisma.branch.findUnique = async () => ({
      id: 2,
      name: 'Sole Branch',
      isActive: false,
    });
    prisma.branch.count = async (args) => {
      if (args?.where?.sourceBranchId !== undefined) return 0;
      return 1;
    };

    await assert.rejects(
      () => branchService.permanentDelete(2, actor),
      (err) => {
        assert.strictEqual(err.status, 400);
        assert.match(err.message, /Cannot delete the only branch in the system/i);
        return true;
      }
    );
  });

  it('rejects if other branches depend on this branch as sourceBranchId (400)', async () => {
    prisma.branch.findUnique = async () => ({
      id: 5,
      name: 'Source Branch',
      isActive: false,
    });
    prisma.branch.count = async (args) => {
      if (args?.where?.sourceBranchId === 5) return 2;
      return 5;
    };

    await assert.rejects(
      () => branchService.permanentDelete(5, actor),
      (err) => {
        assert.strictEqual(err.status, 400);
        assert.match(err.message, /other branches depend on it as a source branch/i);
        return true;
      }
    );
  });

  it('rejects if any employees are assigned to this branch (400)', async () => {
    prisma.branch.findUnique = async () => ({
      id: 7,
      name: 'Branch with Staff',
      isActive: false,
    });
    prisma.employee.count = async (args) => {
      if (args?.where?.primaryBranchId === 7) return 3;
      return 0;
    };

    await assert.rejects(
      () => branchService.permanentDelete(7, actor),
      (err) => {
        assert.strictEqual(err.status, 400);
        assert.match(err.message, /employees are currently assigned to this branch/i);
        return true;
      }
    );
  });

  it('rejects if any active users are assigned to this branch (400)', async () => {
    prisma.branch.findUnique = async () => ({
      id: 8,
      name: 'Branch with Active Users',
      isActive: false,
    });
    prisma.user.count = async (args) => {
      if (args?.where?.branchId === 8 && args?.where?.isActive === true) return 1;
      return 0;
    };

    await assert.rejects(
      () => branchService.permanentDelete(8, actor),
      (err) => {
        assert.strictEqual(err.status, 400);
        assert.match(err.message, /active users are assigned to this branch/i);
        return true;
      }
    );
  });

  it('rejects if branch has production records (400 - preserves historical records)', async () => {
    prisma.branch.findUnique = async () => ({
      id: 12,
      name: 'Old Bakery Branch',
      isActive: false,
    });
    prisma.productionRecord.count = async (args) => {
      if (args?.where?.branchId === 12) return 15;
      return 0;
    };

    await assert.rejects(
      () => branchService.permanentDelete(12, actor),
      (err) => {
        assert.strictEqual(err.status, 400);
        assert.match(err.message, /historical operational records exist/i);
        return true;
      }
    );
  });

  it('rejects if branch has remaining records (400)', async () => {
    prisma.branch.findUnique = async () => ({
      id: 13,
      name: 'Branch with Remainings',
      isActive: false,
    });
    prisma.remainingRecord.count = async (args) => {
      if (args?.where?.branchId === 13) return 8;
      return 0;
    };

    await assert.rejects(
      () => branchService.permanentDelete(13, actor),
      (err) => {
        assert.strictEqual(err.status, 400);
        assert.match(err.message, /historical operational records exist/i);
        return true;
      }
    );
  });

  it('rejects if branch has transfer history (400)', async () => {
    prisma.branch.findUnique = async () => ({
      id: 14,
      name: 'Branch with Transfers',
      isActive: false,
    });
    prisma.productTransfer.count = async (args) => {
      if (args?.where?.OR) return 4;
      return 0;
    };

    await assert.rejects(
      () => branchService.permanentDelete(14, actor),
      (err) => {
        assert.strictEqual(err.status, 400);
        assert.match(err.message, /historical operational records exist/i);
        return true;
      }
    );
  });

  it('successfully permanently deletes a clean test branch and creates audit log', async () => {
    const origTransaction = prisma.$transaction;

    let auditedEntry = null;
    let deletedBranchId = null;
    let unlinkedUsersBranchId = null;

    try {
      const mockBranch = {
        id: 99,
        name: 'Unused Test Branch',
        name_am: 'የሙከራ ቅርንጫፍ',
        address: 'Bole Test St',
        phone: '+251911000000',
        branchType: 'INDEPENDENT',
        sourceBranchId: null,
        isActive: false,
      };

      prisma.branch.findUnique = async () => mockBranch;

      prisma.$transaction = async (callback) => {
        const tx = {
          user: {
            updateMany: async ({ where }) => {
              unlinkedUsersBranchId = where.branchId;
              return { count: 0 };
            },
          },
          rolloverCache: {
            deleteMany: async () => ({ count: 0 }),
          },
          branch: {
            delete: async ({ where }) => {
              deletedBranchId = where.id;
              return mockBranch;
            },
          },
          auditLog: {
            create: async ({ data }) => {
              auditedEntry = data;
              return { id: 1, ...data };
            },
          },
        };
        return callback(tx);
      };

      const result = await branchService.permanentDelete(99, actor);

      assert.strictEqual(result.id, 99);
      assert.strictEqual(result.success, true);
      assert.strictEqual(deletedBranchId, 99);
      assert.strictEqual(unlinkedUsersBranchId, 99);
      assert.ok(auditedEntry, 'Audit log must be created');
      assert.strictEqual(auditedEntry.action, 'PERMANENT_DELETE');
      assert.strictEqual(auditedEntry.entityType, 'branch');
      assert.strictEqual(auditedEntry.entityId, 99);
      assert.strictEqual(auditedEntry.employeeId, 99);
      assert.ok(auditedEntry.oldValue, 'Must record snapshot in oldValue');
      const snapshotName = typeof auditedEntry.oldValue === 'string' ? JSON.parse(auditedEntry.oldValue).name : auditedEntry.oldValue.name;
      assert.strictEqual(snapshotName, 'Unused Test Branch');
    } finally {
      prisma.$transaction = origTransaction;
    }
  });
});
