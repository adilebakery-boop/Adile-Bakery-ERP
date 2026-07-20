const { PrismaClient } = require('@prisma/client');
const { getConfig } = require('./seed-config');

if (process.env.NODE_ENV === 'production' && process.env.SEED_ALLOWED !== 'true') {
  console.error('Refusing to run seed scripts in production. Set SEED_ALLOWED=true to override.');
  process.exit(1);
}

const prisma = new PrismaClient();

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

const BATCH_SIZE = 500;

// Price change schedule by product name: productName → [{ validFrom, validTo, multiplier }]
const PRICE_SCHEDULE_BY_NAME = {
  'Bread Prod 1': [
    { validFrom: '2026-04-01', validTo: '2026-05-26', multiplier: 1.0 },
    { validFrom: '2026-05-27', validTo: null, multiplier: 1.2 },
  ],
  'Bread Prod 2': [
    { validFrom: '2026-04-01', validTo: '2026-05-26', multiplier: 1.0 },
    { validFrom: '2026-05-27', validTo: null, multiplier: 1.2 },
  ],
  'Cream Cake 1': [
    { validFrom: '2026-04-01', validTo: '2026-05-26', multiplier: 1.0 },
    { validFrom: '2026-05-27', validTo: null, multiplier: 1.2 },
  ],
  'Cream Cake 2': [
    { validFrom: '2026-04-01', validTo: '2026-05-26', multiplier: 1.0 },
    { validFrom: '2026-05-27', validTo: null, multiplier: 1.2 },
  ],
};

function getDayStatus(dateStr, branchName, config) {
  const d = new Date(dateStr);
  const m = d.getMonth() + 1;
  const day = d.getDate();

  if (config.reopenScenario && branchName === 'Main Branch' && dateStr === '2026-05-15') return 'reopen';
  if (config.rolloverScenario && branchName === 'Branch 2' && dateStr === '2026-07-05') return 'rollover';

  if (m === 1) return 'closed';
  if (m === 2) return 'closed';
  if (m === 3) {
    if (day <= 5) return 'closed';
    if (day <= 15) return 'open';
    if (day <= 25) return 'closed';
    return 'open';
  }
  if (m === 4) {
    if (day <= 20) return 'open';
    if (day <= 25) return 'closed';
    return 'open';
  }
  if (m === 5) {
    if (day <= 15) return 'open';
    if (day <= 20) return 'closed';
    if (day <= 25) return 'open';
    return 'closed';
  }
  if (m === 6) {
    if (day <= 10) return 'closed';
    if (day <= 20) return 'open';
    return 'closed';
  }
  if (m === 7) return 'open';
  if (m === 8) return 'open';
  if (m === 9) return 'closed';
  if (m === 10) {
    if (day <= 15) return 'closed';
    return 'open';
  }
  if (m === 11) return 'open';
  if (m === 12) {
    if (day <= 15) return 'open';
    if (day <= 20) return 'closed';
    return 'open';
  }
  return 'open';
}

// Branch production multipliers
const BRANCH_MULTIPLIERS = { 1: 2.0, 2: 1.0, 3: 0.5 };

// Base daily production per product category
const CATEGORY_BASE = {
  BREAD_AND_SWEET_BREADS: { day: 80, night: 30 },
  CREAM_CAKES: { day: 20, night: 8 },
  SOFT_CAKES: { day: 30, night: 10 },
  DRY_CAKES: { day: 25, night: 8 },
  COOKIES: { day: 15, night: 5 },
  FETIRE_AND_SNACKS: { day: 40, night: 15 },
  DRINKS_AND_RETAIL_ITEMS: { day: 10, night: 5 },
};

