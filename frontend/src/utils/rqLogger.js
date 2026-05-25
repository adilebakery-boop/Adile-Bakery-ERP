// Development-only React Query logging hook.
// Logs query starts, cache hits, mutation operations for debugging.

export function registerQueryLogger(queryClient) {
  if (process.env.NODE_ENV === 'production') return;

  const queryCache = queryClient.getQueryCache();

  queryCache.subscribe((event) => {
    if (event.type === 'added') {
      console.debug(`[RQ:CACHE] + Added: ${event.query.queryHash}`);
    }
    if (event.type === 'updated') {
      console.debug(`[RQ:CACHE] ~ Updated: ${event.query.queryHash}`);
    }
    if (event.type === 'removed') {
      console.debug(`[RQ:CACHE] - Removed: ${event.query.queryHash}`);
    }
  });
}

export function logRefetchStorm(queryClient, threshold = 5) {
  let count = 0;
  const originalInvalidate = queryClient.invalidateQueries.bind(queryClient);

  queryClient.invalidateQueries = (...args) => {
    count++;
    if (count > threshold) {
      console.warn(`[RQ:STORM] ${count} invalidations triggered in current batch`, args[0]);
    }
    return originalInvalidate(...args);
  };
}
