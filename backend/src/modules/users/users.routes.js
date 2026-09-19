const express = require('express');
const { authenticate } = require('../../middlewares/auth.middleware');
const { asyncHandler } = require('../../middlewares/errorHandler');
const { allowRoles } = require('../../middlewares/role.middleware');
const prisma = require('../../config/prisma');
const bcrypt = require('bcrypt');
const { createUserSchema, updateUserSchema } = require('../../utils/validations/user.validation');
const refreshTokenUtil = require('../../utils/refreshToken');

const SALT_ROUNDS = 10;

const router = express.Router();

const validate = (schema) => (req, res, next) => {
  try {
    req.body = schema.parse(req.body);
    next();
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: error.errors,
    });
  }
};

router.get(
  '/',
  authenticate,
  allowRoles('ADMIN', 'MANAGER'),
  asyncHandler(async (req, res) => {
    const { page: pageQ, limit: limitQ, branchId: queryBranchId, roleName } = req.query;
    const page = parseInt(pageQ) || 1;
    const limit = parseInt(limitQ) || 10;
    const skip = (page - 1) * limit;

    const where = {
      isActive: true,
      ...(roleName && { role: { name: roleName } }),
    };

    if (req.user.role === 'MANAGER') {
      where.branchId = Number(req.user.branchId);
    } else if (queryBranchId) {
      where.branchId = Number(queryBranchId);
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        include: { role: true, branch: true },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.user.count({ where }),
    ]);

    res.json({
      success: true,
      message: 'Users retrieved successfully',
      data: {
        users,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  })
);

router.get(
  '/me',
  authenticate,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      include: { role: true, branch: true }
    });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.json({ success: true, message: 'User retrieved successfully', data: user });
  })
);

router.get(
  '/deactivated',
  authenticate,
  allowRoles('ADMIN', 'MANAGER'),
  asyncHandler(async (req, res) => {
    const where = { isActive: false };
    if (req.user.role === 'MANAGER') {
      where.branchId = Number(req.user.branchId);
    }
    const users = await prisma.user.findMany({
      where,
      include: { role: true, branch: true },
      orderBy: { deletedAt: 'desc' }
    });
    res.json({
      success: true,
      message: 'Deactivated users retrieved successfully',
      data: { users }
    });
  })
);

router.get(
  '/:id',
  authenticate,
  allowRoles('ADMIN', 'MANAGER'),
  asyncHandler(async (req, res) => {
    const where = { id: parseInt(req.params.id) };
    if (req.user.role === 'MANAGER') {
      where.branchId = Number(req.user.branchId);
    }
    const user = await prisma.user.findUnique({
      where,
      include: { role: true, branch: true }
    });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.json({ success: true, message: 'User retrieved successfully', data: user });
  })
);

const OPERATIONAL_ROLES = ['BAKER', 'CAKE_CHEF', 'COOKIE_BAKER', 'FETIR_CHEF', 'CASHIER'];

const canManageTargetUser = async (currentUser, targetUserId) => {
  if (currentUser.role === 'ADMIN') return true;
  
  if (currentUser.role === 'MANAGER') {
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      include: { role: true }
    });
    if (!targetUser) return false;
    if (targetUser.role.name === 'MANAGER' || targetUser.role.name === 'ADMIN') {
      return false;
    }
    if (currentUser.branchId && targetUser.branchId !== Number(currentUser.branchId)) {
      return false;
    }
    return true;
  }
  
  return false;
};

