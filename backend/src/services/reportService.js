const inventoryFlowService = require('./inventoryFlowService');
const { toDateString, getMonday, getSunday } = require('../utils/dateUtils');
const prisma = require('../config/prisma');
const { PRODUCT_SELECT_LOCALIZED } = require('../constants/prismaSelects');
const { safePlus, safeMinus, safeMultiply, decimalToNumber } = require('./inventoryFlowService');

function filterProducts(products, category, productId) {
  let filtered = products;
  if (category) {
    filtered = filtered.filter(p => (p.product?.category || p.category) === category);
  }
  if (productId) {
    filtered = filtered.filter(p => String(p.product?.id || p.productId) === String(productId));
  }
  return filtered;
}

async function getInventoryFlowReport(branchId, operationalDate, category, productId) {
  const baseReport = !branchId
    ? await getCombinedBranchReport(branchId, operationalDate)
    : await inventoryFlowService.getInventoryFlowReport(branchId, operationalDate);

  const filteredProducts = filterProducts(baseReport.products, category, productId);
  const totals = inventoryFlowService.getTotals(filteredProducts);

  return {
    ...baseReport,
    products: filteredProducts,
    totals,
    filters: {
      category: category || null,
      productId: productId || null,
    },
  };
}

async function getCombinedBranchReport(branchId, operationalDate) {
  const branches = await prisma.branch.findMany({
    orderBy: { name: 'asc' },
  });
  const branchReports = await Promise.all(
    branches.map(b => inventoryFlowService.getInventoryFlowReport(b.id, operationalDate))
  );

  const branchesData = branchReports.map(r => ({
    branchId: r.branchId,
    branchName: r.branchName,
    products: r.products,
    totals: inventoryFlowService.getTotals(r.products),
    isClosed: r.isClosed,
  }));

  const allProducts = [];
  for (const r of branchReports) {
    for (const p of r.products) {
      allProducts.push({
        ...p,
        branchId: r.branchId,
        branchName: r.branchName,
      });
    }
  }
  const totals = inventoryFlowService.getTotals(allProducts);
  return {
    source: 'combined',
    branchId: null,
    branchName: 'All Branches',
    operationalDate: toDateString(new Date(operationalDate)),
    isClosed: false,
    products: allProducts,
    totals,
    branchesData,
  };
}

async function getDailyReport(branchId, date, category, productId) {
  const report = await getInventoryFlowReport(branchId, date, category, productId);
  return {
    ...report,
    reportType: 'DAILY',
    reportDate: toDateString(new Date(date)),
  };
}

async function getWeeklyReport(branchId, weekStartDate, category, productId) {
  const branches = !branchId
    ? await prisma.branch.findMany({ orderBy: { name: 'asc' } })
    : [{ id: parseInt(branchId), name: '' }];

  const inputDate = new Date(weekStartDate);
  const startDate = getMonday(inputDate);

  // Build all 7 date strings for the week
  const dateStrs = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(startDate);
    d.setDate(startDate.getDate() + i);
    return toDateString(d);
  });

  // Fetch ALL day×branch reports in parallel — eliminates sequential 7-day loop
  const dayResults = await Promise.all(dateStrs.map(async (dateStr) => {
    const branchResults = await Promise.all(
      branches.map(b => inventoryFlowService.getInventoryFlowReport(b.id, dateStr))
    );
    return { dateStr, branchResults };
  }));

  const weekData = [];
  const allProductsMap = new Map();

  for (const { dateStr, branchResults } of dayResults) {
    const dailyTotals = { totalOpeningStock: 0, totalDayProduction: 0, totalNightProduction: 0, totalNightProductionPreparedFor: 0, totalSellableStock: 0, totalRemainingStock: 0, totalWasteQuantity: 0, totalEstimatedSold: 0, totalEstimatedRevenue: 0 };
    let isClosed = false;
    let source = 'live';
    let dayProducts = [];
    let dayBranchesData = [];

    for (const r of branchResults) {
      const filteredProducts = filterProducts(r.products, category, productId);
      const dayTotals = inventoryFlowService.getTotals(filteredProducts);
      for (const key of Object.keys(dailyTotals)) {
        dailyTotals[key] = decimalToNumber(safePlus(dailyTotals[key], dayTotals[key]));
      }
      if (r.isClosed) isClosed = true;
      if (r.source === 'snapshot') source = 'snapshot';
      dayProducts = dayProducts.concat(filteredProducts);
      dayBranchesData.push({
        branchId: r.branchId,
        branchName: r.branchName,
        products: filteredProducts,
        totals: dayTotals,
      });
    }

    for (const p of dayProducts) {
      const key = `${p.product?.id || p.productId}`;
      if (allProductsMap.has(key)) {
        const existing = allProductsMap.get(key);
        existing.openingStock = decimalToNumber(safePlus(existing.openingStock, p.openingStock));
        existing.dayProduction = decimalToNumber(safePlus(existing.dayProduction, p.dayProduction));
        existing.nightProduction = decimalToNumber(safePlus(existing.nightProduction, p.nightProduction));
        existing.sellableStock = decimalToNumber(safePlus(existing.sellableStock, p.sellableStock));
        existing.remainingStock = decimalToNumber(safePlus(existing.remainingStock, p.remainingStock));
        existing.wasteQuantity = decimalToNumber(safePlus(existing.wasteQuantity, p.wasteQuantity));
        existing.estimatedSold = decimalToNumber(safePlus(existing.estimatedSold, p.estimatedSold));
        existing.estimatedRevenue = decimalToNumber(safePlus(existing.estimatedRevenue, p.estimatedRevenue));
      } else {
        allProductsMap.set(key, { ...p });
      }
    }

    weekData.push({
      date: dateStr,
      dayName: new Date(dateStr + 'T00:00:00Z').toLocaleDateString('en-US', { weekday: 'long' }),
      totals: dailyTotals,
      products: dayProducts,
      branchesData: !branchId ? dayBranchesData : null,
      isClosed,
      source,
    });
  }

  const allProducts = Array.from(allProductsMap.values());

  const aggregatedTotals = weekData.reduce(
    (acc, day) => ({
      totalOpeningStock: decimalToNumber(safePlus(acc.totalOpeningStock, day.totals?.totalOpeningStock)),
      totalDayProduction: decimalToNumber(safePlus(acc.totalDayProduction, day.totals?.totalDayProduction)),
      totalNightProduction: decimalToNumber(safePlus(acc.totalNightProduction, day.totals?.totalNightProduction)),
      totalNightProductionPreparedFor: decimalToNumber(safePlus(acc.totalNightProductionPreparedFor, day.totals?.totalNightProductionPreparedFor)),
      totalSellableStock: decimalToNumber(safePlus(acc.totalSellableStock, day.totals?.totalSellableStock)),
      totalRemainingStock: decimalToNumber(safePlus(acc.totalRemainingStock, day.totals?.totalRemainingStock)),
      totalWasteQuantity: decimalToNumber(safePlus(acc.totalWasteQuantity, day.totals?.totalWasteQuantity)),
      totalEstimatedSold: decimalToNumber(safePlus(acc.totalEstimatedSold, day.totals?.totalEstimatedSold)),
      totalEstimatedRevenue: decimalToNumber(safePlus(acc.totalEstimatedRevenue, day.totals?.totalEstimatedRevenue)),
    }),
    { totalOpeningStock: 0, totalDayProduction: 0, totalNightProduction: 0, totalNightProductionPreparedFor: 0, totalSellableStock: 0, totalRemainingStock: 0, totalWasteQuantity: 0, totalEstimatedSold: 0, totalEstimatedRevenue: 0 }
  );

  let branchName = 'All Branches';
  if (branchId) {
    const branch = await prisma.branch.findUnique({ where: { id: parseInt(branchId) } });
    branchName = branch ? branch.name : '';
  }

  return {
    branchId: branchId ? parseInt(branchId) : null,
    branchName,
    weekStartDate: toDateString(startDate),
    weekEndDate: toDateString(getSunday(startDate)),
    reportType: 'WEEKLY',
    days: weekData,
    products: allProducts,
    totals: aggregatedTotals,
    filters: {
      category: category || null,
      productId: productId || null,
    },
  };
}

