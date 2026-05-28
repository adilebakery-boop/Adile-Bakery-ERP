// ACCOUNTING INVARIANTS
//
// A. Snapshot invariant
//    Closed-day accounting truth lives in DailySnapshot / DailySnapshotItem.
//    The DailyClosure record is the gate (isClosed flag); the DailySnapshot
//    holds the frozen operational numbers (production, remaining, waste,
//    estimatedSold, estimatedRevenue, snapshotPrice).
//
// B. Reopen invariant
//    reopenDay sets isClosed=false and marks the existing snapshot as
//    isInvalidated=true.  Accounting history is preserved — the invalidated
//    snapshot remains in the database and can be audited.  No data is deleted.
//
// C. Re-close invariant
//    After reopenDay, closeDay reuses the existing closure-linked snapshot
//    (found by closureId).  It deletes the old snapshot items, resets the
//    isInvalidated flag to false, and writes fresh snapshot items with
//    current operational data.  The snapshot lifecycle is: active → invalidated
//    → active (reused) for the same closure.
//
// D. Historical pricing invariant
//    Revenue must NEVER use Product.price for historical dates.  The chain is:
//    snapshotPrice (if reading a snapshot) → PriceHistory lookup → Product.price
//    fallback (only for dates without any PriceHistory entry).
//
// E. Snapshot pricing invariant
//    snapshotPrice stores the exact historical price used when the snapshot was
//    generated.  Reports reading from snapshot items must use snapshotPrice,
//    NOT re-look-up the price from PriceHistory.

const { Prisma } = require('@prisma/client');
const prisma = require('../config/prisma');
const inventoryFlowService = require('./inventoryFlowService');
const auditService = require('./auditService');
const { toDateString } = require('../utils/dateUtils');

const ZERO = new Prisma.Decimal('0');

async function getStatus(branchId, operationalDate) {
  const closure = await prisma.dailyClosure.findUnique({
    where: { branchId_operationalDate: { branchId: parseInt(branchId), operationalDate: new Date(operationalDate) } },
    include: {
      closedByUser: { select: { id: true, name: true, username: true } },
    },
  });

  return {
    branchId: parseInt(branchId),
    operationalDate: toDateString(new Date(operationalDate)),
    isClosed: closure?.isClosed || false,
    closureType: closure?.closureType || 'MANUAL',
    closedBy: closure?.closedByUser || null,
    closedAt: closure?.closedAt || null,
    note: closure?.note || null,
  };
}

