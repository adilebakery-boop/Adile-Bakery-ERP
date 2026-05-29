const productionService = require('../../services/productionService');
const { asyncHandler } = require('../../middlewares/errorHandler');

<<<<<<< HEAD
const findAll = asyncHandler(async (req, res) => {
  const { branchId, operationalDate, shift, productId, startDate, endDate } = req.query;

  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, parseInt(req.query.limit) || 20);

  const filters = { branchId, operationalDate, shift, productId, startDate, endDate, page, limit };

  const { data, total } = await productionService.findAll(filters, req.user);
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

=======
>>>>>>> 58ff9f0e3f90cda009f7c548bc8f3dc4b957d667
const findAllGrouped = asyncHandler(async (req, res) => {
  const { branchId, operationalDate, shift, productId, startDate, endDate, page, limit } = req.query;

  const filters = { branchId, operationalDate, shift, productId, startDate, endDate, page, limit };

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