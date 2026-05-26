const express = require('express');
const { authenticate } = require('../../middlewares/auth.middleware');
const { allowRoles } = require('../../middlewares/role.middleware');
const closureController = require('./closure.controller');
const { closeDaySchema, reopenDaySchema, querySchema } = require('./closure.validation');

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

const router = express.Router();

router.get(
  '/status',
  authenticate,
  allowRoles('ADMIN', 'MANAGER', 'BAKER', 'CAKE_CHEF', 'COOKIE_BAKER', 'FETIR_CHEF', 'CASHIER'),
  validateQuery(querySchema),
  closureController.getStatus
);

router.get(
  '/validate',
  authenticate,
  allowRoles('ADMIN', 'MANAGER'),
  validateQuery(querySchema),
  closureController.validate
);

router.post(
  '/close',
  authenticate,
  allowRoles('ADMIN', 'MANAGER'),
  validate(closeDaySchema),
  closureController.close
);

router.post(
  '/reopen',
  authenticate,
  allowRoles('ADMIN', 'MANAGER'),
  validate(reopenDaySchema),
  closureController.reopen
);

module.exports = router;