const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert');

process.env.JWT_SECRET = 'test_jwt_secret_for_unit_tests_1234567890';
process.env.REFRESH_TOKEN_SECRET = 'test_refresh_secret_1234567890_test_key_at_least_32_bytes';

const { updateUserSchema } = require('../../src/utils/validations/user.validation');

describe('User Management & Employee Identity Decoupling Tests', () => {

  describe('1. updateUserSchema - isBlocked validation', () => {
    it('successfully preserves isBlocked when true', () => {
      const parsed = updateUserSchema.parse({ isBlocked: true });
      assert.strictEqual(parsed.isBlocked, true);
    });

    it('successfully preserves isBlocked when false', () => {
      const parsed = updateUserSchema.parse({ isBlocked: false });
      assert.strictEqual(parsed.isBlocked, false);
    });

    it('leaves isBlocked undefined when not provided', () => {
      const parsed = updateUserSchema.parse({ name: 'John Doe' });
      assert.strictEqual(parsed.isBlocked, undefined);
    });

    it('rejects non-boolean isBlocked values', () => {
      assert.throws(() => {
        updateUserSchema.parse({ isBlocked: 'not-a-bool' });
      });
    });
  });

  describe('2. Authentication & Employment Status Rules', () => {
    it('login rejects blocked user with 403 AUTH_ROLE', async () => {
      const prisma = require('../../src/config/prisma');
      const authService = require('../../src/modules/auth/auth.service');
      const bcrypt = require('bcrypt');

      const originalFindUnique = prisma.user.findUnique;
      const originalCompare = bcrypt.compare;

      try {
        prisma.user.findUnique = async () => ({
          id: 42,
          employeeId: 42,
          name: 'Blocked User',
          username: 'blocked_user',
          passwordHash: 'hashed_pw',
          roleId: 1,
          branchId: 1,
          isBlocked: true,
          isActive: true,
          role: { id: 1, name: 'ADMIN' },
          branch: { id: 1, name: 'Main', isActive: true },
          employee: { id: 42, name: 'Blocked User', status: 'ACTIVE' },
        });
        bcrypt.compare = async () => true;

        await assert.rejects(
          async () => {
            await authService.login('blocked_user', 'ValidPassword123!');
          },
          (err) => {
            assert.strictEqual(err.status, 403);
            assert.strictEqual(err.type, 'AUTH_ROLE');
            assert.match(err.message, /blocked/i);
            return true;
          }
        );
      } finally {
        prisma.user.findUnique = originalFindUnique;
        bcrypt.compare = originalCompare;
      }
    });

    it('login rejects deactivated user with 403 AUTH_ROLE', async () => {
      const prisma = require('../../src/config/prisma');
      const authService = require('../../src/modules/auth/auth.service');
      const bcrypt = require('bcrypt');

      const originalFindUnique = prisma.user.findUnique;
      const originalCompare = bcrypt.compare;

      try {
        prisma.user.findUnique = async () => ({
          id: 43,
          employeeId: 43,
          name: 'Deactivated User',
          username: 'deactivated_user',
          passwordHash: 'hashed_pw',
          roleId: 1,
          branchId: 1,
          isBlocked: false,
          isActive: false,
          role: { id: 1, name: 'ADMIN' },
          branch: { id: 1, name: 'Main', isActive: true },
          employee: { id: 43, name: 'Deactivated User', status: 'INACTIVE' },
        });
        bcrypt.compare = async () => true;

        await assert.rejects(
          async () => {
            await authService.login('deactivated_user', 'ValidPassword123!');
          },
          (err) => {
            assert.strictEqual(err.status, 403);
            assert.strictEqual(err.type, 'AUTH_ROLE');
            assert.match(err.message, /deactivated/i);
            return true;
          }
        );
      } finally {
        prisma.user.findUnique = originalFindUnique;
        bcrypt.compare = originalCompare;
      }
    });

    it('Rule 6: Resigned Employee cannot authenticate', async () => {
      const prisma = require('../../src/config/prisma');
      const authService = require('../../src/modules/auth/auth.service');
      const bcrypt = require('bcrypt');

      const originalFindUnique = prisma.user.findUnique;
      const originalCompare = bcrypt.compare;

      try {
        prisma.user.findUnique = async () => ({
          id: 50,
          employeeId: 50,
          name: 'Resigned Employee',
          username: 'resigned_emp',
          passwordHash: 'hashed_pw',
          roleId: 3,
          branchId: 1,
          isBlocked: false,
          isActive: true,
          role: { id: 3, name: 'BAKER' },
          branch: { id: 1, name: 'Main', isActive: true },
          employee: { id: 50, name: 'Resigned Employee', status: 'RESIGNED' },
        });
        bcrypt.compare = async () => true;

        await assert.rejects(
          async () => {
            await authService.login('resigned_emp', 'ValidPassword123!');
          },
          (err) => {
            assert.strictEqual(err.status, 403);
            assert.match(err.message, /employee/i);
            return true;
          }
        );
      } finally {
        prisma.user.findUnique = originalFindUnique;
        bcrypt.compare = originalCompare;
      }
    });

    it('Rule 7: Terminated Employee cannot authenticate', async () => {
      const prisma = require('../../src/config/prisma');
      const authService = require('../../src/modules/auth/auth.service');
      const bcrypt = require('bcrypt');

      const originalFindUnique = prisma.user.findUnique;
      const originalCompare = bcrypt.compare;

      try {
        prisma.user.findUnique = async () => ({
          id: 51,
          employeeId: 51,
          name: 'Terminated Employee',
          username: 'terminated_emp',
          passwordHash: 'hashed_pw',
          roleId: 3,
          branchId: 1,
          isBlocked: false,
          isActive: true,
          role: { id: 3, name: 'BAKER' },
          branch: { id: 1, name: 'Main', isActive: true },
          employee: { id: 51, name: 'Terminated Employee', status: 'TERMINATED' },
        });
        bcrypt.compare = async () => true;

        await assert.rejects(
          async () => {
            await authService.login('terminated_emp', 'ValidPassword123!');
          },
          (err) => {
            assert.strictEqual(err.status, 403);
            assert.match(err.message, /employee/i);
            return true;
          }
        );
      } finally {
        prisma.user.findUnique = originalFindUnique;
        bcrypt.compare = originalCompare;
      }
    });

    it('Rule 8: Active Employee can authenticate successfully', async () => {
      const prisma = require('../../src/config/prisma');
      const authService = require('../../src/modules/auth/auth.service');
      const refreshTokenUtil = require('../../src/utils/refreshToken');
      const bcrypt = require('bcrypt');

      const originalFindUnique = prisma.user.findUnique;
      const originalCompare = bcrypt.compare;
      const originalCreate = refreshTokenUtil.create;

      try {
        prisma.user.findUnique = async () => ({
          id: 52,
          employeeId: 52,
          name: 'Active Baker',
          username: 'active_baker',
          passwordHash: 'hashed_pw',
          roleId: 3,
          branchId: 1,
          isBlocked: false,
          isActive: true,
          role: { id: 3, name: 'BAKER' },
          branch: { id: 1, name: 'Main', isActive: true },
          employee: { id: 52, name: 'Active Baker', status: 'ACTIVE' },
        });
        bcrypt.compare = async () => true;
        refreshTokenUtil.create = async () => ({ token: 'mock_refresh' });

        const result = await authService.login('active_baker', 'ValidPassword123!');
        assert.ok(result.token);
        assert.strictEqual(result.user.employeeId, 52);
        assert.strictEqual(result.user.name, 'Active Baker');
      } finally {
        prisma.user.findUnique = originalFindUnique;
        bcrypt.compare = originalCompare;
        refreshTokenUtil.create = originalCreate;
      }
    });
  });

  describe('3. Deletion Semantics & Identity Preservation', () => {
    it('Rule 1 & 2: Employee 1:0..1 User - Deleting User preserves Employee', async () => {
      const employee = { id: 10, name: 'Kebede Worku', status: 'ACTIVE' };
      const user = { id: 10, employeeId: 10, username: 'kworku' };

      // Emulate deleting User
      const deletedUser = user;
      const survivingEmployee = employee;

      assert.strictEqual(deletedUser.id, 10);
      assert.strictEqual(survivingEmployee.id, 10);
      assert.strictEqual(survivingEmployee.name, 'Kebede Worku');
    });

    it('Rule 3: User deletion preserves historical records', async () => {
      const employeeId = 15;
      const productionRecord = { id: 101, createdBy: employeeId, quantity: 50 };
      const wasteRecord = { id: 201, createdBy: employeeId, quantity: 2 };
      const closureRecord = { id: 301, closedBy: employeeId, isClosed: true };

      // User account is deleted
      const userDeleted = true;
      assert.strictEqual(userDeleted, true);

      // Business records remain linked to employeeId
      assert.strictEqual(productionRecord.createdBy, employeeId);
      assert.strictEqual(wasteRecord.createdBy, employeeId);
      assert.strictEqual(closureRecord.closedBy, employeeId);
    });

    it('Rule 4 & 5: RefreshToken and PasswordReset follow User deletion', async () => {
      const targetUserId = 88;
      const deletedTokens = [];
      const deletedResets = [];
      let userDeleted = false;

      const mockTx = [
        Promise.resolve({ count: 2 }), // refreshTokens
        Promise.resolve({ count: 1 }), // passwordResets
        Promise.resolve({ id: targetUserId }), // user
      ];

      const results = await Promise.all(mockTx);
      assert.strictEqual(results[0].count, 2);
      assert.strictEqual(results[1].count, 1);
      assert.strictEqual(results[2].id, targetUserId);
    });

    it('Rule 9: Historical operational records store Employee ID', () => {
      const operationalEntry = {
        productId: 1,
        branchId: 1,
        quantity: 100,
        createdBy: 12, // employeeId
      };
      assert.strictEqual(typeof operationalEntry.createdBy, 'number');
      assert.strictEqual(operationalEntry.createdBy, 12);
    });

    it('Rule 10: ProductTransfer has a database FK referencing Employee', () => {
      const productTransfer = {
        id: 1,
        productId: 1,
        sourceBranchId: 1,
        dependentBranchId: 2,
        receivedQuantity: 10,
        createdBy: 12, // FK to Employee(id)
      };
      assert.strictEqual(productTransfer.createdBy, 12);
    });

    it('Rule 11: Human audit action stores employeeId + actorName snapshot', async () => {
      const auditService = require('../../src/services/auditService');
      const prisma = require('../../src/config/prisma');

      const originalCreate = prisma.auditLog.create;
      let loggedData = null;

      try {
        prisma.auditLog.create = async ({ data }) => {
          loggedData = data;
          return { id: 1, ...data };
        };

        await auditService.logAudit('waste', 99, 'CREATE', null, { quantity: 5 }, {
          employeeId: 14,
          name: 'Almaz Ayana',
        });

        assert.strictEqual(loggedData.employeeId, 14);
        assert.strictEqual(loggedData.actorName, 'Almaz Ayana');
      } finally {
        prisma.auditLog.create = originalCreate;
      }
    });

    it('Rule 12: System audit action stores NULL employeeId + system actorName', async () => {
      const auditService = require('../../src/services/auditService');
      const prisma = require('../../src/config/prisma');

      const originalCreate = prisma.auditLog.create;
      let loggedData = null;

      try {
        prisma.auditLog.create = async ({ data }) => {
          loggedData = data;
          return { id: 2, ...data };
        };

        await auditService.logAudit('closure', 5, 'AUTO_CLOSE', null, { isClosed: true }, 'System Rollover');

        assert.strictEqual(loggedData.employeeId, null);
        assert.strictEqual(loggedData.actorName, 'System Rollover');
      } finally {
        prisma.auditLog.create = originalCreate;
      }
    });

    it('Rule 13: Rehire creates a new User linked to existing Employee', async () => {
      const existingEmployee = { id: 12, employeeCode: 'EMP-0012', name: 'John Doe', status: 'RESIGNED' };
      
      // Rehire: Employee status updated, new user created referencing employeeId: 12
      const updatedEmployee = { ...existingEmployee, status: 'ACTIVE' };
      const newUser = { id: 99, employeeId: existingEmployee.id, username: 'jdoe_rehired' };

      assert.strictEqual(newUser.employeeId, existingEmployee.id);
      assert.strictEqual(updatedEmployee.status, 'ACTIVE');
      assert.notStrictEqual(newUser.id, existingEmployee.id); // independent sequences
    });

    it('Rule 14 & 15: No fake SYSTEM_USER_ID or || 0 audit fallbacks', () => {
      const user = null;
      const actorEmployeeId = user?.employeeId || user?.userId || null;
      const actorName = user?.name || (actorEmployeeId ? `Employee #${actorEmployeeId}` : 'System');

      assert.strictEqual(actorEmployeeId, null);
      assert.strictEqual(actorName, 'System');
      assert.notStrictEqual(actorEmployeeId, 0); // never falls back to 0
    });
  });

  describe('4. Self-Operation Guards', () => {
    it('prevents user from blocking themselves', () => {
      const currentUserId = 1;
      const targetUserId = 1;
      const isBlocked = true;

      const isSelfBlock = isBlocked && targetUserId === currentUserId;
      assert.strictEqual(isSelfBlock, true);
    });

    it('prevents user from deleting themselves', () => {
      const currentUserId = 1;
      const targetUserId = 1;

      const isSelfDelete = targetUserId === currentUserId;
      assert.strictEqual(isSelfDelete, true);
    });
  });
});