async function createPriceChanges(products, config) {
  if (!config.priceChanges) {
    console.log('  Price changes: skipped');
    return;
  }

  const productByName = {};
  for (const p of products) {
    productByName[p.name] = p;
  }

  let changeCount = 0;
  for (const product of products) {
    const schedule = PRICE_SCHEDULE_BY_NAME[product.name];
    if (!schedule) continue;

    for (const change of schedule) {
      if (new Date(change.validFrom) > new Date(config.endDate)) continue;

      const newPrice = Math.round(Number(product.price) * change.multiplier * 100) / 100;

      await prisma.productPriceHistory.updateMany({
        where: { productId: product.id, validTo: null },
        data: { validTo: new Date(change.validFrom) },
      });

      await prisma.productPriceHistory.create({
        data: {
          productId: product.id,
          price: newPrice,
          validFrom: new Date(change.validFrom),
          validTo: change.validTo ? new Date(change.validTo) : null,
        },
      });

      changeCount++;
    }

    // Update the product's current price to the latest
    const latestEntry = await prisma.productPriceHistory.findFirst({
      where: { productId: product.id, validTo: null },
      orderBy: { validFrom: 'desc' },
    });
    if (latestEntry) {
      await prisma.product.update({
        where: { id: product.id },
        data: { price: latestEntry.price },
      });
    }
  }

  console.log(`  Price changes created: ${changeCount}`);
}

