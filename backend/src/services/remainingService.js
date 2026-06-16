const { Prisma } = require('@prisma/client');
const prisma = require('../config/prisma');
const auditService = require('./auditService');
const { toDateString, canEditOperationalRecord } = require('../utils/dateUtils');
const { validateQuantityForUnitType } = require('../utils/unitTypeValidation');
const { ZERO, toDecimal } = require('../utils/decimalUtils');
const { requireDayNotClosed } = require('./closureService');
const { canCreateForCategory, requireBranchAccess } = require('../utils/accessFilters');

async function findAll(filters = {}) {
  const { branchId, operationalDate, status, startDate, endDate, categories, page = 1, limit = 20 } = filters;
  const where = {};

  if (branchId) where.branchId = parseInt(branchId);
  if (status) where.status = status;
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

  if (categories && categories.length > 0) {
    where.product = { category: { in: categories } };
  }

  const pageNum = Math.max(1, parseInt(page) || 1);
  const limitNum = Math.min(100, parseInt(limit) || 20);
  const skip = (pageNum - 1) * limitNum;

  const [data, total] = await Promise.all([
    prisma.remainingRecord.findMany({
      where,
      skip,
      take: limitNum,
      include: {
        product: { select: { id: true, name: true, category: true, unitType: true, price: true } },
        branch: { select: { id: true, name: true } },
        creator: { select: { id: true, name: true, username: true } },
      },
      orderBy: { operationalDate: 'desc' },
    }),
    prisma.remainingRecord.count({ where }),
  ]);

  return { data, total };
}

async function findById(id, accessFilter = {}) {
  const remaining = await prisma.remainingRecord.findUnique({
    where: { id: parseInt(id), ...accessFilter },
    include: {
      product: true,
      branch: { select: { id: true, name: true } },
      creator: { select: { id: true, name: true, username: true } },
      updater: { select: { id: true, name: true, username: true } },
    },
  });

  if (!remaining) {
    const error = new Error('Remaining record not found');
    error.status = 404;
    throw error;
  }

  return remaining;
}

async function findByOperationalDate(branchId, operationalDate, accessFilter = {}) {
  const where = {
    branchId: parseInt(branchId),
    operationalDate: new Date(operationalDate),
    ...accessFilter,
  };

  const remainings = await prisma.remainingRecord.findMany({
    where,
    include: {
      product: { select: { id: true, name: true, category: true, unitType: true } },
      branch: { select: { id: true, name: true } },
      creator: { select: { id: true, name: true } },
    },
    orderBy: { product: { category: 'asc' } },
  });

  return remainings;
}

async function create(data, user) {
  const { productId, quantity, branchId, operationalDate, status = 'FINAL' } = data;

  requireBranchAccess(branchId, user, 'inventory');

  const branch = await prisma.branch.findUnique({
    where: { id: parseInt(branchId) },
    select: { isActive: true },
  });

  if (!branch || !branch.isActive) {
    const error = new Error('Cannot create remaining records for inactive branch');
    error.status = 400;
    throw error;
  }

  // Validate quantity is positive
  if (quantity === undefined || quantity === null || Number(quantity) <= 0) {
    throw new Error('Quantity must be a positive number');
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
      const error = new Error('Cannot create remaining record for inactive product');
      error.status = 400;
      throw error;
    }

    const error = new Error('Product not found');
    error.status = 404;
    throw error;
  }

  if (!canCreateForCategory(user, product.category)) {
    const error = new Error('You can only record remaining for products in your category');
    error.status = 403;
    throw error;
  }

  const unitValidation = validateQuantityForUnitType(quantity, product.unitType);
  if (!unitValidation.valid) {
    const error = new Error(unitValidation.message);
    error.status = 400;
    throw error;
  }

  const opDate = operationalDate ? new Date(operationalDate) : new Date();

  if (!canEditOperationalRecord(opDate, user.role)) {
    const error = new Error('Remaining records can only be created within the 3-day edit window');
    error.status = 403;
    throw error;
  }

  await requireDayNotClosed(branchId, opDate);

  const existing = await prisma.remainingRecord.findFirst({
    where: {
      branchId: parseInt(branchId),
      operationalDate: opDate,
      productId: parseInt(productId),
    },
  });

  let remaining;

  if (existing) {
    const oldValue = { ...existing };
    remaining = await prisma.remainingRecord.update({
      where: { id: existing.id },
      data: {
        quantity: toDecimal(String(quantity)),
        status,
        updatedBy: user.userId,
      },
      include: {
        product: { select: { id: true, name: true, category: true } },
        branch: { select: { id: true, name: true } },
        updater: { select: { id: true, name: true } },
      },
    });

    await auditService.logAudit('remaining', remaining.id, 'UPDATE', oldValue, remaining, user.userId);
  } else {
    remaining = await prisma.remainingRecord.create({
      data: {
        productId: parseInt(productId),
        branchId: parseInt(branchId),
        operationalDate: opDate,
        quantity: toDecimal(String(quantity)),
        status,
        createdBy: user.userId,
      },
      include: {
        product: { select: { id: true, name: true, category: true } },
        branch: { select: { id: true, name: true } },
        creator: { select: { id: true, name: true } },
      },
    });

    await auditService.logAudit('remaining', remaining.id, 'CREATE', null, remaining, user.userId);
  }

  return remaining;
}

