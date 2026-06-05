const closureService = require('../../services/closureService');
const { asyncHandler } = require('../../middlewares/errorHandler');

function requireBranchMatch(user, branchId, label = 'branch') {
  if (user.role === 'ADMIN') return;
  if (Number(branchId) !== Number(user.branchId)) {
    const err = new Error(`You can only manage ${label} for your assigned branch`);
    err.status = 403;
    throw err;
  }
}

const getStatus = asyncHandler(async (req, res) => {
  const { branchId, operationalDate } = req.query;
  const status = await closureService.getStatus(
    branchId || req.user.branchId,
    operationalDate || new Date().toISOString().split('T')[0]
  );
  res.json({
    success: true,
    data: status,
  });
});

const validate = asyncHandler(async (req, res) => {
  const { branchId, operationalDate } = req.query;
  const effectiveBranchId = branchId || req.user.branchId;
  requireBranchMatch(req.user, effectiveBranchId, 'closures');
  const validation = await closureService.validateBeforeClose(
    effectiveBranchId,
    operationalDate || new Date().toISOString().split('T')[0]
  );
  res.json({
    success: true,
    data: validation,
  });
});

const close = asyncHandler(async (req, res) => {
  const { operationalDate, note } = req.body;
  const branchId = req.body.branchId || req.user.branchId;
  requireBranchMatch(req.user, branchId, 'closures');
  const result = await closureService.closeDay(
    branchId,
    operationalDate,
    req.user.userId,
    note
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
  const branchId = req.body.branchId || req.user.branchId;
  requireBranchMatch(req.user, branchId, 'closures');
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