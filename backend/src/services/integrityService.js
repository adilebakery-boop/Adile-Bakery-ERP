const prisma = require('../config/prisma');
const { toDateString } = require('../utils/dateUtils');
const { logAudit } = require('./auditService');

const SYSTEM_USER_ID = 1;
const SYSTEM_AUDIT_ENTITY = 'integrity_check';

async function checkSnapshotIntegrity() {
  // Verify that snapshot sellableStock = receivedTransfer - sentTransfer + base
  // for snapshots that include transfer data.
  const snapshots = await prisma.dailySnapshot.findMany({
    where: { isInvalidated: false },
    select: {
      id: true,
      branchId: true,
      operationalDate: true,
      items: {
        select: {
          id: true,
          productId: true,
          openingStock: true,
          dayProduction: true,
          nightProduction: true,
          sellableStock: true,
          receivedTransfer: true,
          sentTransfer: true,
        },
      },
    },
  });

  const issues = [];
  for (const snap of snapshots) {
    // Only check snapshots with transfer activity
    const transferItems = snap.items.filter(i => Number(i.receivedTransfer) > 0 || Number(i.sentTransfer) > 0);
    if (transferItems.length === 0) continue;

    for (const item of transferItems) {
      const base = Number(item.openingStock) + Number(item.dayProduction) + Number(item.nightProduction);
      const transferAdj = Number(item.receivedTransfer) - Number(item.sentTransfer);
      const expected = base + transferAdj;
      const actual = Number(item.sellableStock);
      if (expected !== actual) {
        issues.push({
          snapshotId: snap.id,
          branchId: snap.branchId,
          date: toDateString(snap.operationalDate),
          productId: item.productId,
          expected,
          actual,
        });
      }
    }
  }

  if (issues.length > 0) {
    try { await logAudit(SYSTEM_AUDIT_ENTITY, 0, 'SNAPSHOT_INTEGRITY_ISSUE', null, { issues }, SYSTEM_USER_ID); } catch (e) { /* ignore */ }
  }

  return { issues, ok: issues.length === 0 };
}

async function checkAll() {
  const snapshotResult = await checkSnapshotIntegrity();

  const allOk = snapshotResult.ok;

  try { await logAudit(SYSTEM_AUDIT_ENTITY, 0, 'INTEGRITY_CHECK_ALL', null, {
    snapshotResult,
    allOk,
    timestamp: new Date().toISOString(),
  }, SYSTEM_USER_ID); } catch (e) { /* ignore */ }

  return { snapshotResult, allOk };
}

module.exports = { checkSnapshotIntegrity, checkAll };
