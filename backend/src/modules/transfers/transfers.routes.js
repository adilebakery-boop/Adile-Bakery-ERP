const express = require('express');
const { authenticate } = require('../../middlewares/auth.middleware');
const { allowRoles } = require('../../middlewares/role.middleware');
const transferController = require('./transfers.controller');
const {
  createTransferSchema,
  updateSentSchema,
  updateReceivedSchema,
  returnSchema,
  resolveDisputeSchema,
  querySchema,
} = require('./transfers.validation');

const validate = (schema) => (req, res, next) => {
  try {
    schema.parse(req.body);
    next();
  } catch (error) {
    return res.status(400).json({ success: false, message: 'Validation error', errors: error.errors });
  }
};

const router = express.Router();

const isTransferEnabled = (req, res, next) => {
  if (process.env.FEATURE_TRANSFERS !== 'true') {
    return res.status(404).json({ success: false, message: 'Not found' });
  }
  next();
};

router.use(isTransferEnabled);
router.use(authenticate);

const ALL_ROLES = ['ADMIN', 'MANAGER', 'BAKER', 'CAKE_CHEF', 'COOKIE_BAKER', 'FETIR_CHEF', 'CASHIER', 'TRANSFER_OPERATOR'];
const ADMIN_MANAGER_ONLY = ['ADMIN', 'MANAGER'];

router.get('/', allowRoles(...ALL_ROLES), (req, res, next) => {
  try {
    querySchema.parse(req.query);
    next();
  } catch (error) {
    return res.status(400).json({ success: false, message: 'Invalid query', errors: error.errors });
  }
}, transferController.findAll);

router.get('/:id', allowRoles(...ALL_ROLES), transferController.findById);

router.post('/', allowRoles(...ALL_ROLES), validate(createTransferSchema), transferController.create);

router.put('/:id/sent', allowRoles(...ALL_ROLES), validate(updateSentSchema), transferController.updateSent);

router.put('/:id/received', allowRoles(...ALL_ROLES), validate(updateReceivedSchema), transferController.updateReceived);

router.put('/:id/return', allowRoles(...ALL_ROLES), validate(returnSchema), transferController.returnProducts);

router.put('/:id/resolve', allowRoles(...ADMIN_MANAGER_ONLY), validate(resolveDisputeSchema), transferController.resolveDispute);

router.put('/:id/approve', allowRoles(...ADMIN_MANAGER_ONLY), transferController.approve);

router.put('/:id/reject', allowRoles(...ADMIN_MANAGER_ONLY), transferController.reject);

module.exports = router;
