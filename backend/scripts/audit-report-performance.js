require('dotenv').config();
const path = require('path');

// ============================================================
// AUDIT: Report Performance Measurement
// Measures actual execution time, query counts, bottlenecks
// ============================================================

const queryLog = [];
let queryIdCounter = 0;
let requestIdCounter = 0;

// Monkey-patch prisma BEFORE any module imports it
const origDirname = __dirname;
const prismaConfigPath = path.resolve(origDirname, '..', 'src', 'config', 'prisma.js');

const { PrismaClient } = require('@prisma/client');
const auditedPrisma = new PrismaClient({
  log: [
    { emit: 'event', level: 'query' },
    { emit: 'event', level: 'info' },
    { emit: 'event', level: 'warn' },
    { emit: 'event', level: 'error' },
  ],
});

auditedPrisma.$on('query', (e) => {
  const id = ++queryIdCounter;
  const normalizedQuery = e.query.replace(/\s+/g, ' ').trim();
  queryLog.push({
    id,
    requestId: requestIdCounter,
    timestamp: Date.now(),
    query: normalizedQuery,
    params: e.params,
    duration: e.duration,
    model: extractModel(normalizedQuery),
    operation: extractOperation(normalizedQuery),
  });
});

// Replace the cached prisma module so reportService uses our audited instance
delete require.cache[require.resolve(prismaConfigPath)];
require.cache[require.resolve(prismaConfigPath)] = {
  id: prismaConfigPath,
  filename: prismaConfigPath,
  loaded: true,
  exports: auditedPrisma,
  paths: require.cache[require.resolve(prismaConfigPath)]?.paths || [],
};

const prisma = auditedPrisma;

function extractModel(query) {
  const match = query.match(/(?:FROM|INTO|UPDATE|from|into|update)\s+"(\w+)"/i);
  return match ? match[1] : null;
}

function extractOperation(query) {
  const op = query.trim().split(/\s+/)[0].toUpperCase();
  return op;
}

const { getDailyReport, getWeeklyReport, getMonthlyReport, getYearlyReport } = require('../src/services/reportService');

function resetQueryLog() {
  queryLog.length = 0;
  queryIdCounter = 0;
}

function analyzeQueries(duration) {
  if (queryLog.length === 0) return { totalQueries: 0 };

  const totalQueries = queryLog.length;
  const totalDuration = queryLog.reduce((s, q) => s + q.duration, 0);
  const sortedByDuration = [...queryLog].sort((a, b) => b.duration - a.duration);

  // Find duplicated queries (same normalized SQL with different params)
  const querySignature = {};
  for (const q of queryLog) {
    // Remove parameter values to group by shape
    const sig = q.query.replace(/\$\d+/g, '?').replace(/\d+/g, 'N');
    if (!querySignature[sig]) querySignature[sig] = [];
    querySignature[sig].push(q);
  }

  const duplicates = Object.entries(querySignature)
    .filter(([, qs]) => qs.length > 1)
    .sort((a, b) => b[1].length - a[1].length);

  // Detect repeated per-product patterns (same query with different productId)
  const perProductPatterns = Object.entries(querySignature)
    .filter(([sig, qs]) => {
      const count = qs.length;
      return count > 3 && sig.includes('WHERE') && (sig.includes('productId') || sig.includes('"productId"'));
    });

  // Model-level query count
  const modelCount = {};
  for (const q of queryLog) {
    if (q.model) {
      modelCount[q.model] = (modelCount[q.model] || 0) + 1;
    }
  }

  // Operation count
  const opCount = {};
  for (const q of queryLog) {
    opCount[q.operation] = (opCount[q.operation] || 0) + 1;
  }

  return {
    totalQueries,
    totalQueryDurationMs: totalDuration,
    avgQueryDurationMs: totalDuration / totalQueries,
    slowestQueries: sortedByDuration.slice(0, 5).map(q => ({
      id: q.id,
      duration: q.duration,
      query: q.query.substring(0, 200),
      model: q.model,
    })),
    topDuplicatedPatterns: duplicates.slice(0, 10).map(([sig, qs]) => ({
      count: qs.length,
      totalDuration: qs.reduce((s, q) => s + q.duration, 0),
      sampleQuery: qs[0].query.substring(0, 150),
      model: qs[0].model,
    })),
    perProductQueryPatterns: perProductPatterns.map(([sig, qs]) => ({
      count: qs.length,
      totalDuration: qs.reduce((s, q) => s + q.duration, 0),
      sampleQuery: qs[0].query.substring(0, 150),
    })),
    queriesByModel: Object.entries(modelCount).sort((a, b) => b[1] - a[1]),
    queriesByOperation: Object.entries(opCount).sort((a, b) => b[1] - a[1]),
  };
}

