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
      ...(roleId && { roleId: Number(roleId) }),
    };

    if (req.user.role === 'MANAGER') {
      where.branchId = req.user.branchId;
    } else if (branchId) {
      where.branchId = Number(branchId);
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
      where.branchId = req.user.branchId;
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

const canManageTargetUser = async (currentUser, targetUserId) => {
  const currentUserRole = currentUser.role;
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
    if (Number(targetUser.branchId) !== Number(currentUser.branchId)) {
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
    let { name, username, password, roleId, branchId, email } = req.body;
    const currentUserRole = req.user.role;

    console.log('[CREATE USER] req.body:', { name, username, roleId, branchId, email });
    console.log('[CREATE USER] req.user:', { role: req.user.role, branchId: req.user.branchId, userId: req.user.userId });

    const targetRole = await prisma.role.findUnique({ where: { id: roleId } });
    if (!targetRole) {
      return res.status(400).json({ success: false, message: 'Invalid role' });
    }
    console.log('[CREATE USER] targetRole:', targetRole);

    if (currentUserRole === 'MANAGER') {
      console.log('[CREATE USER] MANAGER checks starting');
      if (targetRole.name === 'ADMIN' || targetRole.name === 'MANAGER') {
        return res.status(403).json({ success: false, message: 'Managers cannot create admin or manager accounts' });
      }
      if (!OPERATIONAL_ROLES.includes(targetRole.name)) {
        return res.status(403).json({ success: false, message: 'Managers can only create operational roles' });
      }
      if (branchId && Number(branchId) !== Number(req.user.branchId)) {
        return res.status(403).json({ success: false, message: 'Managers can only create users for their own branch' });
      }
      branchId = branchId || req.user.branchId;
      console.log('[CREATE USER] resolved branchId:', branchId);
    }

    if (targetRole.name === 'MANAGER' && !branchId) {
      return res.status(400).json({ success: false, message: 'Branch is required for manager accounts' });
    }

    console.log('[CREATE USER] hashing password...');
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    console.log('[CREATE USER] hash created, length:', passwordHash.length);

    const createPayload = { name, username, passwordHash, roleId, branchId: branchId || null, email: email || null };
    console.log('[CREATE USER] Prisma create payload:', { ...createPayload, passwordHash: '[REDACTED]', password: '[REDACTED]' });

    try {
      const user = await prisma.user.create({
        data: createPayload,
        include: { role: true }
      });
      console.log('[CREATE USER] success, user id:', user.id);
      res.status(201).json({ success: true, message: 'User created successfully', data: user });
    } catch (err) {
      console.error('[CREATE USER] PRISMA ERROR:', {
        code: err.code,
        message: err.message,
        meta: err.meta,
        stack: err.stack,
      });
      return res.status(500).json({
        success: false,
        message: 'Database error',
        error: err.message,
        code: err.code,
        meta: err.meta,
      });
    }
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
    const { name, username, roleId, branchId, isBlocked, email } = req.body;
    const currentUserRole = req.user.role;

    const canManage = await canManageTargetUser(req.user, targetUserId);
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
        if (branchId && Number(branchId) !== Number(req.user.branchId)) {
          return res.status(403).json({ success: false, message: 'Managers cannot change branch assignments' });
        }
      }

      if (currentUserRole === 'ADMIN' && targetRole.name === 'MANAGER' && !branchId) {
        return res.status(400).json({ success: false, message: 'Branch is required for manager accounts' });
      }
    }

    const user = await prisma.user.update({
      where: { id: targetUserId },
      data: { 
        name, 
        username,
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
