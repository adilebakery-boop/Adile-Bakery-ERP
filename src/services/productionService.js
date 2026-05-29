const prisma = require('../config/prisma');
const inventoryFlowService = require('./inventoryFlowService');
const auditService = require('./auditService');
const { calculateOperationalDate, canEditOperationalRecord, getAddisAbabaDate, startOfDay } = require('../utils/dateUtils');
const { addDays, subDays } = require('date-fns');
const { DEFAULT_PAST_OPERATIONAL_DAYS, DEFAULT_FUTURE_OPERATIONAL_DAYS } = require('../constants/operationalWindow');
const { buildProductionAccessFilter, isAdminOrManager, getAllowedCategories } = require('../utils/accessFilters');
const { validateQuantityForUnitType } = require('../utils/unitTypeValidation');
const { ZERO, toDecimal } = require('../utils/decimalUtils');

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
  const { productId, quantity, branchId, shift, productionDate } = data;

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
      const error = new Error('Cannot create production for inactive product');
      error.status = 400;
      throw error;
    }

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

  const [y, m, d] = productionDate.split('-');
  const prodDate = new Date(Date.UTC(parseInt(y), parseInt(m) - 1, parseInt(d)));

  const addisNow = getAddisAbabaDate();
  const todayUTC = new Date(Date.UTC(addisNow.getFullYear(), addisNow.getMonth(), addisNow.getDate()));
  const minDateUTC = new Date(todayUTC);
  minDateUTC.setUTCDate(minDateUTC.getUTCDate() - 2);
  if (prodDate < minDateUTC || prodDate > todayUTC) {
    const error = new Error('Production date must be within the last 2 days or today');
    error.status = 400;
    throw error;
  }

  const opDate = calculateOperationalDate(prodDate, shift);

  await inventoryFlowService.assertDayEditable(assignedBranchId, opDate);

  const production = await prisma.productionRecord.create({
    data: {
      productId: parseInt(productId),
      branchId: assignedBranchId,
      productionDate: prodDate,
      operationalDate: opDate,
      shift,
      quantity: toDecimal(String(quantity)),
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

  if (!canEditOperationalRecord(existing.operationalDate)) {
    const error = new Error('Production records can only be edited within 3 operational days');
    error.status = 403;
    throw error;
  }

  await inventoryFlowService.assertDayEditable(existing.branchId, existing.operationalDate);

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
    updateData.quantity = toDecimal(String(data.quantity));
  }

  if (data.shift !== undefined && data.shift !== existing.shift) {
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

  await inventoryFlowService.assertDayEditable(existing.branchId, existing.operationalDate);

  await prisma.productionRecord.delete({
    where: { id: parseInt(id) },
  });

  await auditService.logAudit('production', parseInt(id), 'DELETE', existing, null, user.userId);

  return { message: 'Production record deleted successfully' };
}

async function getTodayProductions(branchId, user) {
  const addisNow = getAddisAbabaDate();
  const today = new Date(Date.UTC(addisNow.getFullYear(), addisNow.getMonth(), addisNow.getDate()));

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

async function findAllGrouped(filters = {}) {
  const { branchId, operationalDate, shift, productId, startDate, endDate, page, limit } = filters;
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

  if (!operationalDate && !startDate && !endDate) {
    const addisNow = getAddisAbabaDate();
    const todayUtcMidnight = new Date(Date.UTC(addisNow.getFullYear(), addisNow.getMonth(), addisNow.getDate()));
    where.operationalDate = {
      gte: subDays(todayUtcMidnight, DEFAULT_PAST_OPERATIONAL_DAYS),
      lte: addDays(todayUtcMidnight, DEFAULT_FUTURE_OPERATIONAL_DAYS),
    };
  }

  const pageNum = Math.max(1, parseInt(page) || 1);
  const limitNum = Math.min(50, Math.max(1, parseInt(limit) || 10));
  const skip = (pageNum - 1) * limitNum;

  const [groupKeys, allGroups] = await Promise.all([
    prisma.productionRecord.groupBy({
      by: ['productId', 'branchId', 'operationalDate'],
      where,
      _sum: { quantity: true },
      _count: { id: true },
      orderBy: [
        { operationalDate: 'desc' },
        { productId: 'asc' },
        { branchId: 'asc' },
      ],
      skip,
      take: limitNum,
    }),
    prisma.productionRecord.groupBy({
      by: ['productId', 'branchId', 'operationalDate'],
      where,
    }),
  ]);

  const total = allGroups.length;
  const totalPages = Math.max(1, Math.ceil(total / limitNum));

  if (groupKeys.length === 0) {
    return { data: [], total, page: pageNum, limit: limitNum, totalPages };
  }

  const conditions = groupKeys.map(g => ({
    productId: g.productId,
    branchId: g.branchId,
    operationalDate: g.operationalDate,
  }));

  const productions = await prisma.productionRecord.findMany({
    where: { OR: conditions },
    include: {
      product: { select: { id: true, name: true, category: true, unitType: true, price: true } },
      branch: { select: { id: true, name: true } },
      creator: { select: { id: true, name: true, username: true } },
    },
    orderBy: [
      { operationalDate: 'desc' },
      { productId: 'asc' },
      { branchId: 'asc' },
      { createdAt: 'desc' },
      { id: 'desc' },
    ],
  });

  const productionsByGroupKey = {};
  for (const prod of productions) {
    const opDateStr = prod.operationalDate.toISOString().split('T')[0];
    const key = `${prod.productId}-${prod.branchId}-${opDateStr}`;
    if (!productionsByGroupKey[key]) {
      productionsByGroupKey[key] = [];
    }
    productionsByGroupKey[key].push(prod);
  }

  const groupedArray = groupKeys.map(gk => {
    const opDateStr = gk.operationalDate.toISOString().split('T')[0];
    const key = `${gk.productId}-${gk.branchId}-${opDateStr}`;
    const entries = productionsByGroupKey[key] || [];

    entries.sort((a, b) => {
      const dateCmp = new Date(b.createdAt) - new Date(a.createdAt);
      if (dateCmp !== 0) return dateCmp;
      return b.id - a.id;
    });

    return {
      productId: gk.productId,
      product: entries[0]?.product || null,
      branchId: gk.branchId,
      branch: entries[0]?.branch || null,
      shift: entries[0]?.shift || null,
      operationalDate: opDateStr,
      entries,
      totalQuantity: toDecimal(gk._sum.quantity),
    };
  });

  return {
    data: groupedArray,
    total,
    page: pageNum,
    limit: limitNum,
    totalPages,
  };
}

module.exports = {
  findAllGrouped,
  findById,
  findByOperationalDate,
  create,
  update,
  remove,
  getTodayProductions,
};