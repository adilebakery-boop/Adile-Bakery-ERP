const prisma = require('../config/prisma');
const inventoryFlowService = require('./inventoryFlowService');
const { toDateString } = require('../utils/dateUtils');

async function getAllBranchesOverview(operationalDate) {
  const opDate = new Date(operationalDate);
  opDate.setHours(0, 0, 0, 0);

  const branches = await prisma.branch.findMany({
    where: { isActive: true },
    select: { id: true, name: true },
  });

  let totalProduction = 0;
  let totalEstimatedSold = 0;
  let totalRemaining = 0;
  let totalPendingDrafts = 0;
  let allFinalized = true;
  const branchData = [];

  for (const branch of branches) {
    const flows = await inventoryFlowService.getInventoryFlowForAllProducts(branch.id, operationalDate);
    const totals = inventoryFlowService.getTotals(flows);

    const pendingDrafts = await prisma.remainingRecord.count({
      where: {
        branchId: branch.id,
        operationalDate: opDate,
        status: 'DRAFT',
      },
    });

    const totalBranchProduction = (totals.totalDayProduction || 0) + (totals.totalNightProduction || 0);
    totalProduction += totalBranchProduction;
    totalEstimatedSold += totals.totalEstimatedSold || 0;
    totalRemaining += totals.totalRemainingStock || 0;
    totalPendingDrafts += pendingDrafts;

    if (pendingDrafts > 0) {
      allFinalized = false;
    }

    branchData.push({
      branchId: branch.id,
      branchName: branch.name,
      production: totalBranchProduction,
      estimatedSold: totals.totalEstimatedSold || 0,
      remaining: totals.totalRemainingStock || 0,
      pendingDrafts,
      isFinalized: pendingDrafts === 0,
    });
  }

  return {
    isAllBranches: true,
    totalProduction,
    totalEstimatedSold,
    totalRemaining,
    pendingDrafts: totalPendingDrafts,
    allFinalized,
    branches: branchData,
  };
}

