const express = require('express');
const { authenticate } = require('../../middlewares/auth.middleware');
const { allowRoles } = require('../../middlewares/role.middleware');
const reportsController = require('./reports.controller');

const router = express.Router();

router.get(
  '/inventory-flow',
  authenticate,
  allowRoles('ADMIN', 'MANAGER'),
  reportsController.getInventoryFlow
);

router.get(
  '/daily',
  authenticate,
  allowRoles('ADMIN', 'MANAGER'),
  reportsController.getDaily
);

router.get(
  '/weekly',
  authenticate,
  allowRoles('ADMIN', 'MANAGER'),
  reportsController.getWeekly
);

router.get(
  '/monthly',
  authenticate,
  allowRoles('ADMIN', 'MANAGER'),
  reportsController.getMonthly
);

router.get(
  '/export',
  authenticate,
  allowRoles('ADMIN', 'MANAGER'),
  reportsController.exportReport
);

module.exports = router;