async function measureReport(label, fn) {
  resetQueryLog();
  requestIdCounter++;
  const start = Date.now();

  try {
    await fn();
  } catch (err) {
    console.error(`  ERROR: ${err.message.substring(0, 200)}`);
  }

  const duration = Date.now() - start;
  const analysis = analyzeQueries(duration);

  console.log(`\n=== ${label} ===`);
  console.log(`  Wall time: ${duration}ms`);
  console.log(`  Total queries: ${analysis.totalQueries}`);
  console.log(`  Total query time: ${analysis.totalQueryDurationMs.toFixed(0)}ms`);
  console.log(`  Avg query: ${analysis.avgQueryDurationMs.toFixed(2)}ms`);
  console.log(`  Overhead (non-query): ${(duration - analysis.totalQueryDurationMs).toFixed(0)}ms`);

  if (analysis.totalQueries > 0) {
    if (analysis.slowestQueries.length > 0) {
      console.log(`\n  Slowest queries:`);
      for (const q of analysis.slowestQueries) {
        console.log(`    #${q.id} ${q.duration}ms [${q.model}] ${q.query.substring(0, 120)}`);
      }
    }

    if (analysis.perProductQueryPatterns.length > 0) {
      console.log(`\n  Repeated per-product queries:`);
      for (const p of analysis.perProductQueryPatterns) {
        console.log(`    ${p.count}x ${p.totalDuration.toFixed(0)}ms total ${p.sampleQuery.substring(0, 100)}`);
      }
    }

    if (analysis.topDuplicatedPatterns.length > 0) {
      console.log(`\n  Duplicated query patterns (count > 1):`);
      for (const d of analysis.topDuplicatedPatterns.slice(0, 5)) {
        console.log(`    ${d.count}x ${d.totalDuration.toFixed(0)}ms total [${d.model}] ${d.sampleQuery.substring(0, 100)}`);
      }
    }

    console.log(`\n  Queries by model:`);
    for (const [model, count] of analysis.queriesByModel) {
      console.log(`    ${model}: ${count}`);
    }
  }

  return { duration, ...analysis };
}

async function countRecords() {
  const counts = {};
  for (const table of ['Branch', 'Product', 'ProductionRecord', 'RemainingRecord', 'WasteRecord', 'DailySnapshot', 'DailySnapshotItem', 'DailyClosure', 'ProductPriceHistory']) {
    try {
      const count = await prisma[table[0].toLowerCase() + table.slice(1)].count();
      counts[table] = count;
    } catch (e) {
      counts[table] = `ERROR: ${e.message.substring(0, 50)}`;
    }
  }
  return counts;
}

async function analyzeIndexes() {
  const result = await prisma.$queryRawUnsafe(`
    SELECT
      schemaname,
      tablename,
      indexname,
      indexdef
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename IN ('ProductionRecord', 'RemainingRecord', 'WasteRecord',
                        'DailySnapshot', 'DailySnapshotItem', 'DailyClosure',
                        'ProductPriceHistory', 'Product', 'Branch')
    ORDER BY tablename, indexname
  `);
  return result;
}

