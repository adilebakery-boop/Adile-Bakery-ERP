const transferService = require('./transfers.service');
const { asyncHandler } = require('../../middlewares/errorHandler');

const create = asyncHandler(async (req, res) => {
  const transfer = await transferService.create(req.body, req.user?.userId);
  res.status(201).json({ success: true, message: 'Transfer created', data: transfer });
});

const findAll = asyncHandler(async (req, res) => {
  const result = await transferService.findAll(req.query, req.user);
  res.json({ success: true, message: 'Transfers retrieved', data: result.data, pagination: result.pagination });
});

const findById = asyncHandler(async (req, res) => {
  const transfer = await transferService.findById(req.params.id);
  res.json({ success: true, message: 'Transfer retrieved', data: transfer });
});

const updateSent = asyncHandler(async (req, res) => {
  const transfer = await transferService.updateSent(req.params.id, req.body, req.user?.userId, req.user);
  res.json({ success: true, message: 'Sent quantity updated', data: transfer });
});

const updateReceived = asyncHandler(async (req, res) => {
  const transfer = await transferService.updateReceived(req.params.id, req.body, req.user?.userId, req.user);
  res.json({ success: true, message: 'Received quantity updated', data: transfer });
});

const returnProducts = asyncHandler(async (req, res) => {
  const transfer = await transferService.returnProducts(req.params.id, req.body, req.user?.userId, req.user);
  res.json({ success: true, message: 'Return recorded', data: transfer });
});

const resolveDispute = asyncHandler(async (req, res) => {
  const transfer = await transferService.resolveDispute(req.params.id, req.body, req.user?.userId);
  res.json({ success: true, message: 'Dispute resolved', data: transfer });
});

const approve = asyncHandler(async (req, res) => {
  const transfer = await transferService.approve(req.params.id, req.user?.userId, req.user);
  res.json({ success: true, message: 'Transfer approved', data: transfer });
});

const reject = asyncHandler(async (req, res) => {
  const transfer = await transferService.reject(req.params.id, req.body, req.user?.userId, req.user);
  res.json({ success: true, message: 'Transfer rejected', data: transfer });
});

module.exports = {
  create,
  findAll,
  findById,
  updateSent,
  updateReceived,
  returnProducts,
  resolveDispute,
  approve,
  reject,
};
