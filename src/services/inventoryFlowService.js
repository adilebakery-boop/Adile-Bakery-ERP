const { Prisma } = require('@prisma/client');
const prisma = require('../config/prisma');
const { calculateOperationalDate, addOneDay, getPreviousDay, toDateString } = require('../utils/dateUtils');
const { logAudit } = require('./auditService');

const ZERO = new Prisma.Decimal('0');

// ============================================================
// UTILITY FUNCTIONS (unchanged — used for backward compatibility
// and single-value lookups outside the batch pipeline)
// ============================================================

function toDecimal(value) {
  if (value instanceof Prisma.Decimal) return value;
  if (value === null || value === undefined) return ZERO;
  return new Prisma.Decimal(String(value));
}

function safePlus(a, b) {
  return toDecimal(a).plus(toDecimal(b));
}

function safeMinus(a, b) {
  return toDecimal(a).minus(toDecimal(b));
}

function safeMultiply(a, b) {
  return toDecimal(a).times(toDecimal(b));
}

function safeDivide(a, b) {
  const divisor = toDecimal(b);
  if (divisor.eq(ZERO)) return ZERO;
  return toDecimal(a).dividedBy(divisor);
}

function decimalToNumber(d) {
  if (d instanceof Prisma.Decimal) return d.toNumber();
  return Number(d) || 0;
}

function toDecimalRaw(value) {
  if (value instanceof Prisma.Decimal) return value;
  if (value === null || value === undefined) return ZERO;
  return new Prisma.Decimal(String(value));
}

function getPrismaDecimalOps() {
  return { zero: ZERO, toDecimal: toDecimalRaw, plus: safePlus, minus: safeMinus };
}

// ============================================================
// BACKWARD-COMPATIBLE SINGLE-PRODUCT FUNCTIONS
// These still work for callers that need one product's data.
// They are NOT used by the batch pipeline — they exist only
// for backward compatibility and the verifyCalculations utility.
// ============================================================

async function getOpeningStock(branchId, operationalDate, productId) {
  const prevDay = getPreviousDay(new Date(operationalDate));
  const prevRemaining = await prisma.remainingRecord.findFirst({
    where: {
      branchId: parseInt(branchId),
      productId: parseInt(productId),
      operationalDate: prevDay,
      status: 'FINAL',
    },
  });
  return prevRemaining ? toDecimal(prevRemaining.quantity) : ZERO;
}

async function getDayProduction(branchId, operationalDate, productId) {
  const result = await prisma.productionRecord.aggregate({
    where: { branchId: parseInt(branchId), operationalDate: new Date(operationalDate), shift: 'DAY', productId: parseInt(productId) },
    _sum: { quantity: true },
  });
  return result._sum.quantity ? toDecimal(result._sum.quantity) : ZERO;
}

async function getNightProduction(branchId, operationalDate, productId) {
  const result = await prisma.productionRecord.aggregate({
    where: { branchId: parseInt(branchId), operationalDate: new Date(operationalDate), shift: 'NIGHT', productId: parseInt(productId) },
    _sum: { quantity: true },
  });
  return result._sum.quantity ? toDecimal(result._sum.quantity) : ZERO;
}

async function getSellableStock(branchId, operationalDate, productId) {
  const opening = await getOpeningStock(branchId, operationalDate, productId);
  const dayProd = await getDayProduction(branchId, operationalDate, productId);
  const nightProd = await getNightProduction(branchId, operationalDate, productId);
  return safePlus(safePlus(opening, dayProd), nightProd);
}

async function getRemainingStock(branchId, operationalDate, productId) {
  const result = await prisma.remainingRecord.findFirst({
    where: { branchId: parseInt(branchId), operationalDate: new Date(operationalDate), productId: parseInt(productId), status: 'FINAL' },
    select: { quantity: true },
  });
  return result?.quantity ? toDecimal(result.quantity) : ZERO;
}

async function getWasteQuantity(branchId, operationalDate, productId) {
  const result = await prisma.wasteRecord.aggregate({
    where: { branchId: parseInt(branchId), operationalDate: new Date(operationalDate), productId: parseInt(productId) },
    _sum: { quantity: true },
  });
  return result._sum.quantity ? toDecimal(result._sum.quantity) : ZERO;
}

