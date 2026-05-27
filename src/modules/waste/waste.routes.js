const express = require('express');
const { authenticate } = require('../../middlewares/auth.middleware');
const { allowRoles } = require('../../middlewares/role.middleware');
const wasteController = require('./waste.controller');
const { createWasteSchema, updateWasteSchema, wasteIdSchema, querySchema } = require('./waste.validation');

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

const validateQuery = (schema) => (req, res, next) => {
  try {
    schema.parse(req.query);
    next();
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: 'Invalid query parameters',
      errors: error.errors,
    });
  }
};

const validateIdParam = (req, res, next) => {
  try {
    wasteIdSchema.parse({ id: req.params.id });
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
  validateQuery(querySchema),
  wasteController.findAll
);

router.get(
  '/:id',
  authenticate,
  allowRoles('ADMIN', 'MANAGER', 'BAKER', 'CAKE_CHEF', 'COOKIE_BAKER', 'FETIR_CHEF', 'CASHIER'),
  validateIdParam,
  wasteController.findById
);

router.post(
  '/',
  authenticate,
  allowRoles('ADMIN', 'MANAGER', 'BAKER', 'CAKE_CHEF', 'COOKIE_BAKER', 'FETIR_CHEF', 'CASHIER'),
  validate(createWasteSchema),
  wasteController.create
);

router.put(
  '/:id',
  authenticate,
  allowRoles('ADMIN', 'MANAGER', 'BAKER', 'CAKE_CHEF', 'COOKIE_BAKER', 'FETIR_CHEF', 'CASHIER'),
  validate(updateWasteSchema),
  validateIdParam,
  wasteController.update
);

router.delete(
  '/:id',
  authenticate,
  allowRoles('ADMIN', 'MANAGER'),
  validateIdParam,
  wasteController.remove
);

module.exports = router;