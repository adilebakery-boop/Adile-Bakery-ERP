const productionService = require('../../services/productionService');
const { asyncHandler } = require('../../middlewares/errorHandler');
const { buildProductionAccessFilter } = require('../../utils/accessFilters');

const findAllGrouped = asyncHandler(async (req, res) => {
  const { branchId, operationalDate, shift, productId, startDate, endDate, page, limit } = req.query;
  const { role, userId, branchId: userBranchId } = req.user;

  const filters = { branchId, operationalDate, shift, productId, startDate, endDate, page, limit };

  const accessFilter = buildProductionAccessFilter({ role, userId, branchId: userBranchId });
  Object.assign(filters, accessFilter);

  const result = await productionService.findAllGrouped(filters, req.user);
  res.json({
    success: true,
    data: result.data,
    pagination: {
      page: result.page,
      limit: result.limit,
      total: result.total,
      totalPages: result.totalPages,
    },
  });
});

const findById = asyncHandler(async (req, res) => {
  const production = await productionService.findById(req.params.id);
  res.json({
    success: true,
    data: production,
  });
});

const findByOperationalDate = asyncHandler(async (req, res) => {
  const { branchId, shift } = req.query;
  const productions = await productionService.findByOperationalDate(
    branchId || req.user.branchId,
    req.params.operationalDate,
    shift
  );
  res.json({
    success: true,
    data: productions,
    count: productions.length,
  });
});

const create = asyncHandler(async (req, res) => {
  const production = await productionService.create(req.body, req.user);
  res.status(201).json({
    success: true,
    message: 'Production record created successfully',
    data: production,
  });
});

const update = asyncHandler(async (req, res) => {
  const production = await productionService.update(req.params.id, req.body, req.user);
  res.json({
    success: true,
    message: 'Production record updated successfully',
    data: production,
  });
});

const remove = asyncHandler(async (req, res) => {
  await productionService.remove(req.params.id, req.user);
  res.json({
    success: true,
    message: 'Production record deleted successfully',
  });
});

const getToday = asyncHandler(async (req, res) => {
  const productions = await productionService.getTodayProductions(req.query.branchId, req.user);
  res.json({
    success: true,
    data: productions,
    count: productions.length,
  });
});

module.exports = {
  findAllGrouped,
  findById,
  findByOperationalDate,
  create,
  update,
  remove,
  getToday,
};