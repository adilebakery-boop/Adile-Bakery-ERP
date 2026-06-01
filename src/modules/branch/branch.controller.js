const branchService = require('./branch.service');
const { asyncHandler } = require('../../middlewares/errorHandler');

const create = asyncHandler(async (req, res) => {
  const branch = await branchService.create(req.body, req.user?.userId);
  res.status(201).json({
    success: true,
    message: 'Branch created successfully',
    data: branch,
  });
});

const findActive = asyncHandler(async (req, res) => {
  const branches = await branchService.findActive();
  res.json({
    success: true,
    message: 'Active branches retrieved successfully',
    data: branches,
  });
});

const findAll = asyncHandler(async (req, res) => {
  const result = await branchService.findAll(req.query);
  res.json({
    success: true,
    message: 'Branches retrieved successfully',
    data: result.data,
    pagination: result.pagination,
  });
});

const findById = asyncHandler(async (req, res) => {
  const branch = await branchService.findById(parseInt(req.params.id));
  res.json({
    success: true,
    message: 'Branch retrieved successfully',
    data: branch,
  });
});

const update = asyncHandler(async (req, res) => {
  const branch = await branchService.update(parseInt(req.params.id), req.body, req.user?.userId);
  res.json({
    success: true,
    message: 'Branch updated successfully',
    data: branch,
  });
});

const deleteBranch = asyncHandler(async (req, res) => {
  await branchService.delete(parseInt(req.params.id), req.user?.userId);
  res.json({
    success: true,
    message: 'Branch deleted successfully',
  });
});

const restore = asyncHandler(async (req, res) => {
  const branch = await branchService.restore(parseInt(req.params.id), req.user?.userId);
  res.json({
    success: true,
    message: 'Branch restored successfully',
    data: branch,
  });
});

module.exports = {
  create,
  findActive,
  findAll,
  findById,
  update,
  delete: deleteBranch,
  restore,
};