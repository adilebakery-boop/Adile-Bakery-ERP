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

const prisma = require('../config/prisma');
const inventoryFlowService = require('./inventoryFlowService');
const auditService = require('./auditService');
const { toDateString } = require('../utils/dateUtils');
const { ZERO, toDecimal } = require('../utils/decimalUtils');
const { requireBranchAccess } = require('../utils/accessFilters');

async function getStatus(branchId, operationalDate) {
  const branchIdInt = parseInt(branchId);
  const opDate = new Date(operationalDate);

  const closure = await prisma.dailyClosure.findUnique({
    where: { branchId_operationalDate: { branchId: branchIdInt, operationalDate: opDate } },
    include: {
      closedByUser: { select: { id: true, name: true, username: true } },
    },
  });

  const isClosed = closure?.isClosed || false;

  // Determine status: a day is REOPENED if isClosed is false but there exists
  // an invalidated (previously-active) snapshot for this branch+date.
  let status = 'OPEN';
  if (isClosed) {
    status = 'CLOSED';
  } else {
    const hasInvalidatedSnapshot = await prisma.dailySnapshot.findFirst({
      where: { branchId: branchIdInt, operationalDate: opDate, isInvalidated: true },
      select: { id: true },
    });
    if (hasInvalidatedSnapshot) {
      status = 'REOPENED';
    }
  }

  return {
    branchId: branchIdInt,
    operationalDate: toDateString(opDate),
    status,
    isClosed,
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

  // OPTIMIZED: Single batch inventory pipeline call — used for both
  // missing-product classification and per-product flow validation.
  const flows = await inventoryFlowService.getInventoryFlowForAllProducts(branchIdInt, operationalDate);

  // Build product name lookup for error messages
  const productNames = {};
  for (const p of activeProducts) {
    productNames[p.id] = p.name;
  }

  // Build flow lookup map
  const flowMap = {};
  for (const f of flows) { flowMap[f.productId] = f; }

  // Split missing products into:
  //   blocking  — product had activity, requires manual remaining entry
  //   autoFinal — product had zero activity, safe to auto-finalize as 0
  const blockingMissingProducts = [];
  const autoFinalizeProducts = [];

  for (const product of missingProducts) {
    const flow = flowMap[product.id];
    const hasActivity = flow && (
      flow.openingStock > 0 ||
      flow.dayProduction > 0 ||
      flow.nightProduction > 0 ||
      flow.wasteQuantity > 0
    );
    if (hasActivity) {
      blockingMissingProducts.push(product);
    } else {
      autoFinalizeProducts.push(product);
    }
  }

  if (blockingMissingProducts.length > 0) {
    errors.push({
      type: 'MISSING_REMAINING',
      message: `Missing remaining records for ${blockingMissingProducts.length} products with activity`,
      productIds: blockingMissingProducts.map(p => p.id),
      productNames: blockingMissingProducts.map(p => p.name),
    });
  }

  if (autoFinalizeProducts.length > 0) {
    warnings.push({
      type: 'AUTO_ZERO_REMAINING',
      message: `${autoFinalizeProducts.length} products had no activity. Remaining will be set to 0.`,
      productIds: autoFinalizeProducts.map(p => p.id),
      productNames: autoFinalizeProducts.map(p => p.name),
      count: autoFinalizeProducts.length,
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

  // Validate each product's flow in memory (zero DB queries — reuses flows from above)
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
    autoFinalizeProductIds: autoFinalizeProducts.map(p => p.id),
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
// closureType param: 'MANUAL' (default) runs full validation; 'AUTO_FINALIZE'
// skips validation for scheduler-driven auto-close (forgotten or expired days).
async function closeDay(branchId, operationalDate, userId, note = null, user = null, closureType = 'MANUAL') {
  const branchIdInt = parseInt(branchId);
  const opDate = new Date(operationalDate);

  if (user) {
    requireBranchAccess(branchIdInt, user, 'closure');
  }

  await inventoryFlowService.resolveRollover(branchIdInt, operationalDate);

  if (closureType !== 'AUTO_FINALIZE') {
    const validation = await validateBeforeClose(branchIdInt, operationalDate);

    if (!validation.valid) {
      const error = new Error('Cannot close day. Validation failed.');
      error.status = 400;
      error.data = validation;
      throw error;
    }

    // Auto-create zero-quantity FINAL remaining records for products that had
    // no activity (sellableStock = 0).  These products do not need manual entry
    // because remaining = 0 is mathematically certain.
    if (validation.autoFinalizeProductIds?.length > 0) {
      const now = new Date();
      const records = validation.autoFinalizeProductIds.map(productId => ({
        productId,
        branchId: branchIdInt,
        operationalDate: opDate,
        quantity: 0,
        status: 'FINAL',
        createdBy: userId,
        createdAt: now,
        updatedAt: now,
      }));
      await prisma.remainingRecord.createMany({ data: records });
    }
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
          closureType,
          closedBy: userId,
          closedAt: new Date(),
          note,
          reopenedAt: null,
          autoCloseAt: null,
        },
      });
    } else {
      closure = await tx.dailyClosure.update({
        where: { id: existingClosure.id },
        data: {
          isClosed: true,
          closureType,
          closedBy: userId,
          closedAt: new Date(),
          note,
          reopenedAt: null,
          autoCloseAt: null,
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
      openingStock: toDecimal(String(flow.openingStock)),
      dayProduction: toDecimal(String(flow.dayProduction)),
      nightProduction: toDecimal(String(flow.nightProduction)),
      sellableStock: toDecimal(String(flow.sellableStock)),
      remainingStock: toDecimal(String(flow.remainingStock)),
      wasteQuantity: toDecimal(String(flow.wasteQuantity)),
      estimatedSold: toDecimal(String(flow.estimatedSold)),
      estimatedRevenue: toDecimal(String(flow.estimatedRevenue)),
      snapshotPrice: toDecimal(String(flow.price)),
    }));

    await tx.dailySnapshotItem.createMany({ data: snapshotItems });

    await tx.auditLog.create({
      data: {
        entityType: 'closure',
        entityId: closure.id,
        action: 'CLOSE',
        oldValue: null,
        newValue: JSON.parse(JSON.stringify({ branchId: branchIdInt, operationalDate: toDateString(opDate), closureType, note })),
        userId,
      },
    });

    return { closure, snapshot, itemCount: snapshotItems.length };
  });

  return result;
}

async function reopenDay(branchId, operationalDate, user, reason) {
  requireBranchAccess(branchId, user, 'closure');

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

    const now = new Date();
    const autoCloseAt = new Date(now.getTime() + 3 * 60 * 60 * 1000);

    const updatedClosure = await tx.dailyClosure.update({
      where: { id: closure.id },
      data: {
        isClosed: false,
        closedBy: null,
        closedAt: null,
        reopenedAt: now,
        autoCloseAt,
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

async function requireDayNotClosed(branchId, operationalDate) {
  const opDate = operationalDate instanceof Date ? operationalDate : new Date(operationalDate);
  const closure = await prisma.dailyClosure.findUnique({
    where: {
      branchId_operationalDate: { branchId: parseInt(branchId), operationalDate: opDate },
    },
    select: { isClosed: true },
  });
  if (closure?.isClosed) {
    const error = new Error('This operational day is closed. Reopen the day before making changes.');
    error.status = 403;
    throw error;
  }
}

async function getClosureMap(pairs) {
  const seen = new Set();
  const uniquePairs = [];
  for (const p of pairs) {
    const dateStr = toDateString(p.operationalDate);
    const key = `${p.branchId}|${dateStr}`;
    if (!seen.has(key)) {
      seen.add(key);
      uniquePairs.push({ branchId: parseInt(p.branchId), operationalDate: new Date(p.operationalDate), _key: key });
    }
  }

  if (uniquePairs.length === 0) return {};

  const closures = await prisma.dailyClosure.findMany({
    where: {
      OR: uniquePairs.map(p => ({
        branchId: p.branchId,
        operationalDate: p.operationalDate,
      })),
    },
    select: { branchId: true, operationalDate: true, isClosed: true },
  });

  const map = {};
  for (const c of closures) {
    const dateStr = toDateString(c.operationalDate);
    map[`${c.branchId}|${dateStr}`] = c.isClosed;
  }

  for (const p of uniquePairs) {
    if (!(p._key in map)) {
      map[p._key] = false;
    }
  }

  return map;
}

module.exports = {
  getStatus,
  validateBeforeClose,
  closeDay,
  reopenDay,
  requireDayNotClosed,
  getClosureMap,
};