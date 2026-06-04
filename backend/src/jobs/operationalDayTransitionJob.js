const cron = require('node-cron');
const prisma = require('../config/prisma');
const closureService = require('../services/closureService');
const { getAddisDateString, getPreviousDay, toDateString } = require('../utils/dateUtils');

const SCHEDULE = '*/5 * * * *';
const JOB_NAME = 'operational-day-transition';

let isRunning = false;

async function closeOpenDayForBranch(branchId, operationalDate) {
  const dateStr = typeof operationalDate === 'string' ? operationalDate : toDateString(operationalDate);

  const adminUser = await prisma.user.findFirst({
    where: { role: { name: 'ADMIN' } },
    select: { id: true },
    orderBy: { id: 'asc' },
  });
  const systemUserId = adminUser?.id || null;

  await closureService.ensureDayReadyForAutoClose(branchId, dateStr, systemUserId);

  await closureService.closeDay(branchId, dateStr, systemUserId, 'Auto-closed by operational day transition', {
    closureType: 'AUTO_TRANSITION',
    skipValidation: true,
  });

  console.log(`[${JOB_NAME}] Closed branch=${branchId} date=${dateStr}`);
}

async function closeExpiredReopenForBranch(branchId, operationalDate) {
  const dateStr = typeof operationalDate === 'string' ? operationalDate : toDateString(operationalDate);

  const adminUser = await prisma.user.findFirst({
    where: { role: { name: 'ADMIN' } },
    select: { id: true },
    orderBy: { id: 'asc' },
  });
  const systemUserId = adminUser?.id || null;

  await closureService.ensureDayReadyForAutoClose(branchId, dateStr, systemUserId);

  await closureService.closeDay(branchId, dateStr, systemUserId, 'Auto-closed by reopen timeout', {
    closureType: 'REOPEN_TIMEOUT',
    skipValidation: true,
  });

  console.log(`[${JOB_NAME}] Reopen timeout closed branch=${branchId} date=${dateStr}`);
}

async function processTransition() {
  if (isRunning) return;
  isRunning = true;

  try {
    const now = new Date();
    const todayStr = getAddisDateString();
    const today = new Date(todayStr);

    // Phase 1: Close expired reopen timers (any date, including today)
    const expiredReopens = await prisma.dailyClosure.findMany({
      where: {
        isClosed: false,
        autoCloseAt: { lt: now },
      },
      select: { branchId: true, operationalDate: true },
    });

    for (const day of expiredReopens) {
      try {
        await closeExpiredReopenForBranch(day.branchId, day.operationalDate);
      } catch (err) {
        if (err.message === 'Day is already closed') continue;
        console.error(`[${JOB_NAME}] Error closing expired reopen branch=${day.branchId} date=${toDateString(day.operationalDate)}:`, err.message);
      }
    }

    // Phase 2: Close all open days before today
    const branches = await prisma.branch.findMany({ select: { id: true } });

    for (const branch of branches) {
      const openDays = await prisma.dailyClosure.findMany({
        where: {
          branchId: branch.id,
          operationalDate: { lt: today },
          isClosed: false,
        },
        select: { operationalDate: true },
      });

      for (const day of openDays) {
        try {
          await closeOpenDayForBranch(branch.id, day.operationalDate);
        } catch (err) {
          if (err.message === 'Day is already closed') continue;
          console.error(`[${JOB_NAME}] Error closing branch=${branch.id} date=${toDateString(day.operationalDate)}:`, err.message);
        }
      }

      const daysWithoutClosure = await prisma.productionRecord.findMany({
        where: {
          branchId: branch.id,
          operationalDate: { lt: today },
        },
        select: { operationalDate: true },
        distinct: ['branchId', 'operationalDate'],
      });

      const daysWithWaste = await prisma.wasteRecord.findMany({
        where: {
          branchId: branch.id,
          operationalDate: { lt: today },
        },
        select: { operationalDate: true },
        distinct: ['branchId', 'operationalDate'],
      });

      const daysWithRemaining = await prisma.remainingRecord.findMany({
        where: {
          branchId: branch.id,
          operationalDate: { lt: today },
        },
        select: { operationalDate: true },
        distinct: ['branchId', 'operationalDate'],
      });

      const allOperationalDates = new Map();
      for (const r of [...daysWithoutClosure, ...daysWithWaste, ...daysWithRemaining]) {
        const dateStr = toDateString(r.operationalDate);
        allOperationalDates.set(dateStr, r.operationalDate);
      }

      const closedDates = await prisma.dailyClosure.findMany({
        where: {
          branchId: branch.id,
          operationalDate: { lt: today },
          isClosed: true,
        },
        select: { operationalDate: true },
      });
      const closedSet = new Set(closedDates.map(c => toDateString(c.operationalDate)));

      for (const [dateStr, opDate] of allOperationalDates) {
        if (closedSet.has(dateStr)) continue;

        try {
          await closeOpenDayForBranch(branch.id, opDate);
        } catch (err) {
          if (err.message === 'Day is already closed') continue;
          console.error(`[${JOB_NAME}] Error closing branch=${branch.id} date=${dateStr}:`, err.message);
        }
      }
    }
  } catch (err) {
    console.error(`[${JOB_NAME}] Error:`, err.message);
  } finally {
    isRunning = false;
  }
}

function startOperationalDayTransitionJob() {
  console.log(`[${JOB_NAME}] Scheduling with "${SCHEDULE}"`);
  cron.schedule(SCHEDULE, () => {
    processTransition().catch(err => console.error(`[${JOB_NAME}] Unhandled error:`, err.message));
  });
}

module.exports = { startOperationalDayTransitionJob, processTransition };
