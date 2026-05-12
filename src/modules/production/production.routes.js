const express = require('express');
const { authenticate } = require('../../middlewares/auth.middleware');
const { allowRoles } = require('../../middlewares/role.middleware');
const productionController = require('./production.controller');
const { createProductionSchema, updateProductionSchema, productionIdSchema, querySchema } = require('./production.validation');

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
    productionIdSchema.parse({ id: req.params.id });
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
  (req, res, next) => {
    try {
      querySchema.parse(req.query);
      next();
    } catch (error) {
      return res.status(400).json({ success: false, message: 'Invalid query', errors: error.errors });
    }
  },
  productionController.findAll
);

router.get(
  '/daily',
  authenticate,
  allowRoles('ADMIN', 'MANAGER', 'BAKER', 'CAKE_CHEF', 'COOKIE_BAKER', 'FETIR_CHEF', 'CASHIER'),
  productionController.getDailyProduction
);

router.get(
  '/:id',
  authenticate,
  allowRoles('ADMIN', 'MANAGER', 'BAKER', 'CAKE_CHEF', 'COOKIE_BAKER', 'FETIR_CHEF', 'CASHIER'),
  validateParams(productionIdSchema),
  productionController.findById
);

router.post(
  '/',
  authenticate,
  allowRoles('ADMIN', 'MANAGER', 'BAKER', 'CAKE_CHEF', 'COOKIE_BAKER', 'FETIR_CHEF', 'CASHIER'),
  validate(createProductionSchema),
  productionController.create
);

router.put(
  '/:id',
  authenticate,
  allowRoles('ADMIN', 'MANAGER', 'BAKER', 'CAKE_CHEF', 'COOKIE_BAKER', 'FETIR_CHEF', 'CASHIER'),
  validateParams(productionIdSchema),
  validate(updateProductionSchema),
  productionController.update
);

router.delete(
  '/:id',
  authenticate,
  allowRoles('ADMIN', 'MANAGER'),
  validateParams(productionIdSchema),
  productionController.delete
);

module.exports = router;