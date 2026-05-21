const express = require('express');
const { authenticate } = require('../../middlewares/auth.middleware');
const authController = require('./auth.controller');
const { z, loginSchema, passwordSchema, validate } = require('../../utils/validation');

const changePasswordSchema = validate(
  z.object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: passwordSchema,
  })
);

const router = express.Router();

router.post('/login', validate(loginSchema), authController.login);
router.post('/logout', authenticate, authController.logout);
router.get('/me', authenticate, authController.me);
router.put('/change-password', authenticate, changePasswordSchema, authController.changePassword);

module.exports = router;