const prisma = require('../../config/prisma');
const { hasRoleAccessToCategory } = require('../../security/mappings/role-categories');

const productionService = {
  async validateProductAccess(role, productId) {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: { category: true },
    });

    if (!product) {
      const error = new Error('Product not found');
      error.code = 'P2025';
      throw error;
    }

    if (!product.isActive) {
      const error = new Error('Product is inactive');
      error.code = 'INACTIVE_PRODUCT';
      throw error;
    }

    if (!hasRoleAccessToCategory(role, product.category)) {
      const error = new Error(`You do not have access to ${product.category} category products`);
      error.code = 'CATEGORY_ACCESS_DENIED';
      throw error;
    }

    return product;
  },

  async validateBranch(branchId) {
    const branch = await prisma.branch.findUnique({
      where: { id: branchId },
    });

    if (!branch) {
      const error = new Error('Branch not found');
      error.code = 'P2025';
      throw error;
    }

    if (!branch.isActive) {
      const error = new Error('Branch is inactive');
      error.code = 'INACTIVE_BRANCH';
      throw error;
    }

    return branch;
  },

  async create(data, user) {
    const product = await this.validateProductAccess(user.role, data.productId);
    await this.validateBranch(data.branchId);

    const production = await prisma.productionRecord.create({
      data: {
        productId: data.productId,
        branchId: data.branchId,
        shift: data.shift,
        quantity: data.quantity,
        userId: user.userId,
      },
      include: {
        product: { select: { id: true, name: true, category: true, unitType: true } },
        branch: { select: { id: true, name: true } },
        user: { select: { id: true, name: true, username: true } },
      },
    });

    return production;
  },

  async findAll(options = {}, user) {
    const {
      page = 1,
      limit = 20,
      branchId,
      productId,
      shift,
      startDate,
      endDate,
      userId,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = options;

    const skip = (page - 1) * limit;

    const where = {};

    if (branchId) where.branchId = parseInt(branchId);
    if (productId) where.productId = parseInt(productId);
    if (shift) where.shift = shift;
    if (userId) where.userId = parseInt(userId);

    if (startDate && endDate) {
      where.createdAt = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }

    if (user.role !== 'ADMIN' && user.role !== 'MANAGER') {
      where.userId = user.userId;
    }

    const [productions, total] = await Promise.all([
      prisma.productionRecord.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          product: { select: { id: true, name: true, category: true, unitType: true } },
          branch: { select: { id: true, name: true } },
          user: { select: { id: true, name: true, username: true } },
        },
      }),
      prisma.productionRecord.count({ where }),
    ]);

    return {
      data: productions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  async findById(id) {
    const production = await prisma.productionRecord.findUnique({
      where: { id },
      include: {
        product: true,
        branch: true,
        user: { select: { id: true, name: true, username: true } },
      },
    });

    if (!production) {
      const error = new Error('Production record not found');
      error.code = 'P2025';
      throw error;
    }

    return production;
  },

  async update(id, data, user) {
    const existing = await this.findById(id);

    if (data.quantity !== undefined) {
      const quantity = parseFloat(data.quantity);
      await prisma.productionRecord.update({
        where: { id },
        data: { quantity },
      });
    }

    if (data.shift) {
      await prisma.productionRecord.update({
        where: { id },
        data: { shift: data.shift },
      });
    }

    return this.findById(id);
  },

  async delete(id) {
    await this.findById(id);

    return prisma.productionRecord.delete({
      where: { id },
    });
  },

  async getDailyProduction(branchId, date) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    return prisma.productionRecord.findMany({
      where: {
        branchId,
        createdAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      include: {
        product: { select: { id: true, name: true, category: true } },
        user: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  },

  async getShiftSummary(branchId, date, shift) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    return prisma.productionRecord.groupBy({
      by: ['productId'],
      where: {
        branchId,
        shift,
        createdAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      _sum: {
        quantity: true,
      },
    });
  },
};

module.exports = productionService;