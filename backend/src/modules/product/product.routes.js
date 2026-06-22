const express = require('express');
const { authenticate } = require('../../middlewares/auth.middleware');
const { allowRoles } = require('../../middlewares/role.middleware');
const productController = require('./product.controller');
const { createProductSchema, updateProductSchema, productIdSchema, querySchema } = require('./product.validation');

const validate = (schema) => (req, res, next) => {
  try {
    req.body = schema.parse(req.body);
    next();
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: error.errors,
    });
  }
};

const validateParams = (schema) => (req, res, next) => {
  try {
    schema.parse({ id: req.params.id });
    next();
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: 'Invalid ID parameter',
      errors: error.errors,
    });
  }
};

const router = express.Router();

router.get(
  '/',
  authenticate,
  allowRoles('ADMIN', 'MANAGER', 'BAKER', 'CAKE_CHEF', 'COOKIE_BAKER', 'FETIR_CHEF', 'CASHIER'),
  productController.findAll
);

router.get(
  '/categories',
  authenticate,
  allowRoles('ADMIN', 'MANAGER', 'BAKER', 'CAKE_CHEF', 'COOKIE_BAKER', 'FETIR_CHEF', 'CASHIER'),
  productController.getCategories
);

router.get(
  '/deleted',
  authenticate,
  allowRoles('ADMIN'),
  productController.getDeleted
);

router.get(
  '/:id',
  authenticate,
  allowRoles('ADMIN', 'MANAGER', 'BAKER', 'CAKE_CHEF', 'COOKIE_BAKER', 'FETIR_CHEF', 'CASHIER'),
  validateParams(productIdSchema),
  productController.findById
);

router.post(
  '/',
  authenticate,
  allowRoles('ADMIN'),
  validate(createProductSchema),
  productController.create
);

router.put(
  '/:id',
  authenticate,
  allowRoles('ADMIN'),
  validateParams(productIdSchema),
  validate(updateProductSchema),
  productController.update
);

router.delete(
  '/:id',
  authenticate,
  allowRoles('ADMIN'),
  validateParams(productIdSchema),
  productController.delete
);

router.patch(
  '/:id/restore',
  authenticate,
  allowRoles('ADMIN'),
  validateParams(productIdSchema),
  productController.restore
);

module.exports = router;