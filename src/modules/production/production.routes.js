const express = require('express');
const { authenticate } = require('../../middlewares/auth.middleware');
const { allowRoles } = require('../../middlewares/role.middleware');
const prisma = require('../../config/prisma');

const router = express.Router();

router.get(
  '/',
  authenticate,
  allowRoles('ADMIN', 'MANAGER', 'STAFF', 'CAKE_CHEF', 'FETIR_CHEF', 'CASHIER'),
  async (req, res) => {
    try {
      const { branchId, startDate, endDate } = req.query;
      const where = {};

      if (branchId) where.branchId = parseInt(branchId);
      if (startDate && endDate) {
        where.createdAt = {
          gte: new Date(startDate),
          lte: new Date(endDate),
        };
      }

      const productions = await prisma.productionRecord.findMany({
        where,
        include: { product: true, branch: true, user: true },
        orderBy: { createdAt: 'desc' },
      });
      res.json({ success: true, data: productions });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

router.post(
  '/',
  authenticate,
  allowRoles('ADMIN', 'MANAGER', 'STAFF', 'CAKE_CHEF', 'FETIR_CHEF', 'CASHIER'),
  async (req, res) => {
    try {
      const { productId, quantity, branchId, shift } = req.body;
      const production = await prisma.productionRecord.create({
        data: {
          productId: parseInt(productId),
          quantity: parseFloat(quantity),
          branchId: parseInt(branchId),
          shift,
          userId: req.user.userId,
        },
        include: { product: true, branch: true },
      });
      res.status(201).json({ success: true, data: production });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

router.put(
  '/:id',
  authenticate,
  allowRoles('ADMIN', 'MANAGER', 'STAFF', 'CAKE_CHEF', 'FETIR_CHEF', 'CASHIER'),
  async (req, res) => {
    try {
      const { quantity, shift } = req.body;
      const production = await prisma.productionRecord.update({
        where: { id: parseInt(req.params.id) },
        data: { quantity: quantity ? parseFloat(quantity) : undefined, shift },
        include: { product: true, branch: true },
      });
      res.json({ success: true, data: production });
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
      await prisma.productionRecord.delete({ where: { id: parseInt(req.params.id) } });
      res.json({ success: true, message: 'Production record deleted' });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

module.exports = router;