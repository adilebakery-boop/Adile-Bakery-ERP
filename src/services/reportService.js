const inventoryFlowService = require('./inventoryFlowService');
const { toDateString } = require('../utils/dateUtils');

async function getInventoryFlowReport(branchId, operationalDate) {
  const report = await inventoryFlowService.getInventoryFlowReport(branchId, operationalDate);
  
  return report;
}

async function getDailyReport(branchId, date) {
  const report = await inventoryFlowService.getInventoryFlowReport(branchId, date);

  return {
    ...report,
    reportType: 'DAILY',
    reportDate: toDateString(new Date(date)),
  };
}

async function getWeeklyReport(branchId, weekStartDate) {
  const startDate = new Date(weekStartDate);
  const weekData = [];

  for (let i = 0; i < 7; i++) {
    const currentDate = new Date(startDate);
    currentDate.setDate(startDate.getDate() + i);
    const dateStr = toDateString(currentDate);

    const dailyReport = await inventoryFlowService.getInventoryFlowReport(branchId, dateStr);
    weekData.push({
      date: dateStr,
      dayName: currentDate.toLocaleDateString('en-US', { weekday: 'long' }),
      totals: dailyReport.totals,
      isClosed: dailyReport.isClosed,
      source: dailyReport.source,
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

  return {
    branchId: parseInt(branchId),
    weekStartDate: toDateString(startDate),
    reportType: 'WEEKLY',
    days: weekData,
    totals: aggregatedTotals,
  };
}

async function getMonthlyReport(branchId, year, month) {
  const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
  const endDate = new Date(parseInt(year), parseInt(month), 0);
  const weeks = [];
  let currentWeekStart = new Date(startDate);

  while (currentWeekStart <= endDate) {
    const weekEnd = new Date(currentWeekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    if (weekEnd > endDate) {
      weekEnd.setTime(endDate.getTime());
    }

    const weekReport = await getWeeklyReport(branchId, toDateString(currentWeekStart));
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

  return {
    branchId: parseInt(branchId),
    year: parseInt(year),
    month: parseInt(month),
    monthName: new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString('en-US', { month: 'long' }),
    reportType: 'MONTHLY',
    weeks,
    totals: aggregatedTotals,
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
  exportToCSV,
};