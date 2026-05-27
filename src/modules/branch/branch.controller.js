const branchService = require('./branch.service');

const branchController = {
  async create(req, res) {
    try {
      const branch = await branchService.create(req.body, req.user?.userId);
      res.status(201).json({
        success: true,
        message: 'Branch created successfully',
        data: branch,
      });
    } catch (error) {
      const statusCode = error.code === 'P2002' ? 409 : 500;
      res.status(statusCode).json({
        success: false,
        message: error.code === 'P2002' ? 'Branch name already exists' : error.message,
      });
    }
  },

  async findActive(req, res) {
    try {
      const branches = await branchService.findActive();
      res.json({
        success: true,
        message: 'Active branches retrieved successfully',
        data: branches,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  },

  async findAll(req, res) {
    try {
      const result = await branchService.findAll(req.query);
      res.json({
        success: true,
        message: 'Branches retrieved successfully',
        data: result.data,
        pagination: result.pagination,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  },

  async findById(req, res) {
    try {
      const branch = await branchService.findById(parseInt(req.params.id));
      res.json({
        success: true,
        message: 'Branch retrieved successfully',
        data: branch,
      });
    } catch (error) {
      const statusCode = error.code === 'P2025' ? 404 : 500;
      res.status(statusCode).json({
        success: false,
        message: error.code === 'P2025' ? 'Branch not found' : error.message,
      });
    }
  },

  async update(req, res) {
    try {
      const branch = await branchService.update(parseInt(req.params.id), req.body, req.user?.userId);
      res.json({
        success: true,
        message: 'Branch updated successfully',
        data: branch,
      });
    } catch (error) {
      const statusCode = error.code === 'P2025' ? 404 : error.code === 'P2002' ? 409 : 500;
      res.status(statusCode).json({
        success: false,
        message: error.code === 'P2025' ? 'Branch not found' : error.code === 'P2002' ? 'Branch name already exists' : error.message,
      });
    }
  },

  async delete(req, res) {
    try {
      await branchService.delete(parseInt(req.params.id), req.user?.userId);
      res.json({
        success: true,
        message: 'Branch deleted successfully',
      });
    } catch (error) {
      const statusCode = error.code === 'P2025' ? 404 : 500;
      res.status(statusCode).json({
        success: false,
        message: error.code === 'P2025' ? 'Branch not found' : error.message,
      });
    }
  },
};

module.exports = branchController;