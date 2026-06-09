const prisma = require('../config/prisma');

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
    const now = new Date();
    const keySuffix = keyExtractor ? keyExtractor(req, ip) : ip;
    const key = makeRateLimitKey(prefix, keySuffix);
    try {
      let record = await prisma.rateLimit.findUnique({ where: { key } });

      if (!record) {
        record = await prisma.rateLimit.create({
          data: { key, count: 0, expiresAt: new Date(now.getTime() + windowMs) },
        });
      }

      if (now > record.expiresAt) {
        record = await prisma.rateLimit.update({
          where: { key },
          data: { count: 0, expiresAt: new Date(now.getTime() + windowMs) },
        });
      }

      console.log('[RATE_LIMIT]', prefix, key, record?.count, max);

      if (record.count >= max) {
        const retryAfter = Math.ceil((record.expiresAt.getTime() - now.getTime()) / 1000);
        res.set('Retry-After', String(retryAfter));
        res.set('X-RateLimit-Limit', String(max));
        res.set('X-RateLimit-Remaining', '0');
        return res.status(429).json(message);
      }

      await prisma.rateLimit.upsert({
        where: { key },
        create: { key, count: 1, expiresAt: new Date(now.getTime() + windowMs) },
        update: { count: { increment: 1 } },
      });

      next();
    } catch (error) {
      console.error('[RATE_LIMIT_ERROR]', error);
      next();
    }
  };
}

const loginLimiter = async (req, res, next) => {
  const ip = (req.ip || req.connection.remoteAddress || 'unknown').replace('::ffff:', '');
  const now = new Date();
  const windowMs = 1 * 60 * 1000;

  const key = makeRateLimitKey('login', ip);

  try {
    let record = await prisma.rateLimit.findUnique({ where: { key } });

    if (!record) {
      record = await prisma.rateLimit.create({
        data: { key, count: 0, expiresAt: new Date(now.getTime() + windowMs) },
      });
    }

    if (now > record.expiresAt) {
      record = await prisma.rateLimit.update({
        where: { key },
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
  } catch (error) {
    console.error('[RATE_LIMIT_ERROR]', error);
    next();
  }
};

const incrementLoginAttempts = async (ip) => {
  const key = makeRateLimitKey('login', ip);
  try {
    await prisma.rateLimit.upsert({
      where: { key },
      create: { key, count: 1, expiresAt: new Date(Date.now() + 60 * 1000) },
      update: { count: { increment: 1 } },
    });
  } catch (error) {
    console.error('[RATE_LIMIT_ERROR]', error);
  }
};

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
  incrementLoginAttempts,
};