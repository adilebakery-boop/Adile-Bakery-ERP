const express = require('express');
const authController = require('./auth.controller');
const { loginSchema, validate } = require('../../utils/validation');

const router = express.Router();

router.post('/login', validate(loginSchema), authController.login);

module.exports = router;