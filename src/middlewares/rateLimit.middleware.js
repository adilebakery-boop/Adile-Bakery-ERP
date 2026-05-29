const rateLimit = require('express-rate-limit');
const prisma = require('../config/prisma');

const loginLimiter = async (req, res, next) => {
  const ip = (req.ip || req.connection.remoteAddress || 'unknown').replace('::ffff:', '');
  const now = new Date();
  const windowMs = 1 * 60 * 1000;

  try {
    let record = await prisma.rateLimit.findUnique({ where: { key: ip } });

    if (!record) {
      record = await prisma.rateLimit.create({
        data: { key: ip, count: 0, expiresAt: new Date(now.getTime() + windowMs) },
      });
    }

    if (now > record.expiresAt) {
      record = await prisma.rateLimit.update({
        where: { key: ip },
        data: { count: 0, expiresAt: new Date(now.getTime() + windowMs) },
      });
    }

    if (record.count >= 5) {
      return res.status(429).json({
        success: false,
        message: 'Too many login attempts. Please try again after 1 minute.',
        errors: [],
      });
    }

    next();
  } catch {
    next();
  }
};

const incrementLoginAttempts = async (ip) => {
  try {
    await prisma.rateLimit.upsert({
      where: { key: ip },
      create: { key: ip, count: 1, expiresAt: new Date(Date.now() + 60 * 1000) },
      update: { count: { increment: 1 } },
    });
  } catch {
  }
};

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 250,
  message: {
    success: false,
    message: 'Too many requests. Please try again after 15 minutes.',
    errors: [],
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const exportLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: {
    success: false,
    message: 'Too many export requests. Please try again after 1 hour.',
    errors: [],
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    success: false,
    message: 'Too many password reset requests. Please try again after 15 minutes.',
    errors: [],
  },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {
  loginLimiter,
  apiLimiter,
  exportLimiter,
  otpLimiter,
  incrementLoginAttempts,
};