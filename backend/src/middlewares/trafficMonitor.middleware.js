// Traffic monitoring middleware — counts requests per route prefix within a rolling window.
// Logs counts periodically to provide telemetry for per-route rate limit budgeting.
// Remove or disable once route-specific budgets are deployed and tuned.

const ROUTE_GROUPS = [
  { prefix: '/api/dashboard', name: 'dashboard' },
  { prefix: '/api/remainings', name: 'remaining' },
  { prefix: '/api/productions', name: 'production' },
  { prefix: '/api/products', name: 'products' },
  { prefix: '/api/branches', name: 'branches' },
  { prefix: '/api/reports', name: 'reports' },
  { prefix: '/api/users', name: 'users' },
  { prefix: '/api/auth', name: 'auth' },
  { prefix: '/api/wastes', name: 'waste' },
  { prefix: '/api/closures', name: 'closure' },
];

const LOG_INTERVAL_MS = 60 * 1000;
const WINDOW_MS = 15 * 60 * 1000;

const counters = {};
ROUTE_GROUPS.forEach(g => { counters[g.name] = 0; });
counters['other'] = 0;

let logTimer = null;

function getRouteGroup(path) {
  for (const g of ROUTE_GROUPS) {
    if (path.startsWith(g.prefix)) return g.name;
  }
  return 'other';
}

function trafficMonitor(req, res, next) {
  const group = getRouteGroup(req.path);
  counters[group] = (counters[group] || 0) + 1;

  if (!logTimer) {
    logTimer = setTimeout(() => {
      const total = Object.values(counters).reduce((a, b) => a + b, 0);
      console.log('[TRAFFIC] 15min-window counts (log interval: 60s):');
      const sorted = Object.entries(counters).sort((a, b) => b[1] - a[1]);
      sorted.forEach(([route, count]) => {
        const pct = total > 0 ? ((count / total) * 100).toFixed(1) : '0.0';
        console.log(`  ${route.padEnd(15)} ${String(count).padStart(5)}  (${pct}%)`);
      });
      console.log(`  ${'TOTAL'.padEnd(15)} ${String(total).padStart(5)}`);

      // Reset counters for next window
      ROUTE_GROUPS.forEach(g => { counters[g.name] = 0; });
      counters['other'] = 0;
      logTimer = null;
    }, LOG_INTERVAL_MS);
  }

  next();
}

module.exports = trafficMonitor;
