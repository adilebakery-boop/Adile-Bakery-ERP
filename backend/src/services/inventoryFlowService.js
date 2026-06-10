const { Prisma } = require('@prisma/client');
const prisma = require('../config/prisma');
const { calculateOperationalDate, addOneDay, getPreviousDay, toDateString } = require('../utils/dateUtils');
const { logAudit } = require('./auditService');
const { ZERO, toDecimal } = require('../utils/decimalUtils');

const ROLLOVER_TTL = 86_400_000;

async function isRolloverRecentlyProcessed(branchId, dateKey) {
  const key = `${branchId}-${dateKey}`;
  const entry = await prisma.rolloverCache.findUnique({ where: { key } });
  if (entry && Date.now() - entry.processedAt.getTime() < ROLLOVER_TTL) {
    return true;
  }
  await prisma.rolloverCache.upsert({
    where: { key },
    create: { key, processedAt: new Date() },
    update: { processedAt: new Date() },
  });
  return false;
}

// TEMPORARY protection against unrealistic seed-data overflow.
// Real bakery operational revenue is expected to remain safely
// within DECIMAL(12,2) schema limits.  The seed/test data uses
// intentionally inflated prices/quantities (e.g. 300 -> 300000)
// to stress-test calculations, and their product can exceed the
// column precision.  In production this will never trigger.
// Remove this clamp once seed data uses realistic values, or
// if the schema precision is increased in the future.
const DECIMAL_12_2_MAX = new Prisma.Decimal('9999999999.99');
function clampDecimal12_2(value) {
  if (value.gt(DECIMAL_12_2_MAX)) return DECIMAL_12_2_MAX;
  if (value.lt(DECIMAL_12_2_MAX.negated())) return DECIMAL_12_2_MAX.negated();
  return value;
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

async function resolveRollover(branchId, operationalDate) {
  const currentDate = new Date(operationalDate);
  const currentStr = toDateString(currentDate);

  await prisma.rolloverCache.deleteMany({
    where: { processedAt: { lt: new Date(Date.now() - ROLLOVER_TTL) } },
  });

  if (await isRolloverRecentlyProcessed(branchId, currentStr)) {
    return;
  }

  const startTime = Date.now();
  console.log(`[ROLLOVER] start branchId=${branchId} currentDate=${currentStr}`);

  const prevDay = getPreviousDay(currentDate);

  const LOOKBACK_DAYS = 60;
  const daysToProcess = [];

  const startDate = new Date(prevDay.getTime() - (LOOKBACK_DAYS - 1) * 24 * 60 * 60 * 1000);

  const dates = [];
  let cursor = prevDay;
  while (cursor >= startDate) {
    dates.push(cursor);
    cursor = getPreviousDay(cursor);
  }

  const closures = await prisma.dailyClosure.findMany({
    where: { branchId, operationalDate: { in: dates } },
    select: { operationalDate: true, isClosed: true },
  });
  const closureMap = {};
  for (const c of closures) {
    closureMap[toDateString(c.operationalDate)] = c.isClosed;
  }

  const draftCounts = await prisma.remainingRecord.groupBy({
    by: ['operationalDate'],
    where: { branchId, operationalDate: { in: dates }, status: 'DRAFT' },
    _count: { id: true },
  });
  const draftCountMap = {};
  for (const d of draftCounts) {
    draftCountMap[toDateString(d.operationalDate)] = d._count.id;
  }

  for (let i = dates.length - 1; i >= 0; i--) {
    const dateStr = toDateString(dates[i]);
    if (closureMap[dateStr]) break;
    const draftCount = draftCountMap[dateStr] || 0;
    if (draftCount > 0) {
      daysToProcess.push({ date: dates[i], draftCount });
    }
  }

  if (daysToProcess.length === 0) {
    console.log(`[ROLLOVER] skipped branchId=${branchId} no unresolved DRAFT days`);
    return;
  }

  daysToProcess.reverse();

  for (const { date, draftCount } of daysToProcess) {
    await processRolloverDay(branchId, date, draftCount);
  }

  const duration = Date.now() - startTime;
  console.log(`[ROLLOVER] success branchId=${branchId} days=${daysToProcess.length} duration=${duration}ms`);
}

async function processRolloverDay(branchId, date, draftCount) {
  const dateStr = toDateString(date);
  const now = new Date();

  const adminUser = await prisma.user.findFirst({
    where: { role: { name: 'ADMIN' } },
    select: { id: true },
  });
  const rolloverUserId = adminUser?.id;

  try {
    await prisma.$transaction(async (tx) => {
    const existing = await tx.dailyClosure.findUnique({
      where: { branchId_operationalDate: { branchId, operationalDate: date } },
    });
    if (existing?.isClosed) {
      console.log(`[ROLLOVER] skipped branchId=${branchId} date=${dateStr} already closed`);
      return;
    }

    const draftRecords = await tx.remainingRecord.findMany({
      where: { branchId, operationalDate: date, status: 'DRAFT' },
    });

    if (draftRecords.length === 0) {
      console.log(`[ROLLOVER] skipped branchId=${branchId} date=${dateStr} no DRAFT records at commit time`);
      return;
    }

    for (const draft of draftRecords) {
      await tx.remainingRecord.update({
        where: { id: draft.id },
        data: { status: 'FINAL', autoFinalizedAt: now },
      });
    }

    console.log(`[ROLLOVER] finalized_drafts branchId=${branchId} date=${dateStr} count=${draftRecords.length}`);

    let newClosure;
    try {
      newClosure = await tx.dailyClosure.create({
        data: {
          branchId,
          operationalDate: date,
          isClosed: true,
          closureType: 'AUTO_FINALIZE',
          closedAt: now,
          note: `Auto-finalized: ${draftRecords.length} stale DRAFT record(s)`,
        },
      });
    } catch (err) {
      if (err.code === 'P2002') {
        console.log(`[ROLLOVER] skipped branchId=${branchId} date=${dateStr} concurrent tx won (unique constraint)`);
        throw new Error('ROLLOVER_RACE');
      }
      throw err;
    }

    const snapshotItems = await buildSnapshotItems(tx, branchId, date);

    const snapshot = await tx.dailySnapshot.create({
      data: {
        closureId: newClosure.id,
        branchId,
        operationalDate: date,
        isInvalidated: false,
      },
    });

    if (snapshotItems.length > 0) {
      await tx.dailySnapshotItem.createMany({
        data: snapshotItems.map(item => ({
          snapshotId: snapshot.id,
          productId: item.productId,
          openingStock: item.openingStock,
          dayProduction: item.dayProduction,
          nightProduction: item.nightProduction,
          sellableStock: item.sellableStock,
          remainingStock: item.remainingStock,
          wasteQuantity: item.wasteQuantity,
          estimatedSold: item.estimatedSold,
          estimatedRevenue: item.estimatedRevenue,
          snapshotPrice: item.snapshotPrice,
        })),
      });
    }

    for (const draft of draftRecords) {
      await tx.auditLog.create({
        data: {
          entityType: 'remaining',
          entityId: draft.id,
          action: 'AUTO_FINALIZE',
          oldValue: { status: 'DRAFT' },
          newValue: { status: 'FINAL', autoFinalizedAt: now.toISOString() },
          userId: rolloverUserId,
        },
      });
    }

    await tx.auditLog.create({
      data: {
        entityType: 'closure',
        entityId: newClosure.id,
        action: 'AUTO_CLOSE',
        oldValue: null,
        newValue: { branchId, operationalDate: dateStr, closureType: 'AUTO_FINALIZE', finalizedDrafts: draftRecords.length },
        userId: rolloverUserId,
      },
    });

    console.log(`[ROLLOVER] auto_closed branchId=${branchId} date=${dateStr} closureId=${newClosure.id} snapshotId=${snapshot.id} items=${snapshotItems.length}`);
  });
  } catch (err) {
    if (err.message === 'ROLLOVER_RACE') {
      console.log(`[ROLLOVER] skipped branchId=${branchId} date=${dateStr} concurrent tx handled this day`);
      return;
    }
    throw err;
  }
}

async function buildSnapshotItems(tx, branchId, date) {
  const activeProducts = await tx.product.findMany({
    where: { isActive: true },
    select: { id: true },
    orderBy: { category: 'asc' },
  });

  const inactiveProdIds = await tx.productionRecord.findMany({
    where: { branchId, operationalDate: date, product: { isActive: false } },
    select: { productId: true },
    distinct: ['productId'],
  });
  const inactiveRemIds = await tx.remainingRecord.findMany({
    where: { branchId, operationalDate: date, product: { isActive: false } },
    select: { productId: true },
    distinct: ['productId'],
  });
  const inactiveWasteIds = await tx.wasteRecord.findMany({
    where: { branchId, operationalDate: date, product: { isActive: false } },
    select: { productId: true },
    distinct: ['productId'],
  });

  const seen = new Set(activeProducts.map(p => p.id));
  const extraIds = [];
  for (const r of [...inactiveProdIds, ...inactiveRemIds, ...inactiveWasteIds]) {
    if (!seen.has(r.productId)) {
      seen.add(r.productId);
      extraIds.push(r.productId);
    }
  }

  let extraProducts = [];
  if (extraIds.length > 0) {
    extraProducts = await tx.product.findMany({
      where: { id: { in: extraIds } },
      select: { id: true },
    });
  }

  const allIds = [...activeProducts.map(p => p.id), ...extraProducts.map(p => p.id)];
  const prevDay = getPreviousDay(date);

  const allPriceHistory = await tx.productPriceHistory.findMany({
    where: { productId: { in: allIds } },
    orderBy: { validFrom: 'desc' },
  });
  const lookupDate = toDateString(date);
  const priceMap = {};
  for (const ph of allPriceHistory) {
    if (!priceMap[ph.productId]) {
      const fromDate = toDateString(ph.validFrom);
      const toDate = ph.validTo ? toDateString(ph.validTo) : null;
      if (fromDate <= lookupDate && (!toDate || lookupDate < toDate)) {
        priceMap[ph.productId] = toDecimal(ph.price);
      }
    }
  }

  const fallbackPrices = await tx.product.findMany({
    where: { id: { in: allIds } },
    select: { id: true, price: true },
  });
  const fallbackMap = {};
  for (const p of fallbackPrices) {
    fallbackMap[p.id] = p.price ? toDecimal(p.price) : ZERO;
  }

  const items = [];

  const prevRemainingRecords = await tx.remainingRecord.findMany({
    where: { branchId, productId: { in: allIds }, operationalDate: prevDay, status: 'FINAL' },
    select: { productId: true, quantity: true },
  });
  const openingStockMap = {};
  for (const r of prevRemainingRecords) {
    openingStockMap[r.productId] = toDecimal(r.quantity);
  }

  const dayProductionGroup = await tx.productionRecord.groupBy({
    by: ['productId'],
    where: { branchId, operationalDate: date, shift: 'DAY', productId: { in: allIds } },
    _sum: { quantity: true },
  });
  const dayProductionMap = {};
  for (const g of dayProductionGroup) {
    dayProductionMap[g.productId] = g._sum.quantity ? toDecimal(g._sum.quantity) : ZERO;
  }

  const nightProductionGroup = await tx.productionRecord.groupBy({
    by: ['productId'],
    where: { branchId, operationalDate: date, shift: 'NIGHT', productId: { in: allIds } },
    _sum: { quantity: true },
  });
  const nightProductionMap = {};
  for (const g of nightProductionGroup) {
    nightProductionMap[g.productId] = g._sum.quantity ? toDecimal(g._sum.quantity) : ZERO;
  }

  const remainingRecords = await tx.remainingRecord.findMany({
    where: { branchId, productId: { in: allIds }, operationalDate: date, status: 'FINAL' },
    select: { productId: true, quantity: true },
  });
  const remainingStockMap = {};
  for (const r of remainingRecords) {
    remainingStockMap[r.productId] = toDecimal(r.quantity);
  }

  const wasteGroup = await tx.wasteRecord.groupBy({
    by: ['productId'],
    where: { branchId, operationalDate: date, productId: { in: allIds } },
    _sum: { quantity: true },
  });
  const wasteMap = {};
  for (const g of wasteGroup) {
    wasteMap[g.productId] = g._sum.quantity ? toDecimal(g._sum.quantity) : ZERO;
  }

  for (const productId of allIds) {
    const openingStock = openingStockMap[productId] || ZERO;
    const dayProduction = dayProductionMap[productId] || ZERO;
    const nightProduction = nightProductionMap[productId] || ZERO;
    const sellableStock = safePlus(safePlus(openingStock, dayProduction), nightProduction);
    const remainingStock = remainingStockMap[productId] || ZERO;
    const wasteQty = wasteMap[productId] || ZERO;

    let estimatedSold = safeMinus(safeMinus(sellableStock, remainingStock), wasteQty);
    if (estimatedSold.lt(ZERO)) estimatedSold = ZERO;

    const price = priceMap[productId] || fallbackMap[productId] || ZERO;
    // TEMPORARY clamp: estimatedRevenue must fit DECIMAL(12,2).
    // Only triggers on stress-test seed data with unrealistically
    // high prices x quantities; real bakery operations stay well
    // within the schema limit.
    const estimatedRevenue = clampDecimal12_2(safeMultiply(estimatedSold, price));

    items.push({
      productId,
      openingStock,
      dayProduction,
      nightProduction,
      sellableStock,
      remainingStock,
      wasteQuantity: wasteQty,
      estimatedSold,
      estimatedRevenue,
      // TEMPORARY clamp: snapshotPrice must fit DECIMAL(12,2).
      // Same rationale as estimatedRevenue above.
      snapshotPrice: clampDecimal12_2(price),
    });
  }

  return items;
}

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

// HISTORICAL PRICING INVARIANT — single authoritative lookup
// All revenue calculations MUST go through this function.
// The chain is: PriceHistory lookup → null (caller falls back to Product.price).
// validFrom is INCLUSIVE, validTo is EXCLUSIVE (see schema ProductPriceHistory).
// NEVER read Product.price directly for historical revenue — it reflects the
// current price, not the price at the operational date.
// Comparisons use YYYY-MM-DD strings only — sub-day timestamps are ignored.
async function getHistoricalPrice(productId, operationalDate) {
  const lookupDate = toDateString(operationalDate);

  const records = await prisma.productPriceHistory.findMany({
    where: { productId: parseInt(productId) },
    orderBy: { validFrom: 'desc' },
  });

  const match = records.find(r => {
    const fromDate = toDateString(r.validFrom);
    const toDate = r.validTo ? toDateString(r.validTo) : null;
    return fromDate <= lookupDate && (!toDate || lookupDate < toDate);
  });

  return match?.price ?? null;
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
  const histPrice = await getHistoricalPrice(productId, operationalDate);
  let price;
  if (histPrice !== null) {
    price = toDecimal(histPrice);
  } else {
    const product = await prisma.product.findUnique({
      where: { id: parseInt(productId) },
      select: { price: true },
    });
    price = product?.price ? toDecimal(product.price) : ZERO;
  }
  return safeMultiply(sold, price);
}

async function getFullInventoryFlow(branchId, operationalDate, productId) {
  const product = await prisma.product.findUnique({
    where: { id: parseInt(productId) },
    select: { id: true, name: true, category: true, price: true, unitType: true, isActive: true },
  });

  if (!product) {
    const error = new Error('Product not found');
    error.status = 404;
    throw error;
  }

  const [
    openingStock,
    dayProduction,
    nightProduction,
    sellableStock,
    remainingStock,
    wasteQuantity,
    estimatedSold,
    estimatedRevenue,
  ] = await Promise.all([
    getOpeningStock(branchId, operationalDate, productId),
    getDayProduction(branchId, operationalDate, productId),
    getNightProduction(branchId, operationalDate, productId),
    getSellableStock(branchId, operationalDate, productId),
    getRemainingStock(branchId, operationalDate, productId),
    getWasteQuantity(branchId, operationalDate, productId),
    getEstimatedSold(branchId, operationalDate, productId),
    getEstimatedRevenue(branchId, operationalDate, productId),
  ]);

  const histPrice = await getHistoricalPrice(productId, operationalDate);

  return {
    productId: product.id,
    productName: product.name,
    category: product.category,
    unitType: product.unitType,
    price: decimalToNumber(histPrice ?? product.price),
    isActive: product.isActive,
    openingStock: decimalToNumber(openingStock),
    dayProduction: decimalToNumber(dayProduction),
    nightProduction: decimalToNumber(nightProduction),
    nightProductionPreparedFor: 0,
    sellableStock: decimalToNumber(sellableStock),
    remainingStock: decimalToNumber(remainingStock),
    wasteQuantity: decimalToNumber(wasteQuantity),
    estimatedSold: decimalToNumber(estimatedSold),
    estimatedRevenue: decimalToNumber(estimatedRevenue),
    operationalDate: toDateString(new Date(operationalDate)),
  };
}

async function getInventoryFlowForAllProducts(branchId, operationalDate) {
  // Include ALL products that participate in the operational day — even inactive/archived ones.
  // ERP analytics must preserve historical visibility: archived products are still
  // operationally and financially relevant for the dates they have records.
  const branchIdNum = parseInt(branchId);
  const opDate = new Date(operationalDate);

  const activeProducts = await prisma.product.findMany({
    where: { isActive: true },
    select: { id: true },
    orderBy: { category: 'asc' },
  });

  // Also include inactive products that have operational records for this date+branch.
  const inactiveProdIds = await prisma.productionRecord.findMany({
    where: { branchId: branchIdNum, operationalDate: opDate, product: { isActive: false } },
    select: { productId: true },
    distinct: ['productId'],
  });

  const inactiveRemIds = await prisma.remainingRecord.findMany({
    where: { branchId: branchIdNum, operationalDate: opDate, product: { isActive: false } },
    select: { productId: true },
    distinct: ['productId'],
  });

  const inactiveWasteIds = await prisma.wasteRecord.findMany({
    where: { branchId: branchIdNum, operationalDate: opDate, product: { isActive: false } },
    select: { productId: true },
    distinct: ['productId'],
  });

  const seen = new Set(activeProducts.map(p => p.id));
  const extraIds = [];
  for (const r of [...inactiveProdIds, ...inactiveRemIds, ...inactiveWasteIds]) {
    if (!seen.has(r.productId)) {
      seen.add(r.productId);
      extraIds.push(r.productId);
    }
  }

  let extraProducts = [];
  if (extraIds.length > 0) {
    extraProducts = await prisma.product.findMany({
      where: { id: { in: extraIds } },
      select: { id: true },
    });
  }

  const allProductIds = [...activeProducts.map(p => p.id), ...extraProducts.map(p => p.id)];

  // ── BATCH 1: Production data (single groupBy instead of N per-product aggregates) ──
  const productionData = await prisma.productionRecord.groupBy({
    by: ['productId', 'shift'],
    where: { branchId: branchIdNum, operationalDate: opDate, productId: { in: allProductIds } },
    _sum: { quantity: true },
  });

  // ── BATCH 2: Remaining data ──
  const remainingData = await prisma.remainingRecord.groupBy({
    by: ['productId'],
    where: { branchId: branchIdNum, operationalDate: opDate, productId: { in: allProductIds }, status: 'FINAL' },
    _sum: { quantity: true },
  });

  // ── BATCH 3: Waste data ──
  const wasteData = await prisma.wasteRecord.groupBy({
    by: ['productId'],
    where: { branchId: branchIdNum, operationalDate: opDate, productId: { in: allProductIds } },
    _sum: { quantity: true },
  });

  // ── BATCH 4: Opening stock — previous day remaining for ALL products ──
  const prevDay = getPreviousDay(opDate);
  const prevRemaining = await prisma.remainingRecord.findMany({
    where: { branchId: branchIdNum, operationalDate: prevDay, productId: { in: allProductIds }, status: 'FINAL' },
    select: { productId: true, quantity: true },
  });

  // ── BATCH 5: Product metadata ──
  const products = await prisma.product.findMany({
    where: { id: { in: allProductIds } },
    select: { id: true, name: true, category: true, price: true, unitType: true, isActive: true },
  });

  // ── BATCH 6: Price history — single batch load instead of per-product lookups ──
  const lookupDate = toDateString(operationalDate);
  const priceHistory = await prisma.productPriceHistory.findMany({
    where: { productId: { in: allProductIds } },
    orderBy: { validFrom: 'desc' },
  });

  // ── IN-MEMORY COMPUTATION — NO DB CALLS BELOW ──

  // Build production map: productId → { day: Decimal, night: Decimal }
  const prodMap = {};
  for (const r of productionData) {
    if (!prodMap[r.productId]) prodMap[r.productId] = { day: ZERO, night: ZERO };
    if (r.shift === 'DAY') prodMap[r.productId].day = toDecimal(r._sum.quantity);
    else if (r.shift === 'NIGHT') prodMap[r.productId].night = toDecimal(r._sum.quantity);
  }

  // Build remaining map: productId → Decimal
  const remainingMap = {};
  for (const r of remainingData) {
    remainingMap[r.productId] = toDecimal(r._sum.quantity);
  }

  // Build waste map: productId → Decimal
  const wasteMap = {};
  for (const r of wasteData) {
    wasteMap[r.productId] = toDecimal(r._sum.quantity);
  }

  // Build opening stock map from previous day's remaining
  const openingMap = {};
  for (const r of prevRemaining) {
    openingMap[r.productId] = toDecimal(r.quantity);
  }

  // Build price map — first matching history entry wins (most recent validFrom first)
  const priceMap = {};
  for (const ph of priceHistory) {
    if (!(ph.productId in priceMap)) {
      const fromDate = toDateString(ph.validFrom);
      const toDate = ph.validTo ? toDateString(ph.validTo) : null;
      if (fromDate <= lookupDate && (!toDate || lookupDate < toDate)) {
        priceMap[ph.productId] = toDecimal(ph.price);
      }
    }
  }

  // Fallback prices for products without matching history
  const fallbackPrices = {};
  for (const p of products) {
    fallbackPrices[p.id] = p.price ? toDecimal(p.price) : ZERO;
  }

  // Compute all product flows in pure JS (NO DATABASE CALLS)
  const flows = products.map(product => {
    const pid = product.id;
    const openingStock = openingMap[pid] || ZERO;
    const dayProduction = prodMap[pid]?.day || ZERO;
    const nightProduction = prodMap[pid]?.night || ZERO;
    const sellableStock = safePlus(safePlus(openingStock, dayProduction), nightProduction);
    const remainingStock = remainingMap[pid] || ZERO;
    const wasteQuantity = wasteMap[pid] || ZERO;
    let estimatedSold = safeMinus(safeMinus(sellableStock, remainingStock), wasteQuantity);
    if (estimatedSold.lt(ZERO)) estimatedSold = ZERO;
    const price = priceMap[pid] || fallbackPrices[pid] || ZERO;
    const estimatedRevenue = safeMultiply(estimatedSold, price);

    return {
      productId: pid,
      productName: product.name,
      category: product.category,
      unitType: product.unitType,
      price: decimalToNumber(price),
      isActive: product.isActive,
      openingStock: decimalToNumber(openingStock),
      dayProduction: decimalToNumber(dayProduction),
      nightProduction: decimalToNumber(nightProduction),
      nightProductionPreparedFor: 0,
      sellableStock: decimalToNumber(sellableStock),
      remainingStock: decimalToNumber(remainingStock),
      wasteQuantity: decimalToNumber(wasteQuantity),
      estimatedSold: decimalToNumber(estimatedSold),
      estimatedRevenue: decimalToNumber(estimatedRevenue),
      operationalDate: toDateString(new Date(operationalDate)),
    };
  });

  return flows;
}

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
          price: decimalToNumber(item.snapshotPrice ?? 0),
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

module.exports = {
  calculateOperationalDate,
  resolveRollover,
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
  getHistoricalPrice,
  toDecimal,
  safePlus,
  safeMinus,
  safeMultiply,
  safeDivide,
  decimalToNumber,
};