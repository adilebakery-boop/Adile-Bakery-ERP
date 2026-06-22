const dashboardService = require('../../services/dashboardService');
const { asyncHandler } = require('../../middlewares/errorHandler');

const getToday = asyncHandler(async (req, res) => {
  const { operationalDate } = req.query;
  const branchId = req.user.role === 'ADMIN' ? (req.query.branchId || req.user.branchId) : req.user.branchId;
  if (req.user.role !== 'ADMIN' && !branchId) {
    return res.status(403).json({ success: false, message: 'Branch assignment required' });
  }
  const date = operationalDate || new Date().toISOString().split('T')[0];
  const metrics = await dashboardService.getTodayMetrics(branchId, date, req.user.userId, req.user.role);
  res.json({
    success: true,
    data: metrics,
  });
});

const getAllBranchesStatus = asyncHandler(async (req, res) => {
  const { operationalDate } = req.query;
  const date = operationalDate || new Date().toISOString().split('T')[0];
  let statuses = await dashboardService.getAllBranchesStatus(date);
  if (req.user.role === 'MANAGER') {
    statuses = statuses.filter(s => s.branchId === Number(req.user.branchId));
  }
  res.json({
    success: true,
    data: statuses,
    count: statuses.length,
  });
});

const getRecentActivity = asyncHandler(async (req, res) => {
  const { branchId, limit, operationalDate } = req.query;
  const date = operationalDate || new Date().toISOString().split('T')[0];
  const resolvedBranchId = req.user.role === 'ADMIN' ? (branchId || req.user.branchId) : req.user.branchId;
  if (req.user.role !== 'ADMIN' && !resolvedBranchId) {
    return res.status(403).json({ success: false, message: 'Branch assignment required' });
  }
  const activities = await dashboardService.getRecentActivity(
    resolvedBranchId,
    date,
    parseInt(limit) || 10,
    req.user.userId,
    req.user.role
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
  const resolvedBranchId = req.user.role === 'ADMIN' ? (branchId || req.user.branchId) : req.user.branchId;
  if (req.user.role !== 'ADMIN' && !resolvedBranchId) {
    return res.status(403).json({ success: false, message: 'Branch assignment required' });
  }
  const overview = await dashboardService.getDashboardOverview(
    resolvedBranchId,
    date,
    req.user.userId,
    req.user.role
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