const prisma = require('../config/prisma');

async function getDayStatus(branchId, operationalDate) {
  const branchIdInt = parseInt(branchId);
  const opDate = new Date(operationalDate);

  const closure = await prisma.dailyClosure.findUnique({
    where: { branchId_operationalDate: { branchId: branchIdInt, operationalDate: opDate } },
    select: { isClosed: true },
  });

  if (!closure) return 'OPEN';
  if (!closure.isClosed) return 'REOPENED';
  return 'CLOSED';
}

async function requireDayNotClosed(branchId, operationalDate) {
  const status = await getDayStatus(branchId, operationalDate);
  if (status === 'CLOSED') {
    const error = new Error('This operational day is closed. Reopen the day before making changes.');
    error.status = 403;
    throw error;
  }
}

function resolveBranchId(user, requestBranchId) {
  if (user?.role === 'MANAGER') return parseInt(user.branchId);
  return requestBranchId || user?.branchId || null;
}

module.exports = { getDayStatus, requireDayNotClosed, resolveBranchId };
