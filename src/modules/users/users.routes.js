const express = require('express');
const { authenticate } = require('../../middlewares/auth.middleware');
const { allowRoles, ROLES } = require('../../middlewares/role.middleware');
const prisma = require('../../config/prisma');
const bcrypt = require('bcrypt');

const SALT_ROUNDS = 10;

const router = express.Router();

router.get(
  '/',
  authenticate,
  allowRoles('ADMIN', 'MANAGER'),
  async (req, res) => {
    try {
      const users = await prisma.user.findMany({
        where: { deletedAt: null },
        include: { role: true, branch: true },
        orderBy: { createdAt: 'desc' }
      });
      res.json({
        success: true,
        message: 'Users retrieved successfully',
        data: { users }
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message, errors: [] });
    }
  }
);

router.get(
  '/:id',
  authenticate,
  allowRoles('ADMIN', 'MANAGER'),
  async (req, res) => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: parseInt(req.params.id) },
        include: { role: true, branch: true }
      });
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found', errors: [] });
      }
      res.json({ success: true, message: 'User retrieved successfully', data: user });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message, errors: [] });
    }
  }
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
  async (req, res) => {
    try {
      const { name, username, password, roleId, branchId } = req.body;
      const currentUserRole = req.user.role;

      const targetRole = await prisma.role.findUnique({ where: { id: roleId } });
      if (!targetRole) {
        return res.status(400).json({ success: false, message: 'Invalid role', errors: [] });
      }

      if (currentUserRole === 'MANAGER') {
        if (targetRole.name === 'ADMIN' || targetRole.name === 'MANAGER') {
          return res.status(403).json({ success: false, message: 'Managers cannot create admin or manager accounts', errors: [] });
        }
        if (!OPERATIONAL_ROLES.includes(targetRole.name)) {
          return res.status(403).json({ success: false, message: 'Managers can only create operational roles', errors: [] });
        }
        if (!branchId) {
          return res.status(400).json({ success: false, message: 'Branch is required for operational users', errors: [] });
        }
      }

      if (currentUserRole === 'ADMIN' && targetRole.name === 'MANAGER') {
        const user = await prisma.user.create({
          data: { name, username, passwordHash: await bcrypt.hash(password, SALT_ROUNDS), roleId, branchId: null },
          include: { role: true }
        });
        return res.status(201).json({ success: true, message: 'User created successfully', data: user });
      }

      const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
      const user = await prisma.user.create({
        data: { name, username, passwordHash, roleId, branchId },
        include: { role: true }
      });
      res.status(201).json({ success: true, message: 'User created successfully', data: user });
    } catch (error) {
      if (error.code === 'P2002') {
        return res.status(409).json({ success: false, message: 'Username already exists', errors: [] });
      }
      res.status(500).json({ success: false, message: error.message, errors: [] });
    }
  }
);

router.put(
  '/:id',
  authenticate,
  allowRoles('ADMIN', 'MANAGER'),
  async (req, res) => {
    try {
      const targetUserId = parseInt(req.params.id);
      const { name, roleId, branchId, isBlocked } = req.body;
      const currentUserRole = req.user.role;

      const canManage = await canManageTargetUser(currentUserRole, targetUserId);
      if (!canManage) {
        return res.status(403).json({ success: false, message: 'You do not have permission to manage this user', errors: [] });
      }

      if (roleId) {
        const targetRole = await prisma.role.findUnique({ where: { id: roleId } });
        if (!targetRole) {
          return res.status(400).json({ success: false, message: 'Invalid role', errors: [] });
        }

        if (currentUserRole === 'MANAGER') {
          if (targetRole.name === 'ADMIN' || targetRole.name === 'MANAGER') {
            return res.status(403).json({ success: false, message: 'Managers cannot assign admin or manager roles', errors: [] });
          }
          if (!OPERATIONAL_ROLES.includes(targetRole.name)) {
            return res.status(403).json({ success: false, message: 'Managers can only assign operational roles', errors: [] });
          }
        }

        if (currentUserRole === 'ADMIN' && targetRole.name === 'MANAGER') {
          const user = await prisma.user.update({
            where: { id: targetUserId },
            data: { name, roleId, branchId: null, isBlocked },
            include: { role: true }
          });
          return res.json({ success: true, message: 'User updated successfully', data: user });
        }
      }

      const user = await prisma.user.update({
        where: { id: targetUserId },
        data: { name, roleId, branchId, isBlocked },
        include: { role: true }
      });
      res.json({ success: true, message: 'User updated successfully', data: user });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message, errors: [] });
    }
  }
);

router.delete(
  '/:id',
  authenticate,
  allowRoles('ADMIN', 'MANAGER'),
  async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const currentUserRole = req.user.role;

      const canManage = await canManageTargetUser(currentUserRole, userId);
      if (!canManage) {
        return res.status(403).json({ success: false, message: 'You do not have permission to manage this user', errors: [] });
      }

      if (userId === req.user.userId) {
        return res.status(403).json({ success: false, message: 'You cannot delete your own account', errors: [] });
      }

      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found', errors: [] });
      }
      if (user.deletedAt) {
        return res.status(404).json({ success: false, message: 'User already deactivated', errors: [] });
      }

      await prisma.user.update({
        where: { id: userId },
        data: { deletedAt: new Date() }
      });

      res.json({ success: true, message: 'User deactivated successfully', data: {} });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message, errors: [] });
    }
  }
);

router.get(
  '/me',
  authenticate,
  async (req, res) => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.user.userId },
        include: { role: true, branch: true }
      });
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found', errors: [] });
      }
      res.json({ success: true, message: 'User retrieved successfully', data: user });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message, errors: [] });
    }
  }
);

module.exports = router;