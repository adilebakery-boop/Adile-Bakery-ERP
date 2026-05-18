const dashboardService = require('../../services/dashboardService');
const { asyncHandler } = require('../../middlewares/errorHandler');

const getToday = asyncHandler(async (req, res) => {
  const { operationalDate } = req.query;
  const branchId = req.query.branchId || req.user.branchId;
  const date = operationalDate || new Date().toISOString().split('T')[0];
  const metrics = await dashboardService.getTodayMetrics(branchId, date);
  res.json({
    success: true,
    data: metrics,
  });
});

const getAllBranchesStatus = asyncHandler(async (req, res) => {
  const { operationalDate } = req.query;
  const date = operationalDate || new Date().toISOString().split('T')[0];
  const statuses = await dashboardService.getAllBranchesStatus(date);
  res.json({
    success: true,
    data: statuses,
    count: statuses.length,
  });
});

const getRecentActivity = asyncHandler(async (req, res) => {
  const { branchId, limit } = req.query;
  const activities = await dashboardService.getRecentActivity(
    branchId || req.user.branchId,
    limit || 10
  );
  res.json({
    success: true,
    data: activities,
    count: activities.length,
  });
});

const getOverview = asyncHandler(async (req, res) => {
  const { operationalDate, branchId } = req.query;
  const date = operationalDate || new Date().toISOString().split('T')[0];
  const overview = await dashboardService.getDashboardOverview(
    branchId || req.user.branchId,
    date
  );
  res.json({
    success: true,
    data: overview,
  });
});

module.exports = {
  getToday,
  getAllBranchesStatus,
  getRecentActivity,
  getOverview,
};