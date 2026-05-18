const express = require('express');
const { authenticate } = require('../../middlewares/auth.middleware');
const { allowRoles } = require('../../middlewares/role.middleware');
const productController = require('./product.controller');
const { createProductSchema, updateProductSchema, productIdSchema, querySchema } = require('./product.validation');

const validate = (schema) => (req, res, next) => {
  try {
    schema.parse(req.body);
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
    productIdSchema.parse({ id: req.params.id });
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
  '/:id',
  authenticate,
  allowRoles('ADMIN', 'MANAGER', 'BAKER', 'CAKE_CHEF', 'COOKIE_BAKER', 'FETIR_CHEF', 'CASHIER'),
  validateParams(productIdSchema),
  productController.findById
);

router.post(
  '/',
  authenticate,
  allowRoles('ADMIN', 'MANAGER'),
  validate(createProductSchema),
  productController.create
);

router.put(
  '/:id',
  authenticate,
  allowRoles('ADMIN', 'MANAGER'),
  validateParams(productIdSchema),
  validate(updateProductSchema),
  productController.update
);

router.delete(
  '/:id',
  authenticate,
  allowRoles('ADMIN', 'MANAGER'),
  validateParams(productIdSchema),
  productController.delete
);

router.patch(
  '/:id/restore',
  authenticate,
  allowRoles('ADMIN', 'MANAGER'),
  validateParams(productIdSchema),
  productController.restore
);

router.get(
  '/deleted',
  authenticate,
  allowRoles('ADMIN', 'MANAGER'),
  productController.getDeleted
);

module.exports = router;