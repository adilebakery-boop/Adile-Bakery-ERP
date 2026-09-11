const { Prisma } = require('@prisma/client');
const prisma = require('../config/prisma');
const auditService = require('./auditService');
const { addDays, subDays } = require('date-fns');
const { calculateOperationalDate, canEditOperationalRecord, getAddisDateString, startOfDay } = require('../utils/dateUtils');
const { requireDayNotClosed, getClosureMap } = require('./closureService');
const { buildProductionAccessFilter, isAdminOrManager, getAllowedCategories, requireBranchAccess } = require('../utils/accessFilters');
const { validateQuantityForUnitType } = require('../utils/unitTypeValidation');
const { DEFAULT_PAST_OPERATIONAL_DAYS, DEFAULT_FUTURE_OPERATIONAL_DAYS } = require('../constants/operationalWindow');
const { PRODUCT_SELECT_LOCALIZED } = require('../constants/prismaSelects');

const ZERO = new Prisma.Decimal('0');

function toDecimal(value) {
  if (value instanceof Prisma.Decimal) return value;
  if (value === null || value === undefined) return ZERO;
  return new Prisma.Decimal(String(value));
}

async function findAll(filters = {}, user) {
  const { branchId, operationalDate, shift, productId, startDate, endDate, page = 1, limit = 20 } = filters;
  const where = {};

  if (user) {
    Object.assign(where, buildProductionAccessFilter(user));
  }

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

  const pageNum = Math.max(1, parseInt(page) || 1);
  const limitNum = Math.min(100, parseInt(limit) || 20);
  const skip = (pageNum - 1) * limitNum;

  const [data, total] = await Promise.all([
    prisma.productionRecord.findMany({
      where,
      skip,
      take: limitNum,
      include: {
        product: { select: PRODUCT_SELECT_LOCALIZED },
        branch: { select: { id: true, name: true } },
        creator: { select: { id: true, name: true, username: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.productionRecord.count({ where }),
  ]);

  return { data, total };
}

async function findById(id, accessFilter = {}) {
  const production = await prisma.productionRecord.findUnique({
    where: { id: parseInt(id), ...accessFilter },
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
      product: { select: PRODUCT_SELECT_LOCALIZED },
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

  const assignedBranchId = user.role === 'ADMIN'
    ? (parseInt(branchId) || user.branchId)
    : user.branchId;

  if (!assignedBranchId) {
    const error = new Error('Branch ID is required');
    error.status = 400;
    throw error;
  }

  const branch = await prisma.branch.findUnique({
    where: { id: assignedBranchId },
    select: { isActive: true },
  });

  if (!branch || !branch.isActive) {
    const error = new Error('Cannot create production records for inactive branch');
    error.status = 400;
    throw error;
  }

  const [y, m, d] = productionDate.split('-');
  const prodDate = new Date(Date.UTC(parseInt(y), parseInt(m) - 1, parseInt(d)));

  const todayStr = getAddisDateString();
  const [yNow, mNow, dNow] = todayStr.split('-').map(Number);
  const todayUTC = new Date(Date.UTC(yNow, mNow - 1, dNow));
  const maxPastDays = (user.role === 'ADMIN' || user.role === 'MANAGER') ? 4 : 2;
  const minDateUTC = new Date(todayUTC);
  minDateUTC.setUTCDate(minDateUTC.getUTCDate() - maxPastDays);
  if (prodDate < minDateUTC || prodDate > todayUTC) {
    const error = new Error(`Production date must be within the last ${maxPastDays} days or today`);
    error.status = 400;
    throw error;
  }

  const opDate = calculateOperationalDate(prodDate, shift);

  const editWindowDays = (user.role === 'ADMIN' || user.role === 'MANAGER') ? 5 : 3;
  if (!canEditOperationalRecord(opDate, user.role)) {
    const error = new Error(`Production records can only be created within the ${editWindowDays}-day edit window`);
    error.status = 403;
    throw error;
  }

  await requireDayNotClosed(assignedBranchId, opDate);

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
      product: { select: PRODUCT_SELECT_LOCALIZED },
      branch: { select: { id: true, name: true } },
      creator: { select: { id: true, name: true } },
    },
  });

  await auditService.logAudit('production', production.id, 'CREATE', null, production, user.userId);

  return production;
}

async function update(id, data, user) {
  const existing = await findById(id);

  requireBranchAccess(existing.branchId, user, 'production');

  const editWindowDays = (user.role === 'ADMIN' || user.role === 'MANAGER') ? 5 : 3;
  if (!canEditOperationalRecord(existing.operationalDate, user.role)) {
    const error = new Error(`Production records can only be edited within the ${editWindowDays}-day edit window`);
    error.status = 403;
    throw error;
  }

  await requireDayNotClosed(existing.branchId, existing.operationalDate);

  if (data.shift !== undefined && data.shift !== existing.shift) {
    const error = new Error('Shift cannot be changed after creation. operationalDate is an immutable ledger key.');
    error.status = 400;
    throw error;
  }

  if (data.productionDate !== undefined) {
    const error = new Error('Production date cannot be changed after creation. Create a new record instead.');
    error.status = 400;
    throw error;
  }

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

  const oldValue = { ...existing };

  const production = await prisma.productionRecord.update({
    where: { id: parseInt(id) },
    data: updateData,
    include: {
      product: { select: PRODUCT_SELECT_LOCALIZED },
      branch: { select: { id: true, name: true } },
      creator: { select: { id: true, name: true } },
      updater: { select: { id: true, name: true } },
    },
  });

  await auditService.logAudit('production', production.id, 'UPDATE', oldValue, production, user.userId);

  return production;
}

async function remove(id, user) {
  const existing = await findById(id);

  requireBranchAccess(existing.branchId, user, 'production');

  const editWindowDays = (user.role === 'ADMIN' || user.role === 'MANAGER') ? 5 : 3;
  if (!canEditOperationalRecord(existing.operationalDate, user.role)) {
    const error = new Error(`Production records can only be deleted within the ${editWindowDays}-day edit window`);
    error.status = 403;
    throw error;
  }

  await requireDayNotClosed(existing.branchId, existing.operationalDate);

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

  if (user.role !== 'ADMIN') {
    const allowedCategories = getAllowedCategories(user.role);
    if (allowedCategories.length > 0) {
      where.product = { category: { in: allowedCategories } };
    }
  }

  const resolvedBranchId = user.role === 'MANAGER' ? user.branchId : (branchId || user.branchId);
  if (resolvedBranchId) {
    where.branchId = parseInt(resolvedBranchId);
  }

  const productions = await prisma.productionRecord.findMany({
    where,
    include: {
      product: { select: PRODUCT_SELECT_LOCALIZED },
      branch: { select: { id: true, name: true } },
      creator: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return productions;
}

async function findAllGrouped(filters = {}, user) {
  const { branchId, operationalDate, shift, productId, startDate, endDate, page, limit } = filters;
  const where = {};

  if (user) {
    Object.assign(where, buildProductionAccessFilter(user));
  }

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

  if (!operationalDate && !startDate && !endDate) {
    const todayStr = getAddisDateString();
    const [yNow, mNow, dNow] = todayStr.split('-').map(Number);
    const todayUTC = new Date(Date.UTC(yNow, mNow - 1, dNow));
    where.operationalDate = {
      gte: subDays(todayUTC, DEFAULT_PAST_OPERATIONAL_DAYS),
      lte: addDays(todayUTC, DEFAULT_FUTURE_OPERATIONAL_DAYS),
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
      product: { select: PRODUCT_SELECT_LOCALIZED },
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

  const pairs = groupedArray.map(g => ({ branchId: g.branchId, operationalDate: g.operationalDate }));
  const closureMap = await getClosureMap(pairs);
  groupedArray.forEach(g => {
    g.isClosed = closureMap[`${g.branchId}|${g.operationalDate}`] ?? false;
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
  findAll,
  findAllGrouped,
  findById,
  findByOperationalDate,
  create,
  update,
  remove,
  getTodayProductions,
};