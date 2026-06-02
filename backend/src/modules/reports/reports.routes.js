const express = require('express');
const { authenticate } = require('../../middlewares/auth.middleware');
const { allowRoles } = require('../../middlewares/role.middleware');
const reportsController = require('./reports.controller');
const { reportQuerySchema, exportQuerySchema } = require('./reports.validation');

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
  '/inventory-flow',
  authenticate,
  allowRoles('ADMIN', 'MANAGER'),
  validateQuery(reportQuerySchema),
  reportsController.getInventoryFlow
);

router.get(
  '/daily',
  authenticate,
  allowRoles('ADMIN', 'MANAGER'),
  validateQuery(reportQuerySchema),
  reportsController.getDaily
);

router.get(
  '/weekly',
  authenticate,
  allowRoles('ADMIN', 'MANAGER'),
  validateQuery(reportQuerySchema),
  reportsController.getWeekly
);

router.get(
  '/monthly',
  authenticate,
  allowRoles('ADMIN', 'MANAGER'),
  validateQuery(reportQuerySchema),
  reportsController.getMonthly
);

router.get(
  '/yearly',
  authenticate,
  allowRoles('ADMIN', 'MANAGER'),
  validateQuery(reportQuerySchema),
  reportsController.getYearly
);

router.get(
  '/export',
  authenticate,
  allowRoles('ADMIN', 'MANAGER'),
  validateQuery(exportQuerySchema),
  reportsController.exportReport
);

module.exports = router;