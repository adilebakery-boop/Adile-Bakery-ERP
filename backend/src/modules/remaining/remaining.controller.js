const remainingService = require('../../services/remainingService');
const { asyncHandler } = require('../../middlewares/errorHandler');
const { buildRemainingAccessFilter } = require('../../utils/accessFilters');

const findAll = asyncHandler(async (req, res) => {
  const { branchId, operationalDate, status, startDate, endDate } = req.query;
  const { role, userId, branchId: userBranchId } = req.user;

  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, parseInt(req.query.limit) || 20);

  const filters = { branchId, operationalDate, status, startDate, endDate, page, limit };

  const accessFilter = buildRemainingAccessFilter({ role, userId, branchId: userBranchId });
  Object.assign(filters, accessFilter);

  const { data, total } = await remainingService.findAll(filters);
  res.json({
    success: true,
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
});

const findById = asyncHandler(async (req, res) => {
  const accessFilter = buildRemainingAccessFilter(req.user);
  const remaining = await remainingService.findById(req.params.id, accessFilter);
  res.json({
    success: true,
    data: remaining,
  });
});

const findByOperationalDate = asyncHandler(async (req, res) => {
  const { branchId } = req.query;
  const { role, userId, branchId: userBranchId } = req.user;
  const accessFilter = buildRemainingAccessFilter({ role, userId, branchId: userBranchId });

  const remainings = await remainingService.findByOperationalDate(
    branchId || req.user.branchId,
    req.params.operationalDate,
    accessFilter
  );
  res.json({
    success: true,
    data: remainings,
    count: remainings.length,
  });
});

const create = asyncHandler(async (req, res) => {
  const remaining = await remainingService.create(req.body, req.user);
  res.status(201).json({
    success: true,
    message: 'Remaining record created successfully',
    data: remaining,
  });
});

const createBulk = asyncHandler(async (req, res) => {
  const remainings = await remainingService.createBulk(req.body, req.user);
  res.status(201).json({
    success: true,
    message: 'Bulk remaining records saved successfully',
    data: remainings,
    count: remainings.length,
  });
});

const update = asyncHandler(async (req, res) => {
  const remaining = await remainingService.update(req.params.id, req.body, req.user);
  res.json({
    success: true,
    message: 'Remaining record updated successfully',
    data: remaining,
  });
});

const remove = asyncHandler(async (req, res) => {
  await remainingService.remove(req.params.id, req.user);
  res.json({
    success: true,
    message: 'Remaining record deleted successfully',
  });
});

const getDrafts = asyncHandler(async (req, res) => {
  const { branchId, operationalDate } = req.query;
  const drafts = await remainingService.getDraftRemainings(
    branchId || req.user.branchId,
    operationalDate
  );
  res.json({
    success: true,
    data: drafts,
    count: drafts.length,
  });
});

const getPending = asyncHandler(async (req, res) => {
  const { branchId } = req.query;
  const pending = await remainingService.getPendingRemainings(
    branchId || req.user.branchId
  );
  res.json({
    success: true,
    data: pending,
    count: pending.length,
  });
});

module.exports = {
  findAll,
  findById,
  findByOperationalDate,
  create,
  createBulk,
  update,
  remove,
  getDrafts,
  getPending,
};