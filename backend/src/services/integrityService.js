const prisma = require('../config/prisma');
const { toDateString } = require('../utils/dateUtils');
const { logAudit } = require('./auditService');

const SYSTEM_USER_ID = 1;
const SYSTEM_AUDIT_ENTITY = 'integrity_check';

async function checkTransferBalance() {
  const transfers = await prisma.productTransfer.findMany({
    where: { status: { in: ['PENDING', 'APPROVED', 'CLOSED'] } },
    select: { id: true, productId: true, sentQuantity: true, receivedQuantity: true, operationalDate: true, isDisputed: true },
  });

  const totalSent = { value: 0 };
  const totalReceived = { value: 0 };
  const newDisputeIds = [];
  const perProduct = {};

  for (const t of transfers) {
    const sent = Number(t.sentQuantity || 0);
    const received = Number(t.receivedQuantity);
    totalSent.value += sent;
    totalReceived.value += received;

    if (!perProduct[t.productId]) perProduct[t.productId] = { sent: 0, received: 0 };
    perProduct[t.productId].sent += sent;
    perProduct[t.productId].received += received;

    if (sent !== received && !t.isDisputed) {
      newDisputeIds.push(t.id);
    }
  }

  // Mark newly discovered mismatches as disputed
  if (newDisputeIds.length > 0) {
    await prisma.productTransfer.updateMany({
      where: { id: { in: newDisputeIds } },
      data: { isDisputed: true },
    });
  }

  // Aggregate per-date mismatches for audit logging
  const productMismatches = [];
  for (const [pid, v] of Object.entries(perProduct)) {
    if (v.sent !== v.received) {
      productMismatches.push({ productId: Number(pid), sent: v.sent, received: v.received });
    }
  }

  const systemOk = totalSent.value === totalReceived.value;
  const perRecordOk = newDisputeIds.length === 0;

  const result = {
    systemBalance: { sent: totalSent.value, received: totalReceived.value, ok: systemOk },
    perRecord: { disputes: newDisputeIds.length, ok: perRecordOk },
    productMismatches,
  };

  try { await logAudit(SYSTEM_AUDIT_ENTITY, 0, 'TRANSFER_BALANCE_CHECK', null, result, SYSTEM_USER_ID); } catch (e) { /* audit table may not exist or user may not exist */ }

  return result;
}

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
  const transferResult = await checkTransferBalance();
  const snapshotResult = await checkSnapshotIntegrity();

  const allOk = transferResult.systemBalance.ok && transferResult.perRecord.ok && snapshotResult.ok;

  try { await logAudit(SYSTEM_AUDIT_ENTITY, 0, 'INTEGRITY_CHECK_ALL', null, {
    transferResult,
    snapshotResult,
    allOk,
    timestamp: new Date().toISOString(),
  }, SYSTEM_USER_ID); } catch (e) { /* ignore */ }

  return { transferResult, snapshotResult, allOk };
}

module.exports = { checkTransferBalance, checkSnapshotIntegrity, checkAll };
