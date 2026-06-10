const rateLimitStore = require('../utils/rateLimitStore');

function makeRateLimitKey(feature, ip) {
  var safeFeature = (feature && typeof feature === 'string') ? feature : 'unknown';
  var safeIp = (ip && typeof ip === 'string') ? ip : 'unknown';
  if (safeFeature !== feature || safeIp !== ip) {
    console.warn('[RATE_LIMIT] Invalid input, falling back to unknown key');
  }
  return 'ratelimit:' + safeFeature + ':' + safeIp;
}

function createPrismaLimiter({ windowMs, max, message, prefix, keyExtractor }) {
  return async (req, res, next) => {
    const ip = (req.ip || req.connection.remoteAddress || 'unknown').replace('::ffff:', '');
    const keySuffix = keyExtractor ? keyExtractor(req, ip) : ip;
    const key = makeRateLimitKey(prefix, keySuffix);
    try {
      const result = rateLimitStore.check(key, max, windowMs);

      if (!result.allowed) {
        res.set('Retry-After', String(result.retryAfter));
        res.set('X-RateLimit-Limit', String(max));
        res.set('X-RateLimit-Remaining', '0');
        return res.status(429).json(message);
      }

      rateLimitStore.increment(key, windowMs);
      next();
    } catch (error) {
      console.error('[RATE_LIMIT_ERROR]', error);
      next();
    }
  };
}

const loginLimiter = createPrismaLimiter({
  windowMs: 1 * 60 * 1000,
  max: 5,
  prefix: 'login',
  message: {
    success: false,
    message: 'Too many login attempts. Please try again after 1 minute.',
    errors: [],
  },
});

const apiLimiter = createPrismaLimiter({
  windowMs: 15 * 60 * 1000,
  max: 250,
  prefix: 'api',
  message: {
    success: false,
    message: 'Too many requests. Please try again after 15 minutes.',
    errors: [],
  },
});

const exportLimiter = createPrismaLimiter({
  windowMs: 60 * 60 * 1000,
  max: 10,
  prefix: 'export',
  message: {
    success: false,
    message: 'Too many export requests. Please try again after 1 hour.',
    errors: [],
  },
});

const otpLimiter = createPrismaLimiter({
  windowMs: 1 * 60 * 1000,
  max: 3,
  prefix: 'otp',
  keyExtractor: (req, ip) => {
    const rawEmail = (req.body && req.body.email) ? String(req.body.email).toLowerCase().trim() : '';
    return rawEmail ? `${ip}|${rawEmail}` : ip;
  },
  message: {
    success: false,
    message: 'Too many password reset requests. Please try again after 1 minute.',
    errors: [],
  },
});

module.exports = {
  loginLimiter,
  apiLimiter,
  exportLimiter,
  otpLimiter,
};