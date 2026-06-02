const prisma = require('../config/prisma');
const auditService = require('./auditService');
const { validateQuantityForUnitType } = require('../utils/unitTypeValidation');
const { canEditOperationalRecord, toDateString } = require('../utils/dateUtils');
const { canCreateForCategory, requireBranchAccess } = require('../utils/accessFilters');
const { requireDayNotClosed, getClosureMap } = require('./closureService');
const { ZERO, toDecimal } = require('../utils/decimalUtils');

async function findAll(filters = {}) {
  const { branchId, operationalDate, productId, startDate, endDate, page = 1, limit = 20 } = filters;
  const where = {};

  if (branchId) where.branchId = parseInt(branchId);
  if (productId) where.productId = parseInt(productId);
  if (filters.createdBy !== undefined) where.createdBy = filters.createdBy;
  if (filters.product) where.product = filters.product;

  if (operationalDate) {
    where.operationalDate = new Date(operationalDate);
  }

  if (startDate && endDate) {
    where.operationalDate = {
      gte: new Date(startDate),
      lte: new Date(endDate),
    };
  }

  const pageNum = Math.max(1, parseInt(page) || 1);
  const limitNum = parseInt(limit) || 20;
  const skip = (pageNum - 1) * limitNum;

  const [data, total] = await Promise.all([
    prisma.wasteRecord.findMany({
      where,
      skip,
      take: limitNum,
      include: {
        product: { select: { id: true, name: true, category: true, unitType: true, isActive: true } },
        branch: { select: { id: true, name: true } },
        creator: { select: { id: true, name: true, username: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.wasteRecord.count({ where }),
  ]);

  const pairs = data.map(w => ({ branchId: w.branchId, operationalDate: w.operationalDate }));
  const closureMap = await getClosureMap(pairs);
  data.forEach(w => {
    const dateStr = toDateString(w.operationalDate);
    w.isClosed = closureMap[`${w.branchId}|${dateStr}`] ?? false;
  });

  return { data, total, appliedLimit: limitNum };
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

  requireBranchAccess(branchId, userId, 'waste');

  const branch = await prisma.branch.findUnique({
    where: { id: parseInt(branchId) },
    select: { isActive: true },
  });

  if (!branch || !branch.isActive) {
    const error = new Error('Cannot create waste records for inactive branch');
    error.status = 400;
    throw error;
  }

  const product = await prisma.product.findFirst({
    where: {
      id: parseInt(productId),
      isActive: true,
    },
  });

  if (!product) {
    const existingProduct = await prisma.product.findUnique({
      where: { id: parseInt(productId) },
      select: { isActive: true },
    });

    if (existingProduct && !existingProduct.isActive) {
      const error = new Error('Cannot create waste record for inactive product');
      error.status = 400;
      throw error;
    }

    const error = new Error('Product not found');
    error.status = 404;
    throw error;
  }

  if (!canCreateForCategory(userId, product.category)) {
    const error = new Error('You can only record waste for products in your category');
    error.status = 403;
    throw error;
  }

  const unitValidation = validateQuantityForUnitType(quantity, product.unitType);
  if (!unitValidation.valid) {
    const error = new Error(unitValidation.message);
    error.status = 400;
    throw error;
  }

  const opDate = new Date(operationalDate);

  if (!canEditOperationalRecord(opDate, userId.role)) {
    const error = new Error('Waste records can only be created within the 3-day edit window');
    error.status = 403;
    throw error;
  }

  await requireDayNotClosed(branchId, opDate);

  const waste = await prisma.wasteRecord.create({
    data: {
      productId: parseInt(productId),
      branchId: parseInt(branchId),
      operationalDate: opDate,
      quantity: toDecimal(String(quantity)),
      reason: reason || null,
      createdBy: userId.userId,
    },
    include: {
      product: { select: { id: true, name: true, category: true, isActive: true } },
      branch: { select: { id: true, name: true } },
      creator: { select: { id: true, name: true } },
    },
  });

  await auditService.logAudit('waste', waste.id, 'CREATE', null, waste, userId.userId);

  return waste;
}

async function update(id, data, userId) {
  const existing = await findById(id);

  requireBranchAccess(existing.branchId, userId, 'waste');

  if (!canEditOperationalRecord(existing.operationalDate, userId.role)) {
    const error = new Error('Waste records can only be edited within the 3-day edit window');
    error.status = 403;
    throw error;
  }

  await requireDayNotClosed(existing.branchId, existing.operationalDate);

  const updateData = {};

  if (data.quantity !== undefined) {
    const updateUnitValidation = validateQuantityForUnitType(data.quantity, existing.product.unitType);
    if (!updateUnitValidation.valid) {
      const error = new Error(updateUnitValidation.message);
      error.status = 400;
      throw error;
    }
    updateData.quantity = toDecimal(String(data.quantity));
  }

  if (data.reason !== undefined) {
    updateData.reason = data.reason;
  }

  const oldValue = { ...existing };

  const waste = await prisma.wasteRecord.update({
    where: { id: parseInt(id) },
    data: updateData,
    include: {
      product: { select: { id: true, name: true, category: true, isActive: true } },
      branch: { select: { id: true, name: true } },
    },
  });

  await auditService.logAudit('waste', waste.id, 'UPDATE', oldValue, waste, userId.userId);

  return waste;
}

async function remove(id, userId) {
  const existing = await findById(id);

  requireBranchAccess(existing.branchId, userId, 'waste');

  if (!canEditOperationalRecord(existing.operationalDate, userId.role)) {
    const error = new Error('Waste records can only be deleted within the 3-day edit window');
    error.status = 403;
    throw error;
  }

  await requireDayNotClosed(existing.branchId, existing.operationalDate);

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
