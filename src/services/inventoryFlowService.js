const { Prisma } = require('@prisma/client');
const prisma = require('../config/prisma');
const { calculateOperationalDate, addOneDay, getPreviousDay, toDateString } = require('../utils/dateUtils');
const { logAudit } = require('./auditService');

const ZERO = new Prisma.Decimal('0');

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

async function getFullInventoryFlow(branchId, operationalDate, productId) {
  const product = await prisma.product.findUnique({
    where: { id: parseInt(productId) },
    select: { id: true, name: true, category: true, price: true, unitType: true },
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
    remainingStock: decimalToNumber(remainingStock),
    wasteQuantity: decimalToNumber(wasteQuantity),
    estimatedSold: decimalToNumber(estimatedSold),
    estimatedRevenue: decimalToNumber(estimatedRevenue),
    operationalDate: toDateString(new Date(operationalDate)),
  };
}

async function getInventoryFlowForAllProducts(branchId, operationalDate) {
  const products = await prisma.product.findMany({
    where: { isActive: true },
    select: { id: true },
    orderBy: { category: 'asc' },
  });

  const flows = await Promise.all(
    products.map(p => getFullInventoryFlow(branchId, operationalDate, p.id))
  );

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
};