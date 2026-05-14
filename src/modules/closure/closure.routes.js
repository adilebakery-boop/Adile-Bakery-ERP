const express = require('express');
const { authenticate } = require('../../middlewares/auth.middleware');
const { allowRoles } = require('../../middlewares/role.middleware');
const closureController = require('./closure.controller');

const router = express.Router();

router.get(
  '/status',
  authenticate,
  allowRoles('ADMIN', 'MANAGER', 'BAKER', 'CAKE_CHEF', 'COOKIE_BAKER', 'FETIR_CHEF', 'CASHIER'),
  closureController.getStatus
);

router.get(
  '/validate',
  authenticate,
  allowRoles('ADMIN', 'MANAGER'),
  closureController.validate
);

router.post(
  '/close',
  authenticate,
  allowRoles('ADMIN', 'MANAGER'),
  closureController.close
);

router.post(
  '/reopen',
  authenticate,
  allowRoles('ADMIN', 'MANAGER'),
  closureController.reopen
);

module.exports = router;