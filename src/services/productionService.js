const { Prisma } = require('@prisma/client');
const prisma = require('../config/prisma');
const inventoryFlowService = require('./inventoryFlowService');
const auditService = require('./auditService');
const { calculateOperationalDate } = require('../utils/dateUtils');
const { buildProductionAccessFilter, isAdminOrManager, getAllowedCategories } = require('../utils/accessFilters');
const { validateQuantityForUnitType } = require('../utils/unitTypeValidation');

const ZERO = new Prisma.Decimal('0');

function toDecimal(value) {
  if (value instanceof Prisma.Decimal) return value;
  if (value === null || value === undefined) return ZERO;
  return new Prisma.Decimal(String(value));
}

async function findAll(filters = {}) {
  const { branchId, operationalDate, shift, productId, startDate, endDate } = filters;
  const where = {};

  if (branchId) where.branchId = parseInt(branchId);
  if (productId) where.productId = parseInt(productId);
  if (shift) where.shift = shift;

  if (operationalDate) {
    where.operationalDate = new Date(operationalDate);
  }

  if (startDate && endDate) {
    where.operationalDate = {
      gte: new Date(startDate),
      lte: new Date(endDate),
    };
  }

  if (filters.createdBy !== undefined) where.createdBy = filters.createdBy;

  const productions = await prisma.productionRecord.findMany({
    where,
    include: {
      product: { select: { id: true, name: true, category: true, unitType: true, price: true } },
      branch: { select: { id: true, name: true } },
      creator: { select: { id: true, name: true, username: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return productions;
}

async function findById(id) {
  const production = await prisma.productionRecord.findUnique({
    where: { id: parseInt(id) },
    include: {
      product: true,
      branch: { select: { id: true, name: true } },
      creator: { select: { id: true, name: true, username: true } },
      updater: { select: { id: true, name: true, username: true } },
    },
  });

  if (!production) {
    const error = new Error('Production record not found');
    error.status = 404;
    throw error;
  }

  return production;
}

async function findByOperationalDate(branchId, operationalDate, shift = null) {
  const where = {
    branchId: parseInt(branchId),
    operationalDate: new Date(operationalDate),
  };

  if (shift) where.shift = shift;

  const productions = await prisma.productionRecord.findMany({
    where,
    include: {
      product: { select: { id: true, name: true, category: true, unitType: true } },
      branch: { select: { id: true, name: true } },
      creator: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'asc' },
  });

  return productions;
}

async function create(data, user) {
  const { productId, quantity, branchId, shift, productionDate, operationalDate: userOpDate } = data;

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

  const allowedCategories = getAllowedCategories(user.role);
  if (!allowedCategories.includes(product.category)) {
    const error = new Error('You do not have permission to record this product category');
    error.status = 403;
    throw error;
  }

  const assignedBranchId = isAdminOrManager(user.role)
    ? (parseInt(branchId) || user.branchId)
    : user.branchId;

  if (!assignedBranchId) {
    const error = new Error('Branch ID is required');
    error.status = 400;
    throw error;
  }

  const prodDate = productionDate ? new Date(productionDate) : new Date();
  const opDate = userOpDate
    ? new Date(userOpDate)
    : calculateOperationalDate(prodDate, shift);

  await inventoryFlowService.assertDayOpen(assignedBranchId, opDate);

  const production = await prisma.productionRecord.create({
    data: {
      productId: parseInt(productId),
      branchId: assignedBranchId,
      productionDate: prodDate,
      operationalDate: opDate,
      shift,
      quantity: new Prisma.Decimal(String(quantity)),
      createdBy: user.userId,
    },
    include: {
      product: { select: { id: true, name: true, category: true, unitType: true } },
      branch: { select: { id: true, name: true } },
      creator: { select: { id: true, name: true } },
    },
  });

  await auditService.logAudit('production', production.id, 'CREATE', null, production, user.userId);

  return production;
}

async function update(id, data, user) {
  const existing = await findById(id);

  await inventoryFlowService.assertDayOpen(existing.branchId, existing.operationalDate);

  const updateData = {
    updatedBy: user.userId,
  };

  if (data.quantity !== undefined) {
    const unitValidation = validateQuantityForUnitType(data.quantity, existing.product.unitType);
    if (!unitValidation.valid) {
      const error = new Error(unitValidation.message);
      error.status = 400;
      throw error;
    }
    updateData.quantity = new Prisma.Decimal(String(data.quantity));
  }

  if (data.shift !== undefined) {
    updateData.shift = data.shift;
    if (data.productionDate) {
      updateData.productionDate = new Date(data.productionDate);
      updateData.operationalDate = calculateOperationalDate(new Date(data.productionDate), data.shift);
    } else {
      updateData.operationalDate = calculateOperationalDate(existing.productionDate, data.shift);
    }
  }

  const oldValue = { ...existing };

  const production = await prisma.productionRecord.update({
    where: { id: parseInt(id) },
    data: updateData,
    include: {
      product: { select: { id: true, name: true, category: true, unitType: true } },
      branch: { select: { id: true, name: true } },
      creator: { select: { id: true, name: true } },
      updater: { select: { id: true, name: true } },
    },
  });

  await auditService.logAudit('production', production.id, 'UPDATE', oldValue, production, user.userId);

  return production;
}

async function remove(id, user) {
  if (!isAdminOrManager(user.role)) {
    const error = new Error('Only ADMIN or MANAGER can delete production records');
    error.status = 403;
    throw error;
  }

  const existing = await findById(id);

  await inventoryFlowService.assertDayOpen(existing.branchId, existing.operationalDate);

  await prisma.productionRecord.delete({
    where: { id: parseInt(id) },
  });

  await auditService.logAudit('production', parseInt(id), 'DELETE', existing, null, user.userId);

  return { message: 'Production record deleted successfully' };
}

async function getTodayProductions(branchId, user) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const where = {
    operationalDate: today,
  };

  if (!isAdminOrManager(user.role)) {
    where.createdBy = user.userId;
  }

  if (branchId) {
    where.branchId = parseInt(branchId);
  }

  const productions = await prisma.productionRecord.findMany({
    where,
    include: {
      product: { select: { id: true, name: true, category: true, unitType: true } },
      branch: { select: { id: true, name: true } },
      creator: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return productions;
}

module.exports = {
  findAll,
  findById,
  findByOperationalDate,
  create,
  update,
  remove,
  getTodayProductions,
};