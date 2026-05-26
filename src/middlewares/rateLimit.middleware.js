const rateLimit = require('express-rate-limit');

const loginAttempts = new Map();

const loginLimiter = (req, res, next) => {
  const ip = (req.ip || req.connection.remoteAddress || 'unknown').replace('::ffff:', '');
  const now = Date.now();
  const windowMs = 1 * 60 * 1000;
  const max = 5;

  if (!loginAttempts.has(ip)) {
    loginAttempts.set(ip, { count: 0, resetTime: now + windowMs });
  }

  const record = loginAttempts.get(ip);

  if (now > record.resetTime) {
    record.count = 0;
    record.resetTime = now + windowMs;
  }

  if (record.count >= max) {
    return res.status(429).json({
      success: false,
      message: 'Too many login attempts. Please try again after 1 minute.',
      errors: [],
    });
  }

  next();
};

const incrementLoginAttempts = (ip) => {
  const record = loginAttempts.get(ip);
  if (record) {
    record.count++;
    loginAttempts.set(ip, record);
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