async function getEstimatedSold(branchId, operationalDate, productId) {
  const sellable = await getSellableStock(branchId, operationalDate, productId);
  const remaining = await getRemainingStock(branchId, operationalDate, productId);
  const waste = await getWasteQuantity(branchId, operationalDate, productId);
  const sold = safeMinus(safeMinus(sellable, remaining), waste);
  return sold.lt(ZERO) ? ZERO : sold;
}

async function getEstimatedRevenue(branchId, operationalDate, productId) {
  const sold = await getEstimatedSold(branchId, operationalDate, productId);
  const product = await prisma.product.findUnique({
    where: { id: parseInt(productId) },
    select: { price: true },
  });
  const price = product?.price ? toDecimal(product.price) : ZERO;
  return safeMultiply(sold, price);
}

// ============================================================
// NEW BATCH AGGREGATION PIPELINE
//
// This replaces the per-product query explosion. Instead of
// firing ~17 queries per product, we fire 4 batch queries
// total and compute everything in memory.
//
// Flow:
//   1. buildInventoryMap() — fetches all raw data in 4 queries
//   2. computeFlowFromMap() — pure function, computes derived values
//   3. getInventoryFlowForAllProducts() — orchestrates 1+2
// ============================================================

/**
 * STEP 1 — Fetch all raw inventory data ONCE for a branch/date.
 *
 * Returns a map keyed by productId with all raw values:
 * {
 *   [productId]: {
 *     product: { id, name, category, price, unitType },
 *     openingStock: Decimal,
 *     dayProduction: Decimal,
 *     nightProduction: Decimal,
 *     remaining: Decimal,
 *     waste: Decimal,
 *   }
 * }
 *
 * Query count: 4 (regardless of product count)
 *   1. Active products list
 *   2. Previous day remainings (opening stock) — grouped by productId
 *   3. Productions — grouped by productId + shift
 *   4. Current day remainings — grouped by productId
 *   5. Wastes — grouped by productId
 */
async function buildInventoryMap(branchId, operationalDate) {
  const branchIdInt = parseInt(branchId);
  const opDate = new Date(operationalDate);
  const prevDay = getPreviousDay(opDate);

  // Query 1: Fetch all active products with pricing info
  const products = await prisma.product.findMany({
    where: { isActive: true },
    select: { id: true, name: true, category: true, price: true, unitType: true },
    orderBy: { category: 'asc' },
  });

  // Initialize the map with all products (zero defaults)
  const map = {};
  for (const p of products) {
    map[p.id] = {
      product: p,
      openingStock: ZERO,
      dayProduction: ZERO,
      nightProduction: ZERO,
      remaining: ZERO,
      waste: ZERO,
    };
  }

  // Query 2: Previous day's FINAL remainings (opening stock)
  // Uses groupBy to get one row per productId instead of per-product queries
  const openingData = await prisma.remainingRecord.groupBy({
    by: ['productId'],
    where: {
      branchId: branchIdInt,
      operationalDate: prevDay,
      status: 'FINAL',
    },
    _sum: { quantity: true },
  });
  for (const row of openingData) {
    if (map[row.productId]) {
      map[row.productId].openingStock = toDecimal(row._sum.quantity);
    }
  }

  // Query 3: Productions grouped by productId + shift
  // Two groupBy calls (DAY and NIGHT) instead of per-product aggregate calls
  const [dayProdData, nightProdData] = await Promise.all([
    prisma.productionRecord.groupBy({
      by: ['productId'],
      where: { branchId: branchIdInt, operationalDate: opDate, shift: 'DAY' },
      _sum: { quantity: true },
    }),
    prisma.productionRecord.groupBy({
      by: ['productId'],
      where: { branchId: branchIdInt, operationalDate: opDate, shift: 'NIGHT' },
      _sum: { quantity: true },
    }),
  ]);
  for (const row of dayProdData) {
    if (map[row.productId]) {
      map[row.productId].dayProduction = toDecimal(row._sum.quantity);
    }
  }
  for (const row of nightProdData) {
    if (map[row.productId]) {
      map[row.productId].nightProduction = toDecimal(row._sum.quantity);
    }
  }

  // Query 4: Current day's FINAL remainings
  const remainingData = await prisma.remainingRecord.groupBy({
    by: ['productId'],
    where: {
      branchId: branchIdInt,
      operationalDate: opDate,
      status: 'FINAL',
    },
    _sum: { quantity: true },
  });
  for (const row of remainingData) {
    if (map[row.productId]) {
      map[row.productId].remaining = toDecimal(row._sum.quantity);
    }
  }

  // Query 5: Wastes grouped by productId
  const wasteData = await prisma.wasteRecord.groupBy({
    by: ['productId'],
    where: { branchId: branchIdInt, operationalDate: opDate },
    _sum: { quantity: true },
  });
  for (const row of wasteData) {
    if (map[row.productId]) {
      map[row.productId].waste = toDecimal(row._sum.quantity);
    }
  }

  return map;
}

