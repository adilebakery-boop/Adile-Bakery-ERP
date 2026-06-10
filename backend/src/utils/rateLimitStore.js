const store = new Map();
const CLEANUP_INTERVAL = 60 * 1000;

function makeKey(feature, suffix) {
  const safeFeature = (feature && typeof feature === 'string') ? feature : 'unknown';
  const safeSuffix = (suffix && typeof suffix === 'string') ? suffix : 'unknown';
  return safeFeature + ':' + safeSuffix;
}

function now() {
  return Date.now();
}

function check(key, max, windowMs) {
  const entry = store.get(key);
  if (!entry) {
    return { allowed: true, retryAfter: 0 };
  }
  if (now() > entry.resetTime) {
    store.delete(key);
    return { allowed: true, retryAfter: 0 };
  }
  if (entry.count >= max) {
    const retryAfter = Math.ceil((entry.resetTime - now()) / 1000);
    return { allowed: false, retryAfter };
  }
  return { allowed: true, retryAfter: 0 };
}

function increment(key, windowMs) {
  const entry = store.get(key);
  if (!entry || now() > entry.resetTime) {
    store.set(key, { count: 1, resetTime: now() + windowMs });
    return;
  }
  entry.count += 1;
}

function cleanup() {
  const cutoff = now();
  for (const [key, entry] of store.entries()) {
    if (cutoff > entry.resetTime) {
      store.delete(key);
    }
  }
}

setInterval(cleanup, CLEANUP_INTERVAL);

module.exports = { makeKey, check, increment, cleanup };
