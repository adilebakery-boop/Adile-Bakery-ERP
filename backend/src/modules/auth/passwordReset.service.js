const crypto = require('crypto');
const bcrypt = require('bcrypt');
const prisma = require('../../config/prisma');
const { sendOTPEmail } = require('../../utils/email');

const SALT_ROUNDS = 10;
const MAX_ATTEMPTS = 5;

// Generate secure 6-digit OTP
const generateOTP = () => {
  return crypto.randomInt(100000, 1000000).toString();
};

// Create password reset request
const createResetRequest = async (email) => {
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) throw new Error('User not found');
  if (user.isBlocked) throw new Error('Account is blocked');
  if (!user.isActive) throw new Error('Account is deactivated');

  const otp = generateOTP();

  // 1. SEND EMAIL FIRST
  try {
    await sendOTPEmail(email, otp);
  } catch (err) {
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
  if (!user) throw new Error('User not found');
  if (user.isBlocked) throw new Error('Account is blocked');
  if (!user.isActive) throw new Error('Account is deactivated');

  const resetRecord = await prisma.passwordReset.findFirst({
    where: { userId: user.id, used: false },
    orderBy: { createdAt: 'desc' }
  });

  if (!resetRecord) throw new Error('No active reset request found');
  if (resetRecord.expiresAt < new Date()) throw new Error('OTP has expired');
  if (resetRecord.attempts >= MAX_ATTEMPTS) throw new Error('Too many failed attempts. Please request a new OTP.');

  const isMatch = await bcrypt.compare(otp, resetRecord.otpHash);
  if (!isMatch) {
    await prisma.passwordReset.update({
      where: { id: resetRecord.id },
      data: { attempts: resetRecord.attempts + 1 }
    });
    throw new Error('Invalid OTP');
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