router.post(
  '/',
  authenticate,
  allowRoles('ADMIN', 'MANAGER'),
  validate(createUserSchema),
  asyncHandler(async (req, res) => {
    const { name, username, password, roleName, branchId, email } = req.body;
    const currentUserRole = req.user.role;

    const targetRole = await prisma.role.findUnique({ where: { name: roleName } });
    if (!targetRole) {
      return res.status(400).json({ success: false, message: 'Invalid role' });
    }

    if (currentUserRole === 'MANAGER') {
      if (targetRole.name === 'ADMIN' || targetRole.name === 'MANAGER') {
        return res.status(403).json({ success: false, message: 'Managers cannot create admin or manager accounts' });
      }
      if (!OPERATIONAL_ROLES.includes(targetRole.name)) {
        return res.status(403).json({ success: false, message: 'Managers can only create operational roles' });
      }
      if (!branchId) {
        return res.status(400).json({ success: false, message: 'Branch is required for operational users' });
      }
      if (Number(branchId) !== Number(req.user.branchId)) {
        return res.status(403).json({ success: false, message: 'Managers can only create users for their assigned branch' });
      }
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    let assignedEmployeeId = req.body.employeeId ? Number(req.body.employeeId) : null;
    const effectiveBranchId = (currentUserRole === 'ADMIN' && targetRole.name === 'MANAGER') ? (branchId || null) : branchId;

    const user = await prisma.$transaction(async (tx) => {
      if (!assignedEmployeeId) {
        const empCode = `EMP-${Date.now().toString().slice(-6)}`;
        const employee = await tx.employee.create({
          data: {
            employeeCode: empCode,
            name,
            email: email || null,
            status: 'ACTIVE',
            primaryRoleId: targetRole.id,
            primaryBranchId: effectiveBranchId || null,
            userAccountCreatedAt: new Date(),
          },
        });
        assignedEmployeeId = employee.id;

        await tx.employeeRoleHistory.create({
          data: {
            employeeId: employee.id,
            roleId: targetRole.id,
            startDate: new Date(),
          },
        });
      } else {
        const existingEmp = await tx.employee.findUnique({ where: { id: assignedEmployeeId } });
        if (!existingEmp) {
          throw Object.assign(new Error('Specified employee not found'), { status: 404 });
        }
        await tx.employee.update({
          where: { id: assignedEmployeeId },
          data: {
            status: 'ACTIVE',
            name: name || existingEmp.name,
            primaryRoleId: targetRole.id,
            primaryBranchId: effectiveBranchId || existingEmp.primaryBranchId,
          },
        });
        await tx.employeeRoleHistory.create({
          data: {
            employeeId: assignedEmployeeId,
            roleId: targetRole.id,
            startDate: new Date(),
          },
        });
      }

      return tx.user.create({
        data: {
          employeeId: assignedEmployeeId,
          name,
          username,
          passwordHash,
          roleId: targetRole.id,
          branchId: effectiveBranchId,
          email: email || null,
        },
        include: { role: true, branch: true, employee: true },
      });
    });

    res.status(201).json({ success: true, message: 'User created successfully', data: user });
  })
);

router.put(
  '/:id/restore',
  authenticate,
  allowRoles('ADMIN', 'MANAGER'),
  asyncHandler(async (req, res) => {
    const userId = parseInt(req.params.id);

    const canManage = await canManageTargetUser(req.user, userId);
    if (!canManage) {
      return res.status(403).json({ success: false, message: 'You do not have permission to manage this user' });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    if (user.isActive) {
      return res.status(400).json({ success: false, message: 'User is already active' });
    }

    const restored = await prisma.user.update({
      where: { id: userId },
      data: { isActive: true, deletedAt: null },
      include: { role: true, branch: true }
    });

    res.json({ success: true, message: 'User restored successfully', data: restored });
  })
);

router.put(
  '/:id',
  authenticate,
  allowRoles('ADMIN', 'MANAGER'),
  validate(updateUserSchema),
  asyncHandler(async (req, res) => {
    const targetUserId = parseInt(req.params.id);
    const { name, username, roleName, branchId, isBlocked, email } = req.body;
    const currentUserRole = req.user.role;

    const canManage = await canManageTargetUser(req.user, targetUserId);
    if (!canManage) {
      return res.status(403).json({ success: false, message: 'You do not have permission to manage this user' });
    }

    let targetRole = null;
    if (roleName) {
      targetRole = await prisma.role.findUnique({ where: { name: roleName } });
      if (!targetRole) {
        return res.status(400).json({ success: false, message: 'Invalid role' });
      }

      if (currentUserRole === 'MANAGER') {
        if (targetRole.name === 'ADMIN' || targetRole.name === 'MANAGER') {
          return res.status(403).json({ success: false, message: 'Managers cannot assign admin or manager roles' });
        }
        if (!OPERATIONAL_ROLES.includes(targetRole.name)) {
          return res.status(403).json({ success: false, message: 'Managers can only assign operational roles' });
        }
      }
    }

    if (isBlocked && targetUserId === req.user.userId) {
      return res.status(400).json({ success: false, message: 'You cannot block your own account' });
    }

    const user = await prisma.user.update({
      where: { id: targetUserId },
      data: { 
        name, 
        username,
        roleId: targetRole?.id,
        branchId, 
        isBlocked,
        email: email === undefined ? undefined : (email || null)
      },
      include: { role: true, branch: true, employee: true }
    });

    if (user.employeeId && (name || email !== undefined)) {
      await prisma.employee.update({
        where: { id: user.employeeId },
        data: {
          ...(name ? { name } : {}),
          ...(email !== undefined ? { email: email || null } : {}),
        },
      }).catch((err) => console.warn('[USERS] Failed to sync employee details:', err));
    }

    if (isBlocked === true) {
      await refreshTokenUtil.revokeAll(targetUserId).catch((err) => {
        console.warn(`[USERS] Failed to revoke tokens for blocked user ${targetUserId}:`, err);
      });
    }

    res.json({ success: true, message: 'User updated successfully', data: user });
  })
);

router.delete(
  '/:id/permanent',
  authenticate,
  allowRoles('ADMIN', 'MANAGER'),
  asyncHandler(async (req, res) => {
    const targetUserId = parseInt(req.params.id);

    const canManage = await canManageTargetUser(req.user, targetUserId);
    if (!canManage) {
      return res.status(403).json({ success: false, message: 'You do not have permission to manage this user' });
    }

    if (targetUserId === req.user.userId) {
      return res.status(403).json({ success: false, message: 'You cannot delete your own account' });
    }

    const user = await prisma.user.findUnique({ where: { id: targetUserId } });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (user.isActive) {
      return res.status(400).json({
        success: false,
        message: 'User must be deactivated before permanent removal',
      });
    }

    // Safe deletion of account and auth credentials in transaction
    // Historical business records (production, waste, closures, audit) reference Employee and remain preserved
    await prisma.$transaction([
      prisma.refreshToken.deleteMany({ where: { userId: targetUserId } }),
      prisma.passwordReset.deleteMany({ where: { userId: targetUserId } }),
      prisma.user.delete({ where: { id: targetUserId } }),
    ]);

    res.json({
      success: true,
      message: 'User login account permanently deleted successfully. Employee record and historical business records remain preserved.',
      data: {},
    });
  })
);

router.delete(
  '/:id',
  authenticate,
  allowRoles('ADMIN', 'MANAGER'),
  asyncHandler(async (req, res) => {
    const userId = parseInt(req.params.id);

    const canManage = await canManageTargetUser(req.user, userId);
    if (!canManage) {
      return res.status(403).json({ success: false, message: 'You do not have permission to manage this user' });
    }

    if (userId === req.user.userId) {
      return res.status(403).json({ success: false, message: 'You cannot delete your own account' });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    if (!user.isActive) {
      return res.status(404).json({ success: false, message: 'User already deactivated' });
    }

    await prisma.user.update({
      where: { id: userId },
      data: { isActive: false, deletedAt: new Date() }
    });

    res.json({ success: true, message: 'User deactivated successfully', data: {} });
  })
);

module.exports = router;
