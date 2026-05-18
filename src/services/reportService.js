const inventoryFlowService = require('./inventoryFlowService');
const { toDateString, getMonday, getSunday } = require('../utils/dateUtils');
const prisma = require('../config/prisma');

function filterProducts(products, category, productId) {
  let filtered = products;
  if (category) {
    filtered = filtered.filter(p => p.category === category);
  }
  if (productId) {
    filtered = filtered.filter(p => p.productId === productId);
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
    where: { isActive: true },
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

  const allProducts = new Map();
  for (const r of branchReports) {
    for (const p of r.products) {
      const key = `${p.productId}`;
      if (allProducts.has(key)) {
        const existing = allProducts.get(key);
        existing.openingStock += p.openingStock;
        existing.dayProduction += p.dayProduction;
        existing.nightProduction += p.nightProduction;
        existing.sellableStock += p.sellableStock;
        existing.remainingStock += p.remainingStock;
        existing.wasteQuantity += p.wasteQuantity;
        existing.estimatedSold += p.estimatedSold;
        existing.estimatedRevenue += p.estimatedRevenue;
        existing.branchNames.push(r.branchName);
      } else {
        allProducts.set(key, {
          ...p,
          branchName: r.branchName,
          branchNames: [r.branchName],
        });
      }
    }
  }
  const combined = Array.from(allProducts.values());
  const totals = inventoryFlowService.getTotals(combined);
  return {
    source: 'combined',
    branchId: null,
    branchName: 'All Branches',
    operationalDate: toDateString(new Date(operationalDate)),
    isClosed: false,
    products: combined,
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
    ? await prisma.branch.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } })
    : [{ id: parseInt(branchId), name: '' }];

  const inputDate = new Date(weekStartDate);
  const startDate = getMonday(inputDate);
  const weekData = [];
  let allProducts = [];

  for (let i = 0; i < 7; i++) {
    const currentDate = new Date(startDate);
    currentDate.setDate(startDate.getDate() + i);
    const dateStr = toDateString(currentDate);

    const dailyTotals = { totalOpeningStock: 0, totalDayProduction: 0, totalNightProduction: 0, totalNightProductionPreparedFor: 0, totalSellableStock: 0, totalRemainingStock: 0, totalWasteQuantity: 0, totalEstimatedSold: 0, totalEstimatedRevenue: 0 };
    let isClosed = false;
    let source = 'live';
    let dayProducts = [];
    let dayBranchesData = [];

    if (!branchId) {
      for (const b of branches) {
        const r = await inventoryFlowService.getInventoryFlowReport(b.id, dateStr);
        const filteredProducts = filterProducts(r.products, category, productId);
        const dayTotals = inventoryFlowService.getTotals(filteredProducts);
        for (const key of Object.keys(dailyTotals)) {
          dailyTotals[key] += dayTotals[key] || 0;
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
    } else {
      const r = await inventoryFlowService.getInventoryFlowReport(branchId, dateStr);
      const filteredProducts = filterProducts(r.products, category, productId);
      const dayTotals = inventoryFlowService.getTotals(filteredProducts);
      Object.assign(dailyTotals, dayTotals);
      isClosed = r.isClosed;
      source = r.source;
      dayProducts = filteredProducts;
    }

    allProducts = allProducts.concat(dayProducts);

    weekData.push({
      date: dateStr,
      dayName: currentDate.toLocaleDateString('en-US', { weekday: 'long' }),
      totals: dailyTotals,
      products: dayProducts,
      branchesData: !branchId ? dayBranchesData : null,
      isClosed,
      source,
    });
  }

  const aggregatedTotals = weekData.reduce(
    (acc, day) => ({
      totalOpeningStock: acc.totalOpeningStock + (day.totals?.totalOpeningStock || 0),
      totalDayProduction: acc.totalDayProduction + (day.totals?.totalDayProduction || 0),
      totalNightProduction: acc.totalNightProduction + (day.totals?.totalNightProduction || 0),
      totalNightProductionPreparedFor: acc.totalNightProductionPreparedFor + (day.totals?.totalNightProductionPreparedFor || 0),
      totalSellableStock: acc.totalSellableStock + (day.totals?.totalSellableStock || 0),
      totalRemainingStock: acc.totalRemainingStock + (day.totals?.totalRemainingStock || 0),
      totalWasteQuantity: acc.totalWasteQuantity + (day.totals?.totalWasteQuantity || 0),
      totalEstimatedSold: acc.totalEstimatedSold + (day.totals?.totalEstimatedSold || 0),
      totalEstimatedRevenue: acc.totalEstimatedRevenue + (day.totals?.totalEstimatedRevenue || 0),
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

  if (firstDayOfWeek !== 1) {
    const daysToSunday = (7 - firstDayOfWeek) % 7;
    if (daysToSunday > 0) {
      const partialWeekEnd = new Date(startDate);
      partialWeekEnd.setDate(partialWeekEnd.getDate() + daysToSunday);
      if (partialWeekEnd > endDate) {
        partialWeekEnd.setTime(endDate.getTime());
      }

      const weekStartStr = toDateString(currentWeekStart);
      const weekEndStr = toDateString(partialWeekEnd);

      const weekReport = await getWeeklyReport(branchId, weekStartStr, category, productId);
      weekReport.weekStartDate = weekStartStr;
      weekReport.weekEndDate = weekEndStr;
      weeks.push(weekReport);

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

    const weekStartStr = toDateString(currentWeekStart);
    const weekEndStr = toDateString(weekEnd);

    const weekReport = await getWeeklyReport(branchId, weekStartStr, category, productId);
    weekReport.weekStartDate = weekStartStr;
    weekReport.weekEndDate = weekEndStr;
    weeks.push(weekReport);

    currentWeekStart = new Date(weekEnd);
    currentWeekStart.setDate(currentWeekStart.getDate() + 1);
  }

  const aggregatedTotals = weeks.reduce(
    (acc, week) => ({
      totalOpeningStock: acc.totalOpeningStock + (week.totals?.totalOpeningStock || 0),
      totalDayProduction: acc.totalDayProduction + (week.totals?.totalDayProduction || 0),
      totalNightProduction: acc.totalNightProduction + (week.totals?.totalNightProduction || 0),
      totalNightProductionPreparedFor: acc.totalNightProductionPreparedFor + (week.totals?.totalNightProductionPreparedFor || 0),
      totalSellableStock: acc.totalSellableStock + (week.totals?.totalSellableStock || 0),
      totalRemainingStock: acc.totalRemainingStock + (week.totals?.totalRemainingStock || 0),
      totalWasteQuantity: acc.totalWasteQuantity + (week.totals?.totalWasteQuantity || 0),
      totalEstimatedSold: acc.totalEstimatedSold + (week.totals?.totalEstimatedSold || 0),
      totalEstimatedRevenue: acc.totalEstimatedRevenue + (week.totals?.totalEstimatedRevenue || 0),
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

  const allProducts = weeks.flatMap(w => w.products || []);

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

async function getYearlyReport(branchId, year, category, productId) {
  const yearNum = parseInt(year);
  const pidFilter = productId ? parseInt(productId) : null;

  const branches = !branchId
    ? await prisma.branch.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } })
    : [{ id: parseInt(branchId), name: '' }];

  const monthTotalsMap = {};
  for (let m = 1; m <= 12; m++) {
    monthTotalsMap[m] = {
      totalOpeningStock: 0,
      totalDayProduction: 0,
      totalNightProduction: 0,
      totalNightProductionPreparedFor: 0,
      totalSellableStock: 0,
      totalRemainingStock: 0,
      totalWasteQuantity: 0,
      totalEstimatedSold: 0,
      totalEstimatedRevenue: 0,
    };
  }

  const productYearlyTotals = {};
  const branchYearlyTotals = {};
  const branchProductsMap = {};
  const monthProductsMap = {};
  for (let m = 1; m <= 12; m++) {
    monthProductsMap[m] = {};
  }
  for (const branch of branches) {
    branchYearlyTotals[branch.id] = {};
    branchProductsMap[branch.id] = {};
    for (let m = 1; m <= 12; m++) {
      branchYearlyTotals[branch.id][m] = {
        totalDayProduction: 0,
        totalNightProduction: 0,
        totalSellableStock: 0,
        totalRemainingStock: 0,
        totalWasteQuantity: 0,
        totalEstimatedSold: 0,
        totalEstimatedRevenue: 0,
      };
    }

    const yearStart = new Date(yearNum, 0, 1);
    const yearEnd = new Date(yearNum, 11, 31);

    const closures = await prisma.dailyClosure.findMany({
      where: {
        branchId: branch.id,
        operationalDate: { gte: yearStart, lte: yearEnd },
        isClosed: true,
      },
    });
    const closedDates = new Set(closures.map(c => c.operationalDate.toISOString().split('T')[0]));

    const snapshots = await prisma.dailySnapshot.findMany({
      where: {
        branchId: branch.id,
        operationalDate: { gte: yearStart, lte: yearEnd },
        isInvalidated: false,
      },
      include: {
        items: {
          include: { product: { select: { id: true, name: true, category: true, price: true } } }
        },
      },
    });

    for (const snapshot of snapshots) {
      const snapshotDate = snapshot.operationalDate.toISOString().split('T')[0];
      const m = snapshot.operationalDate.getMonth() + 1;

      for (const item of snapshot.items) {
        if (category && item.product.category !== category) continue;
        if (pidFilter && item.productId !== pidFilter) continue;

        const key = `${item.productId}`;
        const opening = Number(item.openingStock) || 0;
        const dayProd = Number(item.dayProduction) || 0;
        const nightProd = Number(item.nightProduction) || 0;
        const sellable = Number(item.sellableStock) || 0;
        const remaining = Number(item.remainingStock) || 0;
        const waste = Number(item.wasteQuantity) || 0;
        const sold = Number(item.estimatedSold) || 0;
        const revenue = Number(item.estimatedRevenue) || 0;

        monthTotalsMap[m].totalOpeningStock += opening;
        monthTotalsMap[m].totalDayProduction += dayProd;
        monthTotalsMap[m].totalNightProduction += nightProd;
        monthTotalsMap[m].totalSellableStock += sellable;
        monthTotalsMap[m].totalRemainingStock += remaining;
        monthTotalsMap[m].totalWasteQuantity += waste;
        monthTotalsMap[m].totalEstimatedSold += sold;
        monthTotalsMap[m].totalEstimatedRevenue += revenue;

        branchYearlyTotals[branch.id][m].totalDayProduction += dayProd;
        branchYearlyTotals[branch.id][m].totalNightProduction += nightProd;
        branchYearlyTotals[branch.id][m].totalSellableStock += sellable;
        branchYearlyTotals[branch.id][m].totalRemainingStock += remaining;
        branchYearlyTotals[branch.id][m].totalWasteQuantity += waste;
        branchYearlyTotals[branch.id][m].totalEstimatedSold += sold;
        branchYearlyTotals[branch.id][m].totalEstimatedRevenue += revenue;

        if (!monthProductsMap[m][key]) {
          monthProductsMap[m][key] = {
            productId: item.productId,
            productName: item.product.name,
            category: item.product.category,
            price: Number(item.product.price) || 0,
            totalOpeningStock: 0,
            totalDayProduction: 0,
            totalNightProduction: 0,
            totalSellableStock: 0,
            totalRemainingStock: 0,
            totalWasteQuantity: 0,
            totalEstimatedSold: 0,
            totalEstimatedRevenue: 0,
          };
        }
        monthProductsMap[m][key].totalOpeningStock += opening;
        monthProductsMap[m][key].totalDayProduction += dayProd;
        monthProductsMap[m][key].totalNightProduction += nightProd;
        monthProductsMap[m][key].totalSellableStock += sellable;
        monthProductsMap[m][key].totalRemainingStock += remaining;
        monthProductsMap[m][key].totalWasteQuantity += waste;
        monthProductsMap[m][key].totalEstimatedSold += sold;
        monthProductsMap[m][key].totalEstimatedRevenue += revenue;

        if (!branchProductsMap[branch.id][m]) {
          branchProductsMap[branch.id][m] = {};
        }
        if (!branchProductsMap[branch.id][m][key]) {
          branchProductsMap[branch.id][m][key] = {
            productId: item.productId,
            productName: item.product.name,
            category: item.product.category,
            price: Number(item.product.price) || 0,
            totalOpeningStock: 0,
            totalDayProduction: 0,
            totalNightProduction: 0,
            totalSellableStock: 0,
            totalRemainingStock: 0,
            totalWasteQuantity: 0,
            totalEstimatedSold: 0,
            totalEstimatedRevenue: 0,
          };
        }
        branchProductsMap[branch.id][m][key].totalOpeningStock += opening;
        branchProductsMap[branch.id][m][key].totalDayProduction += dayProd;
        branchProductsMap[branch.id][m][key].totalNightProduction += nightProd;
        branchProductsMap[branch.id][m][key].totalSellableStock += sellable;
        branchProductsMap[branch.id][m][key].totalRemainingStock += remaining;
        branchProductsMap[branch.id][m][key].totalWasteQuantity += waste;
        branchProductsMap[branch.id][m][key].totalEstimatedSold += sold;
        branchProductsMap[branch.id][m][key].totalEstimatedRevenue += revenue;

        if (!productYearlyTotals[key]) {
          productYearlyTotals[key] = {
            productId: item.productId,
            productName: item.product.name,
            category: item.product.category,
            price: Number(item.product.price) || 0,
            totalOpeningStock: 0,
            totalDayProduction: 0,
            totalNightProduction: 0,
            totalSellableStock: 0,
            totalRemainingStock: 0,
            totalWasteQuantity: 0,
            totalEstimatedSold: 0,
            totalEstimatedRevenue: 0,
          };
        }
        productYearlyTotals[key].totalOpeningStock += opening;
        productYearlyTotals[key].totalDayProduction += dayProd;
        productYearlyTotals[key].totalNightProduction += nightProd;
        productYearlyTotals[key].totalSellableStock += sellable;
        productYearlyTotals[key].totalRemainingStock += remaining;
        productYearlyTotals[key].totalWasteQuantity += waste;
        productYearlyTotals[key].totalEstimatedSold += sold;
        productYearlyTotals[key].totalEstimatedRevenue += revenue;
      }
    }

    for (let m = 1; m <= 12; m++) {
      const monthStart = new Date(yearNum, m - 1, 1);
      const monthEnd = new Date(yearNum, m, 0);

      const prodRecords = await prisma.productionRecord.groupBy({
        by: ['productId', 'shift'],
        where: {
          branchId: branch.id,
          operationalDate: { gte: monthStart, lte: monthEnd },
          ...(pidFilter ? { productId: pidFilter } : {}),
        },
        _sum: { quantity: true },
      });

      const remainingRecords = await prisma.remainingRecord.groupBy({
        by: ['productId'],
        where: {
          branchId: branch.id,
          operationalDate: { gte: monthStart, lte: monthEnd },
          status: 'FINAL',
          ...(pidFilter ? { productId: pidFilter } : {}),
        },
        _sum: { quantity: true },
      });

      const wasteRecords = await prisma.wasteRecord.groupBy({
        by: ['productId'],
        where: {
          branchId: branch.id,
          operationalDate: { gte: monthStart, lte: monthEnd },
          ...(pidFilter ? { productId: pidFilter } : {}),
        },
        _sum: { quantity: true },
      });

      const dayProdMap = {};
      const nightProdMap = {};
      for (const r of prodRecords) {
        if (r.shift === 'DAY') {
          dayProdMap[r.productId] = Number(r._sum.quantity) || 0;
        } else if (r.shift === 'NIGHT') {
          nightProdMap[r.productId] = Number(r._sum.quantity) || 0;
        }
      }

      const remainingMap = {};
      for (const r of remainingRecords) {
        remainingMap[r.productId] = Number(r._sum.quantity) || 0;
      }

      const wasteMap = {};
      for (const r of wasteRecords) {
        wasteMap[r.productId] = Number(r._sum.quantity) || 0;
      }

      const products = await prisma.product.findMany({
        where: { isActive: true, ...(category ? { category } : {}), ...(pidFilter ? { id: pidFilter } : {}) },
        select: { id: true, name: true, category: true, price: true },
      });

      for (const product of products) {
        const pid = product.id;
        const dayProd = dayProdMap[pid] || 0;
        const nightProd = nightProdMap[pid] || 0;
        const remaining = remainingMap[pid] || 0;
        const waste = wasteMap[pid] || 0;

        const sellable = dayProd + nightProd;
        const estimatedSold = Math.max(0, sellable - remaining - waste);
        const estimatedRevenue = estimatedSold * (Number(product.price) || 0);
        const price = Number(product.price) || 0;

        const key = `${pid}`;

        if (!monthProductsMap[m][key]) {
          monthProductsMap[m][key] = {
            productId: pid,
            productName: product.name,
            category: product.category,
            price: price,
            totalDayProduction: 0,
            totalNightProduction: 0,
            totalSellableStock: 0,
            totalRemainingStock: 0,
            totalWasteQuantity: 0,
            totalEstimatedSold: 0,
            totalEstimatedRevenue: 0,
          };
        }
        monthProductsMap[m][key].totalDayProduction += dayProd;
        monthProductsMap[m][key].totalNightProduction += nightProd;
        monthProductsMap[m][key].totalSellableStock += sellable;
        monthProductsMap[m][key].totalRemainingStock += remaining;
        monthProductsMap[m][key].totalWasteQuantity += waste;
        monthProductsMap[m][key].totalEstimatedSold += estimatedSold;
        monthProductsMap[m][key].totalEstimatedRevenue += estimatedRevenue;

        if (!branchProductsMap[branch.id][m]) {
          branchProductsMap[branch.id][m] = {};
        }
        if (!branchProductsMap[branch.id][m][key]) {
          branchProductsMap[branch.id][m][key] = {
            productId: pid,
            productName: product.name,
            category: product.category,
            price: price,
            totalDayProduction: 0,
            totalNightProduction: 0,
            totalSellableStock: 0,
            totalRemainingStock: 0,
            totalWasteQuantity: 0,
            totalEstimatedSold: 0,
            totalEstimatedRevenue: 0,
          };
        }
        branchProductsMap[branch.id][m][key].totalDayProduction += dayProd;
        branchProductsMap[branch.id][m][key].totalNightProduction += nightProd;
        branchProductsMap[branch.id][m][key].totalSellableStock += sellable;
        branchProductsMap[branch.id][m][key].totalRemainingStock += remaining;
        branchProductsMap[branch.id][m][key].totalWasteQuantity += waste;
        branchProductsMap[branch.id][m][key].totalEstimatedSold += estimatedSold;
        branchProductsMap[branch.id][m][key].totalEstimatedRevenue += estimatedRevenue;

        monthTotalsMap[m].totalDayProduction += dayProd;
        monthTotalsMap[m].totalNightProduction += nightProd;
        monthTotalsMap[m].totalSellableStock += sellable;
        monthTotalsMap[m].totalRemainingStock += remaining;
        monthTotalsMap[m].totalWasteQuantity += waste;
        monthTotalsMap[m].totalEstimatedSold += estimatedSold;
        monthTotalsMap[m].totalEstimatedRevenue += estimatedRevenue;

        branchYearlyTotals[branch.id][m].totalDayProduction += dayProd;
        branchYearlyTotals[branch.id][m].totalNightProduction += nightProd;
        branchYearlyTotals[branch.id][m].totalSellableStock += sellable;
        branchYearlyTotals[branch.id][m].totalRemainingStock += remaining;
        branchYearlyTotals[branch.id][m].totalWasteQuantity += waste;
        branchYearlyTotals[branch.id][m].totalEstimatedSold += estimatedSold;
        branchYearlyTotals[branch.id][m].totalEstimatedRevenue += estimatedRevenue;

        if (!productYearlyTotals[key]) {
          productYearlyTotals[key] = {
            productId: pid,
            productName: product.name,
            category: product.category,
            totalOpeningStock: 0,
            totalDayProduction: 0,
            totalNightProduction: 0,
            totalSellableStock: 0,
            totalRemainingStock: 0,
            totalWasteQuantity: 0,
            totalEstimatedSold: 0,
            totalEstimatedRevenue: 0,
          };
        }
        productYearlyTotals[key].totalDayProduction += dayProd;
        productYearlyTotals[key].totalNightProduction += nightProd;
        productYearlyTotals[key].totalSellableStock += sellable;
        productYearlyTotals[key].totalRemainingStock += remaining;
        productYearlyTotals[key].totalWasteQuantity += waste;
        productYearlyTotals[key].totalEstimatedSold += estimatedSold;
        productYearlyTotals[key].totalEstimatedRevenue += estimatedRevenue;
      }
    }
  }

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
        totals: branchYearlyTotals[b.id]?.[m] || {
          totalDayProduction: 0,
          totalNightProduction: 0,
          totalSellableStock: 0,
          totalRemainingStock: 0,
          totalWasteQuantity: 0,
          totalEstimatedSold: 0,
          totalEstimatedRevenue: 0,
        },
        products: Object.values(branchProductsMap[b.id]?.[m] || {}),
      })) : null,
    });
  }

  const aggregatedTotals = Object.values(monthTotalsMap).reduce(
    (acc, mTotals) => ({
      totalOpeningStock: acc.totalOpeningStock + (mTotals.totalOpeningStock || 0),
      totalDayProduction: acc.totalDayProduction + (mTotals.totalDayProduction || 0),
      totalNightProduction: acc.totalNightProduction + (mTotals.totalNightProduction || 0),
      totalNightProductionPreparedFor: acc.totalNightProductionPreparedFor + (mTotals.totalNightProductionPreparedFor || 0),
      totalSellableStock: acc.totalSellableStock + (mTotals.totalSellableStock || 0),
      totalRemainingStock: acc.totalRemainingStock + (mTotals.totalRemainingStock || 0),
      totalWasteQuantity: acc.totalWasteQuantity + (mTotals.totalWasteQuantity || 0),
      totalEstimatedSold: acc.totalEstimatedSold + (mTotals.totalEstimatedSold || 0),
      totalEstimatedRevenue: acc.totalEstimatedRevenue + (mTotals.totalEstimatedRevenue || 0),
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
    filters: {
      category: category || null,
    },
};
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

  const rows = reportData.products.map(p => [
    p.productName,
    p.category,
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
    'TOTAL',
    '',
    reportData.totals.totalOpeningStock,
    reportData.totals.totalDayProduction,
    reportData.totals.totalNightProduction,
    reportData.totals.totalNightProductionPreparedFor,
    reportData.totals.totalSellableStock,
    reportData.totals.totalRemainingStock,
    reportData.totals.totalWasteQuantity,
    reportData.totals.totalEstimatedSold,
    reportData.totals.totalEstimatedRevenue,
  ];

  const csvContent = [
    headers.join(','),
    ...rows.map(r => r.join(',')),
    totalsRow.join(','),
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