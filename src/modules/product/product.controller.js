const productService = require('./product.service');

const productController = {
  async create(req, res) {
    try {
      const product = await productService.create(req.body, req.user?.userId);
      res.status(201).json({
        success: true,
        message: 'Product created successfully',
        data: product,
      });
    } catch (error) {
      const statusCode = error.code === 'P2002' ? 409 : 500;
      res.status(statusCode).json({
        success: false,
        message: error.code === 'P2002' ? 'Product name already exists' : error.message,
      });
    }
  },

  async findAll(req, res) {
    try {
      const result = await productService.findAll(req.query);
      res.json({
        success: true,
        message: 'Products retrieved successfully',
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
      const product = await productService.findById(parseInt(req.params.id));
      res.json({
        success: true,
        message: 'Product retrieved successfully',
        data: product,
      });
    } catch (error) {
      const statusCode = error.code === 'P2025' ? 404 : 500;
      res.status(statusCode).json({
        success: false,
        message: error.code === 'P2025' ? 'Product not found' : error.message,
      });
    }
  },

  async update(req, res) {
    try {
      const product = await productService.update(parseInt(req.params.id), req.body, req.user?.userId);
      res.json({
        success: true,
        message: 'Product updated successfully',
        data: product,
      });
    } catch (error) {
      const statusCode = error.code === 'P2025' ? 404 : error.code === 'P2002' ? 409 : 500;
      res.status(statusCode).json({
        success: false,
        message: error.code === 'P2025' ? 'Product not found' : error.code === 'P2002' ? 'Product name already exists' : error.message,
      });
    }
  },

  async delete(req, res) {
    try {
      await productService.delete(parseInt(req.params.id), req.user?.userId);
      res.json({
        success: true,
        message: 'Product deleted successfully',
      });
    } catch (error) {
      const statusCode = error.code === 'P2025' ? 404 : 500;
      res.status(statusCode).json({
        success: false,
        message: error.code === 'P2025' ? 'Product not found' : error.message,
      });
    }
  },

  async restore(req, res) {
    try {
      const product = await productService.restore(parseInt(req.params.id), req.user?.userId);
      res.json({
        success: true,
        message: 'Product restored successfully',
        data: product,
      });
    } catch (error) {
      const statusCode = error.code === 'P2025' ? 404 : 500;
      res.status(statusCode).json({
        success: false,
        message: error.code === 'P2025' ? 'Product not found' : error.message,
      });
    }
  },

  async delete(req, res) {
    try {
      await productService.delete(parseInt(req.params.id));
      res.json({
        success: true,
        message: 'Product deleted successfully',
      });
    } catch (error) {
      const statusCode = error.code === 'P2025' ? 404 : 500;
      res.status(statusCode).json({
        success: false,
        message: error.code === 'P2025' ? 'Product not found' : error.message,
      });
    }
  },

  async getCategories(req, res) {
    try {
      const categories = await productService.getCategories();
      res.json({
        success: true,
        message: 'Categories retrieved successfully',
        data: categories,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  },

  async restore(req, res) {
    try {
      const product = await productService.restore(parseInt(req.params.id));
      res.json({
        success: true,
        message: 'Product restored successfully',
        data: product,
      });
    } catch (error) {
      const statusCode = error.code === 'P2025' ? 404 : 500;
      res.status(statusCode).json({
        success: false,
        message: error.code === 'P2025' ? 'Product not found' : error.message,
      });
    }
  },

  async getDeleted(req, res) {
    try {
      const result = await productService.getDeleted(req.query);
      res.json({
        success: true,
        message: 'Deleted products retrieved successfully',
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
};

module.exports = productController;