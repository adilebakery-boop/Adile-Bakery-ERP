const express = require('express');
const { authenticate } = require('../../middlewares/auth.middleware');
const { allowRoles } = require('../../middlewares/role.middleware');
const authController = require('./auth.controller');
const { z, loginSchema, passwordSchema, validate } = require('../../utils/validation');

const changePasswordSchema = validate(
  z.object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: passwordSchema,
  })
);

const resetPasswordSchema = validate(
  z.object({
    newPassword: passwordSchema,
  })
);

const router = express.Router();

router.post('/login', validate(loginSchema), authController.login);
router.post('/logout', authenticate, authController.logout);
router.get('/me', authenticate, authController.me);
router.put('/change-password', authenticate, changePasswordSchema, authController.changePassword);
router.put('/reset-password/:userId', authenticate, allowRoles('ADMIN', 'MANAGER'), resetPasswordSchema, authController.resetPassword);

module.exports = router;