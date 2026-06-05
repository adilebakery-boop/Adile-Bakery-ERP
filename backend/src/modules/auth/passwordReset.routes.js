const express = require('express');
const { asyncHandler } = require('../../middlewares/errorHandler');
const { z, validate, passwordSchema } = require('../../utils/validation');
const { otpLimiter } = require('../../middlewares/rateLimit.middleware');
const passwordResetService = require('./passwordReset.service');
const AppError = require('../../utils/AppError');

const router = express.Router();

const forgotPasswordSchema = validate(
  z.object({
    email: z.string().email('Invalid email address')
  })
);

const verifyOTPSchema = validate(
  z.object({
    email: z.string().email('Invalid email address'),
    otp: z.string().length(6, 'OTP must be exactly 6 digits')
  })
);

const resetPasswordSchema = validate(
  z.object({
    email: z.string().email('Invalid email address'),
    otp: z.string().length(6, 'OTP must be exactly 6 digits'),
    newPassword: passwordSchema
  })
);

router.post(
  '/forgot-password',
  otpLimiter,
  forgotPasswordSchema,
  asyncHandler(async (req, res) => {
    const { email } = req.body;
    try {
      await passwordResetService.createResetRequest(email);
      res.json({ success: true, message: 'If an account exists, a 6-digit OTP has been sent' });
    } catch (err) {
      if (err instanceof AppError && err.message === 'User not found') {
        return res.json({ success: true, message: 'If an account exists, a 6-digit OTP has been sent' });
      }
      if (err.isEmailError) {
        return res.status(500).json({ success: false, message: err.message });
      }
      throw err;
    }
  })
);

router.post(
  '/verify-otp',
  verifyOTPSchema,
  asyncHandler(async (req, res) => {
    const { email, otp } = req.body;
    await passwordResetService.verifyAndGetActiveOTP(email, otp);
    res.json({ success: true, message: 'OTP verified successfully' });
  })
);

router.post(
  '/reset-password',
  resetPasswordSchema,
  asyncHandler(async (req, res) => {
    const { email, otp, newPassword } = req.body;
    await passwordResetService.resetPassword(email, otp, newPassword);
    res.json({ success: true, message: 'Password has been reset successfully' });
  })
);

module.exports = router;
