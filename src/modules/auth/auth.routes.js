const express = require('express');
const { authenticate } = require('../../middlewares/auth.middleware');
const authController = require('./auth.controller');
const { loginSchema, validate } = require('../../utils/validation');

const router = express.Router();

router.post('/login', validate(loginSchema), authController.login);
router.post('/logout', authenticate, authController.logout);
router.get('/me', authenticate, authController.me);
router.put('/change-password', authenticate, authController.changePassword);

module.exports = router;