async function getTodayMetrics(branchId, operationalDate, userId, userRole) {
  const isManager = userRole === 'ADMIN' || userRole === 'MANAGER';
  const userFilter = isManager ? {} : { createdBy: parseInt(userId) };
  
  const opDateStr = operationalDate || new Date().toISOString().split('T')[0];
  const opDate = new Date(opDateStr + 'T00:00:00.000Z');
  
  // Get user's productions for today
  const productions = await prisma.productionRecord.findMany({
    where: {
      branchId: parseInt(branchId),
      operationalDate: opDate,
      ...userFilter
    },
    select: { quantity: true, shift: true }
  });
  
  // Get user's remainings for today
  const remainings = await prisma.remainingRecord.findMany({
    where: {
      branchId: parseInt(branchId),
      operationalDate: opDate,
      ...userFilter
    },
    select: { quantity: true, status: true }
  });
  
  // Get previous day's remaining for opening stock
  const prevDate = new Date(opDate);
  prevDate.setDate(prevDate.getDate() - 1);
  const prevDayRemainings = await prisma.remainingRecord.findMany({
    where: {
      branchId: parseInt(branchId),
      operationalDate: prevDate,
      status: 'FINAL',
      ...userFilter
    },
    select: { quantity: true }
  });
  
  // Calculate totals
  let totalDayProduction = 0;
  let totalNightProduction = 0;
  let totalRemainingStock = 0;
  let totalOpeningStock = 0;
  
  // Opening stock = previous day's remaining
  for (const r of prevDayRemainings) {
    totalOpeningStock += Number(r.quantity);
  }
  
  for (const p of productions) {
    if (p.shift === 'DAY') {
      totalDayProduction += Number(p.quantity);
    } else {
      totalNightProduction += Number(p.quantity);
    }
  }
  
  const finalRemainings = remainings.filter(r => r.status === 'FINAL');
  for (const r of finalRemainings) {
    totalRemainingStock += Number(r.quantity);
  }
  
  // Calculate estimated sold
  const totalProduction = totalDayProduction + totalNightProduction;
  const sellableStock = totalOpeningStock + totalProduction;
  const totalEstimatedSold = Math.max(0, sellableStock - totalRemainingStock);
  
  const totals = {
    totalDayProduction,
    totalNightProduction,
    totalRemainingStock,
    totalEstimatedSold,
  };
  
  const productionCompleted = productions.length > 0;
  const remainingSubmitted = finalRemainings.length > 0;

  const closure = await prisma.dailyClosure.findUnique({
    where: { branchId_operationalDate: { branchId: parseInt(branchId), operationalDate: opDate } },
  });

  return {
    branchId: parseInt(branchId),
    operationalDate: toDateString(new Date(operationalDate)),
    metrics: totals,
    productionCompleted,
    remainingSubmitted,
    allProductsHaveRemaining: remainingSubmitted,
    status: closure?.isClosed ? 'CLOSED' : (productionCompleted ? (remainingSubmitted ? 'COMPLETED' : 'PENDING_REMAINING') : 'PENDING_PRODUCTION'),
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

async function getRecentActivity(branchId, operationalDate, limit = 10, userId, userRole) {
  // Use the date string directly to avoid timezone issues
  const opDateStr = operationalDate || new Date().toISOString().split('T')[0];
  
  // Only managers/admins see all data, others only see their own
  const isManager = userRole === 'ADMIN' || userRole === 'MANAGER';
  const userFilter = isManager ? {} : { createdBy: parseInt(userId) };

  if (!branchId || branchId === 'all') {

    const [recentProductions, recentRemainings] = await Promise.all([
      prisma.productionRecord.findMany({
        where: { 
          operationalDate: new Date(opDateStr + 'T00:00:00.000Z'),
          ...userFilter
        },
        include: {
          product: { select: { name: true } },
          creator: { select: { name: true } },
          branch: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: parseInt(limit),
      }),
      prisma.remainingRecord.findMany({
        where: { 
          operationalDate: new Date(opDateStr + 'T00:00:00.000Z'),
          ...userFilter
        },
        include: {
          product: { select: { name: true } },
          creator: { select: { name: true } },
          branch: { select: { name: true } },
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
        branchName: p.branch?.name || '',
        quantity: Number(p.quantity),
        shift: p.shift,
        user: p.creator.name,
        time: p.createdAt,
      })),
      ...recentRemainings.map(r => ({
        type: 'REMAINING',
        id: r.id,
        product: r.product.name,
        branchName: r.branch?.name || '',
        quantity: Number(r.quantity),
        status: r.status,
        user: r.creator.name,
        time: r.createdAt,
      })),
    ].sort((a, b) => new Date(b.time) - new Date(a.time)).slice(0, parseInt(limit));

    return activities;
  }

  const [recentProductions, recentRemainings] = await Promise.all([
    prisma.productionRecord.findMany({
      where: { 
        branchId: parseInt(branchId), 
        operationalDate: new Date(opDateStr + 'T00:00:00.000Z'),
        ...userFilter
      },
      include: {
        product: { select: { name: true } },
        creator: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit),
    }),
    prisma.remainingRecord.findMany({
      where: { 
        branchId: parseInt(branchId), 
        operationalDate: new Date(opDateStr + 'T00:00:00.000Z'),
        ...userFilter
      },
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

async function getDashboardOverview(branchId, operationalDate, userId, userRole) {
  const isAllBranches = !branchId || branchId === 'all' || branchId === 'null' || branchId === 'undefined' || branchId === '';
  const isManager = userRole === 'ADMIN' || userRole === 'MANAGER';
  
  if (isAllBranches) {
    const allBranchesData = await getAllBranchesOverview(operationalDate, userId, userRole);
    const activities = await getRecentActivity(null, operationalDate, 5, userId, userRole);
    return {
      isAllBranches: true,
      operationalDate: toDateString(new Date(operationalDate)),
      ...allBranchesData,
      recentActivity: activities,
    };
  }

  const opDateStr = operationalDate || new Date().toISOString().split('T')[0];
  
  // Filter by user for non-managers
  const userFilter = isManager ? {} : { createdBy: parseInt(userId) };

  const [metrics, activities, branchInfo, pendingDraftsCount] = await Promise.all([
    getTodayMetrics(branchId, operationalDate, userId, userRole),
    getRecentActivity(branchId, operationalDate, 5, userId, userRole),
    prisma.branch.findUnique({
      where: { id: parseInt(branchId) },
      select: { id: true, name: true },
    }),
    prisma.remainingRecord.count({
      where: {
        branchId: parseInt(branchId),
        operationalDate: new Date(opDateStr + 'T00:00:00.000Z'),
        status: 'DRAFT',
        ...(isManager ? {} : { createdBy: parseInt(userId) }),
      },
    }),
  ]);

  const totals = metrics.metrics || {};
  const totalProduction = (totals.totalDayProduction || 0) + (totals.totalNightProduction || 0);

  return {
    branch: branchInfo,
    operationalDate: toDateString(new Date(operationalDate)),
    totalProduction,
    totalEstimatedSold: totals.totalEstimatedSold || 0,
    totalRemaining: totals.totalRemainingStock || 0,
    pendingDrafts: pendingDraftsCount,
    allFinalized: pendingDraftsCount === 0,
    recentActivity: activities,
  };
}

module.exports = {
  getTodayMetrics,
  getAllBranchesStatus,
  getRecentActivity,
  getDashboardOverview,
};