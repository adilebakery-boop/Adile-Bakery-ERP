const express = require('express');
const { authenticate } = require('../../middlewares/auth.middleware');
const { allowRoles } = require('../../middlewares/role.middleware');
const closureGuard = require('../../middlewares/closureGuard.middleware');
const remainingController = require('./remaining.controller');
const { createRemainingSchema, createBulkSchema, updateRemainingSchema, remainingIdSchema, querySchema } = require('./remaining.validation');

const validate = (schema) => (req, res, next) => {
  try {
    schema.parse(req.body);
    next();
  } catch (error) {
    console.error('[REMAINING VALIDATION ERROR] body:', JSON.stringify(req.body), 'errors:', JSON.stringify(error.errors));
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
    console.error('[REMAINING QUERY VALIDATION ERROR] query:', JSON.stringify(req.query), 'errors:', JSON.stringify(error.errors));
    return res.status(400).json({
      success: false,
      message: 'Invalid query parameters',
      errors: error.errors,
    });
  }
};

const validateIdParam = (req, res, next) => {
  try {
    remainingIdSchema.parse({ id: req.params.id });
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
  remainingController.findAll
);

router.get(
  '/by-date/:operationalDate',
  authenticate,
  allowRoles('ADMIN', 'MANAGER', 'BAKER', 'CAKE_CHEF', 'COOKIE_BAKER', 'FETIR_CHEF', 'CASHIER'),
  remainingController.findByOperationalDate
);

router.get(
  '/drafts',
  authenticate,
  allowRoles('ADMIN', 'MANAGER', 'BAKER', 'CAKE_CHEF', 'COOKIE_BAKER', 'FETIR_CHEF', 'CASHIER'),
  remainingController.getDrafts
);

router.get(
  '/pending',
  authenticate,
  allowRoles('ADMIN', 'MANAGER'),
  remainingController.getPending
);

router.get(
  '/:id',
  authenticate,
  allowRoles('ADMIN', 'MANAGER', 'BAKER', 'CAKE_CHEF', 'COOKIE_BAKER', 'FETIR_CHEF', 'CASHIER'),
  validateIdParam,
  remainingController.findById
);

router.post(
  '/',
  authenticate,
  allowRoles('ADMIN', 'MANAGER', 'BAKER', 'CAKE_CHEF', 'COOKIE_BAKER', 'FETIR_CHEF', 'CASHIER'),
  closureGuard,
  validate(createRemainingSchema),
  remainingController.create
);

router.post(
  '/bulk',
  authenticate,
  allowRoles('ADMIN', 'MANAGER', 'BAKER', 'CAKE_CHEF', 'COOKIE_BAKER', 'FETIR_CHEF', 'CASHIER'),
  closureGuard,
  validate(createBulkSchema),
  remainingController.createBulk
);

router.put(
  '/:id',
  authenticate,
  allowRoles('ADMIN', 'MANAGER', 'BAKER', 'CAKE_CHEF', 'COOKIE_BAKER', 'FETIR_CHEF', 'CASHIER'),
  closureGuard,
  validate(updateRemainingSchema),
  validateIdParam,
  remainingController.update
);

router.delete(
  '/:id',
  authenticate,
  allowRoles('ADMIN', 'MANAGER'),
  closureGuard,
  validateIdParam,
  remainingController.remove
);

module.exports = router;