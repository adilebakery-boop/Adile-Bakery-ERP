const { Prisma } = require('@prisma/client');
const prisma = require('../config/prisma');
const inventoryFlowService = require('./inventoryFlowService');
const auditService = require('./auditService');
const { validateQuantityForUnitType } = require('../utils/unitTypeValidation');

const ZERO = new Prisma.Decimal('0');

function toDecimal(value) {
  if (value instanceof Prisma.Decimal) return value;
  if (value === null || value === undefined) return ZERO;
  return new Prisma.Decimal(String(value));
}

async function findAll(filters = {}) {
  const { branchId, operationalDate, productId, startDate, endDate } = filters;
  const where = {};

  if (branchId) where.branchId = parseInt(branchId);
  if (productId) where.productId = parseInt(productId);

  if (operationalDate) {
    where.operationalDate = new Date(operationalDate);
  }

  if (startDate && endDate) {
    where.operationalDate = {
      gte: new Date(startDate),
      lte: new Date(endDate),
    };
  }

  const wastes = await prisma.wasteRecord.findMany({
    where,
    include: {
      product: { select: { id: true, name: true, category: true, unitType: true } },
      branch: { select: { id: true, name: true } },
      creator: { select: { id: true, name: true, username: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return wastes;
}

async function findById(id) {
  const waste = await prisma.wasteRecord.findUnique({
    where: { id: parseInt(id) },
    include: {
      product: true,
      branch: { select: { id: true, name: true } },
      creator: { select: { id: true, name: true, username: true } },
    },
  });

  if (!waste) {
    const error = new Error('Waste record not found');
    error.status = 404;
    throw error;
  }

  return waste;
}

async function create(data, userId) {
  const { productId, quantity, branchId, operationalDate, reason } = data;

  const product = await prisma.product.findUnique({
    where: { id: parseInt(productId) },
  });

  if (!product) {
    const error = new Error('Product not found');
    error.status = 404;
    throw error;
  }

  const unitValidation = validateQuantityForUnitType(quantity, product.unitType);
  if (!unitValidation.valid) {
    const error = new Error(unitValidation.message);
    error.status = 400;
    throw error;
  }

  const opDate = new Date(operationalDate);

  await inventoryFlowService.assertDayOpen(parseInt(branchId), opDate);

  const waste = await prisma.wasteRecord.create({
    data: {
      productId: parseInt(productId),
      branchId: parseInt(branchId),
      operationalDate: opDate,
      quantity: new Prisma.Decimal(String(quantity)),
      reason: reason || null,
      createdBy: userId.userId,
    },
    include: {
      product: { select: { id: true, name: true, category: true } },
      branch: { select: { id: true, name: true } },
      creator: { select: { id: true, name: true } },
    },
  });

  await auditService.logAudit('waste', waste.id, 'CREATE', null, waste, userId.userId);

  return waste;
}

async function update(id, data, userId) {
  const existing = await findById(id);

  await inventoryFlowService.assertDayOpen(existing.branchId, existing.operationalDate);

  const updateData = {};

  if (data.quantity !== undefined) {
    const updateUnitValidation = validateQuantityForUnitType(data.quantity, existing.product.unitType);
    if (!updateUnitValidation.valid) {
      const error = new Error(updateUnitValidation.message);
      error.status = 400;
      throw error;
    }
    updateData.quantity = new Prisma.Decimal(String(data.quantity));
  }

  if (data.reason !== undefined) {
    updateData.reason = data.reason;
  }

  const oldValue = { ...existing };

  const waste = await prisma.wasteRecord.update({
    where: { id: parseInt(id) },
    data: updateData,
    include: {
      product: { select: { id: true, name: true, category: true } },
      branch: { select: { id: true, name: true } },
    },
  });

  await auditService.logAudit('waste', waste.id, 'UPDATE', oldValue, waste, userId.userId);

  return waste;
}

async function remove(id, userId) {
  if (userId.role !== 'ADMIN' && userId.role !== 'MANAGER') {
    const error = new Error('Only ADMIN or MANAGER can delete waste records');
    error.status = 403;
    throw error;
  }

  const existing = await findById(id);

  await inventoryFlowService.assertDayOpen(existing.branchId, existing.operationalDate);

  await prisma.wasteRecord.delete({
    where: { id: parseInt(id) },
  });

  await auditService.logAudit('waste', parseInt(id), 'DELETE', existing, null, userId.userId);

  return { message: 'Waste record deleted successfully' };
}

module.exports = {
  findAll,
  findById,
  create,
  update,
  remove,
};