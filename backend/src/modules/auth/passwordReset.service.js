const crypto = require('crypto');
const bcrypt = require('bcrypt');
const prisma = require('../../config/prisma');
const { sendOTPEmail } = require('../../utils/email');
const AppError = require('../../utils/AppError');

const SALT_ROUNDS = 10;
const MAX_ATTEMPTS = 5;

// Generate secure 6-digit OTP
const generateOTP = () => {
  return crypto.randomInt(100000, 1000000).toString();
};

// Create password reset request
const createResetRequest = async (email) => {
  console.log('[FORGOT_TRACE] createResetRequest entered');

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    console.log('[FORGOT_TRACE] EARLY EXIT: user not found');
    throw new AppError('User not found', 404, 'AUTH_TOKEN');
  }
  console.log('[FORGOT_TRACE] user found: id=' + user.id + ' email=' + user.email);

  if (user.isBlocked) {
    console.log('[FORGOT_TRACE] EARLY EXIT: user is blocked');
    throw new AppError('Account is blocked', 403, 'AUTH_ROLE');
  }
  if (!user.isActive) {
    console.log('[FORGOT_TRACE] EARLY EXIT: user is not active');
    throw new AppError('Account is deactivated', 403, 'AUTH_ROLE');
  }

  console.log('[FORGOT_TRACE] generating otp');
  const otp = generateOTP();

  // 1. SEND EMAIL FIRST
  console.log('[OTP_DIAG] entering sendOTPEmail at', new Date().toISOString());

  const emailStart = Date.now();

  try {
    console.log('[FORGOT_TRACE] calling sendOTPEmail');
    await sendOTPEmail(email, otp);

    console.log(
      '[OTP_DIAG] sendOTPEmail returned in',
      Date.now() - emailStart,
      'ms'
    );
    console.log('[FORGOT_TRACE] sendOTPEmail returned successfully');
  } catch (err) {
    console.error(
      '[OTP_DIAG] sendOTPEmail threw after',
      Date.now() - emailStart,
      'ms, code=',
      err.code,
      ', message=',
      err.message
    );
    console.error('[FORGOT_TRACE] sendOTPEmail threw:', err.message);

    err.isEmailError = true;
    throw err;
  }

  const otpHash = await bcrypt.hash(otp, SALT_ROUNDS);
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

  // 2. DB STATE MUST BE SINGLE SOURCE OF TRUTH
  try {
    await prisma.passwordReset.deleteMany({
      where: { userId: user.id }
    });

    await prisma.passwordReset.create({
      data: {
        userId: user.id,
        otpHash,
        expiresAt,
        attempts: 0,
        used: false
      }
    });

  } catch (dbErr) {
    console.warn(`[OTP] DB failed AFTER email sent for ${email}: ${dbErr.message}`);
    throw new Error('OTP was sent but system failed to register it. Request a new OTP.');
  }
};

// Internal verification logic
const verifyAndGetActiveOTP = async (email, otp) => {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new AppError('User not found', 404, 'AUTH_TOKEN');
  if (user.isBlocked) throw new AppError('Account is blocked', 403, 'AUTH_ROLE');
  if (!user.isActive) throw new AppError('Account is deactivated', 403, 'AUTH_ROLE');

  const resetRecord = await prisma.passwordReset.findFirst({
    where: { userId: user.id, used: false },
    orderBy: { createdAt: 'desc' }
  });

  if (!resetRecord) throw new AppError('No active reset request found', 400, 'SYSTEM');
  if (resetRecord.expiresAt < new Date()) throw new AppError('OTP has expired', 400, 'SYSTEM');
  if (resetRecord.attempts >= MAX_ATTEMPTS) throw new AppError('Too many failed attempts. Please request a new OTP.', 400, 'SYSTEM');

  const isMatch = await bcrypt.compare(otp, resetRecord.otpHash);
  if (!isMatch) {
    await prisma.passwordReset.update({
      where: { id: resetRecord.id },
      data: { attempts: resetRecord.attempts + 1 }
    });
    throw new AppError('Invalid OTP', 401, 'AUTH_TOKEN');
  }

  return { user, resetRecord };
};

// Reset Password function
const resetPassword = async (email, otp, newPassword) => {
  const { user, resetRecord } = await verifyAndGetActiveOTP(email, otp);
  const newHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: newHash }
    }),
    prisma.passwordReset.update({
      where: { id: resetRecord.id },
      data: { used: true }
    })
  ]);
};

module.exports = {
  createResetRequest,
  verifyAndGetActiveOTP,
  resetPassword
};