async function getMonthlyReport(branchId, year, month, category, productId) {
  const yearNum = parseInt(year);
  const monthNum = parseInt(month);
  const startDate = new Date(yearNum, monthNum - 1, 1);
  const endDate = new Date(yearNum, monthNum, 0);
  const weeks = [];

  const firstDayOfWeek = startDate.getDay();
  let currentWeekStart = new Date(startDate);

  // Collect all week start dates FIRST (no DB calls)
  const weekSpecs = [];

  if (firstDayOfWeek !== 1) {
    const daysToSunday = (7 - firstDayOfWeek) % 7;
    if (daysToSunday > 0) {
      const partialWeekEnd = new Date(startDate);
      partialWeekEnd.setDate(partialWeekEnd.getDate() + daysToSunday);
      if (partialWeekEnd > endDate) {
        partialWeekEnd.setTime(endDate.getTime());
      }
      weekSpecs.push({
        weekStartStr: toDateString(currentWeekStart),
        weekEndStr: toDateString(partialWeekEnd),
      });
      currentWeekStart = new Date(partialWeekEnd);
      currentWeekStart.setDate(currentWeekStart.getDate() + 1);
    }
  }

  while (currentWeekStart <= endDate) {
    const weekEnd = new Date(currentWeekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    if (weekEnd > endDate) {
      weekEnd.setTime(endDate.getTime());
    }
    weekSpecs.push({
      weekStartStr: toDateString(currentWeekStart),
      weekEndStr: toDateString(weekEnd),
    });
    currentWeekStart = new Date(weekEnd);
    currentWeekStart.setDate(currentWeekStart.getDate() + 1);
  }

  // Fetch ALL weeks in parallel — eliminates sequential 4-5 week loop
  const weekReports = await Promise.all(
    weekSpecs.map(spec =>
      getWeeklyReport(branchId, spec.weekStartStr, category, productId)
        .then(report => {
          report.weekStartDate = spec.weekStartStr;
          report.weekEndDate = spec.weekEndStr;
          return report;
        })
    )
  );
  weeks.push(...weekReports);

  const aggregatedTotals = weeks.reduce(
    (acc, week) => ({
      totalOpeningStock: decimalToNumber(safePlus(acc.totalOpeningStock, week.totals?.totalOpeningStock)),
      totalDayProduction: decimalToNumber(safePlus(acc.totalDayProduction, week.totals?.totalDayProduction)),
      totalNightProduction: decimalToNumber(safePlus(acc.totalNightProduction, week.totals?.totalNightProduction)),
      totalNightProductionPreparedFor: decimalToNumber(safePlus(acc.totalNightProductionPreparedFor, week.totals?.totalNightProductionPreparedFor)),
      totalSellableStock: decimalToNumber(safePlus(acc.totalSellableStock, week.totals?.totalSellableStock)),
      totalRemainingStock: decimalToNumber(safePlus(acc.totalRemainingStock, week.totals?.totalRemainingStock)),
      totalWasteQuantity: decimalToNumber(safePlus(acc.totalWasteQuantity, week.totals?.totalWasteQuantity)),
      totalEstimatedSold: decimalToNumber(safePlus(acc.totalEstimatedSold, week.totals?.totalEstimatedSold)),
      totalEstimatedRevenue: decimalToNumber(safePlus(acc.totalEstimatedRevenue, week.totals?.totalEstimatedRevenue)),
    }),
    {
      totalOpeningStock: 0,
      totalDayProduction: 0,
      totalNightProduction: 0,
      totalNightProductionPreparedFor: 0,
      totalSellableStock: 0,
      totalRemainingStock: 0,
      totalWasteQuantity: 0,
      totalEstimatedSold: 0,
      totalEstimatedRevenue: 0,
    }
  );

  const allProductsMap = new Map();
  for (const week of weeks) {
    for (const p of (week.products || [])) {
      const key = `${p.product?.id || p.productId}`;
      if (allProductsMap.has(key)) {
        const existing = allProductsMap.get(key);
        existing.openingStock = decimalToNumber(safePlus(existing.openingStock, p.openingStock));
        existing.dayProduction = decimalToNumber(safePlus(existing.dayProduction, p.dayProduction));
        existing.nightProduction = decimalToNumber(safePlus(existing.nightProduction, p.nightProduction));
        existing.sellableStock = decimalToNumber(safePlus(existing.sellableStock, p.sellableStock));
        existing.remainingStock = decimalToNumber(safePlus(existing.remainingStock, p.remainingStock));
        existing.wasteQuantity = decimalToNumber(safePlus(existing.wasteQuantity, p.wasteQuantity));
        existing.estimatedSold = decimalToNumber(safePlus(existing.estimatedSold, p.estimatedSold));
        existing.estimatedRevenue = decimalToNumber(safePlus(existing.estimatedRevenue, p.estimatedRevenue));
      } else {
        allProductsMap.set(key, { ...p });
      }
    }
  }
  const allProducts = Array.from(allProductsMap.values());

  let branchName = 'All Branches';
  if (branchId) {
    const branch = await prisma.branch.findUnique({ where: { id: parseInt(branchId) } });
    branchName = branch ? branch.name : '';
  }

  return {
    branchId: branchId ? parseInt(branchId) : null,
    branchName,
    year: parseInt(year),
    month: parseInt(month),
    monthName: new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString('en-US', { month: 'long' }),
    reportType: 'MONTHLY',
    weeks,
    products: allProducts,
    totals: aggregatedTotals,
    filters: {
      category: category || null,
      productId: productId || null,
    },
  };
}

const MONTH_NAMES_FULL = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

function createProdEntry(item) {
  return {
    product: item.product,
    price: item.price,
    displayPrice: item.displayPrice || String(item.price || 0),
    totalOpeningStock: 0, totalDayProduction: 0, totalNightProduction: 0,
    totalSellableStock: 0, totalRemainingStock: 0, totalWasteQuantity: 0,
    totalEstimatedSold: 0, totalEstimatedRevenue: 0,
  };
}

function addToProd(entry, src) {
  entry.totalOpeningStock = decimalToNumber(safePlus(entry.totalOpeningStock, src.opening ?? 0));
  entry.totalDayProduction = decimalToNumber(safePlus(entry.totalDayProduction, src.dayProd ?? src.totalDayProduction ?? 0));
  entry.totalNightProduction = decimalToNumber(safePlus(entry.totalNightProduction, src.nightProd ?? src.totalNightProduction ?? 0));
  entry.totalSellableStock = decimalToNumber(safePlus(entry.totalSellableStock, src.sellable ?? src.totalSellableStock ?? 0));
  entry.totalRemainingStock = decimalToNumber(safePlus(entry.totalRemainingStock, src.remaining ?? src.totalRemainingStock ?? 0));
  entry.totalWasteQuantity = decimalToNumber(safePlus(entry.totalWasteQuantity, src.waste ?? src.totalWasteQuantity ?? 0));
  entry.totalEstimatedSold = decimalToNumber(safePlus(entry.totalEstimatedSold, src.sold ?? src.totalEstimatedSold ?? 0));
  entry.totalEstimatedRevenue = decimalToNumber(safePlus(entry.totalEstimatedRevenue, src.revenue ?? src.totalEstimatedRevenue ?? 0));
}

function emptyMonthTotals() {
  return {
    totalOpeningStock: 0, totalDayProduction: 0, totalNightProduction: 0,
    totalNightProductionPreparedFor: 0, totalSellableStock: 0,
    totalRemainingStock: 0, totalWasteQuantity: 0,
    totalEstimatedSold: 0, totalEstimatedRevenue: 0,
  };
}

function emptyBranchMonthTotals() {
  return {
    totalDayProduction: 0, totalNightProduction: 0, totalSellableStock: 0,
    totalRemainingStock: 0, totalWasteQuantity: 0,
    totalEstimatedSold: 0, totalEstimatedRevenue: 0,
  };
}

function computeDisplayPrice(allPrices) {
  const sorted = [...allPrices].sort((a, b) => a - b);
  if (sorted.length === 1) return String(sorted[0]);
  if (sorted.length > 1) return `${sorted[0]} – ${sorted[sorted.length - 1]}`;
  return '0';
}

function groupLiveByMonth(prodRecords, remainingRecords, wasteRecords, historyByProduct, snapshotPriceSets, monthProductsMap, monthTotalsMap, branchYearlyTotalsMap, branchProductsMap, branchId, yearNum, category, pidFilter, productYearlyTotals = {}) {
  const snapshotPriceSetsLocal = snapshotPriceSets || {};

  const dayProdByDate = {};
  const nightProdByDate = {};
  for (const r of prodRecords) {
    const dk = r.operationalDate.toISOString().split('T')[0];
    const qty = Number(r._sum.quantity) || 0;
    if (r.shift === 'DAY') {
      if (!dayProdByDate[dk]) dayProdByDate[dk] = {};
      dayProdByDate[dk][r.productId] = (dayProdByDate[dk][r.productId] || 0) + qty;
    } else if (r.shift === 'NIGHT') {
      if (!nightProdByDate[dk]) nightProdByDate[dk] = {};
      nightProdByDate[dk][r.productId] = (nightProdByDate[dk][r.productId] || 0) + qty;
    }
  }

  const remainingByDate = {};
  for (const r of remainingRecords) {
    const dk = r.operationalDate.toISOString().split('T')[0];
    if (!remainingByDate[dk]) remainingByDate[dk] = {};
    remainingByDate[dk][r.productId] = (remainingByDate[dk][r.productId] || 0) + (Number(r._sum.quantity) || 0);
  }

  const wasteByDate = {};
  for (const r of wasteRecords) {
    const dk = r.operationalDate.toISOString().split('T')[0];
    if (!wasteByDate[dk]) wasteByDate[dk] = {};
    wasteByDate[dk][r.productId] = (wasteByDate[dk][r.productId] || 0) + (Number(r._sum.quantity) || 0);
  }

  const allDateKeys = [...new Set([
    ...Object.keys(dayProdByDate), ...Object.keys(nightProdByDate),
    ...Object.keys(remainingByDate), ...Object.keys(wasteByDate),
  ])];

  const allProdIds = new Set();
  for (const dk of allDateKeys) {
    for (const m of [dayProdByDate, nightProdByDate, remainingByDate, wasteByDate]) {
      if (m[dk]) Object.keys(m[dk]).forEach(p => allProdIds.add(Number(p)));
    }
  }

  if (allDateKeys.length === 0) return;

  // Group dates by month
  const monthDates = {};
  for (const dk of allDateKeys) {
    const m = parseInt(dk.split('-')[1], 10);
    if (!monthDates[m]) monthDates[m] = [];
    monthDates[m].push(dk);
  }

  // We need product names/categories for the live path
  // They are fetched once in the caller; here we build them from the groupBy results
  // Since we don't have product names in groupBy, we accumulate by productId
  // and merge names later
  const liveMonthProd = {};
  for (let m = 1; m <= 12; m++) {
    if (!monthDates[m]) continue;
    const dates = monthDates[m];
    const livePriceSets = {};

    // Accumulate per-product across dates in this month
    const monthAccum = {};
    for (const dk of dates) {
      const dateProds = new Set([
        ...Object.keys(dayProdByDate[dk] || {}),
        ...Object.keys(nightProdByDate[dk] || {}),
        ...Object.keys(remainingByDate[dk] || {}),
        ...Object.keys(wasteByDate[dk] || {}),
      ]);
      for (const pidStr of dateProds) {
        const pid = Number(pidStr);
        const dayProd = dayProdByDate[dk]?.[pid] || 0;
        const nightProd = nightProdByDate[dk]?.[pid] || 0;
        const remaining = remainingByDate[dk]?.[pid] || 0;
        const waste = wasteByDate[dk]?.[pid] || 0;

        if (dayProd === 0 && nightProd === 0 && remaining === 0 && waste === 0) continue;

        if (!monthAccum[pid]) {
          monthAccum[pid] = { dayProd: 0, nightProd: 0, remaining: 0, waste: 0, estimatedSold: 0, estimatedRevenue: 0 };
        }

        const sellable = dayProd + nightProd;
        const dailySold = Math.max(0, sellable - (remaining + waste));

        const entries = historyByProduct[pid] || [];
        let histPrice = 0;
        for (let i = entries.length - 1; i >= 0; i--) {
          const e = entries[i];
          const fromDate = e.validFrom.toISOString().split('T')[0];
          const toDate = e.validTo ? e.validTo.toISOString().split('T')[0] : null;
          if (fromDate <= dk && (!toDate || dk < toDate)) {
            histPrice = Number(e.price);
            break;
          }
        }

        if (!livePriceSets[pid]) livePriceSets[pid] = new Set();
        livePriceSets[pid].add(histPrice);

        monthAccum[pid].dayProd += dayProd;
        monthAccum[pid].nightProd += nightProd;
        monthAccum[pid].remaining += remaining;
        monthAccum[pid].waste += waste;
        monthAccum[pid].estimatedSold += dailySold;
        monthAccum[pid].estimatedRevenue += dailySold * histPrice;
      }
    }

    liveMonthProd[m] = { accum: monthAccum, priceSets: livePriceSets };
  }

  // Merge live data into the shared maps
  for (let m = 1; m <= 12; m++) {
    if (!liveMonthProd[m]) continue;
    const { accum, priceSets } = liveMonthProd[m];

    for (const [pidStr, prod] of Object.entries(accum)) {
      const pid = Number(pidStr);
      const key = pidStr;

      const snapKey = `${m}-${pid}`;
      const allPrices = new Set([...(priceSets[pid] || [])]);
      if (snapshotPriceSetsLocal[snapKey]) {
        snapshotPriceSetsLocal[snapKey].forEach(p => allPrices.add(p));
      }
      const displayPrice = computeDisplayPrice(allPrices);

      const sellable = prod.dayProd + prod.nightProd;

      // Shared helper to create entry if missing, then add values
      const ensureAndAdd = (map, mapKey, displayOverride) => {
        if (!map[mapKey]) {
          map[mapKey] = {
            productId: pid, productName: '', category: '', price: 0,
            displayPrice: displayOverride || displayPrice,
            totalOpeningStock: 0, totalDayProduction: 0, totalNightProduction: 0,
            totalSellableStock: 0, totalRemainingStock: 0, totalWasteQuantity: 0,
            totalEstimatedSold: 0, totalEstimatedRevenue: 0,
          };
        } else if (displayOverride) {
          map[mapKey].displayPrice = displayOverride;
        }
        const entry = map[mapKey];
        entry.totalDayProduction = decimalToNumber(safePlus(entry.totalDayProduction, prod.dayProd));
        entry.totalNightProduction = decimalToNumber(safePlus(entry.totalNightProduction, prod.nightProd));
        entry.totalSellableStock = decimalToNumber(safePlus(entry.totalSellableStock, sellable));
        entry.totalRemainingStock = decimalToNumber(safePlus(entry.totalRemainingStock, prod.remaining));
        entry.totalWasteQuantity = decimalToNumber(safePlus(entry.totalWasteQuantity, prod.waste));
        entry.totalEstimatedSold = decimalToNumber(safePlus(entry.totalEstimatedSold, prod.estimatedSold));
        entry.totalEstimatedRevenue = decimalToNumber(safePlus(entry.totalEstimatedRevenue, prod.estimatedRevenue));
      };

      if (!monthProductsMap[m][key]) {
        monthProductsMap[m][key] = {
          productId: pid, productName: '', category: '', price: 0,
          displayPrice, totalOpeningStock: 0,
          totalDayProduction: 0, totalNightProduction: 0, totalSellableStock: 0,
          totalRemainingStock: 0, totalWasteQuantity: 0,
          totalEstimatedSold: 0, totalEstimatedRevenue: 0,
        };
      } else {
        monthProductsMap[m][key].displayPrice = displayPrice;
      }
      const mpEntry = monthProductsMap[m][key];
      mpEntry.totalDayProduction = decimalToNumber(safePlus(mpEntry.totalDayProduction, prod.dayProd));
      mpEntry.totalNightProduction = decimalToNumber(safePlus(mpEntry.totalNightProduction, prod.nightProd));
      mpEntry.totalSellableStock = decimalToNumber(safePlus(mpEntry.totalSellableStock, sellable));
      mpEntry.totalRemainingStock = decimalToNumber(safePlus(mpEntry.totalRemainingStock, prod.remaining));
      mpEntry.totalWasteQuantity = decimalToNumber(safePlus(mpEntry.totalWasteQuantity, prod.waste));
      mpEntry.totalEstimatedSold = decimalToNumber(safePlus(mpEntry.totalEstimatedSold, prod.estimatedSold));
      mpEntry.totalEstimatedRevenue = decimalToNumber(safePlus(mpEntry.totalEstimatedRevenue, prod.estimatedRevenue));

      if (!branchProductsMap[branchId][m]) branchProductsMap[branchId][m] = {};
      if (!branchProductsMap[branchId][m][key]) {
        branchProductsMap[branchId][m][key] = {
          productId: pid, productName: '', category: '', price: 0,
          displayPrice, totalOpeningStock: 0,
          totalDayProduction: 0, totalNightProduction: 0, totalSellableStock: 0,
          totalRemainingStock: 0, totalWasteQuantity: 0,
          totalEstimatedSold: 0, totalEstimatedRevenue: 0,
        };
      } else {
        branchProductsMap[branchId][m][key].displayPrice = displayPrice;
      }
      const bpEntry = branchProductsMap[branchId][m][key];
      bpEntry.totalDayProduction = decimalToNumber(safePlus(bpEntry.totalDayProduction, prod.dayProd));
      bpEntry.totalNightProduction = decimalToNumber(safePlus(bpEntry.totalNightProduction, prod.nightProd));
      bpEntry.totalSellableStock = decimalToNumber(safePlus(bpEntry.totalSellableStock, sellable));
      bpEntry.totalRemainingStock = decimalToNumber(safePlus(bpEntry.totalRemainingStock, prod.remaining));
      bpEntry.totalWasteQuantity = decimalToNumber(safePlus(bpEntry.totalWasteQuantity, prod.waste));
      bpEntry.totalEstimatedSold = decimalToNumber(safePlus(bpEntry.totalEstimatedSold, prod.estimatedSold));
      bpEntry.totalEstimatedRevenue = decimalToNumber(safePlus(bpEntry.totalEstimatedRevenue, prod.estimatedRevenue));

      monthTotalsMap[m].totalDayProduction = decimalToNumber(safePlus(monthTotalsMap[m].totalDayProduction, prod.dayProd));
      monthTotalsMap[m].totalNightProduction = decimalToNumber(safePlus(monthTotalsMap[m].totalNightProduction, prod.nightProd));
      monthTotalsMap[m].totalSellableStock = decimalToNumber(safePlus(monthTotalsMap[m].totalSellableStock, sellable));
      monthTotalsMap[m].totalRemainingStock = decimalToNumber(safePlus(monthTotalsMap[m].totalRemainingStock, prod.remaining));
      monthTotalsMap[m].totalWasteQuantity = decimalToNumber(safePlus(monthTotalsMap[m].totalWasteQuantity, prod.waste));
      monthTotalsMap[m].totalEstimatedSold = decimalToNumber(safePlus(monthTotalsMap[m].totalEstimatedSold, prod.estimatedSold));
      monthTotalsMap[m].totalEstimatedRevenue = decimalToNumber(safePlus(monthTotalsMap[m].totalEstimatedRevenue, prod.estimatedRevenue));

      if (!branchYearlyTotalsMap[branchId]) branchYearlyTotalsMap[branchId] = {};
      if (!branchYearlyTotalsMap[branchId][m]) {
        branchYearlyTotalsMap[branchId][m] = emptyBranchMonthTotals();
      }
      const btEntry = branchYearlyTotalsMap[branchId][m];
      btEntry.totalDayProduction = decimalToNumber(safePlus(btEntry.totalDayProduction, prod.dayProd));
      btEntry.totalNightProduction = decimalToNumber(safePlus(btEntry.totalNightProduction, prod.nightProd));
      btEntry.totalSellableStock = decimalToNumber(safePlus(btEntry.totalSellableStock, sellable));
      btEntry.totalRemainingStock = decimalToNumber(safePlus(btEntry.totalRemainingStock, prod.remaining));
      btEntry.totalWasteQuantity = decimalToNumber(safePlus(btEntry.totalWasteQuantity, prod.waste));
      btEntry.totalEstimatedSold = decimalToNumber(safePlus(btEntry.totalEstimatedSold, prod.estimatedSold));
      btEntry.totalEstimatedRevenue = decimalToNumber(safePlus(btEntry.totalEstimatedRevenue, prod.estimatedRevenue));

      if (!productYearlyTotals[key]) {
        productYearlyTotals[key] = {
          productId: pid, productName: '', category: '', displayPrice,
          totalOpeningStock: 0, totalDayProduction: 0, totalNightProduction: 0,
          totalSellableStock: 0, totalRemainingStock: 0, totalWasteQuantity: 0,
          totalEstimatedSold: 0, totalEstimatedRevenue: 0,
        };
      } else {
        productYearlyTotals[key].displayPrice = displayPrice;
      }
      const pyEntry = productYearlyTotals[key];
      pyEntry.totalDayProduction = decimalToNumber(safePlus(pyEntry.totalDayProduction, prod.dayProd));
      pyEntry.totalNightProduction = decimalToNumber(safePlus(pyEntry.totalNightProduction, prod.nightProd));
      pyEntry.totalSellableStock = decimalToNumber(safePlus(pyEntry.totalSellableStock, sellable));
      pyEntry.totalRemainingStock = decimalToNumber(safePlus(pyEntry.totalRemainingStock, prod.remaining));
      pyEntry.totalWasteQuantity = decimalToNumber(safePlus(pyEntry.totalWasteQuantity, prod.waste));
      pyEntry.totalEstimatedSold = decimalToNumber(safePlus(pyEntry.totalEstimatedSold, prod.estimatedSold));
      pyEntry.totalEstimatedRevenue = decimalToNumber(safePlus(pyEntry.totalEstimatedRevenue, prod.estimatedRevenue));
    }
  }
}

async function getYearlyReport(branchId, year, category, productId) {
  const yearNum = parseInt(year);
  const pidFilter = productId ? parseInt(productId) : null;

  const branches = !branchId
    ? await prisma.branch.findMany({ orderBy: { name: 'asc' } })
    : [{ id: parseInt(branchId), name: '' }];

  const yearStart = new Date(yearNum, 0, 1);
  const yearEnd = new Date(yearNum, 11, 31);

  const monthTotalsMap = {};
  for (let m = 1; m <= 12; m++) monthTotalsMap[m] = emptyMonthTotals();

  const productYearlyTotals = {};
  const branchYearlyTotals = {};
  const branchProductsMap = {};
  const monthProductsMap = {};
  for (let m = 1; m <= 12; m++) monthProductsMap[m] = {};
  for (const branch of branches) {
    branchYearlyTotals[branch.id] = {};
    branchProductsMap[branch.id] = {};
    for (let m = 1; m <= 12; m++) {
      branchYearlyTotals[branch.id][m] = emptyBranchMonthTotals();
    }
  }
  const snapshotPriceSets = {};

  // Single price history query — shared by all branches
  const allPriceHistory = await prisma.productPriceHistory.findMany({
    where: {
      validFrom: { lte: yearEnd },
      OR: [
        { validTo: null },
        { validTo: { gt: yearStart } },
      ],
    },
    orderBy: { validFrom: 'desc' },
  });
  const historyByProduct = {};
  for (const ph of allPriceHistory) {
    if (!historyByProduct[ph.productId]) historyByProduct[ph.productId] = [];
    historyByProduct[ph.productId].push(ph);
  }

  await Promise.all(branches.map(async (branch) => {
    // ── SNAPSHOT PATH ──────────────────────────────────────────────────────
    const [snapshots] = await Promise.all([
      prisma.dailySnapshot.findMany({
        where: {
          branchId: branch.id,
          operationalDate: { gte: yearStart, lte: yearEnd },
          isInvalidated: false,
        },
        include: {
          items: {
            include: { product: { select: PRODUCT_SELECT_LOCALIZED } }
          },
        },
      }),
    ]);

    const snapshotDatesForBranch = snapshots.map(s => s.operationalDate);

    for (const snapshot of snapshots) {
      const m = snapshot.operationalDate.getMonth() + 1;
      for (const item of snapshot.items) {
        if (category && item.product.category !== category) continue;
        if (pidFilter && item.productId !== pidFilter) continue;

        const key = `${item.productId}`;
        const itemPrice = Number(item.snapshotPrice ?? 0);
        const priceKey = `${m}-${key}`;
        if (!snapshotPriceSets[priceKey]) snapshotPriceSets[priceKey] = new Set();
        snapshotPriceSets[priceKey].add(itemPrice);

        const fields = {
          opening: Number(item.openingStock) || 0,
          dayProd: Number(item.dayProduction) || 0,
          nightProd: Number(item.nightProduction) || 0,
          sellable: Number(item.sellableStock) || 0,
          remaining: Number(item.remainingStock) || 0,
          waste: Number(item.wasteQuantity) || 0,
          sold: Number(item.estimatedSold) || 0,
          revenue: Number(item.estimatedRevenue) || 0,
        };

        // Accumulate into month totals
        addToProd(monthTotalsMap[m], fields);

        // Accumulate into branch totals
        addToProd(branchYearlyTotals[branch.id][m], fields);

        // Accumulate into monthProductsMap
        if (!monthProductsMap[m][key]) {
          monthProductsMap[m][key] = createProdEntry({
            product: item.product,
            price: Number(item.snapshotPrice ?? 0) || 0,
            displayPrice: String(Number(item.snapshotPrice ?? 0) || 0),
          });
        }
        addToProd(monthProductsMap[m][key], fields);

        // Accumulate into branchProductsMap
        if (!branchProductsMap[branch.id][m]) branchProductsMap[branch.id][m] = {};
        if (!branchProductsMap[branch.id][m][key]) {
          branchProductsMap[branch.id][m][key] = createProdEntry({
            product: item.product,
            price: Number(item.snapshotPrice ?? 0) || 0,
            displayPrice: String(Number(item.snapshotPrice ?? 0) || 0),
          });
        }
        addToProd(branchProductsMap[branch.id][m][key], fields);

        // Accumulate into productYearlyTotals
        if (!productYearlyTotals[key]) {
          productYearlyTotals[key] = {
            product: item.product,
            price: Number(item.snapshotPrice ?? 0) || 0,
            displayPrice: String(Number(item.snapshotPrice ?? 0) || 0),
            totalOpeningStock: 0, totalDayProduction: 0, totalNightProduction: 0,
            totalSellableStock: 0, totalRemainingStock: 0, totalWasteQuantity: 0,
            totalEstimatedSold: 0, totalEstimatedRevenue: 0,
          };
        }
        addToProd(productYearlyTotals[key], fields);
      }
    }

    // ── LIVE PATH ───────────────────────────────────────────────────────────
    // Query production/remaining/waste for the FULL year (excluding snapshot dates)
    // then group by month in memory.
    if (snapshotDatesForBranch.length > 0) {
      const daysInYear = (yearEnd - yearStart) / 86400000 + 1;
      if (snapshotDatesForBranch.length >= daysInYear) return;
    }

    const dateExcludeAll = snapshotDatesForBranch.length > 0 ? { notIn: snapshotDatesForBranch } : {};
    const liveWhere = {
      branchId: branch.id,
      operationalDate: { gte: yearStart, lte: yearEnd, ...dateExcludeAll },
      ...(pidFilter ? { productId: pidFilter } : {}),
    };

    const [prodRecords, remainingRecords, wasteRecords] = await Promise.all([
      prisma.productionRecord.groupBy({
        by: ['productId', 'shift', 'operationalDate'],
        where: liveWhere,
        _sum: { quantity: true },
      }),
      prisma.remainingRecord.groupBy({
        by: ['productId', 'operationalDate'],
        where: { ...liveWhere, status: 'FINAL' },
        _sum: { quantity: true },
      }),
      prisma.wasteRecord.groupBy({
        by: ['productId', 'operationalDate'],
        where: liveWhere,
        _sum: { quantity: true },
      }),
    ]);

    groupLiveByMonth(prodRecords, remainingRecords, wasteRecords, historyByProduct, snapshotPriceSets, monthProductsMap, monthTotalsMap, branchYearlyTotals, branchProductsMap, branch.id, yearNum, category, pidFilter, productYearlyTotals);
  }));

  // Build months array
  const months = [];
  for (let m = 1; m <= 12; m++) {
    const monthProducts = Object.values(monthProductsMap[m]);

    months.push({
      month: m,
      monthName: MONTH_NAMES_FULL[m - 1],
      totals: monthTotalsMap[m],
      products: monthProducts,
      branchesData: !branchId ? branches.map(b => ({
        branchId: b.id,
        branchName: b.name,
        totals: branchYearlyTotals[b.id]?.[m] || emptyBranchMonthTotals(),
        products: Object.values(branchProductsMap[b.id]?.[m] || {}),
      })) : null,
    });
  }

  const aggregatedTotals = Object.values(monthTotalsMap).reduce(
    (acc, mTotals) => ({
      totalOpeningStock: decimalToNumber(safePlus(acc.totalOpeningStock, mTotals.totalOpeningStock)),
      totalDayProduction: decimalToNumber(safePlus(acc.totalDayProduction, mTotals.totalDayProduction)),
      totalNightProduction: decimalToNumber(safePlus(acc.totalNightProduction, mTotals.totalNightProduction)),
      totalNightProductionPreparedFor: decimalToNumber(safePlus(acc.totalNightProductionPreparedFor, mTotals.totalNightProductionPreparedFor)),
      totalSellableStock: decimalToNumber(safePlus(acc.totalSellableStock, mTotals.totalSellableStock)),
      totalRemainingStock: decimalToNumber(safePlus(acc.totalRemainingStock, mTotals.totalRemainingStock)),
      totalWasteQuantity: decimalToNumber(safePlus(acc.totalWasteQuantity, mTotals.totalWasteQuantity)),
      totalEstimatedSold: decimalToNumber(safePlus(acc.totalEstimatedSold, mTotals.totalEstimatedSold)),
      totalEstimatedRevenue: decimalToNumber(safePlus(acc.totalEstimatedRevenue, mTotals.totalEstimatedRevenue)),
    }),
    emptyMonthTotals()
  );

  let branchName = 'All Branches';
  if (branchId) {
    const branch = await prisma.branch.findUnique({ where: { id: parseInt(branchId) } });
    branchName = branch ? branch.name : '';
  }

  const products = Object.values(productYearlyTotals).sort((a, b) =>
    (b.totalEstimatedRevenue || 0) - (a.totalEstimatedRevenue || 0)
  );

  return {
    branchId: branchId ? parseInt(branchId) : null,
    branchName,
    year: yearNum,
    reportType: 'YEARLY',
    months,
    products,
    totals: aggregatedTotals,
    filters: { category: category || null },
  };
}

function escapeCSV(value) {
  const str = String(value ?? '');
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

function exportToCSV(reportData) {
  const headers = [
    'Product',
    'Category',
    'Opening Stock',
    'Day Production',
    'Night Production',
    'Night Prepared For Next',
    'Sellable Stock',
    'Remaining Stock',
    'Waste',
    'Estimated Sold',
    'Estimated Revenue',
  ];

  const normalizedProducts = reportData.products.map(p => ({
    productName: p.product?.name || p.productName || '',
    category: p.product?.category || p.category || '',
    openingStock: p.openingStock ?? p.totalOpeningStock ?? 0,
    dayProduction: p.dayProduction ?? p.totalDayProduction ?? 0,
    nightProduction: p.nightProduction ?? p.totalNightProduction ?? 0,
    nightProductionPreparedFor: p.nightProductionPreparedFor ?? 0,
    sellableStock: p.sellableStock ?? p.totalSellableStock ?? 0,
    remainingStock: p.remainingStock ?? p.totalRemainingStock ?? 0,
    wasteQuantity: p.wasteQuantity ?? p.totalWasteQuantity ?? 0,
    estimatedSold: p.estimatedSold ?? p.totalEstimatedSold ?? 0,
    estimatedRevenue: p.totalEstimatedRevenue ?? p.estimatedRevenue ?? 0,
  })).filter(p => p.dayProduction !== 0 || p.nightProduction !== 0 || p.sellableStock !== 0 || p.remainingStock !== 0 || p.wasteQuantity !== 0 || p.estimatedSold !== 0 || p.estimatedRevenue !== 0);

  if (normalizedProducts.length === 0) {
    return [headers.map(escapeCSV).join(','), escapeCSV('No operational activity recorded.')].join('\n');
  }

  const rows = normalizedProducts.map(p => [
    escapeCSV(p.productName),
    escapeCSV(p.category),
    p.openingStock,
    p.dayProduction,
    p.nightProduction,
    p.nightProductionPreparedFor,
    p.sellableStock,
    p.remainingStock,
    p.wasteQuantity,
    p.estimatedSold,
    p.estimatedRevenue,
  ]);

  const totalsRow = [
    escapeCSV('TOTAL'),
    '',
    reportData.totals.totalOpeningStock ?? reportData.totals.totalOpening ?? 0,
    reportData.totals.totalDayProduction ?? 0,
    reportData.totals.totalNightProduction ?? 0,
    reportData.totals.totalNightProductionPreparedFor ?? 0,
    reportData.totals.totalSellableStock ?? 0,
    reportData.totals.totalRemainingStock ?? 0,
    reportData.totals.totalWasteQuantity ?? 0,
    reportData.totals.totalEstimatedSold ?? 0,
    reportData.totals.totalEstimatedRevenue ?? 0,
  ];

  const csvContent = [
    headers.map(escapeCSV).join(','),
    ...rows.map(r => r.map(v => typeof v === 'number' ? String(v) : escapeCSV(String(v))).join(',')),
    totalsRow.map(v => typeof v === 'number' ? String(v) : escapeCSV(String(v))).join(','),
  ].join('\n');

  return csvContent;
}

module.exports = {
  getInventoryFlowReport,
  getDailyReport,
  getWeeklyReport,
  getMonthlyReport,
  getYearlyReport,
  exportToCSV,
};