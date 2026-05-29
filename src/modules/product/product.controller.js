const productService = require('./product.service');
const { asyncHandler } = require('../../middlewares/errorHandler');

const create = asyncHandler(async (req, res) => {
  const product = await productService.create(req.body, req.user?.userId);
  res.status(201).json({
    success: true,
    message: 'Product created successfully',
    data: product,
  });
});

const findAll = asyncHandler(async (req, res) => {
  const result = await productService.findAll(req.query);
  res.json({
    success: true,
    message: 'Products retrieved successfully',
    data: result.data,
    pagination: result.pagination,
  });
});

const findById = asyncHandler(async (req, res) => {
  const product = await productService.findById(parseInt(req.params.id));
  res.json({
    success: true,
    message: 'Product retrieved successfully',
    data: product,
  });
});

const update = asyncHandler(async (req, res) => {
  const product = await productService.update(parseInt(req.params.id), req.body, req.user?.userId);
  res.json({
    success: true,
    message: 'Product updated successfully',
    data: product,
  });
});

const delete_ = asyncHandler(async (req, res) => {
  await productService.delete(parseInt(req.params.id), req.user?.userId);
  res.json({
    success: true,
    message: 'Product deleted successfully',
  });
});

const restore = asyncHandler(async (req, res) => {
  const product = await productService.restore(parseInt(req.params.id), req.user?.userId);
  res.json({
    success: true,
    message: 'Product restored successfully',
    data: product,
  });
});

const getCategories = asyncHandler(async (req, res) => {
  const categories = await productService.getCategories();
  res.json({
    success: true,
    message: 'Categories retrieved successfully',
    data: categories,
  });
});

const getDeleted = asyncHandler(async (req, res) => {
  const result = await productService.getDeleted(req.query);
  res.json({
    success: true,
    message: 'Deleted products retrieved successfully',
    data: result.data,
    pagination: result.pagination,
  });
});

module.exports = {
  create,
  findAll,
  findById,
  update,
  delete: delete_,
  restore,
  getCategories,
  getDeleted,
};