const prisma = require('../../config/prisma');
const { hasRoleAccessToCategory } = require('../../security/mappings/role-categories');

const productionService = {
  async validateProductAccess(role, productId) {
    const product = await prisma.product.findUnique({
      where: { id: productId },
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
      const error = new Error(`You do not have access to ${product.category} products`);
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
    await this.validateProductAccess(user.role, data.productId);
    await this.validateBranch(data.branchId);

    // Validate quantity is positive
    if (!data.quantity || Number(data.quantity) <= 0) {
      throw new Error('Quantity must be a positive number');
    }

    // Night shift production counts as tomorrow's production
    let opDate = new Date(data.operationalDate || new Date());
    if (data.shift === 'NIGHT') {
      opDate.setDate(opDate.getDate() + 1);
    }

    const production = await prisma.productionRecord.create({
      data: {
        productId: data.productId,
        branchId: data.branchId,
        shift: data.shift,
        quantity: data.quantity,
        operationalDate: opDate,
        productionDate: opDate,
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
      operationalDate,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = options;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);
    const where = {};

    if (branchId) where.branchId = parseInt(branchId);
    if (productId) where.productId = parseInt(productId);
    if (shift) where.shift = shift;
    if (userId) where.userId = parseInt(userId);

    if (operationalDate) {
      where.operationalDate = new Date(operationalDate);
    }

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
        take,
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

  async update(id, data) {
    await this.findById(id);

    return prisma.productionRecord.update({
      where: { id },
      data: {
        quantity: data.quantity ? parseFloat(data.quantity) : undefined,
        shift: data.shift,
      },
      include: {
        product: true,
        branch: true,
        user: { select: { id: true, name: true, username: true } },
      },
    });
  },

  async delete(id) {
    await this.findById(id);

    return prisma.productionRecord.delete({ where: { id } });
  },
};

module.exports = productionService;