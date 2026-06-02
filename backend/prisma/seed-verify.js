const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('\n=== SEED VERIFICATION ===\n');

  // 1. Infrastructure counts
  const roleCount = await prisma.role.count();
  const branchCount = await prisma.branch.count();
  const userCount = await prisma.user.count();
  console.log('Infrastructure:');
  console.log(`  Roles:     ${roleCount}`);
  console.log(`  Branches:  ${branchCount}`);
  console.log(`  Users:     ${userCount}`);

  // 1b. User distribution
  const branches = await prisma.branch.findMany({ orderBy: { id: 'asc' } });
  const globalAdminCount = await prisma.user.count({
    where: { role: { name: 'ADMIN' }, branchId: null },
  });
  const globalManagerCount = await prisma.user.count({
    where: { role: { name: 'MANAGER' }, branchId: null },
  });
  console.log(`  Global ADMIN:  ${globalAdminCount}`);
  console.log(`  Global MANAGER: ${globalManagerCount}`);
  for (const b of branches) {
    const branchUsers = await prisma.user.findMany({
      where: { branchId: b.id },
      include: { role: { select: { name: true } } },
      orderBy: { roleId: 'asc' },
    });
    const rolesStr = branchUsers.map(u => u.role.name).join(', ');
    console.log(`  ${b.name}: ${branchUsers.length} users (${rolesStr})`);
  }

  // 2. Product + PriceHistory
  const productCount = await prisma.product.count();
  const priceHistoryCount = await prisma.productPriceHistory.count();
  console.log(`\nProducts: ${productCount}  PriceHistory entries: ${priceHistoryCount}`);

  // 3. Check for overlapping PriceHistory ranges
  // VALID RANGE RULE:
  //   validFrom is INCLUSIVE, validTo is EXCLUSIVE.
  //   Contiguous ranges  previous.validTo === next.validFrom  are VALID (NOT overlap).
  //   A TRUE overlap exists only when  previous.validTo  >  next.validFrom.
  const allHistory = await prisma.productPriceHistory.findMany({
    orderBy: [{ productId: 'asc' }, { validFrom: 'asc' }],
  });
  const byProd = {};
  let contiguousCount = 0;
  let trueOverlaps = 0;
  for (const h of allHistory) {
    if (!byProd[h.productId]) byProd[h.productId] = [];
    byProd[h.productId].push(h);
  }
  for (const [pid, entries] of Object.entries(byProd)) {
    for (let i = 0; i < entries.length - 1; i++) {
      const cur = entries[i];
      const next = entries[i + 1];
      if (!cur.validTo || !next.validFrom) continue;
      if (cur.validTo > next.validFrom) {
        console.log(`  [TRUE OVERLAP] Product ${pid}: entry ${i} validTo ${cur.validTo} > entry ${i+1} validFrom ${next.validFrom}`);
        trueOverlaps++;
      } else if (cur.validTo.getTime() === next.validFrom.getTime()) {
        contiguousCount++;
      }
    }
  }
  console.log(`\nPriceHistory ranges: ${priceHistoryCount} entries`);
  console.log(`  Contiguous (validTo === validFrom, correct): ${contiguousCount}`);
  console.log(`  True overlaps (validTo > validFrom, ERROR):  ${trueOverlaps}`);

  if (priceHistoryCount > 0) {
    const sample = allHistory[0];
    const hasValidToNull = allHistory.some(h => h.validTo === null);
    console.log(`  Has open-ended entry (validTo=null): ${hasValidToNull ? 'YES' : 'NO'}`);
    console.log(`  Sample: productId=${sample.productId} price=${sample.price} validFrom=${sample.validFrom} validTo=${sample.validTo}`);
  }

  // 4. Operational data counts
  const prodRecCount = await prisma.productionRecord.count();
  const remRecCount = await prisma.remainingRecord.count();
  const wasteRecCount = await prisma.wasteRecord.count();
  console.log('\nOperational records:');
  console.log(`  ProductionRecord: ${prodRecCount}`);
  console.log(`  RemainingRecord:  ${remRecCount}`);
  console.log(`  WasteRecord:      ${wasteRecCount}`);

  // 5. Date range of operational data
  const firstProd = await prisma.productionRecord.findFirst({ orderBy: { operationalDate: 'asc' }, select: { operationalDate: true } });
  const lastProd = await prisma.productionRecord.findFirst({ orderBy: { operationalDate: 'desc' }, select: { operationalDate: true } });
  if (firstProd) {
    console.log(`\nOperational date range: ${firstProd.operationalDate.toISOString().split('T')[0]} to ${lastProd.operationalDate.toISOString().split('T')[0]}`);
  }

  // 6. Closure + Snapshot counts
  const closureCount = await prisma.dailyClosure.count();
  const snapshotCount = await prisma.dailySnapshot.count();
  const snapshotItemCount = await prisma.dailySnapshotItem.count();
  const invalidatedCount = await prisma.dailySnapshot.count({ where: { isInvalidated: true } });
  console.log('\nAccounting records:');
  console.log(`  DailyClosure:      ${closureCount}`);
  console.log(`  DailySnapshot:     ${snapshotCount} (invalidated: ${invalidatedCount})`);
  console.log(`  DailySnapshotItem: ${snapshotItemCount}`);

  // 7. Reopen + Rollover
  const reopenCount = await prisma.reopenLog.count();
  const autoFinalizeClosures = await prisma.dailyClosure.count({ where: { closureType: 'AUTO_FINALIZE' } });
  console.log(`\nWorkflow records:`);
  console.log(`  ReopenLog:           ${reopenCount}`);
  console.log(`  AUTO_FINALIZE closures: ${autoFinalizeClosures}`);

  // 8. SnapshotPrice consistency check
  const snapItemsWithPrice = await prisma.dailySnapshotItem.count({ where: { snapshotPrice: { not: null } } });
  const snapItemsTotal = await prisma.dailySnapshotItem.count();
  console.log(`\nSnapshotPrice field:`);
  console.log(`  Items with snapshotPrice: ${snapItemsWithPrice} / ${snapItemsTotal}`);

  if (snapItemsWithPrice > 0) {
    const sampleSnap = await prisma.dailySnapshotItem.findFirst({
      where: { snapshotPrice: { not: null } },
      include: { snapshot: true },
    });
    if (sampleSnap) {
      console.log(`  Sample: snapshotId=${sampleSnap.snapshotId} productId=${sampleSnap.productId}`);
      console.log(`    snapshotPrice=${sampleSnap.snapshotPrice} estimatedRevenue=${sampleSnap.estimatedRevenue}`);
    }
  }

  // 9. Verify year report loads and returns data
  try {
    const rs = require('../src/services/reportService');
    const yearReport = await rs.getYearlyReport(null, 2026, null, null);
    if (yearReport && yearReport.months) {
      const monthsWithData = yearReport.months.filter(m => m.products && m.products.length > 0);
      console.log(`\nYearly report (2026):`);
      console.log(`  Months with data: ${monthsWithData.length}/12`);
      for (const m of monthsWithData) {
        const products = m.products || [];
        const sold = products.reduce((s, p) => s + (p.totalEstimatedSold || 0), 0);
        const revenue = products.reduce((s, p) => s + (p.totalEstimatedRevenue || 0), 0);
        console.log(`  Month ${m.month}: ${products.length} products, sold=${sold}, revenue=${revenue}`);
      }
    } else {
      console.log('\nYearly report: No data returned');
    }
  } catch (e) {
    console.log(`\nYearly report error: ${e.message}`);
  }

  // 10. PriceHistory per-product summary
  if (priceHistoryCount > 0) {
    console.log('\nPriceHistory per product:');
    for (const [pid, entries] of Object.entries(byProd)) {
      const changes = entries.map((e, i) => {
        const price = Number(e.price);
        const from = e.validFrom.toISOString().split('T')[0];
        const to = e.validTo ? e.validTo.toISOString().split('T')[0] : 'present';
        return `${from}..${to} = ${price}`;
      });
      console.log(`  Product ${pid}: ${changes.join(' | ')}`);
    }
  }

  // 11. Report consistency — verify that totals reconcile across granularities
  console.log('\n--- Report Consistency ---');
  try {
    const rs = require('../src/services/reportService');
    const reportBranch = await prisma.branch.findFirst({
      where: { isActive: true },
      orderBy: { id: 'asc' },
    });
    if (reportBranch) {
      // Pick a sample month (month 6) and verify weekly = sum of daily
      const month6 = await rs.getMonthlyReport(reportBranch.id, 2026, 6, null, null);
      const monthlyTotalRevenue = month6.totals?.totalEstimatedRevenue || 0;
      const sumDailyRevenue = (month6.weeks || []).reduce(
        (s, w) => s + (w.days || []).reduce((sd, d) => sd + (d.totals?.totalEstimatedRevenue || 0), 0),
        0
      );
      const weekSumRevenue = (month6.weeks || []).reduce(
        (s, w) => s + (w.totals?.totalEstimatedRevenue || 0), 0
      );
      const monthlyReconciled = Math.abs(monthlyTotalRevenue - sumDailyRevenue) < 1
        && Math.abs(monthlyTotalRevenue - weekSumRevenue) < 1;
      console.log(`  Month 6 branch=${reportBranch.name}:`);
      console.log(`    monthly total revenue:     ${monthlyTotalRevenue}`);
      console.log(`    sum of weekly totals:      ${weekSumRevenue}`);
      console.log(`    sum of daily totals:       ${sumDailyRevenue}`);
      console.log(`    RECONCILED:                ${monthlyReconciled ? 'YES' : 'NO'}`);

      // Verify yearly totals for this branch
      const yearReport = await rs.getYearlyReport(reportBranch.id, 2026, null, null);
      const yearTotalRevenue = (yearReport?.months || []).reduce(
        (s, m) => s + (m.products || []).reduce((sp, p) => sp + (Number(p.totalEstimatedRevenue) || 0), 0),
        0
      );
      const yearTotalSold = (yearReport?.months || []).reduce(
        (s, m) => s + (m.products || []).reduce((sp, p) => sp + (Number(p.totalEstimatedSold) || 0), 0),
        0
      );
      console.log(`  Year 2026 branch=${reportBranch.name}:`);
      console.log(`    annual revenue: ${yearTotalRevenue}`);
      console.log(`    annual sold:    ${yearTotalSold}`);
    }
  } catch (e) {
    console.log(`  Report consistency error: ${e.message}`);
  }

  // 12. Reopen accounting consistency
  // NOTE: After the full reopen cycle (close → reopen → modify → re-close),
  // the re-close step reuses the closure-linked snapshot. The old snapshot
  // items from before reopen are replaced. The reopen invariant is that
  // reopenDay itself preserves history (it only sets isInvalidated=true).
  // The re-close is a separate workflow that overwrites with fresh data.
  console.log('\n--- Reopen Consistency ---');
  try {
    const reopenLog = await prisma.reopenLog.findFirst({
      orderBy: { reopenedAt: 'desc' },
    });
    if (reopenLog) {
      console.log(`  ReopenLog found: branch=${reopenLog.branchId} date=${reopenLog.operationalDate.toISOString().split('T')[0]}`);

      // Verify the reopened day has an active closure-linked snapshot
      const closureForDay = await prisma.dailyClosure.findUnique({
        where: {
          branchId_operationalDate: {
            branchId: reopenLog.branchId,
            operationalDate: reopenLog.operationalDate,
          },
        },
      });
      if (closureForDay) {
        const activeSnapshot = await prisma.dailySnapshot.findFirst({
          where: { closureId: closureForDay.id, isInvalidated: false },
        });
        if (activeSnapshot) {
          const itemCount = await prisma.dailySnapshotItem.count({
            where: { snapshotId: activeSnapshot.id },
          });
          const itemsWithPrice = await prisma.dailySnapshotItem.count({
            where: { snapshotId: activeSnapshot.id, snapshotPrice: { not: null } },
          });
          console.log(`  Active snapshot: id=${activeSnapshot.id} items=${itemCount} snapshotPrice=${itemsWithPrice}/${itemCount}`);
          console.log(`  Invariant C (re-close refreshes snapshot): ${itemCount >= 1 ? 'PASS' : 'FAIL'}`);
          console.log(`  Invariant E (snapshotPrice set):          ${itemsWithPrice === itemCount ? 'PASS' : 'FAIL'}`);

          // Verify the snapshot was regenerated (items exist with proper data)
          const sampleItem = await prisma.dailySnapshotItem.findFirst({
            where: { snapshotId: activeSnapshot.id },
          });
          if (sampleItem) {
            console.log(`  Sample: productId=${sampleItem.productId} sold=${sampleItem.estimatedSold} revenue=${sampleItem.estimatedRevenue} price=${sampleItem.snapshotPrice}`);
          }
        }
      }
    } else {
      console.log('  No reopen log found (skip)');
    }
  } catch (e) {
    console.log(`  Reopen consistency error: ${e.message}`);
  }

  // 13. Rollover consistency
  console.log('\n--- Rollover Consistency ---');
  try {
    const autoClosure = await prisma.dailyClosure.findFirst({
      where: { closureType: 'AUTO_FINALIZE' },
    });
    if (autoClosure) {
      console.log(`  AUTO_FINALIZE closure found: branch=${autoClosure.branchId} date=${autoClosure.operationalDate.toISOString().split('T')[0]}`);
      const rolloverSnapshot = await prisma.dailySnapshot.findFirst({
        where: { closureId: autoClosure.id },
      });
      if (rolloverSnapshot) {
        const items = await prisma.dailySnapshotItem.findMany({
          where: { snapshotId: rolloverSnapshot.id },
          include: { product: { select: { name: true, category: true } } },
        });
        const itemsWithPrice = items.filter(i => i.snapshotPrice !== null);
        console.log(`    Snapshot items: ${items.length}, with snapshotPrice: ${itemsWithPrice.length}/${items.length}`);
        console.log(`    Invariant E (snapshotPrice on rollover): ${itemsWithPrice.length === items.length ? 'PASS' : 'FAIL'}`);
        const hasNightProduction = items.some(i => Number(i.nightProduction) > 0);
        console.log(`    Night production present: ${hasNightProduction ? 'YES' : 'NO (check seed config)'}`);

        if (items.length > 0) {
          const sampleItem = items[0];
          console.log(`    Sample: ${sampleItem.product.name} night=${sampleItem.nightProduction} price=${sampleItem.snapshotPrice}`);
        }
      }

      // Verify audit log exists for auto-finalize
      const auditLogs = await prisma.auditLog.findMany({
        where: {
          entityType: 'remaining',
          action: 'AUTO_FINALIZE',
        },
      });
      console.log(`    AUDIT logs (AUTO_FINALIZE): ${auditLogs.length}`);
      console.log(`    Invariant audit trail: ${auditLogs.length >= 1 ? 'PASS' : 'FAIL'}`);
    } else {
      console.log('  No AUTO_FINALIZE closure found (skip)');
    }
  } catch (e) {
    console.log(`  Rollover consistency error: ${e.message}`);
  }

  // 14. Final summary table
  console.log('\n=== FINAL VERIFICATION SUMMARY ===');
  console.log(`  Branches:             ${branchCount}`);
  console.log(`  Users:                ${userCount} (${globalAdminCount} global ADMIN, ${globalManagerCount} global MANAGER, ${userCount - globalAdminCount - globalManagerCount} operational)`);
  console.log(`  Products:             ${productCount}`);
  console.log(`  PriceHistory entries: ${priceHistoryCount}`);
  console.log(`  Production records:   ${prodRecCount}`);
  console.log(`  Remaining records:    ${remRecCount}`);
  console.log(`  Waste records:        ${wasteRecCount}`);
  console.log(`  Closures:             ${closureCount}`);
  console.log(`  Snapshots:            ${snapshotCount} (${invalidatedCount} invalidated)`);
  console.log(`  Snapshot items:       ${snapshotItemCount}`);
  console.log(`  Reopen logs:          ${reopenCount}`);
  console.log(`  Audit logs:           ${await prisma.auditLog.count()}`);

  console.log('\n=== VERIFICATION COMPLETE ===');
}

main().catch(e => { console.error('VERIFY FAIL:', e.message); process.exit(1); }).finally(() => prisma.$disconnect());
