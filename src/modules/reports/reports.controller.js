const reportService = require('../../services/reportService');
const { asyncHandler } = require('../../middlewares/errorHandler');

const getInventoryFlow = asyncHandler(async (req, res) => {
  const { branchId, operationalDate } = req.query;
  const report = await reportService.getInventoryFlowReport(
    branchId || req.user.branchId,
    operationalDate || new Date().toISOString().split('T')[0]
  );
  res.json({
    success: true,
    data: report,
  });
});

const getDaily = asyncHandler(async (req, res) => {
  const { branchId, operationalDate } = req.query;
  const report = await reportService.getDailyReport(
    branchId || req.user.branchId,
    operationalDate || new Date().toISOString().split('T')[0]
  );
  res.json({
    success: true,
    data: report,
  });
});

const getWeekly = asyncHandler(async (req, res) => {
  const { branchId, operationalDate } = req.query;
  const report = await reportService.getWeeklyReport(
    branchId || req.user.branchId,
    operationalDate || new Date().toISOString().split('T')[0]
  );
  res.json({
    success: true,
    data: report,
  });
});

const getMonthly = asyncHandler(async (req, res) => {
  const { branchId, operationalDate } = req.query;
  const date = operationalDate || new Date().toISOString().split('T')[0];
  const [year, month] = date.split('-');
  const report = await reportService.getMonthlyReport(
    branchId || req.user.branchId,
    parseInt(year),
    parseInt(month)
  );
  res.json({
    success: true,
    data: report,
  });
});

const exportCSV = asyncHandler(async (req, res) => {
  const { branchId, operationalDate } = req.query;
  const report = await reportService.getInventoryFlowReport(
    branchId || req.user.branchId,
    operationalDate || new Date().toISOString().split('T')[0]
  );
  const csv = reportService.exportToCSV(report);
  
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename=inventory-report-${operationalDate}.csv`);
  res.send(csv);
});

module.exports = {
  getInventoryFlow,
  getDaily,
  getWeekly,
  getMonthly,
  exportCSV,
};