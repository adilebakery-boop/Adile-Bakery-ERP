const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const START_DATE = '2026-05-28';
const END_DATE = '2026-06-04';
const CLOSED_UP_TO = '2026-06-01';

const BATCH_SIZE = 500;

const BRANCH_MULTIPLIERS = { 1: 2.0, 2: 1.0, 3: 0.5 };

const CATEGORY_BASE = {
  BREAD_AND_SWEET_BREADS: { day: 80, night: 30 },
  CREAM_CAKES: { day: 20, night: 8 },
  SOFT_CAKES: { day: 30, night: 10 },
  DRY_CAKES: { day: 25, night: 8 },
  COOKIES: { day: 15, night: 5 },
  FETIRE_AND_SNACKS: { day: 40, night: 15 },
  DRINKS_AND_RETAIL_ITEMS: { day: 10, night: 5 },
};

function toDateString(d) {
  return d.toISOString().split('T')[0];
}

function rng(seed) {
  let s = seed;
  return function () {
    s = (s * 1664525 + 1013904223) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

async function cleanExistingData() {
  console.log('Cleaning existing data in date range...');
  const start = new Date(START_DATE);
  const end = new Date(END_DATE);

  const dailySnapshots = await prisma.dailySnapshot.findMany({
    where: { operationalDate: { gte: start, lte: end } },
    select: { id: true },
  });
  const snapshotIds = dailySnapshots.map(s => s.id);

  if (snapshotIds.length > 0) {
    await prisma.dailySnapshotItem.deleteMany({ where: { snapshotId: { in: snapshotIds } } });
    await prisma.dailySnapshot.deleteMany({ where: { id: { in: snapshotIds } } });
  }

  await prisma.reopenLog.deleteMany({
    where: { operationalDate: { gte: start, lte: end } },
  });

  await prisma.auditLog.deleteMany({
    where: {
      entityType: 'closure',
      entityId: { in: (await prisma.dailyClosure.findMany({
        where: { operationalDate: { gte: start, lte: end } },
        select: { id: true },
      })).map(c => c.id) },
    },
  });
  await prisma.auditLog.deleteMany({
    where: {
      entityType: 'remaining',
      entityId: { in: (await prisma.remainingRecord.findMany({
        where: { operationalDate: { gte: start, lte: end } },
        select: { id: true },
      })).map(r => r.id) },
    },
  });

  await prisma.remainingRecord.deleteMany({ where: { operationalDate: { gte: start, lte: end } } });
  await prisma.wasteRecord.deleteMany({ where: { operationalDate: { gte: start, lte: end } } });
  await prisma.productionRecord.deleteMany({ where: { operationalDate: { gte: start, lte: end } } });
  await prisma.dailyClosure.deleteMany({ where: { operationalDate: { gte: start, lte: end } } });

  console.log('  Cleanup complete');
}

async function insertOperationalData(products, branches, adminUser) {
  console.log('Inserting operational data...');

  const prodCat = {};
  for (const p of products) prodCat[p.id] = p.category;

  const startDate = new Date(START_DATE);
  const endDate = new Date(END_DATE);
  const dayCount = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;

  let prodBatch = [];
  let remBatch = [];
  let wasteBatch = [];
  let totalProd = 0;
  let totalRem = 0;
  let totalWaste = 0;

  for (let i = 0; i < dayCount; i++) {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);
    const dateStr = toDateString(d);
    const dayOfWeek = d.getDay();
    const weekendFactor = (dayOfWeek === 0 || dayOfWeek === 6) ? 0.5 : 1.0;

    const isClosedDay = dateStr <= CLOSED_UP_TO;

    for (const branch of branches) {
      const bm = BRANCH_MULTIPLIERS[branch.id] || 1.0;

      for (const product of products) {
        const base = CATEGORY_BASE[prodCat[product.id]] || { day: 20, night: 10 };
        const rand = rng(product.id * 10000 + branch.id * 1000 + i * 7 + 13);

        const dayQty = Math.max(1, Math.round(base.day * bm * weekendFactor * (0.8 + rand() * 0.4)));
        const nightQty = Math.max(0, Math.round(base.night * bm * weekendFactor * (0.7 + rand() * 0.6)));
        const sellable = dayQty + nightQty;
        const remQty = Math.max(0, Math.round(sellable * (0.08 + rand() * 0.12)));
        const wasteQty = Math.max(0, Math.round(sellable * (0.01 + rand() * 0.04)));

        prodBatch.push({
          productId: product.id,
          branchId: branch.id,
          productionDate: d,
          operationalDate: d,
          shift: 'DAY',
          quantity: dayQty,
          createdBy: adminUser.id,
        });
        prodBatch.push({
          productId: product.id,
          branchId: branch.id,
          productionDate: d,
          operationalDate: d,
          shift: 'NIGHT',
          quantity: nightQty,
          createdBy: adminUser.id,
        });

        remBatch.push({
          productId: product.id,
          branchId: branch.id,
          operationalDate: d,
          quantity: remQty,
          status: 'FINAL',
          createdBy: adminUser.id,
        });

        if (wasteQty > 0) {
          wasteBatch.push({
            productId: product.id,
            branchId: branch.id,
            operationalDate: d,
            quantity: wasteQty,
            reason: 'Production waste',
            createdBy: adminUser.id,
          });
        }

        if (prodBatch.length >= BATCH_SIZE) {
          await prisma.productionRecord.createMany({ data: prodBatch });
          totalProd += prodBatch.length;
          prodBatch = [];
        }
        if (remBatch.length >= BATCH_SIZE) {
          await prisma.remainingRecord.createMany({ data: remBatch });
          totalRem += remBatch.length;
          remBatch = [];
        }
        if (wasteBatch.length >= BATCH_SIZE) {
          await prisma.wasteRecord.createMany({ data: wasteBatch });
          totalWaste += wasteBatch.length;
          wasteBatch = [];
        }
      }
    }
    process.stdout.write('.');
  }

  if (prodBatch.length > 0) {
    await prisma.productionRecord.createMany({ data: prodBatch });
    totalProd += prodBatch.length;
  }
  if (remBatch.length > 0) {
    await prisma.remainingRecord.createMany({ data: remBatch });
    totalRem += remBatch.length;
  }
  if (wasteBatch.length > 0) {
    await prisma.wasteRecord.createMany({ data: wasteBatch });
    totalWaste += wasteBatch.length;
  }

  console.log(`\n  Production: ${totalProd}, Remaining: ${totalRem}, Waste: ${totalWaste}`);
}

async function closeDays(products, branches, adminUser) {
  console.log('Closing days (May 28 → Jun 1)...');

  const closureService = require('../src/services/closureService');

  const startDate = new Date(START_DATE);
  const closedUpTo = new Date(CLOSED_UP_TO);
  const dayCount = Math.ceil((closedUpTo - startDate) / (1000 * 60 * 60 * 24)) + 1;

  let closed = 0;
  let skipped = 0;

  for (let i = 0; i < dayCount; i++) {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);
    const dateStr = toDateString(d);

    for (const branch of branches) {
      try {
        await closureService.closeDay(branch.id, dateStr, adminUser.id);
        closed++;
      } catch (err) {
        console.log(`\n  [WARN] closeDay failed: branch=${branch.name} date=${dateStr}: ${err.message}`);
        skipped++;
      }
    }
    process.stdout.write('.');
  }

  console.log(`\n  Closed: ${closed}, Skipped: ${skipped}`);
}

