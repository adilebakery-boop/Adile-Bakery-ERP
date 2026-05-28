const express = require('express');
const { authenticate } = require('../../middlewares/auth.middleware');
const { asyncHandler } = require('../../middlewares/errorHandler');
const { allowRoles } = require('../../middlewares/role.middleware');
const prisma = require('../../config/prisma');
const bcrypt = require('bcrypt');
const { createUserSchema, updateUserSchema } = require('../../utils/validations/user.validation');

const SALT_ROUNDS = 10;

const router = express.Router();

const validate = (schema) => (req, res, next) => {
  try {
    schema.parse(req.body);
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
    const { page: pageQ, limit: limitQ, branchId, roleId } = req.query;
    const page = parseInt(pageQ) || 1;
    const limit = parseInt(limitQ) || 10;
    const skip = (page - 1) * limit;

    const where = {
      isActive: true,
      ...(branchId && { branchId: Number(branchId) }),
      ...(roleId && { roleId: Number(roleId) }),
    };

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
    const users = await prisma.user.findMany({
      where: { isActive: false },
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
    const user = await prisma.user.findUnique({
      where: { id: parseInt(req.params.id) },
      include: { role: true, branch: true }
    });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.json({ success: true, message: 'User retrieved successfully', data: user });
  })
);

const OPERATIONAL_ROLES = ['BAKER', 'CAKE_CHEF', 'COOKIE_BAKER', 'FETIR_CHEF', 'CASHIER'];

const canManageTargetUser = async (currentUserRole, targetUserId) => {
  if (currentUserRole === 'ADMIN') return true;
  
  if (currentUserRole === 'MANAGER') {
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      include: { role: true }
    });
    if (!targetUser) return false;
    if (targetUser.role.name === 'MANAGER' || targetUser.role.name === 'ADMIN') {
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
    const { name, username, password, roleId, branchId, email } = req.body;
    const currentUserRole = req.user.role;

    const targetRole = await prisma.role.findUnique({ where: { id: roleId } });
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
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    if (currentUserRole === 'ADMIN' && targetRole.name === 'MANAGER') {
      const user = await prisma.user.create({
        data: { name, username, passwordHash, roleId, branchId: null, email: email || null },
        include: { role: true }
      });
      return res.status(201).json({ success: true, message: 'User created successfully', data: user });
    }

    const user = await prisma.user.create({
      data: { name, username, passwordHash, roleId, branchId, email: email || null },
      include: { role: true }
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
    const currentUserRole = req.user.role;

    const canManage = await canManageTargetUser(currentUserRole, userId);
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
    const { name, roleId, branchId, isBlocked, email } = req.body;
    const currentUserRole = req.user.role;

    const canManage = await canManageTargetUser(currentUserRole, targetUserId);
    if (!canManage) {
      return res.status(403).json({ success: false, message: 'You do not have permission to manage this user' });
    }

    if (roleId) {
      const targetRole = await prisma.role.findUnique({ where: { id: roleId } });
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

      if (currentUserRole === 'ADMIN' && targetRole.name === 'MANAGER') {
        const user = await prisma.user.update({
          where: { id: targetUserId },
          data: { 
            name, 
            roleId, 
            branchId: null, 
            isBlocked,
            email: email === undefined ? undefined : (email || null)
          },
          include: { role: true }
        });
        return res.json({ success: true, message: 'User updated successfully', data: user });
      }
    }

    const user = await prisma.user.update({
      where: { id: targetUserId },
      data: { 
        name, 
        roleId, 
        branchId, 
        isBlocked,
        email: email === undefined ? undefined : (email || null)
      },
      include: { role: true }
    });
    res.json({ success: true, message: 'User updated successfully', data: user });
  })
);

router.delete(
  '/:id',
  authenticate,
  allowRoles('ADMIN', 'MANAGER'),
  asyncHandler(async (req, res) => {
    const userId = parseInt(req.params.id);
    const currentUserRole = req.user.role;

    const canManage = await canManageTargetUser(currentUserRole, userId);
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