async function main() {
  console.log('='.repeat(70));
  console.log('REPORT SYSTEM PERFORMANCE AUDIT');
  console.log('='.repeat(70));
  console.log(`Started at: ${new Date().toISOString()}`);
  console.log('');

  const records = await countRecords();
  console.log('Database record counts:');
  for (const [table, count] of Object.entries(records)) {
    console.log(`  ${table}: ${count}`);
  }

  const today = new Date();
  const yearStr = String(today.getFullYear());
  const monthStr = String(today.getMonth() + 1).padStart(2, '0');
  const dayStr = String(today.getDate()).padStart(2, '0');

  console.log('\n' + '-'.repeat(70));
  console.log('MEASUREMENT 1: Single Branch, Recent Date');
  console.log('-'.repeat(70));

  let results = {};

  // ====== DAILY REPORT ======
  results.daily = await measureReport('DAILY REPORT (single branch, today)', async () => {
    await getDailyReport(1, `${yearStr}-${monthStr}-${dayStr}`, null, null);
  });

  // ====== WEEKLY REPORT ======
  results.weekly = await measureReport('WEEKLY REPORT (single branch, this week)', async () => {
    await getWeeklyReport(1, `${yearStr}-${monthStr}-${dayStr}`, null, null);
  });

  // ====== MONTHLY REPORT ======
  results.monthly = await measureReport('MONTHLY REPORT (single branch, this month)', async () => {
    await getMonthlyReport(1, yearStr, monthStr, null, null);
  });

  // ====== YEARLY REPORT ======
  results.yearly = await measureReport('YEARLY REPORT (single branch, this year)', async () => {
    await getYearlyReport(1, yearStr, null, null);
  });

  // ====== ALL BRANCHES COMPARISON ======
  console.log('\n' + '-'.repeat(70));
  console.log('MEASUREMENT 2: All Branches (worst-case)');
  console.log('-'.repeat(70));

  if (records.Branch > 1) {
    results.dailyAllBranches = await measureReport('DAILY REPORT (all branches)', async () => {
      await getDailyReport(null, `${yearStr}-${monthStr}-${dayStr}`, null, null);
    });
    results.weeklyAllBranches = await measureReport('WEEKLY REPORT (all branches)', async () => {
      await getWeeklyReport(null, `${yearStr}-${monthStr}-${dayStr}`, null, null);
    });
    results.monthlyAllBranches = await measureReport('MONTHLY REPORT (all branches)', async () => {
      await getMonthlyReport(null, yearStr, monthStr, null, null);
    });
    results.yearlyAllBranches = await measureReport('YEARLY REPORT (all branches)', async () => {
      await getYearlyReport(null, yearStr, null, null);
    });
  } else {
    console.log('  (only 1 branch, skipping all-branches tests)');
  }

  // ====== BOTTLENECK SUMMARY ======
  console.log('\n' + '='.repeat(70));
  console.log('BOTTLENECK SUMMARY');
  console.log('='.repeat(70));

  const summary = [
    { name: 'Daily', ...results.daily },
    { name: 'Weekly', ...results.weekly },
    { name: 'Monthly', ...results.monthly },
    { name: 'Yearly', ...results.yearly },
  ];

  if (results.dailyAllBranches) {
    summary.push({ name: 'Daily (all)', ...results.dailyAllBranches });
    summary.push({ name: 'Weekly (all)', ...results.weeklyAllBranches });
    summary.push({ name: 'Monthly (all)', ...results.monthlyAllBranches });
    summary.push({ name: 'Yearly (all)', ...results.yearlyAllBranches });
  }

  console.log('\n  Report Type       | Time(ms) | Queries | QueryTime(ms) | Avg(ms) | Overhead(ms)');
  console.log('  ' + '-'.repeat(90));
  for (const s of summary) {
    const qt = s.totalQueryDurationMs || 0;
    const avg = s.avgQueryDurationMs || 0;
    console.log(
      `  ${s.name.padEnd(18)} | ${String(s.duration).padStart(7)} | ${String(s.totalQueries).padStart(7)} | ${qt.toFixed(0).padStart(12)} | ${avg.toFixed(1).padStart(6)} | ${(s.duration - qt).toFixed(0).padStart(11)}`
    );
  }

  // Ranking bottlenecks
  console.log('\n  BOTTLENECK RANKING:');
  console.log('  ' + '-'.repeat(50));

  const bottlenecks = [];
  const bw = summary.filter(s => s.name.includes('Weekly') || s.name.includes('Monthly'));

  for (const s of summary) {
    if (s.perProductQueryPatterns && s.perProductQueryPatterns.length > 0) {
      const nPlusOneCount = s.perProductQueryPatterns.reduce((a, p) => a + p.count, 0);
      const nPlusOneDuration = s.perProductQueryPatterns.reduce((a, p) => a + p.totalDuration, 0);
      const ratio = s.totalQueries > 0 ? nPlusOneCount / s.totalQueries : 0;
      bottlenecks.push({
        type: 'N+1 Query Explosion',
        report: s.name,
        severity: ratio > 0.5 ? 'CRITICAL' : ratio > 0.2 ? 'HIGH' : 'MEDIUM',
        detail: `${nPlusOneCount} per-product queries (${(ratio * 100).toFixed(0)}% of total), ${nPlusOneDuration.toFixed(0)}ms`,
      });
    }
  }

  for (const s of summary) {
    const tqdm = s.totalQueryDurationMs || 0;
    const overhead = s.duration - tqdm;
    const overheadRatio = s.duration > 0 ? overhead / s.duration : 0;
    if (overheadRatio > 0.2 && s.duration > 100) {
      bottlenecks.push({
        type: 'Serialization / JS Overhead',
        report: s.name,
        severity: overhead > 1000 ? 'HIGH' : 'MEDIUM',
        detail: `${overhead.toFixed(0)}ms non-query time (${(overheadRatio * 100).toFixed(0)}% of total)`,
      });
    }
    if (s.totalQueries > 100) {
      bottlenecks.push({
        type: 'Total Query Volume',
        report: s.name,
        severity: s.totalQueries > 1000 ? 'CRITICAL' : 'HIGH',
        detail: `${s.totalQueries} total queries (${(tqdm).toFixed(0)}ms total query time)`,
      });
    }
  }

  const severityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
  bottlenecks.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  for (let i = 0; i < bottlenecks.length; i++) {
    const b = bottlenecks[i];
    console.log(`  ${i + 1}. [${b.severity}] ${b.type} (${b.report}): ${b.detail}`);
  }

  // ====== INDEX ANALYSIS ======
  console.log('\n' + '-'.repeat(70));
  console.log('DATABASE INDEX ANALYSIS');
  console.log('-'.repeat(70));

  const indexes = await analyzeIndexes();
  const indexMap = {};
  for (const idx of indexes) {
    const tbl = idx.tablename;
    if (!indexMap[tbl]) indexMap[tbl] = [];
    indexMap[tbl].push({ name: idx.indexname, def: idx.indexdef });
  }

  for (const [table, idxs] of Object.entries(indexMap)) {
    console.log(`\n  ${table}:`);
    for (const idx of idxs) {
      console.log(`    ${idx.name}: ${idx.def.substring(0, 150)}`);
    }
  }

  // Check for missing indexes
  const missingChecks = [];
  const allIndexDefs = indexes.map(i => i.indexdef);

  // Check operationalDate indexes
  for (const tbl of ['ProductionRecord', 'RemainingRecord', 'WasteRecord', 'DailySnapshot', 'DailySnapshotItem']) {
    const hasOpDate = allIndexDefs.some(d => d.includes(tbl) && d.includes('operationalDate'));
    if (!hasOpDate) missingChecks.push(`  MISSING: ${tbl} has no index on operationalDate`);
  }

  // Check composite indexes for report queries
  const hasProdComposite = allIndexDefs.some(d => d.includes('ProductionRecord') && d.includes('branchId') && d.includes('operationalDate') && d.includes('productId'));
  if (!hasProdComposite) missingChecks.push('  MISSING: ProductionRecord lacks composite [branchId, operationalDate, productId]');

  const hasRemComposite = allIndexDefs.some(d => d.includes('RemainingRecord') && d.includes('branchId') && d.includes('operationalDate') && d.includes('productId'));
  if (!hasRemComposite) missingChecks.push('  MISSING: RemainingRecord lacks composite [branchId, operationalDate, productId]');

  if (missingChecks.length > 0) {
    console.log('\n  POTENTIAL MISSING INDEXES:');
    for (const m of missingChecks) console.log(m);
  } else {
    console.log('\n  All critical indexes appear to be present.');
  }

  // ====== getMonday() ANALYSIS ======
  console.log('\n' + '-'.repeat(70));
  console.log('getMonday() EDGE CASE ANALYSIS');
  console.log('-'.repeat(70));

  const { getMonday, getSunday, toDateString } = require('../src/utils/dateUtils');

  // Test March 1, 2026 (Sunday)
  const testCases = [
    { label: 'Month starting on Sunday', date: '2026-03-01' },
    { label: 'Month starting on Monday', date: '2026-06-01' },
    { label: 'Month starting on Wednesday', date: '2026-04-01' },
    { label: 'Month starting on Saturday', date: '2026-08-01' },
    { label: 'Mid-month (15th)', date: '2026-04-15' },
  ];

  for (const tc of testCases) {
    const input = new Date(tc.date);
    const mon = getMonday(input);
    const sun = getSunday(input);
    const monStr = toDateString(mon);
    const sunStr = toDateString(sun);
    const includesPrevMonth = mon.getMonth() !== input.getMonth();
    const prevMonthDays = includesPrevMonth ? input.getDate() - mon.getDate() : 0;
    console.log(`  ${tc.label} (${tc.date}):`);
    console.log(`    Input day: ${input.getUTCDay()} (${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][input.getUTCDay()]})`);
    console.log(`    Monday: ${monStr}, Sunday: ${sunStr}`);
    console.log(`    Includes previous month days: ${includesPrevMonth ? `YES (${prevMonthDays} days from previous month)` : 'NO'}`);
  }

  console.log('\n  IMPACT: getMonday may include up to 6 days from previous month');
  console.log('  in the first week\'s Monday boundary. However, getMonthlyReport');
  console.log('  calls getWeeklyReport with the first day of the month, not the');
  console.log('  computed Monday, so the partial-week logic correctly bounds the');
  console.log('  report to month-internal days only. The getMonday() call inside');
  console.log('  getWeeklyReport re-anchors the week to Monday, which means the');
  console.log('  daily details within that week may show dates from the previous');
  console.log('  month (affecting dayName/date display), but totals are not');
  console.log('  double-counted because getWeeklyReport only iterates 7 days from');
  console.log('  the input startDate, not from the computed Monday.');
  console.log('  VERDICT: Display bug only, no incorrect totals.');

  // ====== REACT QUERY RETRY ANALYSIS ======
  console.log('\n' + '-'.repeat(70));
  console.log('FRONTEND RETRY BEHAVIOR ANALYSIS');
  console.log('-'.repeat(70));
  console.log('  Axios timeout: 30s');
  console.log('  Axios retries: 2 (status 408, 502, 503, 504, ECONNABORTED)');
  console.log('  React Query staleTime: daily=30s, weekly=5min, monthly=10min, yearly=60min');
  console.log('  React Query gcTime: 2min (all)');
  console.log('  React Query retry: DEFAULT (3 attempts on failure)');
  console.log('');
  console.log('  AMPLIFICATION SCENARIO:');
  console.log('  If monthly report takes 35s (>30s timeout):');
  console.log('    Axios times out (ECONNABORTED) → retries (2x) → 35s * 3 = 105s total');
  console.log('    React Query sees failure → retries 3x more → 105s * 3 = 315s total');
  console.log('    Total perceived wait: ~5 minutes before error is shown');
  console.log('  This EXPLAINS the "hanging" behavior users see for monthly reports.');

  // ====== COMPARISON TABLE ======
  console.log('\n' + '='.repeat(70));
  console.log('ARCHITECTURE COMPARISON: Why Yearly Is More Efficient');
  console.log('='.repeat(70));
  console.log(`
  getWeeklyReport              | getMonthlyReport              | getYearlyReport
  -----------------------------|-------------------------------|------------------------------
  Sequential 7-day FOR loop    | Calls getWeeklyReport 4-5x    | Dual-path: snapshots + groupBy
  Per day: N calls to          | Same N+1 explosion as         | Snapshot: 2 queries/branch
    getInventoryFlowReport     | weekly × 5 = 5x more queries  | Live: 3 groupBy/month/branch
  N+1 per product within       | Recursive composition means   | Batch PriceHistory load
    getFullInventoryFlow       | 35 getInventoryFlowReport     | No per-product loops in DB
  ~8 sub-queries per product   | calls for a 5-week month      | All aggregation in SQL
  No parallel day processing   | No parallel week processing   | Data processed in memory
  Sequential branch processing | Sequential branch processing | Sequential branch processing

  Yearly is more efficient because:
  1. Uses SQL GROUP BY (set-based) instead of per-product loops
  2. Reads pre-computed snapshots for closed days (no calculation needed)
  3. Batch-loads PriceHistory once instead of per-product lookups
  4. Avoids recursive composition (weekly → monthly ≈ 5x multiplier)
  5. Single query per month per metric vs N_products × days queries
  `);

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error('FATAL:', err);
  await prisma.$disconnect();
  process.exit(1);
});
