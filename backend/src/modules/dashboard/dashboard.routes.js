const express = require('express');
const { authenticate } = require('../../middlewares/auth.middleware');
const { allowRoles } = require('../../middlewares/role.middleware');
const dashboardController = require('./dashboard.controller');

const router = express.Router();

router.get(
  '/today',
  authenticate,
  allowRoles('ADMIN', 'MANAGER', 'BAKER', 'CAKE_CHEF', 'COOKIE_BAKER', 'FETIR_CHEF', 'CASHIER'),
  dashboardController.getToday
);

router.get(
  '/branches-status',
  authenticate,
  allowRoles('ADMIN', 'MANAGER'),
  dashboardController.getAllBranchesStatus
);

router.get(
  '/recent-activity',
  authenticate,
  allowRoles('ADMIN', 'MANAGER', 'BAKER', 'CAKE_CHEF', 'COOKIE_BAKER', 'FETIR_CHEF', 'CASHIER'),
  dashboardController.getRecentActivity
);

router.get(
  '/overview',
  authenticate,
  allowRoles('ADMIN', 'MANAGER', 'BAKER', 'CAKE_CHEF', 'COOKIE_BAKER', 'FETIR_CHEF', 'CASHIER'),
  dashboardController.getOverview
);

module.exports = router;