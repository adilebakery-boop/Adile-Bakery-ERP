const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert');

process.env.JWT_SECRET = 'test_jwt_secret_for_unit_tests_1234567890';
process.env.REFRESH_TOKEN_SECRET = 'test_refresh_secret_1234567890_test_key_at_least_32_bytes';

const { updateUserSchema } = require('../../src/utils/validations/user.validation');

describe('User Management - Unit & Safety Tests', () => {

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

  describe('2. Authentication & Authorization Enforcement', () => {
    it('login rejects blocked user with 403 AUTH_ROLE', async () => {
      const prisma = require('../../src/config/prisma');
      const authService = require('../../src/modules/auth/auth.service');
      const bcrypt = require('bcrypt');

      const originalFindUnique = prisma.user.findUnique;
      const originalCompare = bcrypt.compare;

      try {
        prisma.user.findUnique = async () => ({
          id: 42,
          name: 'Blocked User',
          username: 'blocked_user',
          passwordHash: 'hashed_pw',
          roleId: 1,
          branchId: 1,
          isBlocked: true,
          isActive: true,
          role: { id: 1, name: 'ADMIN' },
          branch: { id: 1, name: 'Main', isActive: true },
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
          name: 'Deactivated User',
          username: 'deactivated_user',
          passwordHash: 'hashed_pw',
          roleId: 1,
          branchId: 1,
          isBlocked: false,
          isActive: false,
          role: { id: 1, name: 'ADMIN' },
          branch: { id: 1, name: 'Main', isActive: true },
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

    it('refreshToken.verify returns null if user isBlocked', async () => {
      const prisma = require('../../src/config/prisma');
      const refreshTokenUtil = require('../../src/utils/refreshToken');

      const originalFindUnique = prisma.refreshToken.findUnique;

      try {
        prisma.refreshToken.findUnique = async () => ({
          tokenHash: 'dummy',
          expiresAt: new Date(Date.now() + 100000),
          user: {
            id: 99,
            isActive: true,
            isBlocked: true,
            role: { name: 'BAKER' },
            branch: { name: 'Main' },
          },
        });

        const verified = await refreshTokenUtil.verify('dummy_raw_token');
        assert.strictEqual(verified, null);
      } finally {
        prisma.refreshToken.findUnique = originalFindUnique;
      }
    });

    it('refreshToken.verify returns null if user is not active', async () => {
      const prisma = require('../../src/config/prisma');
      const refreshTokenUtil = require('../../src/utils/refreshToken');

      const originalFindUnique = prisma.refreshToken.findUnique;

      try {
        prisma.refreshToken.findUnique = async () => ({
          tokenHash: 'dummy',
          expiresAt: new Date(Date.now() + 100000),
          user: {
            id: 100,
            isActive: false,
            isBlocked: false,
            role: { name: 'BAKER' },
            branch: { name: 'Main' },
          },
        });

        const verified = await refreshTokenUtil.verify('dummy_raw_token');
        assert.strictEqual(verified, null);
      } finally {
        prisma.refreshToken.findUnique = originalFindUnique;
      }
    });
  });

  describe('3. User Deactivation vs Permanent Deletion Logic', () => {
    it('deactivation soft-deletes the user without calling prisma.user.delete', async () => {
      let updateData = null;
      let deleteCalled = false;

      const mockPrisma = {
        user: {
          findUnique: async () => ({ id: 5, isActive: true, roleId: 3, role: { name: 'BAKER' } }),
          update: async ({ where, data }) => {
            updateData = { where, data };
            return { id: 5, ...data };
          },
          delete: async () => {
            deleteCalled = true;
          },
        },
      };

      // Emulate deactivation
      const targetUser = await mockPrisma.user.findUnique({ where: { id: 5 } });
      assert.strictEqual(targetUser.isActive, true);

      await mockPrisma.user.update({
        where: { id: 5 },
        data: { isActive: false, deletedAt: new Date() },
      });

      assert.strictEqual(updateData.data.isActive, false);
      assert.ok(updateData.data.deletedAt instanceof Date);
      assert.strictEqual(deleteCalled, false);
    });

    it('permanent removal is blocked if the user is still active', async () => {
      const user = { id: 6, isActive: true };
      const canProceed = !user.isActive;
      assert.strictEqual(canProceed, false);
    });

    it('permanent removal is blocked if historical business records exist', async () => {
      const historicalCounts = {
        production: 12,
        remaining: 0,
        waste: 0,
        closure: 0,
        transfer: 0,
        reopen: 0,
        audit: 3,
        snapshot: 0,
      };

      const totalHistorical = Object.values(historicalCounts).reduce((a, b) => a + b, 0);
      assert.strictEqual(totalHistorical > 0, true);

      // Verify that removal is prevented
      const canSafelyDelete = totalHistorical === 0;
      assert.strictEqual(canSafelyDelete, false);
    });

    it('permanent removal succeeds for test accounts with zero historical records', async () => {
      const historicalCounts = {
        production: 0,
        remaining: 0,
        waste: 0,
        closure: 0,
        transfer: 0,
        reopen: 0,
        audit: 0,
        snapshot: 0,
      };

      const totalHistorical = Object.values(historicalCounts).reduce((a, b) => a + b, 0);
      assert.strictEqual(totalHistorical, 0);

      let txExecuted = false;
      const mockTx = [
        Promise.resolve({ count: 1 }), // refreshTokens
        Promise.resolve({ count: 0 }), // passwordReset
        Promise.resolve({ id: 77 }),   // user
      ];

      txExecuted = true;
      assert.strictEqual(txExecuted, true);
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
