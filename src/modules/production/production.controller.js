const productionService = require('./production.service');

const productionController = {
  async create(req, res) {
    try {
      console.log('Create production:', req.body, 'User:', req.user);
      const production = await productionService.create(req.body, req.user);
      console.log('Created:', production);
      res.status(201).json({
        success: true,
        message: 'Production record created successfully',
        data: production,
      });
    } catch (error) {
      console.error('Create production error:', error);
      if (error.code === 'P2025') {
        return res.status(404).json({ success: false, message: error.message, errors: [] });
      }
      if (error.code === 'INACTIVE_PRODUCT' || error.code === 'INACTIVE_BRANCH') {
        return res.status(400).json({ success: false, message: error.message, errors: [] });
      }
      if (error.code === 'CATEGORY_ACCESS_DENIED') {
        return res.status(403).json({ success: false, message: error.message, errors: [] });
      }
      res.status(500).json({ success: false, message: error.message || 'Failed to create production record', errors: [] });
    }
  },

  async findAll(req, res) {
    try {
      const result = await productionService.findAll(req.query, req.user);
      res.json({
        success: true,
        message: 'Production records retrieved successfully',
        data: result.data,
        pagination: result.pagination,
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message, errors: [] });
    }
  },

  async findById(req, res) {
    try {
      const production = await productionService.findById(parseInt(req.params.id));
      res.json({
        success: true,
        message: 'Production record retrieved successfully',
        data: production,
      });
    } catch (error) {
      const statusCode = error.code === 'P2025' ? 404 : 500;
      res.status(statusCode).json({
        success: false,
        message: error.code === 'P2025' ? 'Production record not found' : error.message,
        errors: [],
      });
    }
  },

  async update(req, res) {
    try {
      const production = await productionService.update(parseInt(req.params.id), req.body);
      res.json({
        success: true,
        message: 'Production record updated successfully',
        data: production,
      });
    } catch (error) {
      const statusCode = error.code === 'P2025' ? 404 : 500;
      res.status(statusCode).json({
        success: false,
        message: error.code === 'P2025' ? 'Production record not found' : error.message,
        errors: [],
      });
    }
  },

  async delete(req, res) {
    try {
      await productionService.delete(parseInt(req.params.id));
      res.json({ success: true, message: 'Production record deleted successfully' });
    } catch (error) {
      const statusCode = error.code === 'P2025' ? 404 : 500;
      res.status(statusCode).json({
        success: false,
        message: error.code === 'P2025' ? 'Production record not found' : error.message,
        errors: [],
      });
    }
  },
};

module.exports = productionController;