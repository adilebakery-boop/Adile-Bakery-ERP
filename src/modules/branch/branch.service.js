const prisma = require('../../config/prisma');

const branchService = {
  async findActive() {
    return prisma.branch.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
  },

  async create(data) {
    const existingBranch = await prisma.branch.findUnique({
      where: { name: data.name },
    });

    if (existingBranch) {
      const error = new Error('Branch name already exists');
      error.code = 'P2002';
      throw error;
    }

    return prisma.branch.create({
      data: {
        name: data.name,
        name_am: data.name_am || null,
        address: data.address || null,
        phone: data.phone || null,
        isActive: true,
      },
    });
  },

  async findAll(options = {}) {
    const { page = 1, limit = 10, search, sortBy = 'id', sortOrder = 'desc' } = options;
    const skip = (page - 1) * limit;

    const where = search
      ? { name: { contains: search, mode: 'insensitive' } }
      : {};

    const [branches, total] = await Promise.all([
      prisma.branch.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
      }),
      prisma.branch.count({ where }),
    ]);

    return {
      data: branches,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  async findById(id) {
    const branch = await prisma.branch.findUnique({
      where: { id },
    });

    if (!branch) {
      const error = new Error('Branch not found');
      error.code = 'P2025';
      throw error;
    }

    return branch;
  },

  async update(id, data) {
    await this.findById(id);

    if (data.name) {
      const existingBranch = await prisma.branch.findFirst({
        where: { name: data.name, NOT: { id } },
      });

      if (existingBranch) {
        const error = new Error('Branch name already exists');
        error.code = 'P2002';
        throw error;
      }
    }

    return prisma.branch.update({
      where: { id },
      data: {
        name: data.name,
        name_am: data.name_am !== undefined ? (data.name_am || null) : undefined,
        address: data.address || null,
        phone: data.phone || null,
        isActive: data.isActive,
      },
    });
  },

  async delete(id) {
    await this.findById(id);

    return prisma.branch.delete({
      where: { id },
    });
  },

  async restore(id) {
    const branch = await prisma.branch.findUnique({
      where: { id },
    });

    if (!branch) {
      const error = new Error('Branch not found');
      error.code = 'P2025';
      throw error;
    }

    return prisma.branch.update({
      where: { id },
      data: { isActive: true },
    });
  },
};

module.exports = branchService;