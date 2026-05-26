const express = require('express');
const { authenticate } = require('../../middlewares/auth.middleware');
const { allowRoles } = require('../../middlewares/role.middleware');
const branchController = require('./branch.controller');
const { createBranchSchema, updateBranchSchema, branchIdSchema, querySchema } = require('./branch.validation');

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
  (req, res, next) => {
    try {
      querySchema.parse(req.query);
      next();
    } catch (error) {
      return res.status(400).json({ success: false, message: 'Invalid query', errors: error.errors });
    }
  },
  branchController.findAll
);

router.get(
  '/active',
  authenticate,
  allowRoles('ADMIN', 'MANAGER', 'BAKER', 'CAKE_CHEF', 'COOKIE_BAKER', 'FETIR_CHEF', 'CASHIER'),
  branchController.findActive
);

router.get(
  '/:id',
  authenticate,
  allowRoles('ADMIN', 'MANAGER', 'BAKER', 'CAKE_CHEF', 'COOKIE_BAKER', 'FETIR_CHEF', 'CASHIER'),
  validateParams(branchIdSchema),
  branchController.findById
);

router.post(
  '/',
  authenticate,
  allowRoles('ADMIN', 'MANAGER'),
  validate(createBranchSchema),
  branchController.create
);

router.put(
  '/:id',
  authenticate,
  allowRoles('ADMIN', 'MANAGER'),
  validateParams(branchIdSchema),
  validate(updateBranchSchema),
  branchController.update
);

router.delete(
  '/:id',
  authenticate,
  allowRoles('ADMIN', 'MANAGER'),
  validateParams(branchIdSchema),
  branchController.delete
);

module.exports = router;