/**
 * STEP 2 — Pure function: compute all derived inventory values
 * from a pre-built inventory map entry.
 *
 * NO database queries. All calculations are in-memory.
 *
 * Business rules preserved exactly:
 *   sellableStock = openingStock + dayProduction + nightProduction
 *   estimatedSold = max(0, sellableStock - remaining - waste)
 *   estimatedRevenue = estimatedSold * unitPrice
 */
function computeFlowFromMap(entry, operationalDate) {
  const { product, openingStock, dayProduction, nightProduction, remaining, waste } = entry;

  // sellableStock = opening + day prod + night prod
  const sellableStock = safePlus(safePlus(openingStock, dayProduction), nightProduction);

  // estimatedSold = sellable - remaining - waste (floor at 0)
  const estimatedSoldRaw = safeMinus(safeMinus(sellableStock, remaining), waste);
  const estimatedSold = estimatedSoldRaw.lt(ZERO) ? ZERO : estimatedSoldRaw;

  // estimatedRevenue = estimatedSold * price
  const price = product.price ? toDecimal(product.price) : ZERO;
  const estimatedRevenue = safeMultiply(estimatedSold, price);

  return {
    productId: product.id,
    productName: product.name,
    category: product.category,
    unitType: product.unitType,
    price: decimalToNumber(product.price),
    openingStock: decimalToNumber(openingStock),
    dayProduction: decimalToNumber(dayProduction),
    nightProduction: decimalToNumber(nightProduction),
    nightProductionPreparedFor: 0,
    sellableStock: decimalToNumber(sellableStock),
    remainingStock: decimalToNumber(remaining),
    wasteQuantity: decimalToNumber(waste),
    estimatedSold: decimalToNumber(estimatedSold),
    estimatedRevenue: decimalToNumber(estimatedRevenue),
    operationalDate: toDateString(new Date(operationalDate)),
  };
}

/**
 * STEP 3 — Orchestrator: build map + compute flows for all products.
 *
 * This replaces the old loop that called getFullInventoryFlow per product.
 *
 * OLD: 1 query for products + (17 × N) queries for N products = ~850 queries for 50 products
 * NEW: 5 batch queries total (regardless of product count)
 */
async function getInventoryFlowForAllProducts(branchId, operationalDate) {
  // Step 1: Fetch all raw data in 5 batch queries
  const inventoryMap = await buildInventoryMap(branchId, operationalDate);

  // Step 2: Compute all flows in memory (zero DB queries)
  const flows = Object.values(inventoryMap).map(entry =>
    computeFlowFromMap(entry, operationalDate)
  );
  return flows;
}

/**
 * Single-product inventory flow — used by validateInventoryFlow
 * and backward-compatible callers.
 *
 * Uses the batch pipeline internally so even single-product lookups
 * benefit from grouped queries. The map is built for all products
 * but only the requested one is returned.
 *
 * For callers that need many products one-by-one (like closure validation),
 * they should use getInventoryFlowForAllProducts instead.
 */
