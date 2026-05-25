const { Prisma } = require('@prisma/client');
const prisma = require('../config/prisma');
const inventoryFlowService = require('./inventoryFlowService');
const auditService = require('./auditService');
const { toDateString } = require('../utils/dateUtils');
const { validateQuantityForUnitType } = require('../utils/unitTypeValidation');

const ZERO = new Prisma.Decimal('0');

function toDecimal(value) {
  if (value instanceof Prisma.Decimal) return value;
  if (value === null || value === undefined) return ZERO;
  return new Prisma.Decimal(String(value));
}

async function findAll(filters = {}) {
  const { branchId, operationalDate, status, startDate, endDate, categories } = filters;
  const where = {};

  if (branchId) where.branchId = parseInt(branchId);
  if (status) where.status = status;

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

  const remainings = await prisma.remainingRecord.findMany({
    where,
    include: {
      product: { select: { id: true, name: true, category: true, unitType: true, price: true } },
      branch: { select: { id: true, name: true } },
      creator: { select: { id: true, name: true, username: true } },
    },
    orderBy: { operationalDate: 'desc' },
  });

  return remainings;
}

async function findById(id) {
  const remaining = await prisma.remainingRecord.findUnique({
    where: { id: parseInt(id) },
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

  requireBranchAccess(branchId, user);

  // Validate quantity is positive
  if (quantity === undefined || quantity === null || Number(quantity) < 0) {
    throw new Error('Quantity must be a non-negative number');
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

  const unitValidation = validateQuantityForUnitType(quantity, product.unitType);
  if (!unitValidation.valid) {
    const error = new Error(unitValidation.message);
    error.status = 400;
    throw error;
  }

  const opDate = operationalDate ? new Date(operationalDate) : new Date();

  await inventoryFlowService.assertDayOpen(parseInt(branchId), opDate);

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
        quantity: new Prisma.Decimal(String(quantity)),
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
        quantity: new Prisma.Decimal(String(quantity)),
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

  requireBranchAccess(branchId, user);

  await inventoryFlowService.assertDayOpen(parseInt(branchId), opDate);

  try {
    const result = await prisma.$transaction(async (tx) => {
    // Re-check day open inside transaction boundary to close race window.
    // The outer assertDayOpen guards against closed days without starting a
    // transaction, but the day could close between check and transaction start.
    // This inner check ensures atomicity.
    const closure = await tx.dailyClosure.findUnique({
      where: { branchId_operationalDate: { branchId: parseInt(branchId), operationalDate: opDate } },
    });
    if (closure?.isClosed) {
      const err = new Error('Operational day is closed. Reopen required to make changes.');
      err.status = 403;
      throw err;
    }

    const results = [];
    const auditLogs = [];

    for (const item of items) {
      const product = await tx.product.findFirst({
        where: {
          id: parseInt(item.productId),
          isActive: true,
        },
      });

      if (!product) {
        const existingProduct = await tx.product.findUnique({
          where: { id: parseInt(item.productId) },
          select: { isActive: true },
        });

        if (existingProduct && !existingProduct.isActive) {
          const err = new Error(`Cannot save remaining for inactive product: ${existingProduct.id}`);
          err.status = 400;
          throw err;
        }

        const err = new Error(`Product ${item.productId} not found`);
        err.status = 404;
        throw err;
      }

      const bulkUnitValidation = validateQuantityForUnitType(item.remainingQuantity, product.unitType);
      if (!bulkUnitValidation.valid) {
        const err = new Error(`Product "${product.name}": ${bulkUnitValidation.message}`);
        err.status = 400;
        throw err;
      }

      const existing = await tx.remainingRecord.findFirst({
        where: {
          branchId: parseInt(branchId),
          operationalDate: opDate,
          productId: parseInt(item.productId),
        },
      });

      let remaining;

      if (existing) {
        const oldValue = { ...existing };
        remaining = await tx.remainingRecord.update({
          where: { id: existing.id },
          data: {
            quantity: new Prisma.Decimal(String(item.remainingQuantity ?? 0)),
            status: item.status || 'FINAL',
            updatedBy: user.userId,
          },
          include: {
            product: { select: { id: true, name: true, category: true } },
            branch: { select: { id: true, name: true } },
          },
        });

        auditLogs.push({
          entityType: 'remaining',
          entityId: remaining.id,
          action: 'UPDATE',
          oldValue: JSON.parse(JSON.stringify(oldValue)),
          newValue: JSON.parse(JSON.stringify(remaining)),
          userId: user.userId,
        });
      } else {
        remaining = await tx.remainingRecord.create({
          data: {
            productId: parseInt(item.productId),
            branchId: parseInt(branchId),
            operationalDate: opDate,
            quantity: new Prisma.Decimal(String(item.remainingQuantity ?? 0)),
            status: item.status || 'FINAL',
            createdBy: user.userId,
          },
          include: {
            product: { select: { id: true, name: true, category: true } },
            branch: { select: { id: true, name: true } },
          },
        });

        auditLogs.push({
          entityType: 'remaining',
          entityId: remaining.id,
          action: 'CREATE',
          oldValue: null,
          newValue: JSON.parse(JSON.stringify(remaining)),
          userId: user.userId,
        });
      }

      results.push(remaining);
    }

    await tx.auditLog.createMany({ data: auditLogs });

    return results;
  });

    return result;
  } catch (err) {
    throw err;
  }
}

async function update(id, data, user) {
  const existing = await findById(id);

  requireBranchAccess(existing.branchId, user);

  await inventoryFlowService.assertDayOpen(existing.branchId, existing.operationalDate);

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
    updateData.quantity = new Prisma.Decimal(String(data.quantity));
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
  if (user.role !== 'ADMIN' && user.role !== 'MANAGER') {
    const error = new Error('Only ADMIN or MANAGER can delete remaining records');
    error.status = 403;
    throw error;
  }

  const existing = await findById(id);

  requireBranchAccess(existing.branchId, user);

  await inventoryFlowService.assertDayOpen(existing.branchId, existing.operationalDate);

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
  const today = new Date();
  today.setHours(0, 0, 0, 0);

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

function requireBranchAccess(branchId, user) {
  if (!user?.role) return;

  const privilegedRoles = ['ADMIN', 'MANAGER'];

  if (privilegedRoles.includes(user.role)) {
    return;
  }

  if (Number(branchId) !== Number(user.branchId)) {
    const err = new Error('You can only modify inventory for your assigned branch');
    err.status = 403;
    throw err;
  }
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