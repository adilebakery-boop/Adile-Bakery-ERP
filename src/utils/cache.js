const cache = new Map();

function set(key, value, ttlMs = 5 * 60 * 1000) {
  cache.set(key, {
    value,
    expiresAt: Date.now() + ttlMs,
  });
}

function get(key) {
  const entry = cache.get(key);
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return undefined;
  }
  return entry.value;
}

function invalidate(key) {
  cache.delete(key);
}

function invalidatePrefix(prefix) {
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) {
      cache.delete(key);
    }
  }
}

function clear() {
  cache.clear();
}

function getStats() {
  let expired = 0;
  let active = 0;
  const now = Date.now();
  for (const entry of cache.values()) {
    if (now > entry.expiresAt) expired++;
    else active++;
  }
  return { size: cache.size, active, expired };
}

module.exports = { set, get, invalidate, invalidatePrefix, clear, getStats };