async function getFullInventoryFlow(branchId, operationalDate, productId) {
  // Use the batch pipeline — even for a single product this is faster
  // than the old 17-query approach because groupBy is more efficient
  // than 17 individual queries.
  const inventoryMap = await buildInventoryMap(branchId, operationalDate);

  const entry = inventoryMap[parseInt(productId)];
  if (!entry) {
    const error = new Error('Product not found');
    error.status = 404;
    throw error;
  }

  const flow = computeFlowFromMap(entry, operationalDate);
  return flow;
}

// ============================================================
// TOTALS (unchanged — operates on flow arrays)
// ============================================================

function getTotals(flows) {
  const totals = flows.reduce(
    (acc, flow) => {
      return {
        totalOpeningStock: safePlus(acc.totalOpeningStock, toDecimal(flow.openingStock)),
        totalDayProduction: safePlus(acc.totalDayProduction, toDecimal(flow.dayProduction)),
        totalNightProduction: safePlus(acc.totalNightProduction, toDecimal(flow.nightProduction)),
        totalNightProductionPreparedFor: safePlus(acc.totalNightProductionPreparedFor, toDecimal(flow.nightProductionPreparedFor)),
        totalSellableStock: safePlus(acc.totalSellableStock, toDecimal(flow.sellableStock)),
        totalRemainingStock: safePlus(acc.totalRemainingStock, toDecimal(flow.remainingStock)),
        totalWasteQuantity: safePlus(acc.totalWasteQuantity, toDecimal(flow.wasteQuantity)),
        totalEstimatedSold: safePlus(acc.totalEstimatedSold, toDecimal(flow.estimatedSold)),
        totalEstimatedRevenue: safePlus(acc.totalEstimatedRevenue, toDecimal(flow.estimatedRevenue)),
      };
    },
    {
      totalOpeningStock: ZERO,
      totalDayProduction: ZERO,
      totalNightProduction: ZERO,
      totalNightProductionPreparedFor: ZERO,
      totalSellableStock: ZERO,
      totalRemainingStock: ZERO,
      totalWasteQuantity: ZERO,
      totalEstimatedSold: ZERO,
      totalEstimatedRevenue: ZERO,
    }
  );

  return {
    totalOpeningStock: decimalToNumber(totals.totalOpeningStock),
    totalDayProduction: decimalToNumber(totals.totalDayProduction),
    totalNightProduction: decimalToNumber(totals.totalNightProduction),
    totalNightProductionPreparedFor: decimalToNumber(totals.totalNightProductionPreparedFor),
    totalSellableStock: decimalToNumber(totals.totalSellableStock),
    totalRemainingStock: decimalToNumber(totals.totalRemainingStock),
    totalWasteQuantity: decimalToNumber(totals.totalWasteQuantity),
    totalEstimatedSold: decimalToNumber(totals.totalEstimatedSold),
    totalEstimatedRevenue: decimalToNumber(totals.totalEstimatedRevenue),
  };
}

// ============================================================
// REPORT (unchanged logic — uses refactored getInventoryFlowForAllProducts)
// ============================================================

