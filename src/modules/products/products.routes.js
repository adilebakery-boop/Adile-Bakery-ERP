const express = require('express');
const { authenticate } = require('../../middlewares/auth.middleware');
const { allowRoles, ROLES } = require('../../middlewares/role.middleware');
const prisma = require('../../config/prisma');

const router = express.Router();

router.get(
  '/',
  authenticate,
  allowRoles('ADMIN', 'MANAGER'),
  async (req, res) => {
    try {
      const products = await prisma.product.findMany({
        where: { isActive: true },
      });
      res.json({ success: true, data: products });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

router.post(
  '/',
  authenticate,
  allowRoles('ADMIN', 'MANAGER'),
  async (req, res) => {
    try {
      const { name, category, price, unitType } = req.body;
      const product = await prisma.product.create({
        data: { name, category, price, unitType, isActive: true },
      });
      res.status(201).json({ success: true, data: product });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

module.exports = router;