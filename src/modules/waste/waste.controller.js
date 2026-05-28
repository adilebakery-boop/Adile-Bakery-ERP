const wasteService = require('../../services/wasteService');
const { asyncHandler } = require('../../middlewares/errorHandler');
const { buildWasteAccessFilter } = require('../../utils/accessFilters');

const findAll = asyncHandler(async (req, res) => {
  const { role, userId } = req.user;

  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, parseInt(req.query.limit) || 20);

  const filters = { ...req.query, page, limit };

  const accessFilter = buildWasteAccessFilter({ role, userId });
  Object.assign(filters, accessFilter);

  const { data, total } = await wasteService.findAll(filters);
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
  const waste = await wasteService.findById(req.params.id);
  res.json({
    success: true,
    data: waste,
  });
});

const create = asyncHandler(async (req, res) => {
  const waste = await wasteService.create(req.body, req.user);
  res.status(201).json({
    success: true,
    message: 'Waste record created successfully',
    data: waste,
  });
});

const update = asyncHandler(async (req, res) => {
  const waste = await wasteService.update(req.params.id, req.body, req.user);
  res.json({
    success: true,
    message: 'Waste record updated successfully',
    data: waste,
  });
});

const remove = asyncHandler(async (req, res) => {
  await wasteService.remove(req.params.id, req.user);
  res.json({
    success: true,
    message: 'Waste record deleted successfully',
  });
});

module.exports = {
  findAll,
  findById,
  create,
  update,
  remove,
};