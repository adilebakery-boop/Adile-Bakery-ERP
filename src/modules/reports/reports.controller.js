const reportService = require('../../services/reportService');
const exportService = require('../../services/exportService');
const { asyncHandler } = require('../../middlewares/errorHandler');

function resolveBranchId(branchId) {
  if (!branchId || branchId === 'all') return null;
  return parseInt(branchId);
}

function getProductName(productId, products) {
  if (!productId) return null;
  const product = products.find(p => p.id === parseInt(productId));
  return product ? product.name : null;
}

const getInventoryFlow = asyncHandler(async (req, res) => {
  const { branchId, operationalDate, category, productId } = req.query;
  const report = await reportService.getInventoryFlowReport(
    resolveBranchId(branchId),
    operationalDate || new Date().toISOString().split('T')[0],
    category || undefined,
    productId ? parseInt(productId) : undefined
  );
  res.json({ success: true, data: report });
});

const getDaily = asyncHandler(async (req, res) => {
  const { branchId, operationalDate, category, productId } = req.query;
  const report = await reportService.getDailyReport(
    resolveBranchId(branchId),
    operationalDate || new Date().toISOString().split('T')[0],
    category || undefined,
    productId ? parseInt(productId) : undefined
  );
  res.json({ success: true, data: report });
});

const getWeekly = asyncHandler(async (req, res) => {
  const { branchId, operationalDate, category, productId } = req.query;
  const report = await reportService.getWeeklyReport(
    resolveBranchId(branchId),
    operationalDate || new Date().toISOString().split('T')[0],
    category || undefined,
    productId ? parseInt(productId) : undefined
  );
  res.json({ success: true, data: report });
});

const getMonthly = asyncHandler(async (req, res) => {
  const { branchId, operationalDate, category, productId } = req.query;
  const date = operationalDate || new Date().toISOString().split('T')[0];
  const [year, month] = date.split('-');
  const report = await reportService.getMonthlyReport(
    resolveBranchId(branchId),
    parseInt(year),
    parseInt(month),
    category || undefined,
    productId ? parseInt(productId) : undefined
  );
  res.json({ success: true, data: report });
});

const getYearly = asyncHandler(async (req, res) => {
  const { branchId, operationalDate, category, productId } = req.query;
  const date = operationalDate || new Date().toISOString().split('T')[0];
  const [year] = date.split('-');
  const report = await reportService.getYearlyReport(
    resolveBranchId(branchId),
    parseInt(year),
    category || undefined,
    productId || undefined
  );
  res.json({ success: true, data: report });
});

const exportReport = asyncHandler(async (req, res) => {
  const { type, branchId, operationalDate, category, productId } = req.query;
  const resolvedBranchId = resolveBranchId(branchId);
  const dateStr = operationalDate || new Date().toISOString().split('T')[0];

  let exportMode = 'SINGLE_BRANCH';
  if (!branchId || branchId === '') {
    exportMode = 'ALL_BRANCHES';
  } else if (branchId === 'comparison') {
    exportMode = 'COMPARISON';
  }

  let reportData;
  let excelBuffer;
  let filename;

  const filters = { category, product: null };
  const generatedBy = req.user?.name || 'System';

  if (type === 'daily') {
    reportData = await reportService.getDailyReport(
      resolvedBranchId,
      dateStr,
      category || undefined,
      productId ? parseInt(productId) : undefined
    );
    excelBuffer = await exportService.exportDailyReport(reportData, {
      generatedBy,
      category,
      productName: filters.product,
      exportMode,
    });
    filename = exportService.generateFilename('daily', reportData.branchName, filters, dateStr, null, null, null, null, null, null);
  } else if (type === 'weekly') {
    reportData = await reportService.getWeeklyReport(
      resolvedBranchId,
      dateStr,
      category || undefined,
      productId ? parseInt(productId) : undefined
    );
    excelBuffer = await exportService.exportWeeklyReport(reportData, {
      generatedBy,
      category,
      productName: filters.product,
      exportMode,
    });
    filename = exportService.generateFilename('weekly', reportData.branchName, filters, null, null, null, reportData.weekStartDate, reportData.weekEndDate, null, null);
  } else if (type === 'monthly') {
    const [year, month] = dateStr.split('-');
    const monthInt = parseInt(month);
    reportData = await reportService.getMonthlyReport(
      resolvedBranchId,
      parseInt(year),
      monthInt,
      category || undefined,
      productId ? parseInt(productId) : undefined
    );
    excelBuffer = await exportService.exportMonthlyReport(reportData, {
      generatedBy,
      category,
      productName: filters.product,
      exportMode,
    });
    const monthNames = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
    const monthName = monthNames[monthInt - 1];
    const monthStartDate = `${year}-${month}-01`;
    const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
    const monthEndDate = `${year}-${month}-${lastDay}`;
    filename = exportService.generateFilename('monthly', reportData.branchName, filters, null, monthName, year, null, null, monthStartDate, monthEndDate);
  } else if (type === 'yearly') {
    const [yearStr] = dateStr.split('-');
    reportData = await reportService.getYearlyReport(
      resolvedBranchId,
      parseInt(yearStr),
      category || undefined
    );
    const yearlyExportMode = (branchId === 'comparison') ? 'COMPARISON' : exportMode;
    excelBuffer = await exportService.exportYearlyReport(reportData, {
      generatedBy,
      category,
      productName: filters.product,
      exportMode: yearlyExportMode,
    });
    filename = exportService.generateFilename('yearly', reportData.branchName, filters, null, null, yearStr, null, null, null, null);
  } else {
    return res.status(400).json({ success: false, message: 'Invalid export type' });
  }

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
  res.send(excelBuffer);
});

module.exports = {
  getInventoryFlow,
  getDaily,
  getWeekly,
  getMonthly,
  getYearly,
  exportReport,
};