async function createBulk(data, user) {
  const { branchId, operationalDate: opDateParam, items } = data;

  const opDate = opDateParam ? new Date(opDateParam) : new Date();

  requireBranchAccess(branchId, user, 'inventory');

  const branch = await prisma.branch.findUnique({
    where: { id: parseInt(branchId) },
    select: { isActive: true, name: true },
  });

  if (!branch || !branch.isActive) {
    const error = new Error('Cannot create remaining records for inactive branch');
    error.status = 400;
    throw error;
  }

  const branchInfo = { id: parseInt(branchId), name: branch.name };

  if (!canEditOperationalRecord(opDate, user.role)) {
    const error = new Error('Remaining records can only be edited within the 3-day edit window');
    error.status = 403;
    throw error;
  }

  await requireDayNotClosed(branchId, opDate);

  // Fetch products and existing records outside the transaction (read-only)
  const productIds = items.map(item => parseInt(item.productId));

  const allProducts = await prisma.product.findMany({
    where: { id: { in: productIds } },
  });
  const productMap = new Map(allProducts.map(p => [p.id, p]));

  const existingRecords = await prisma.remainingRecord.findMany({
    where: {
      branchId: parseInt(branchId),
      operationalDate: opDate,
      productId: { in: productIds },
    },
  });
  const existingMap = new Map(existingRecords.map(r => [r.productId, r]));

  // Validate all items
  for (const item of items) {
    const product = productMap.get(parseInt(item.productId));

    if (!product) {
      const err = new Error(`Product ${item.productId} not found`);
      err.status = 404;
      throw err;
    }

    if (!product.isActive) {
      const err = new Error(`Cannot save remaining for inactive product: ${product.id}`);
      err.status = 400;
      throw err;
    }

    if (!canCreateForCategory(user, product.category)) {
      const err = new Error(`You do not have permission to record remaining for product "${product.name}"`);
      err.status = 403;
      throw err;
    }

    const bulkUnitValidation = validateQuantityForUnitType(item.remainingQuantity, product.unitType);
    if (!bulkUnitValidation.valid) {
      const err = new Error(`Product "${product.name}": ${bulkUnitValidation.message}`);
      err.status = 400;
      throw err;
    }
  }

  const result = await prisma.$transaction(async (tx) => {

  const branchIdNum = parseInt(branchId);
  const userIdNum = user.userId;

  const returnedRows = items.length > 0
    ? await tx.$queryRaw(Prisma.sql`
    INSERT INTO "RemainingRecord"
      ("productId", "branchId", "operationalDate", "quantity", "status", "createdBy", "updatedAt")
    VALUES ${Prisma.join(items.map(item => Prisma.sql`(
      ${parseInt(item.productId)},
      ${branchIdNum},
      ${opDate}::date,
      ${toDecimal(String(item.remainingQuantity ?? 0)).toString()}::decimal(12,3),
      ${item.status || 'FINAL'}::"RemainingStatus",
      ${userIdNum},
      NOW()
    )`))}
    ON CONFLICT ("branchId", "operationalDate", "productId") DO UPDATE
    SET
      "quantity" = EXCLUDED."quantity",
      "status" = EXCLUDED."status",
      "updatedBy" = ${userIdNum},
      "updatedAt" = NOW()
    RETURNING *;
  `)
    : [];

  const auditLogs = returnedRows.map(row => {
    const existing = existingMap.get(row.productId);
    return {
      entityType: 'remaining',
      entityId: row.id,
      action: existing ? 'UPDATE' : 'CREATE',
      oldValue: existing ? JSON.parse(JSON.stringify(existing)) : null,
      newValue: JSON.parse(JSON.stringify(row)),
      userId: user.userId,
    };
  });

  if (auditLogs.length > 0) {
    await tx.auditLog.createMany({ data: auditLogs });
  }

  return returnedRows.map(row => ({
    ...row,
    product: productMap.get(row.productId)
      ? { id: row.productId, name: productMap.get(row.productId).name, category: productMap.get(row.productId).category }
      : undefined,
    branch: branchInfo,
  }));
});

  return result;
}

