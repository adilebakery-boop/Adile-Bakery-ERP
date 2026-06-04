const prisma = require('../config/prisma');
const closureService = require('../services/closureService');
const { toDateString } = require('../utils/dateUtils');

const JOB_NAME = 'backlog-closure';

async function processBacklog() {
  console.log(`[${JOB_NAME}] Starting backlog repair for expired reopen timers...`);

  const now = new Date();

  const adminUser = await prisma.user.findFirst({
    where: { role: { name: 'ADMIN' } },
    select: { id: true },
    orderBy: { id: 'asc' },
  });
  const systemUserId = adminUser?.id || null;

  // ONLY close reopened days whose timer has already expired.
  // Valid OPEN days and recently reopened days with active timers
  // are left alone — the cron job handles them in its own time.
  const expiredReopens = await prisma.dailyClosure.findMany({
    where: {
      isClosed: false,
      autoCloseAt: { lt: now },
    },
    select: { branchId: true, operationalDate: true },
  });

  let totalClosed = 0;

  for (const day of expiredReopens) {
    try {
      await closureService.ensureDayReadyForAutoClose(day.branchId, day.operationalDate, systemUserId);
      await closureService.closeDay(day.branchId, day.operationalDate, systemUserId, 'Auto-closed by backlog job (expired reopen timer)', {
        closureType: 'REOPEN_TIMEOUT',
        skipValidation: true,
      });
      totalClosed++;
      console.log(`[${JOB_NAME}] Closed expired reopen branch=${day.branchId} date=${toDateString(day.operationalDate)}`);
    } catch (err) {
      if (err.message === 'Day is already closed') continue;
      console.error(`[${JOB_NAME}] Error branch=${day.branchId} date=${toDateString(day.operationalDate)}: ${err.message}`);
    }
  }

  console.log(`[${JOB_NAME}] Complete. Expired reopen timers closed: ${totalClosed}`);
}

module.exports = { processBacklog };
