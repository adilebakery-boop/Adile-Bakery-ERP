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

router.post(
  '/',
  authenticate,
  allowRoles('ADMIN', 'MANAGER'),
  async (req, res) => {
    try {
      const { name, username, password, roleId, branchId } = req.body;
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
      const { name, roleId, branchId, isBlocked } = req.body;
      const user = await prisma.user.update({
        where: { id: parseInt(req.params.id) },
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
      await prisma.user.delete({ where: { id: parseInt(req.params.id) } });
      res.json({ success: true, message: 'User deleted successfully', data: {} });
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