async function validateBeforeClose(branchId, operationalDate) {
  const errors = [];
  const warnings = [];

  const opDate = new Date(operationalDate);
  const branchIdInt = parseInt(branchId);

  const activeProducts = await prisma.product.findMany({
    where: { isActive: true },
    select: { id: true, name: true },
  });

  const finalRemainings = await prisma.remainingRecord.findMany({
    where: { branchId: branchIdInt, operationalDate: opDate, status: 'FINAL' },
    select: { productId: true, quantity: true },
  });

  const submittedIds = new Set(finalRemainings.map(r => r.productId));
  const missingProducts = activeProducts.filter(p => !submittedIds.has(p.id));

  if (missingProducts.length > 0) {
    errors.push({
      type: 'MISSING_REMAINING',
      message: `Missing remaining records for products: ${missingProducts.map(p => p.name).join(', ')}`,
      productIds: missingProducts.map(p => p.id),
    });
  }

  const draftRemainings = await prisma.remainingRecord.findMany({
    where: { branchId: branchIdInt, operationalDate: opDate, status: 'DRAFT' },
    select: { productId: true },
  });

  if (draftRemainings.length > 0) {
    errors.push({
      type: 'DRAFT_REMAINING',
      message: `${draftRemainings.length} remaining records are still in DRAFT status`,
      productIds: draftRemainings.map(r => r.productId),
    });
  }

  const productions = await prisma.productionRecord.findMany({
    where: { branchId: branchIdInt, operationalDate: opDate },
    select: { id: true },
  });

  if (productions.length === 0) {
    warnings.push({
      type: 'NO_PRODUCTION',
      message: 'No production records found for this day',
    });
  }

  // OPTIMIZED: Use batch inventory pipeline instead of per-product DB calls.
  // OLD: Called validateInventoryFlow per product → 5 batch queries × N products
  // NEW: Single getInventoryFlowForAllProducts → 5 batch queries total, then in-memory validation
  const flows = await inventoryFlowService.getInventoryFlowForAllProducts(branchIdInt, operationalDate);

  // Build a product name lookup for error messages
  const productNames = {};
  for (const p of activeProducts) {
    productNames[p.id] = p.name;
  }

  // Validate each product's flow in memory (zero DB queries)
  for (const flow of flows) {
    if (flow.estimatedSold < 0) {
      errors.push({
        type: 'NEGATIVE_SOLD',
        message: `${productNames[flow.productId] || 'Unknown'}: Remaining exceeds production for this product`,
        severity: 'error',
        productId: flow.productId,
      });
    }

    if (flow.remainingStock > flow.sellableStock) {
      errors.push({
        type: 'REMAINDER_EXCEEDS_SELLABLE',
        message: `${productNames[flow.productId] || 'Unknown'}: Remaining stock exceeds sellable stock`,
        severity: 'error',
        productId: flow.productId,
      });
    }

    const wasteRatio = flow.sellableStock > 0 ? flow.wasteQuantity / flow.sellableStock : 0;
    if (wasteRatio > 0.2) {
      warnings.push({
        type: 'HIGH_WASTE',
        message: `${productNames[flow.productId] || 'Unknown'}: Waste rate is ${(wasteRatio * 100).toFixed(1)}%`,
        severity: 'warning',
        productId: flow.productId,
      });
    }

    if (flow.openingStock > 0 && flow.dayProduction === 0 && flow.remainingStock > flow.openingStock * 1.5) {
      warnings.push({
        type: 'LARGE_OPENING_NO_PRODUCTION',
        message: `${productNames[flow.productId] || 'Unknown'}: Large opening stock with no new production`,
        severity: 'warning',
        productId: flow.productId,
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    checks: {
      allProductsHaveFinalRemaining: missingProducts.length === 0,
      noDraftRemainings: draftRemainings.length === 0,
      hasProduction: productions.length > 0,
    },
  };
}

// closeDay — freezes operational data into a DailySnapshot.
// If the day was previously closed and reopened, the existing snapshot
// (found by closureId) is reused — items are replaced, not accumulated.
// snapshotPrice is set from inventoryFlowService (PriceHistory) at close time.
async function closeDay(branchId, operationalDate, userId, note = null) {
  const branchIdInt = parseInt(branchId);
  const opDate = new Date(operationalDate);

  const validation = await validateBeforeClose(branchIdInt, operationalDate);

  if (!validation.valid) {
    const error = new Error('Cannot close day. Validation failed.');
    error.status = 400;
    error.data = validation;
    throw error;
  }

  const result = await prisma.$transaction(async (tx) => {
    const existingClosure = await tx.dailyClosure.findUnique({
      where: { branchId_operationalDate: { branchId: branchIdInt, operationalDate: opDate } },
    });

    if (existingClosure?.isClosed) {
      const error = new Error('Day is already closed');
      error.status = 400;
      throw error;
    }

    const flows = await inventoryFlowService.getInventoryFlowForAllProducts(branchIdInt, operationalDate);

    let closure = existingClosure;
    
    if (!closure) {
      closure = await tx.dailyClosure.create({
        data: {
          branchId: branchIdInt,
          operationalDate: opDate,
          isClosed: true,
          closureType: 'MANUAL',
          closedBy: userId,
          closedAt: new Date(),
          note,
        },
      });
    } else {
      closure = await tx.dailyClosure.update({
        where: { id: existingClosure.id },
        data: {
          isClosed: true,
          closureType: 'MANUAL',
          closedBy: userId,
          closedAt: new Date(),
          note,
        },
      });
    }

    // Re-close path: if a snapshot already exists for this closure (e.g. after
    // reopenDay), reuse it — delete old items, reset invalidation flags, write
    // fresh items.  This preserves the invariant that each closure has exactly
    // one active snapshot (closureId is @unique).
    let snapshot = await tx.dailySnapshot.findFirst({
      where: { closureId: closure.id },
    });

    if (snapshot) {
      await tx.dailySnapshotItem.deleteMany({
        where: { snapshotId: snapshot.id },
      });
      snapshot = await tx.dailySnapshot.update({
        where: { id: snapshot.id },
        data: {
          isInvalidated: false,
          closedBy: userId,
          closedAt: new Date(),
          invalidatedAt: null,
          invalidatedBy: null,
        },
      });
    } else {
      snapshot = await tx.dailySnapshot.create({
        data: {
          closureId: closure.id,
          branchId: branchIdInt,
          operationalDate: opDate,
          closedBy: userId,
          closedAt: new Date(),
          isInvalidated: false,
        },
      });
    }

    const snapshotItems = flows.map(flow => ({
      snapshotId: snapshot.id,
      productId: flow.productId,
      openingStock: new Prisma.Decimal(String(flow.openingStock)),
      dayProduction: new Prisma.Decimal(String(flow.dayProduction)),
      nightProduction: new Prisma.Decimal(String(flow.nightProduction)),
      sellableStock: new Prisma.Decimal(String(flow.sellableStock)),
      remainingStock: new Prisma.Decimal(String(flow.remainingStock)),
      wasteQuantity: new Prisma.Decimal(String(flow.wasteQuantity)),
      estimatedSold: new Prisma.Decimal(String(flow.estimatedSold)),
      estimatedRevenue: new Prisma.Decimal(String(flow.estimatedRevenue)),
      snapshotPrice: new Prisma.Decimal(String(flow.price)),
    }));

    await tx.dailySnapshotItem.createMany({ data: snapshotItems });

    await tx.auditLog.create({
      data: {
        entityType: 'closure',
        entityId: closure.id,
        action: 'CLOSE',
        oldValue: null,
        newValue: JSON.parse(JSON.stringify({ branchId: branchIdInt, operationalDate: toDateString(opDate), note })),
        userId,
      },
    });

    return { closure, snapshot, itemCount: snapshotItems.length };
  });

  return result;
}

async function reopenDay(branchId, operationalDate, user, reason) {
  if (user.role !== 'ADMIN' && user.role !== 'MANAGER') {
    const error = new Error('Only ADMIN or MANAGER can reopen closed days');
    error.status = 403;
    throw error;
  }

  const branchIdInt = parseInt(branchId);
  const opDate = new Date(operationalDate);

  const result = await prisma.$transaction(async (tx) => {
    const closure = await tx.dailyClosure.findUnique({
      where: { branchId_operationalDate: { branchId: branchIdInt, operationalDate: opDate } },
    });

    if (!closure?.isClosed) {
      const error = new Error('Day is not closed');
      error.status = 400;
      throw error;
    }

    const reopenLog = await tx.reopenLog.create({
      data: {
        branchId: branchIdInt,
        operationalDate: opDate,
        reopenedBy: user?.userId || user?.id || 0,
        reason,
      },
    });

    const snapshot = await tx.dailySnapshot.findFirst({
      where: { branchId: branchIdInt, operationalDate: opDate, isInvalidated: false },
    });

    if (snapshot) {
      await tx.dailySnapshot.update({
        where: { id: snapshot.id },
        data: {
          isInvalidated: true,
          invalidatedAt: new Date(),
          invalidatedBy: user?.userId || user?.id || 0,
        },
      });
    }

    const updatedClosure = await tx.dailyClosure.update({
      where: { id: closure.id },
      data: {
        isClosed: false,
        closedBy: null,
        closedAt: null,
      },
    });

    await tx.auditLog.create({
      data: {
        entityType: 'closure',
        entityId: closure.id,
        action: 'REOPEN',
        oldValue: JSON.parse(JSON.stringify({ wasClosed: true })),
        newValue: JSON.parse(JSON.stringify({ reason, reopenedBy: user?.userId || user?.id || 0 })),
        userId: user?.userId || user?.id || 0,
      },
    });

    return { closure: updatedClosure, reopenLog };
  });

  return result;
}

module.exports = {
  getStatus,
  validateBeforeClose,
  closeDay,
  reopenDay,
};