const express = require('express');
const { authenticate } = require('../../middlewares/auth.middleware');
const { allowRoles } = require('../../middlewares/role.middleware');
const prisma = require('../../config/prisma');

const router = express.Router();

router.get(
  '/',
  authenticate,
  allowRoles('ADMIN', 'MANAGER', 'BAKER', 'CAKE_CHEF', 'COOKIE_BAKER', 'FETIR_CHEF', 'CASHIER'),
  async (req, res) => {
    try {
      const { branchId, startDate, endDate } = req.query;
      const where = {};

      if (branchId) where.branchId = parseInt(branchId);
      if (startDate && endDate) {
        where.date = {
          gte: new Date(startDate),
          lte: new Date(endDate),
        };
      }

      const remainings = await prisma.remainingRecord.findMany({
        where,
        include: { product: true, branch: true, user: true },
        orderBy: { date: 'desc' },
      });
      res.json({ success: true, data: remainings });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

router.post(
  '/',
  authenticate,
  allowRoles('ADMIN', 'MANAGER', 'BAKER', 'CAKE_CHEF', 'COOKIE_BAKER', 'FETIR_CHEF', 'CASHIER'),
  async (req, res) => {
    try {
      const { productId, quantity, branchId, date } = req.body;
      const existing = await prisma.remainingRecord.findFirst({
        where: {
          productId: parseInt(productId),
          branchId: parseInt(branchId),
          date: new Date(date),
        },
      });

      if (existing) {
        const updated = await prisma.remainingRecord.update({
          where: { id: existing.id },
          data: { quantity: parseFloat(quantity), userId: req.user.userId },
        });
        return res.json({ success: true, data: updated });
      }

      const remaining = await prisma.remainingRecord.create({
        data: {
          productId: parseInt(productId),
          quantity: parseFloat(quantity),
          branchId: parseInt(branchId),
          date: new Date(date),
          userId: req.user.userId,
        },
        include: { product: true, branch: true },
      });
      res.status(201).json({ success: true, data: remaining });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

router.put(
  '/:id',
  authenticate,
  allowRoles('ADMIN', 'MANAGER', 'BAKER', 'CAKE_CHEF', 'COOKIE_BAKER', 'FETIR_CHEF', 'CASHIER'),
  async (req, res) => {
    try {
      const { quantity } = req.body;
      const remaining = await prisma.remainingRecord.update({
        where: { id: parseInt(req.params.id) },
        data: { quantity: parseFloat(quantity) },
        include: { product: true, branch: true },
      });
      res.json({ success: true, data: remaining });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

router.delete(
  '/:id',
  authenticate,
  allowRoles('ADMIN', 'MANAGER'),
  async (req, res) => {
    try {
      await prisma.remainingRecord.delete({ where: { id: parseInt(req.params.id) } });
      res.json({ success: true, message: 'Remaining record deleted' });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

module.exports = router;