async function update(id, data, user) {
  const existing = await findById(id);

  requireBranchAccess(existing.branchId, user, 'inventory');

  if (!canEditOperationalRecord(existing.operationalDate, user.role)) {
    const error = new Error('Remaining records can only be edited within the 3-day edit window');
    error.status = 403;
    throw error;
  }

  await requireDayNotClosed(existing.branchId, existing.operationalDate);

  const updateData = {
    updatedBy: user.userId,
  };

  if (data.quantity !== undefined) {
    const updateUnitValidation = validateQuantityForUnitType(data.quantity, existing.product.unitType);
    if (!updateUnitValidation.valid) {
      const error = new Error(updateUnitValidation.message);
      error.status = 400;
      throw error;
    }
    updateData.quantity = toDecimal(String(data.quantity));
  }

  if (data.status !== undefined) {
    updateData.status = data.status;
  }

  const oldValue = { ...existing };

  const remaining = await prisma.remainingRecord.update({
    where: { id: parseInt(id) },
    data: updateData,
    include: {
      product: { select: { id: true, name: true, category: true } },
      branch: { select: { id: true, name: true } },
      updater: { select: { id: true, name: true } },
    },
  });

  await auditService.logAudit('remaining', remaining.id, 'UPDATE', oldValue, remaining, user.userId);

  return remaining;
}

async function remove(id, user) {
  const existing = await findById(id);

  requireBranchAccess(existing.branchId, user, 'inventory');

  if (!canEditOperationalRecord(existing.operationalDate, user.role)) {
    const error = new Error('Remaining records can only be deleted within the 3-day edit window');
    error.status = 403;
    throw error;
  }

  await requireDayNotClosed(existing.branchId, existing.operationalDate);

  await prisma.remainingRecord.delete({
    where: { id: parseInt(id) },
  });

  await auditService.logAudit('remaining', parseInt(id), 'DELETE', existing, null, user.userId);

  return { message: 'Remaining record deleted successfully' };
}

async function getDraftRemainings(branchId, operationalDate) {
  return prisma.remainingRecord.findMany({
    where: {
      branchId: parseInt(branchId),
      operationalDate: new Date(operationalDate),
      status: 'DRAFT',
    },
    include: {
      product: { select: { id: true, name: true, category: true } },
    },
  });
}

async function getPendingRemainings(branchId) {
  const { getAddisAbabaDate } = require('../utils/dateUtils');
  const addisNow = getAddisAbabaDate();
  const today = new Date(Date.UTC(addisNow.getFullYear(), addisNow.getMonth(), addisNow.getDate()));

  const activeProducts = await prisma.product.findMany({
    where: { isActive: true },
    select: { id: true },
  });

  const submittedProducts = await prisma.remainingRecord.findMany({
    where: {
      branchId: parseInt(branchId),
      operationalDate: today,
      status: 'FINAL',
    },
    select: { productId: true },
  });

  const submittedIds = new Set(submittedProducts.map(p => p.productId));
  const missingProducts = activeProducts.filter(p => !submittedIds.has(p.id));

  return missingProducts;
}

module.exports = {
  findAll,
  findById,
  findByOperationalDate,
  create,
  createBulk,
  update,
  remove,
  getDraftRemainings,
  getPendingRemainings,
};