async function insertOperationalData(products, branches, adminUser, config) {
  console.log('  Generating operational data...');

  const startDate = new Date(config.startDate);
  const endDate = new Date(config.endDate);

  // Build a product category map
  const prodCat = {};
  for (const p of products) {
    prodCat[p.id] = p.category;
  }

  let prodBatch = [];
  let remBatch = [];
  let wasteBatch = [];
  let totalProd = 0;
  let totalRem = 0;
  let totalWaste = 0;

  const dayCount = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;

  for (let i = 0; i < dayCount; i++) {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);
    const dateStr = toDateString(d);
    const dayOfWeek = d.getDay();

    // Weekends get lower production
    const weekendFactor = (dayOfWeek === 0 || dayOfWeek === 6) ? 0.5 : 1.0;

    for (const branch of branches) {
      const bm = BRANCH_MULTIPLIERS[branch.id] || 1.0;
      const dayStatus = getDayStatus(dateStr, branch.name, config);
      const isRollover = dayStatus === 'rollover';

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
          status: isRollover ? 'DRAFT' : 'FINAL',
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
    if (i % 30 === 0) process.stdout.write('.');
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

async function closeDays(products, branches, adminUser, config) {
  console.log('  Processing closures...');

  const closureService = require('../src/services/closureService');

  const startDate = new Date(config.startDate);
  const endDate = new Date(config.endDate);
  const dayCount = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;

  let closed = 0;
  let skipped = 0;

  for (let i = 0; i < dayCount; i++) {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);
    const dateStr = toDateString(d);

    for (const branch of branches) {
      const dayStatus = getDayStatus(dateStr, branch.id, config);
      if (dayStatus === 'closed') {
        try {
          await closureService.closeDay(branch.id, dateStr, adminUser.id);
          closed++;
        } catch (err) {
          console.log(`\n  [WARN] closeDay failed: branch=${branch.name} date=${dateStr}: ${err.message}`);
          skipped++;
        }
      }
      if (dayStatus === 'reopen') {
        // Handled separately in reopenScenario phase (close → reopen → edit → re-close)
        // Skip here to avoid double-processing
      }
    }
    if (i % 30 === 0) process.stdout.write('.');
  }

  console.log(`\n  Closed: ${closed}, Skipped: ${skipped}`);
}

async function reopenScenario(products, branches, adminUser, config) {
  if (!config.reopenScenario) {
    console.log('  Reopen scenario: skipped');
    return;
  }

  console.log('  Processing reopen scenario...');

  const closureService = require('../src/services/closureService');

  const reopenBranch = branches.find(b => b.name === 'Main Branch');
  if (!reopenBranch) {
    console.log('  [WARN] Main Branch not found for reopen scenario');
    return;
  }
  const reopenBranchId = reopenBranch.id;

  const reopenDate = '2026-05-15';
  const reopenDateObj = new Date(reopenDate);

  // Construct user object matching req.user format (role as string)
  const userObj = {
    userId: adminUser.id,
    role: 'ADMIN',
    branchId: adminUser.branchId,
    isBlocked: false,
    isActive: true,
  };

  // Step 1: Close the day first
  try {
    await closureService.closeDay(reopenBranchId, reopenDate, adminUser.id);
    console.log('  closeDay succeeded');
  } catch (err) {
    console.log(`  [WARN] closeDay failed: ${err.message}`);
    return;
  }

  // Step 2: Reopen the day (invalidates old snapshot)
  try {
    await closureService.reopenDay(reopenBranchId, reopenDate, userObj, 'Seed reopen scenario: adjusting production quantities');
    console.log('  reopenDay succeeded');
  } catch (err) {
    console.log(`  [WARN] reopenDay failed: ${err.message}`);
    return;
  }

  // Step 3: Modify operational data (increase production by 30%)
  for (const product of products) {
    const existing = await prisma.productionRecord.findFirst({
      where: { branchId: reopenBranchId, operationalDate: reopenDateObj, shift: 'DAY', productId: product.id },
    });
    if (existing) {
      const newQty = Math.round(Number(existing.quantity) * 1.3);
      await prisma.productionRecord.update({
        where: { id: existing.id },
        data: { quantity: newQty },
      });
    }

    const remRecord = await prisma.remainingRecord.findFirst({
      where: { branchId: reopenBranchId, operationalDate: reopenDateObj, productId: product.id },
    });
    if (remRecord) {
      const newRemQty = Math.round(Number(remRecord.quantity) * 1.2);
      await prisma.remainingRecord.update({
        where: { id: remRecord.id },
        data: { quantity: newRemQty },
      });
    }
  }

  // Step 3: Re-close the day (creates new snapshot with updated pricing + quantities)
  try {
    await closureService.closeDay(reopenBranchId, reopenDate, adminUser.id);
    console.log('  Reopen → re-close completed successfully');
  } catch (err) {
    console.log(`  [WARN] Re-close failed: ${err.message}`);
  }
}

async function rolloverScenario(products, branches, adminUser, config) {
  if (!config.rolloverScenario) {
    console.log('  Rollover scenario: skipped');
    return;
  }

  console.log('  Processing rollover scenario...');

  const inventoryFlowService = require('../src/services/inventoryFlowService');

  const rolloverBranch = branches.find(b => b.name === 'Branch 2');
  if (!rolloverBranch) {
    console.log('  [WARN] Branch 2 not found for rollover scenario');
    return;
  }

  // The rollover day (Jul 5, Branch 2) already has DRAFT remaining records from
  // the operational data insert. resolveRollover will find them, auto-finalize,
  // and create closure + snapshot.
  try {
    await inventoryFlowService.resolveRollover(rolloverBranch.id, new Date('2026-07-06'));
    console.log('  Rollover auto-finalize completed successfully');
  } catch (err) {
    console.log(`  [WARN] Rollover failed: ${err.message}`);
  }
}

async function main() {
  const config = getConfig();
  console.log(`\nSeed schedules: dataset=${config.name} range=${config.startDate}..${config.endDate}`);
  console.log(`  Branches: ${config.branchNames.join(', ')} | Products: ${config.productIds ? 'all' : config.productIds}`);
  console.log(`  Reopen=${config.reopenScenario} Rollover=${config.rolloverScenario} PriceChanges=${config.priceChanges}`);

  const branches = await prisma.branch.findMany({
    where: { name: { in: config.branchNames }, isActive: true },
  });
  const productWhere = config.productIds ? { id: { in: config.productIds } } : { isActive: true };
  const products = await prisma.product.findMany({ where: productWhere, orderBy: { id: 'asc' } });
  const adminUser = await prisma.user.findFirst({
    where: { role: { name: 'ADMIN' } },
  });

  if (!adminUser) { console.error('No admin user found.'); process.exit(1); }
  if (branches.length === 0) { console.error('No branches found.'); process.exit(1); }
  if (products.length === 0) { console.error('No products found.'); process.exit(1); }

  console.log(`  Branches: ${branches.length}, Products: ${products.length}`);

  // Phase 1: Create PriceHistory changes
  console.log('Phase 1: Price history changes');
  await createPriceChanges(products, config);

  // Phase 2: Bulk insert operational data
  console.log('Phase 2: Operational data');
  await insertOperationalData(products, branches, adminUser, config);

  // Phase 3: Close days per pattern
  console.log('Phase 3: Day closures');
  await closeDays(products, branches, adminUser, config);

  // Phase 4: Reopen scenario (reopen → edit → re-close)
  console.log('Phase 4: Reopen scenario');
  await reopenScenario(products, branches, adminUser, config);

  // Phase 5: Rollover scenario
  console.log('Phase 5: Rollover scenario');
  await rolloverScenario(products, branches, adminUser, config);

  console.log('\nSchedule seeding complete!');
}

main().catch(e => { console.error('\nFATAL:', e.message, e.stack); process.exit(1); }).finally(() => prisma.$disconnect());