async function verifyState(branches) {
  console.log('\nVerifying closure state...');

  for (const branch of branches) {
    console.log(`\n  Branch: ${branch.name} (id=${branch.id})`);

    const startDate = new Date(START_DATE);
    const endDate = new Date(END_DATE);
    const dayCount = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;

    for (let i = 0; i < dayCount; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      const dateStr = toDateString(d);

      const closure = await prisma.dailyClosure.findUnique({
        where: { branchId_operationalDate: { branchId: branch.id, operationalDate: d } },
      });

      const prodCount = await prisma.productionRecord.count({
        where: { branchId: branch.id, operationalDate: d },
      });
      const remCount = await prisma.remainingRecord.count({
        where: { branchId: branch.id, operationalDate: d },
      });
      const wasteCount = await prisma.wasteRecord.count({
        where: { branchId: branch.id, operationalDate: d },
      });

      const isClosed = closure?.isClosed || false;
      const snapCount = isClosed
        ? await prisma.dailySnapshotItem.count({
            where: { snapshot: { closureId: closure.id } },
          })
        : 0;

      const expected = dateStr <= CLOSED_UP_TO ? 'CLOSED' : 'OPEN';
      const actual = isClosed ? 'CLOSED' : 'OPEN';
      const match = expected === actual ? '✓' : '✗';

      console.log(`    ${dateStr}: ${actual}${match !== '✓' ? ` (expected ${expected}) ${match}` : ''} prod=${prodCount} rem=${remCount} waste=${wasteCount} snap=${snapCount}`);
    }
  }
}

async function main() {
  console.log('=== Seed Closure Test Dataset ===');
  console.log(`Range: ${START_DATE} → ${END_DATE}`);
  console.log(`Closed: ${START_DATE} → ${CLOSED_UP_TO} (MANUAL + snapshots)`);
  console.log(`Open: ${new Date(CLOSED_UP_TO).getTime() + 86400000 > new Date(CLOSED_UP_TO).getTime() ? 'Jun 2' : ''} → ${END_DATE} (no closures)\n`);

  const branches = await prisma.branch.findMany({ where: { isActive: true }, orderBy: { id: 'asc' } });
  const products = await prisma.product.findMany({ where: { isActive: true }, orderBy: { id: 'asc' } });
  const adminUser = await prisma.user.findFirst({ where: { role: { name: 'ADMIN' } }, orderBy: { id: 'asc' } });

  if (!adminUser) { console.error('No admin user found.'); process.exit(1); }
  if (branches.length === 0) { console.error('No branches found.'); process.exit(1); }
  if (products.length === 0) { console.error('No products found.'); process.exit(1); }

  console.log(`Branches: ${branches.length}, Products: ${products.length}, Admin: ${adminUser.name}\n`);

  await cleanExistingData();
  await insertOperationalData(products, branches, adminUser);
  await closeDays(products, branches, adminUser);
  await verifyState(branches);

  console.log('\n=== Seed complete ===');
}

main().catch(e => {
  console.error('\nFATAL:', e.message, e.stack);
  process.exit(1);
}).finally(() => prisma.$disconnect());
