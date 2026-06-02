const prisma = require('../config/prisma');
const { getAddisDateString } = require('../utils/dateUtils');

async function backfillClosures() {
  console.log('=== Backfill Closures — Data Consistency Fix ===\n');

  const todayStr = getAddisDateString();
  console.log(`Today (Addis Ababa): ${todayStr}`);

  // Collect all unique (branchId, operationalDate) pairs from operational tables
  const [productionPairs, wastePairs, remainingPairs] = await Promise.all([
    prisma.productionRecord.findMany({
      select: { branchId: true, operationalDate: true },
      distinct: ['branchId', 'operationalDate'],
    }),
    prisma.wasteRecord.findMany({
      select: { branchId: true, operationalDate: true },
      distinct: ['branchId', 'operationalDate'],
    }),
    prisma.remainingRecord.findMany({
      select: { branchId: true, operationalDate: true },
      distinct: ['branchId', 'operationalDate'],
    }),
  ]);

  // Merge into a unique set
  const pairMap = new Map();
  const addPairs = (pairs) => {
    for (const p of pairs) {
      const dateStr = p.operationalDate instanceof Date
        ? p.operationalDate.toISOString().split('T')[0]
        : String(p.operationalDate);
      const key = `${p.branchId}|${dateStr}`;
      pairMap.set(key, { branchId: p.branchId, dateStr });
    }
  };
  addPairs(productionPairs);
  addPairs(wastePairs);
  addPairs(remainingPairs);

  const allPairs = [...pairMap.values()];
  console.log(`Unique (branchId, operationalDate) pairs found: ${allPairs.length}`);

  // Filter to past dates only (strictly < today)
  const pastPairs = allPairs.filter(({ dateStr }) => dateStr < todayStr);
  console.log(`Pairs with date < today: ${pastPairs.length}`);
  console.log(`Skipping today (${todayStr}) and future dates: ${allPairs.length - pastPairs.length}`);

  if (pastPairs.length === 0) {
    console.log('\nNothing to backfill.');
    return;
  }

  // Find which pairs already have a DailyClosure record
  const existingClosures = await prisma.dailyClosure.findMany({
    where: {
      OR: pastPairs.map(({ branchId, dateStr }) => ({
        branchId,
        operationalDate: new Date(dateStr),
      })),
    },
    select: {
      branchId: true,
      operationalDate: true,
    },
  });

  const existingSet = new Set(
    existingClosures.map((c) => {
      const dateStr = c.operationalDate instanceof Date
        ? c.operationalDate.toISOString().split('T')[0]
        : String(c.operationalDate);
      return `${c.branchId}|${dateStr}`;
    })
  );

  const missingPairs = pastPairs.filter(({ branchId, dateStr }) => !existingSet.has(`${branchId}|${dateStr}`));
  console.log(`Missing closures (need backfill): ${missingPairs.length}`);

  if (missingPairs.length === 0) {
    console.log('\nAll past dates already have closures.');
    return;
  }

  // Find an admin user to use as closedBy (fall back to null)
  let adminUser = await prisma.user.findFirst({
    where: { role: { name: 'ADMIN' } },
    select: { id: true },
    orderBy: { id: 'asc' },
  });

  const closedBy = adminUser?.id || null;
  console.log(`Using closedBy: ${closedBy}${closedBy ? '' : ' (null)'}`);

  // Build DailyClosure records
  const now = new Date();
  const records = missingPairs.map(({ branchId, dateStr }) => {
    // closedAt = end of operational day in Addis Ababa
    const closedAt = new Date(`${dateStr}T20:59:59.000Z`); // 23:59:59 EAT = 20:59:59 UTC
    return {
      branchId: parseInt(branchId),
      operationalDate: new Date(dateStr),
      isClosed: true,
      closedBy,
      closedAt,
      closureType: 'AUTO_FINALIZE',
      note: 'Backfilled by system — no actual closure event occurred',
    };
  });

  // Batch create
  const BATCH_SIZE = 100;
  let created = 0;
  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE);
    await prisma.dailyClosure.createMany({ data: batch });
    created += batch.length;
    console.log(`  Created ${created}/${records.length} closures...`);
  }

  console.log(`\n=== Done. ${created} closures backfilled. ===`);
}

backfillClosures()
  .catch((err) => {
    console.error('\nBackfill failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
