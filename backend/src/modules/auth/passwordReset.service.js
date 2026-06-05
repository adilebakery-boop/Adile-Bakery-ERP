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
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new AppError('User not found', 404, 'AUTH_TOKEN');
  if (user.isBlocked) throw new AppError('Account is blocked', 403, 'AUTH_ROLE');
  if (!user.isActive) throw new AppError('Account is deactivated', 403, 'AUTH_ROLE');

  const otp = generateOTP();
  const otpHash = await bcrypt.hash(otp, SALT_ROUNDS);
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

  await prisma.passwordReset.create({
    data: {
      userId: user.id,
      otpHash,
      expiresAt
    }
  });

  await sendOTPEmail(email, otp);
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
