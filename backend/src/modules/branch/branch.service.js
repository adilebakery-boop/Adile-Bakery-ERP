const prisma = require('../../config/prisma');
const cache = require('../../utils/cache');
const auditService = require('../../services/auditService');

const branchService = {
  async findActive() {
    const cached = cache.get('branches:active');
    if (cached) return cached;

    const branches = await prisma.branch.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });

    cache.set('branches:active', branches, 5 * 60 * 1000);
    return branches;
  },

  async create(data, userId) {
    const existingBranch = await prisma.branch.findUnique({
      where: { name: data.name },
    });

    if (existingBranch) {
      const error = new Error('Branch name already exists');
      error.code = 'P2002';
      throw error;
    }

    const branch = await prisma.branch.create({
      data: {
        name: data.name,
        name_am: data.name_am || null,
        address: data.address || null,
        phone: data.phone || null,
        isActive: true,
      },
    });

    await auditService.logAudit('branch', branch.id, 'CREATE', null, branch, userId);
    cache.invalidatePrefix('branches:');
    return branch;
  },

  async findAll(options = {}) {
    const { page = 1, limit = 10, search, sortBy = 'id', sortOrder = 'desc', isActive } = options;
    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 10;
    const skip = (pageNum - 1) * limitNum;

    const where = {};

    if (search) {
      where.name = { contains: search, mode: 'insensitive' };
    }

    if (isActive !== undefined) {
      where.isActive = isActive === 'true' || isActive === true;
    }

    const [branches, total] = await Promise.all([
      prisma.branch.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { [sortBy]: sortOrder },
      }),
      prisma.branch.count({ where }),
    ]);

    return {
      data: branches,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
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

  async update(id, data, userId) {
    const old = await this.findById(id);

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

    const branch = await prisma.branch.update({
      where: { id },
      data: {
        name: data.name,
        name_am: data.name_am !== undefined ? (data.name_am || null) : undefined,
        address: data.address || null,
        phone: data.phone || null,
        isActive: data.isActive,
      },
    });

    await auditService.logAudit('branch', branch.id, 'UPDATE', old, branch, userId);
    cache.invalidatePrefix('branches:');
    return branch;
  },

  async delete(id, userId) {
    const old = await this.findById(id);

    const branch = await prisma.branch.update({
      where: { id },
      data: { isActive: false },
    });

    await auditService.logAudit('branch', branch.id, 'DELETE', old, branch, userId);
    cache.invalidatePrefix('branches:');
    return branch;
  },

  async restore(id, userId) {
    const branch = await prisma.branch.findUnique({
      where: { id },
    });

    if (!branch) {
      const error = new Error('Branch not found');
      error.code = 'P2025';
      throw error;
    }

    const restored = await prisma.branch.update({
      where: { id },
      data: { isActive: true },
    });

    await auditService.logAudit('branch', restored.id, 'RESTORE', branch, restored, userId);
    cache.invalidatePrefix('branches:');
    return restored;
  },
};

module.exports = branchService;
