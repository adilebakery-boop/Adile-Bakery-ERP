const cron = require("node-cron");
const prisma = require("../config/prisma");
const closureService = require("./closureService");
const integrityService = require("./integrityService");
const { subDays } = require("date-fns");
const { toDateString, getPreviousDay } = require("../utils/dateUtils");

const SYSTEM_CLOSURE_ACTOR = {
  userId: null,
  employeeId: null,
  role: 'ADMIN',
  name: 'System Auto-Close',
  branchId: null,
};

async function autoCloseOldOpenDays() {
  const todayStr = toDateString(new Date());

  const threeDaysAgo = getPreviousDay(
    getPreviousDay(getPreviousDay(new Date())),
  );

  const dateFilter = { gte: subDays(new Date(), 30) };

  const [productionPairs, wastePairs, remainingPairs] = await Promise.all([
    prisma.productionRecord.findMany({
      select: { branchId: true, operationalDate: true },
      distinct: ["branchId", "operationalDate"],
      where: { operationalDate: dateFilter },
    }),
    prisma.wasteRecord.findMany({
      select: { branchId: true, operationalDate: true },
      distinct: ["branchId", "operationalDate"],
      where: { operationalDate: dateFilter },
    }),
    prisma.remainingRecord.findMany({
      select: { branchId: true, operationalDate: true },
      distinct: ["branchId", "operationalDate"],
      where: { operationalDate: dateFilter },
    }),
  ]);

  const pairMap = new Map();
  for (const p of [...productionPairs, ...wastePairs, ...remainingPairs]) {
    const key = `${p.branchId}|${toDateString(p.operationalDate)}`;
    pairMap.set(key, { branchId: p.branchId, date: p.operationalDate });
  }

  const pastPairs = [];
  for (const [, pair] of pairMap) {
    const dateStr = toDateString(pair.date);
    if (dateStr < todayStr && pair.date <= threeDaysAgo) {
      pastPairs.push(pair);
    }
  }

  if (pastPairs.length === 0) return;

  const existingClosures = await prisma.dailyClosure.findMany({
    where: {
      OR: pastPairs.map((p) => ({
        branchId: p.branchId,
        operationalDate: p.date,
      })),
    },
    select: {
      branchId: true,
      operationalDate: true,
      isClosed: true,
      reopenedAt: true,
    },
  });

  const openDays = [];
  for (const pair of pastPairs) {
    const match = existingClosures.find(
      (c) =>
        c.branchId === pair.branchId &&
        c.operationalDate.getTime() === pair.date.getTime(),
    );
    if (!match) {
      openDays.push(pair);
    } else if (!match.isClosed && !match.reopenedAt) {
      openDays.push(pair);
    }
  }

  let closed = 0;
  for (const day of openDays) {
    try {
      await closureService.closeDay(
        day.branchId,
        toDateString(day.date),
        null,
        "Auto-closed: day past 3-day edit window",
        SYSTEM_CLOSURE_ACTOR,
        "AUTO_FINALIZE",
      );
      closed++;
      console.log(
        `[CLOSURE_SCHEDULER] auto-closed OPEN day branchId=${day.branchId} date=${toDateString(day.date)}`,
      );
    } catch (err) {
      console.error(
        `[CLOSURE_SCHEDULER] Failed to auto-close OPEN day branchId=${day.branchId} date=${toDateString(day.date)}:`,
        err.message,
      );
    }
  }

  if (closed > 0) {
    console.log(
      `[CLOSURE_SCHEDULER] autoCloseOldOpenDays: ${closed} day(s) closed`,
    );
  }
}

async function autoCloseExpiredReopenedDays() {
  const now = new Date();

  const expired = await prisma.dailyClosure.findMany({
    where: {
      isClosed: false,
      reopenedAt: { not: null },
      autoCloseAt: { lte: now },
    },
    select: { branchId: true, operationalDate: true },
  });

  if (expired.length === 0) return;

  let closed = 0;
  for (const day of expired) {
    try {
      await closureService.closeDay(
        day.branchId,
        toDateString(day.operationalDate),
        null,
        "Auto-closed: reopen window (3h) expired",
        SYSTEM_CLOSURE_ACTOR,
        "AUTO_FINALIZE",
      );
      closed++;
      console.log(
        `[CLOSURE_SCHEDULER] auto-closed REOPENED day branchId=${day.branchId} date=${toDateString(day.operationalDate)}`,
      );
    } catch (err) {
      console.error(
        `[CLOSURE_SCHEDULER] Failed to auto-close REOPENED day branchId=${day.branchId} date=${toDateString(day.operationalDate)}:`,
        err.message,
      );
    }
  }

  if (closed > 0) {
    console.log(
      `[CLOSURE_SCHEDULER] autoCloseExpiredReopenedDays: ${closed} day(s) closed`,
    );
  }
}

async function runClosureScheduler() {
  console.log("[CLOSURE_SCHEDULER] Starting scheduled run...");
  await Promise.all([
    autoCloseOldOpenDays(),
    autoCloseExpiredReopenedDays(),
  ]);

  // Nightly integrity check (fire-and-forget after closures)
  try {
    const result = await integrityService.checkAll();
    if (!result.allOk) {
      console.log("[INTEGRITY] Issues found:", JSON.stringify({ snapshotOk: result.snapshotResult.ok }));
    } else {
      console.log("[INTEGRITY] All checks passed");
    }
  } catch (err) {
    console.error("[INTEGRITY] Check failed:", err.message);
  }

  console.log("[CLOSURE_SCHEDULER] Scheduled run complete");
}

function startClosureScheduler() {
  runClosureScheduler().catch((err) => {
    console.error("[CLOSURE_SCHEDULER] Initial run error:", err.message);
  });

  cron.schedule("0 */2 * * *", () => {
    runClosureScheduler().catch((err) => {
      console.error("[CLOSURE_SCHEDULER] Error:", err.message);
    });
  });

  console.log(
    "[CLOSURE_SCHEDULER] Cron scheduled: every 2 hours (at minute 0)",
  );
}

module.exports = { startClosureScheduler, runClosureScheduler };
