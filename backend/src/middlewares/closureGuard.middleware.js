const { getDayStatus } = require('../utils/closureGuard');

function closureGuard(req, res, next) {
  if (req.method === 'GET') return next();

  const body = req.body || {};
  const operationalDate = body.operationalDate || req.query.operationalDate;
  const branchId = body.branchId || req.query.branchId;

  if (!operationalDate) return next();

  const resolvedBranchId = req.user?.role === 'MANAGER' ? req.user.branchId : (branchId || req.user?.branchId);
  if (!resolvedBranchId) return next();

  getDayStatus(resolvedBranchId, operationalDate)
    .then(status => {
      if (status === 'CLOSED') {
        return res.status(403).json({
          success: false,
          message: 'This operational day is closed. Reopen the day before making changes.',
        });
      }
      next();
    })
    .catch(next);
}

module.exports = closureGuard;
