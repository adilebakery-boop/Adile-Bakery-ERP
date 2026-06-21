const prisma = require('../../config/prisma');

const transferService = {
  async create(data, userId) {
    const { productId, dependentBranchId, receivedQuantity, operationalDate } = data;

    const dependentBranch = await prisma.branch.findUnique({ where: { id: dependentBranchId } });
    if (!dependentBranch || dependentBranch.branchType !== 'DEPENDENT') {
      const err = new Error('Dependent branch not found or not configured as DEPENDENT');
      err.status = 400;
      throw err;
    }

    const sourceBranchId = dependentBranch.sourceBranchId;
    if (!sourceBranchId) {
      const err = new Error('Dependent branch has no source branch configured');
      err.status = 400;
      throw err;
    }

    const existing = await prisma.productTransfer.findUnique({
      where: {
        productId_sourceBranchId_dependentBranchId_operationalDate: {
          productId,
          sourceBranchId,
          dependentBranchId,
          operationalDate: new Date(operationalDate),
        },
      },
    });

    if (existing) {
      const err = new Error('Transfer already exists for this product, source, dependent, and date');
      err.status = 409;
      throw err;
    }

    const transfer = await prisma.productTransfer.create({
      data: {
        productId,
        sourceBranchId,
        dependentBranchId,
        operationalDate: new Date(operationalDate),
        receivedQuantity,
        createdBy: userId,
      },
      include: {
        product: { select: { id: true, name: true, name_am: true, category: true, unitType: true } },
        sourceBranch: { select: { id: true, name: true } },
        dependentBranch: { select: { id: true, name: true } },
      },
    });

    return transfer;
  },

  async findAll(query, user) {
    const { page = 1, limit = 20, sourceBranchId, dependentBranchId, productId, operationalDate, startDate, endDate, search } = query;
    const pageNum = Number(page) || 1;
    const limitNum = Math.min(Number(limit) || 20, 1000);
    const skip = (pageNum - 1) * limitNum;

    const where = {};

    if (sourceBranchId) where.sourceBranchId = Number(sourceBranchId);
    if (dependentBranchId) where.dependentBranchId = Number(dependentBranchId);
    if (productId) where.productId = Number(productId);
    if (operationalDate) where.operationalDate = new Date(operationalDate);
    if (startDate) {
      where.operationalDate = { ...(where.operationalDate || {}), gte: new Date(startDate) };
    }
    if (endDate) {
      where.operationalDate = { ...(where.operationalDate || {}), lte: new Date(endDate) };
    }

    if (user) {
      if (user.role === 'MANAGER' && user.branchId) {
        where.OR = [
          { sourceBranchId: Number(user.branchId) },
          { dependentBranchId: Number(user.branchId) },
        ];
      }
    }

    const [transfers, total] = await Promise.all([
      prisma.productTransfer.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        include: {
          product: { select: { id: true, name: true, name_am: true, category: true, unitType: true } },
          sourceBranch: { select: { id: true, name: true } },
          dependentBranch: { select: { id: true, name: true } },
        },
      }),
      prisma.productTransfer.count({ where }),
    ]);

    return {
      data: transfers,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    };
  },

  async findById(id) {
    const transfer = await prisma.productTransfer.findUnique({
      where: { id: Number(id) },
      include: {
        product: { select: { id: true, name: true, name_am: true, category: true, unitType: true } },
        sourceBranch: { select: { id: true, name: true } },
        dependentBranch: { select: { id: true, name: true } },
      },
    });

    if (!transfer) {
      const err = new Error('Transfer not found');
      err.status = 404;
      throw err;
    }

    return transfer;
  },

  async updateSent(id, data, userId, user) {
    const transfer = await this.findById(id);

    if (user.role !== 'ADMIN' && user.role !== 'MANAGER' && user.role !== 'TRANSFER_OPERATOR') {
      if (Number(user.branchId) !== transfer.sourceBranchId) {
        const err = new Error('You can only update sent quantity for your own source branch');
        err.status = 403;
        throw err;
      }
    }

    const updated = await prisma.productTransfer.update({
      where: { id: Number(id) },
      data: { sentQuantity: data.sentQuantity },
      include: {
        product: { select: { id: true, name: true, name_am: true, category: true, unitType: true } },
        sourceBranch: { select: { id: true, name: true } },
        dependentBranch: { select: { id: true, name: true } },
      },
    });

    return updated;
  },

  async updateReceived(id, data, userId, user) {
    const transfer = await this.findById(id);

    if (user.role !== 'ADMIN' && user.role !== 'MANAGER') {
      if (Number(user.branchId) !== transfer.dependentBranchId) {
        const err = new Error('You can only update received quantity for your own dependent branch');
        err.status = 403;
        throw err;
      }
    }

    const updated = await prisma.productTransfer.update({
      where: { id: Number(id) },
      data: { receivedQuantity: data.receivedQuantity },
      include: {
        product: { select: { id: true, name: true, name_am: true, category: true, unitType: true } },
        sourceBranch: { select: { id: true, name: true } },
        dependentBranch: { select: { id: true, name: true } },
      },
    });

    return updated;
  },
};

module.exports = transferService;
