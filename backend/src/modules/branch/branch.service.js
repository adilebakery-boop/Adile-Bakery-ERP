const prisma = require('../../config/prisma');
const cache = require('../../utils/cache');
const auditService = require('../../services/auditService');

const branchService = {
  async findActive(user) {
    const isManager = user?.role === 'MANAGER';
    const cacheKey = isManager ? `branches:active:${user.branchId}` : 'branches:active';

    const cached = cache.get(cacheKey);
    if (cached) return cached;

    const where = { isActive: true };
    if (isManager && user?.branchId) {
      where.id = Number(user.branchId);
    }

    const branches = await prisma.branch.findMany({
      where,
      orderBy: { name: 'asc' },
    });

    cache.set(cacheKey, branches, 5 * 60 * 1000);
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
        branchType: data.branchType || 'INDEPENDENT',
        sourceBranchId: data.sourceBranchId || null,
      },
    });

    await auditService.logAudit('branch', branch.id, 'CREATE', null, branch, userId);
    cache.invalidatePrefix('branches:');
    return branch;
  },

  async findAll(options = {}, user) {
    const { page = 1, limit = 10, search, sortBy = 'id', sortOrder = 'desc', isActive } = options;
    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 10;
    const skip = (pageNum - 1) * limitNum;

    const where = { isActive: true };

    if (user?.role === 'MANAGER' && user?.branchId) {
      where.id = Number(user.branchId);
    }

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
        address: data.address !== undefined ? (data.address || null) : undefined,
        phone: data.phone !== undefined ? (data.phone || null) : undefined,
        isActive: data.isActive !== undefined ? data.isActive : undefined,
        branchType: data.branchType || undefined,
        sourceBranchId:
          data.sourceBranchId !== undefined
            ? (data.sourceBranchId ? Number(data.sourceBranchId) : null)
            : undefined,
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

  async permanentDelete(id, actor) {
    const branch = await prisma.branch.findUnique({
      where: { id },
    });

    if (!branch) {
      const error = new Error('Branch not found');
      error.code = 'P2025';
      error.status = 404;
      throw error;
    }

    if (branch.isActive) {
      const error = new Error('Branch must be deactivated before permanent removal');
      error.status = 400;
      throw error;
    }

    if (branch.id === 1) {
      const error = new Error('The primary system branch cannot be permanently deleted');
      error.status = 403;
      throw error;
    }

    const totalBranches = await prisma.branch.count();
    if (totalBranches <= 1) {
      const error = new Error('Cannot delete the only branch in the system');
      error.status = 400;
      throw error;
    }

    const dependentBranchesCount = await prisma.branch.count({
      where: { sourceBranchId: id },
    });
    if (dependentBranchesCount > 0) {
      const error = new Error('Cannot delete branch: other branches depend on it as a source branch');
      error.status = 400;
      throw error;
    }

    const employeeCount = await prisma.employee.count({
      where: { primaryBranchId: id },
    });
    if (employeeCount > 0) {
      const error = new Error('Cannot delete branch: employees are currently assigned to this branch. Please reassign employees first');
      error.status = 400;
      throw error;
    }

    const activeUserCount = await prisma.user.count({
      where: { branchId: id, isActive: true },
    });
    if (activeUserCount > 0) {
      const error = new Error('Cannot delete branch: active users are assigned to this branch. Please reassign or deactivate users first');
      error.status = 400;
      throw error;
    }

    const [prodCount, remCount, wasteCount, closureCount, transferCount] = await Promise.all([
      prisma.productionRecord.count({ where: { branchId: id } }),
      prisma.remainingRecord.count({ where: { branchId: id } }),
      prisma.wasteRecord.count({ where: { branchId: id } }),
      prisma.dailyClosure.count({ where: { branchId: id } }),
      prisma.productTransfer.count({
        where: { OR: [{ sourceBranchId: id }, { dependentBranchId: id }] },
      }),
    ]);

    if (prodCount + remCount + wasteCount + closureCount + transferCount > 0) {
      const error = new Error('Cannot permanently delete branch: historical operational records exist. Deactivate the branch instead to preserve history');
      error.status = 400;
      throw error;
    }

    await prisma.$transaction(async (tx) => {
      await tx.user.updateMany({
        where: { branchId: id },
        data: { branchId: null },
      });

      await tx.rolloverCache.deleteMany({
        where: { key: { startsWith: `${id}-` } },
      });

      await tx.branch.delete({
        where: { id },
      });

      await tx.auditLog.create({
        data: {
          entityType: 'branch',
          entityId: id,
          action: 'PERMANENT_DELETE',
          oldValue: branch,
          newValue: {
            deletedAt: new Date().toISOString(),
            branchName: branch.name,
            branchId: id,
            deletedBy: actor?.name || 'System',
          },
          employeeId: actor?.employeeId || null,
          actorName: actor?.name || 'System',
        },
      });
    });

    cache.invalidatePrefix('branches:');
    return { success: true, id };
  },
};

module.exports = branchService;