async function getInventoryFlowReport(branchId, operationalDate) {
  const closure = await prisma.dailyClosure.findUnique({
    where: { branchId_operationalDate: { branchId: parseInt(branchId), operationalDate: new Date(operationalDate) } },
  });

  if (closure?.isClosed) {
    const snapshot = await prisma.dailySnapshot.findFirst({
      where: { branchId: parseInt(branchId), operationalDate: new Date(operationalDate), isInvalidated: false },
      include: {
        items: { include: { product: { select: { id: true, name: true, category: true, price: true, unitType: true } } } },
        branch: { select: { id: true, name: true } },
      },
    });

    if (snapshot) {
      return {
        source: 'snapshot',
        snapshotId: snapshot.id,
        closedBy: snapshot.closedBy,
        closedAt: snapshot.closedAt,
        branchId: snapshot.branchId,
        branchName: snapshot.branch.name,
        operationalDate: toDateString(new Date(operationalDate)),
        isClosed: true,
        products: snapshot.items.map(item => ({
          productId: item.productId,
          productName: item.product.name,
          category: item.product.category,
          unitType: item.product.unitType,
          price: decimalToNumber(item.product.price),
          openingStock: decimalToNumber(item.openingStock),
          dayProduction: decimalToNumber(item.dayProduction),
          nightProduction: decimalToNumber(item.nightProduction),
          nightProductionPreparedFor: 0,
          sellableStock: decimalToNumber(item.sellableStock),
          remainingStock: decimalToNumber(item.remainingStock),
          wasteQuantity: decimalToNumber(item.wasteQuantity),
          estimatedSold: decimalToNumber(item.estimatedSold),
          estimatedRevenue: decimalToNumber(item.estimatedRevenue),
        })),
        totals: getTotals(snapshot.items.map(item => ({
          openingStock: item.openingStock,
          dayProduction: item.dayProduction,
          nightProduction: item.nightProduction,
          nightProductionPreparedFor: 0,
          sellableStock: item.sellableStock,
          remainingStock: item.remainingStock,
          wasteQuantity: item.wasteQuantity,
          estimatedSold: item.estimatedSold,
          estimatedRevenue: item.estimatedRevenue,
        }))),
      };
    }
  }

  const flows = await getInventoryFlowForAllProducts(branchId, operationalDate);
  const branch = await prisma.branch.findUnique({ where: { id: parseInt(branchId) }, select: { id: true, name: true } });

  return {
    source: 'live',
    branchId: parseInt(branchId),
    branchName: branch?.name || '',
    operationalDate: toDateString(new Date(operationalDate)),
    isClosed: closure?.isClosed || false,
    products: flows,
    totals: getTotals(flows),
  };
}

// ============================================================
// VALIDATION (unchanged logic — uses refactored getFullInventoryFlow)
// ============================================================

async function validateInventoryFlow(branchId, operationalDate, productId) {
  const flow = await getFullInventoryFlow(branchId, operationalDate, productId);
  const warnings = [];

  if (flow.estimatedSold < 0) {
    warnings.push({ type: 'NEGATIVE_SOLD', message: 'Remaining exceeds production for this product', severity: 'error' });
  }

  if (flow.remainingStock > flow.sellableStock) {
    warnings.push({ type: 'REMAINDER_EXCEEDS_SELLABLE', message: 'Remaining stock exceeds sellable stock', severity: 'error' });
  }

  const wasteRatio = flow.sellableStock > 0 ? flow.wasteQuantity / flow.sellableStock : 0;
  if (wasteRatio > 0.2) {
    warnings.push({ type: 'HIGH_WASTE', message: `Waste rate is ${(wasteRatio * 100).toFixed(1)}%`, severity: 'warning' });
  }

  if (flow.openingStock > 0 && flow.dayProduction === 0 && flow.remainingStock > flow.openingStock * 1.5) {
    warnings.push({ type: 'LARGE_OPENING_NO_PRODUCTION', message: 'Large opening stock with no new production', severity: 'warning' });
  }

  return { flow, warnings };
}

// ============================================================
// DAY OPEN ASSERTION (unchanged)
// ============================================================

async function assertDayOpen(branchId, operationalDate) {
  const closure = await prisma.dailyClosure.findUnique({
    where: { branchId_operationalDate: { branchId: parseInt(branchId), operationalDate: new Date(operationalDate) } },
  });

  if (closure?.isClosed) {
    const error = new Error('Operational day is closed. Reopen required to make changes.');
    error.status = 403;
    throw error;
  }
}

// ============================================================
// EXPORTS
// All original exports preserved for backward compatibility.
// New exports: buildInventoryMap, computeFlowFromMap
// ============================================================

module.exports = {
  calculateOperationalDate,
  assertDayOpen,
  getOpeningStock,
  getDayProduction,
  getNightProduction,
  getSellableStock,
  getRemainingStock,
  getWasteQuantity,
  getEstimatedSold,
  getEstimatedRevenue,
  getFullInventoryFlow,
  getInventoryFlowForAllProducts,
  getTotals,
  getInventoryFlowReport,
  validateInventoryFlow,
  toDecimal,
  safePlus,
  safeMinus,
  safeMultiply,
  safeDivide,
  decimalToNumber,
  // New batch pipeline exports (for advanced callers)
  buildInventoryMap,
  computeFlowFromMap,
};
