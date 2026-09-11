const express = require('express');
const { authenticate } = require('../../middlewares/auth.middleware');
const { allowRoles } = require('../../middlewares/role.middleware');
const transferController = require('./transfers.controller');
const {
  createTransferSchema,
  updateSentSchema,
  updateReceivedSchema,
  querySchema,
} = require('./transfers.validation');

const validate = (schema) => (req, res, next) => {
  try {
    req.body = schema.parse(req.body);
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

const TRANSFER_ROLES = ['ADMIN', 'MANAGER', 'TRANSFER_OPERATOR'];
const ADMIN_MANAGER_ONLY = ['ADMIN', 'MANAGER'];

router.get('/', allowRoles(...TRANSFER_ROLES), (req, res, next) => {
  try {
    querySchema.parse(req.query);
    next();
  } catch (error) {
    return res.status(400).json({ success: false, message: 'Invalid query', errors: error.errors });
  }
}, transferController.findAll);

router.get('/:id', allowRoles(...TRANSFER_ROLES), transferController.findById);

router.post('/', allowRoles(...TRANSFER_ROLES), validate(createTransferSchema), transferController.create);

router.put('/:id/sent', allowRoles(...TRANSFER_ROLES), validate(updateSentSchema), transferController.updateSent);

router.put('/:id/received', allowRoles(...TRANSFER_ROLES), validate(updateReceivedSchema), transferController.updateReceived);

module.exports = router;
