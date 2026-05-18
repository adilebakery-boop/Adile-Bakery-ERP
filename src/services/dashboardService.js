const prisma = require('../config/prisma');
const inventoryFlowService = require('./inventoryFlowService');
const { toDateString } = require('../utils/dateUtils');

async function getTodayMetrics(branchId, operationalDate) {
  const flows = await inventoryFlowService.getInventoryFlowForAllProducts(branchId, operationalDate);
  const totals = inventoryFlowService.getTotals(flows);

  const productionCompleted = flows.some(f => f.dayProduction > 0 || f.nightProduction > 0);
  const remainingSubmitted = flows.some(f => f.remainingStock > 0);
  const allProductsHaveRemaining = await checkAllProductsHaveRemaining(branchId, operationalDate);

  let status = 'PENDING_PRODUCTION';
  if (productionCompleted && allProductsHaveRemaining && remainingSubmitted) {
    status = 'READY_TO_CLOSE';
  } else if (productionCompleted && remainingSubmitted) {
    status = 'PENDING_CLOSURE';
  } else if (productionCompleted) {
    status = 'PENDING_REMAINING';
  }

  const closure = await prisma.dailyClosure.findUnique({
    where: { branchId_operationalDate: { branchId: parseInt(branchId), operationalDate: new Date(operationalDate) } },
  });

  if (closure?.isClosed) {
    status = 'CLOSED';
  }

  return {
    branchId: parseInt(branchId),
    operationalDate: toDateString(new Date(operationalDate)),
    metrics: totals,
    productionCompleted,
    remainingSubmitted,
    allProductsHaveRemaining,
    status,
    isClosed: closure?.isClosed || false,
    closedBy: closure?.closedBy || null,
    closedAt: closure?.closedAt || null,
  };
}

async function checkAllProductsHaveRemaining(branchId, operationalDate) {
  const activeProducts = await prisma.product.findMany({
    where: { isActive: true },
    select: { id: true },
  });

  const submitted = await prisma.remainingRecord.findMany({
    where: {
      branchId: parseInt(branchId),
      operationalDate: new Date(operationalDate),
      status: 'FINAL',
    },
    select: { productId: true },
  });

  const submittedIds = new Set(submitted.map(p => p.productId));
  return activeProducts.every(p => submittedIds.has(p.id));
}

async function getAllBranchesStatus(operationalDate) {
  const branches = await prisma.branch.findMany({
    where: { isActive: true },
    select: { id: true, name: true },
  });

  const statuses = await Promise.all(
    branches.map(async (branch) => {
      const metrics = await getTodayMetrics(branch.id, operationalDate);
      return {
        branchId: branch.id,
        branchName: branch.name,
        status: metrics.status,
        isClosed: metrics.isClosed,
      };
    })
  );

  return statuses;
}

async function getRecentActivity(branchId, limit = 10) {
  const opDate = new Date();
  opDate.setHours(0, 0, 0, 0);

  const [recentProductions, recentRemainings] = await Promise.all([
    prisma.productionRecord.findMany({
      where: { branchId: parseInt(branchId), operationalDate: opDate },
      include: {
        product: { select: { name: true } },
        creator: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit),
    }),
    prisma.remainingRecord.findMany({
      where: { branchId: parseInt(branchId), operationalDate: opDate },
      include: {
        product: { select: { name: true } },
        creator: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit),
    }),
  ]);

  const activities = [
    ...recentProductions.map(p => ({
      type: 'PRODUCTION',
      id: p.id,
      product: p.product.name,
      quantity: Number(p.quantity),
      shift: p.shift,
      user: p.creator.name,
      time: p.createdAt,
    })),
    ...recentRemainings.map(r => ({
      type: 'REMAINING',
      id: r.id,
      product: r.product.name,
      quantity: Number(r.quantity),
      status: r.status,
      user: r.creator.name,
      time: r.createdAt,
    })),
  ].sort((a, b) => new Date(b.time) - new Date(a.time)).slice(0, parseInt(limit));

  return activities;
}

async function getDashboardOverview(branchId, operationalDate) {
  const [metrics, activities, branchInfo] = await Promise.all([
    getTodayMetrics(branchId, operationalDate),
    getRecentActivity(branchId, 5),
    prisma.branch.findUnique({
      where: { id: parseInt(branchId) },
      select: { id: true, name: true },
    }),
  ]);

  return {
    branch: branchInfo,
    operationalDate: toDateString(new Date(operationalDate)),
    ...metrics,
    recentActivity: activities,
  };
}

module.exports = {
  getTodayMetrics,
  getAllBranchesStatus,
  getRecentActivity,
  getDashboardOverview,
};