const closureService = require('../../services/closureService');
const { asyncHandler } = require('../../middlewares/errorHandler');

const getStatus = asyncHandler(async (req, res) => {
  const { branchId, operationalDate } = req.query;
  const resolvedBranchId = req.user.role === 'MANAGER' ? req.user.branchId : (branchId || req.user.branchId);
  const status = await closureService.getStatus(
    resolvedBranchId,
    operationalDate || new Date().toISOString().split('T')[0]
  );
  res.json({
    success: true,
    data: status,
  });
});

const validate = asyncHandler(async (req, res) => {
  const { branchId, operationalDate } = req.query;
  const resolvedBranchId = req.user.role === 'MANAGER' ? req.user.branchId : (branchId || req.user.branchId);
  const validation = await closureService.validateBeforeClose(
    resolvedBranchId,
    operationalDate || new Date().toISOString().split('T')[0]
  );
  res.json({
    success: true,
    data: validation,
  });
});

const close = asyncHandler(async (req, res) => {
  const { operationalDate, note } = req.body;
  const branchId = req.user.role === 'MANAGER' ? req.user.branchId : (req.body.branchId || req.user.branchId);

  const closingEmployeeId = req.user.employeeId;
  if (!closingEmployeeId) {
    const error = new Error('Authenticated employee ID is required to close an operational day');
    error.status = 400;
    throw error;
  }

  const result = await closureService.closeDay(
    branchId,
    operationalDate,
    closingEmployeeId,
    note,
    req.user
  );
  res.json({
    success: true,
    message: 'Day closed successfully',
    data: {
      closureId: result.closure.id,
      snapshotId: result.snapshot.id,
      itemCount: result.itemCount,
    },
  });
});

const reopen = asyncHandler(async (req, res) => {
  const { operationalDate, reason } = req.body;
  const branchId = req.user.role === 'MANAGER' ? req.user.branchId : (req.body.branchId || req.user.branchId);
  const result = await closureService.reopenDay(
    branchId,
    operationalDate,
    req.user,
    reason
  );
  res.json({
    success: true,
    message: 'Day reopened successfully',
    data: result,
  });
});

module.exports = {
  getStatus,
  validate,
  close,
  reopen,
};