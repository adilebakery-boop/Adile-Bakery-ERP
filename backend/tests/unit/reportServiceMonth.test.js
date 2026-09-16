const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert');

process.env.DATABASE_URL = 'postgresql://dummy:dummy@localhost:5432/dummy';

const prisma = require('../../src/config/prisma');
const inventoryFlowService = require('../../src/services/inventoryFlowService');
const reportService = require('../../src/services/reportService');

describe('reportService - getMonthlyReport & getMonthWeekSpecs', () => {
  let fetchedDates = [];
  const originalGetInventoryFlowReport = inventoryFlowService.getInventoryFlowReport;
  const originalBranchFindMany = prisma.branch.findMany;
  const originalBranchFindUnique = prisma.branch.findUnique;

  beforeEach(() => {
    fetchedDates = [];

    // Mock prisma branch calls
    prisma.branch.findMany = async () => [{ id: 1, name: 'Main Branch' }];
    prisma.branch.findUnique = async ({ where }) => ({ id: where.id, name: 'Main Branch' });

    // Mock inventoryFlowService.getInventoryFlowReport to return deterministic data per date
    inventoryFlowService.getInventoryFlowReport = async (branchId, dateStr) => {
      fetchedDates.push(dateStr);
      const [year, month, day] = dateStr.split('-').map(Number);
      const dayNum = day;

      const products = [
        {
          product: { id: 101, name: 'White Bread', category: 'BREAD_AND_SWEET_BREADS' },
          openingStock: dayNum * 5,
          dayProduction: dayNum * 10,
          nightProduction: dayNum * 2,
          sellableStock: dayNum * 17,
          remainingStock: dayNum * 3,
          wasteQuantity: dayNum * 1,
          estimatedSold: dayNum * 13,
          estimatedRevenue: dayNum * 130,
        },
      ];

      return {
        source: 'live',
        branchId,
        branchName: 'Main Branch',
        operationalDate: dateStr,
        isClosed: false,
        products,
        totals: {
          totalOpeningStock: dayNum * 5,
          totalDayProduction: dayNum * 10,
          totalNightProduction: dayNum * 2,
          totalNightProductionPreparedFor: 0,
          totalSellableStock: dayNum * 17,
          totalRemainingStock: dayNum * 3,
          totalWasteQuantity: dayNum * 1,
          totalEstimatedSold: dayNum * 13,
          totalEstimatedRevenue: dayNum * 130,
        },
      };
    };
  });

  // Helper to verify month report invariants
  async function testMonthInvariants(year, month, expectedDayCount, expectedBuckets) {
    fetchedDates = [];
    const report = await reportService.getMonthlyReport(1, year, month, null, null);

    assert.strictEqual(report.reportType, 'MONTHLY');
    assert.strictEqual(report.year, year);
    assert.strictEqual(report.month, month);

    // 1. Check fetched dates
    assert.strictEqual(fetchedDates.length, expectedDayCount, `Expected exactly ${expectedDayCount} dates to be queried`);
    const uniqueFetched = new Set(fetchedDates);
    assert.strictEqual(uniqueFetched.size, expectedDayCount, `Expected no duplicate dates queried`);

    // 2. Check that no date is outside the month
    const yearStr = String(year);
    const monthStr = String(month).padStart(2, '0');
    for (const d of fetchedDates) {
      assert.ok(d.startsWith(`${yearStr}-${monthStr}-`), `Date ${d} is outside month ${year}-${month}`);
    }

    // 3. Check every day of the month exists
    for (let day = 1; day <= expectedDayCount; day++) {
      const expectedDate = `${yearStr}-${monthStr}-${String(day).padStart(2, '0')}`;
      assert.ok(uniqueFetched.has(expectedDate), `Day ${expectedDate} was missing from fetched dates`);
    }

    // 4. Check week buckets
    if (expectedBuckets) {
      assert.strictEqual(report.weeks.length, expectedBuckets.length, `Expected ${expectedBuckets.length} week buckets`);
      for (let i = 0; i < expectedBuckets.length; i++) {
        const w = report.weeks[i];
        const exp = expectedBuckets[i];
        assert.strictEqual(w.weekStartDate, exp.start, `Week ${i + 1} start mismatch`);
        assert.strictEqual(w.weekEndDate, exp.end, `Week ${i + 1} end mismatch`);
        assert.strictEqual(w.days.length, exp.days, `Week ${i + 1} day count mismatch`);
      }
    }

    // 5. Check outside-month protection on returned objects
    for (const w of report.weeks) {
      assert.ok(w.weekStartDate.startsWith(`${yearStr}-${monthStr}-`), `Week start ${w.weekStartDate} outside month`);
      assert.ok(w.weekEndDate.startsWith(`${yearStr}-${monthStr}-`), `Week end ${w.weekEndDate} outside month`);
      for (const d of w.days) {
        assert.ok(d.date.startsWith(`${yearStr}-${monthStr}-`), `Day ${d.date} in week days outside month`);
      }
    }

    // 6. Check total consistency: monthly total = sum of weekly totals
    const sumOfWeeks = report.weeks.reduce((acc, w) => ({
      totalOpeningStock: acc.totalOpeningStock + w.totals.totalOpeningStock,
      totalDayProduction: acc.totalDayProduction + w.totals.totalDayProduction,
      totalNightProduction: acc.totalNightProduction + w.totals.totalNightProduction,
      totalSellableStock: acc.totalSellableStock + w.totals.totalSellableStock,
      totalRemainingStock: acc.totalRemainingStock + w.totals.totalRemainingStock,
      totalWasteQuantity: acc.totalWasteQuantity + w.totals.totalWasteQuantity,
      totalEstimatedSold: acc.totalEstimatedSold + w.totals.totalEstimatedSold,
      totalEstimatedRevenue: acc.totalEstimatedRevenue + w.totals.totalEstimatedRevenue,
    }), {
      totalOpeningStock: 0, totalDayProduction: 0, totalNightProduction: 0,
      totalSellableStock: 0, totalRemainingStock: 0, totalWasteQuantity: 0,
      totalEstimatedSold: 0, totalEstimatedRevenue: 0,
    });

    assert.strictEqual(report.totals.totalDayProduction, sumOfWeeks.totalDayProduction, 'Monthly totalDayProduction must equal sum of week totals');
    assert.strictEqual(report.totals.totalNightProduction, sumOfWeeks.totalNightProduction, 'Monthly totalNightProduction must equal sum of week totals');
    assert.strictEqual(report.totals.totalSellableStock, sumOfWeeks.totalSellableStock, 'Monthly totalSellableStock must equal sum of week totals');
    assert.strictEqual(report.totals.totalRemainingStock, sumOfWeeks.totalRemainingStock, 'Monthly totalRemainingStock must equal sum of week totals');
    assert.strictEqual(report.totals.totalWasteQuantity, sumOfWeeks.totalWasteQuantity, 'Monthly totalWasteQuantity must equal sum of week totals');
    assert.strictEqual(report.totals.totalEstimatedSold, sumOfWeeks.totalEstimatedSold, 'Monthly totalEstimatedSold must equal sum of week totals');
    assert.strictEqual(report.totals.totalEstimatedRevenue, sumOfWeeks.totalEstimatedRevenue, 'Monthly totalEstimatedRevenue must equal sum of week totals');

    return report;
  }

  it('1. May 2026: Exactly 31 unique dates, no April or June dates', async () => {
    const expectedBuckets = [
      { start: '2026-05-01', end: '2026-05-03', days: 3 },
      { start: '2026-05-04', end: '2026-05-10', days: 7 },
      { start: '2026-05-11', end: '2026-05-17', days: 7 },
      { start: '2026-05-18', end: '2026-05-24', days: 7 },
      { start: '2026-05-25', end: '2026-05-31', days: 7 },
    ];
    await testMonthInvariants(2026, 5, 31, expectedBuckets);
  });

  it('2. April 2026: Exactly 30 unique dates, final week 2026-04-27 -> 2026-04-30', async () => {
    const expectedBuckets = [
      { start: '2026-04-01', end: '2026-04-05', days: 5 },
      { start: '2026-04-06', end: '2026-04-12', days: 7 },
      { start: '2026-04-13', end: '2026-04-19', days: 7 },
      { start: '2026-04-20', end: '2026-04-26', days: 7 },
      { start: '2026-04-27', end: '2026-04-30', days: 4 },
    ];
    await testMonthInvariants(2026, 4, 30, expectedBuckets);
  });

  it('3. August 2026: Exactly 31 unique dates across 6 bounded weeks', async () => {
    const expectedBuckets = [
      { start: '2026-08-01', end: '2026-08-02', days: 2 },
      { start: '2026-08-03', end: '2026-08-09', days: 7 },
      { start: '2026-08-10', end: '2026-08-16', days: 7 },
      { start: '2026-08-17', end: '2026-08-23', days: 7 },
      { start: '2026-08-24', end: '2026-08-30', days: 7 },
      { start: '2026-08-31', end: '2026-08-31', days: 1 },
    ];
    await testMonthInvariants(2026, 8, 31, expectedBuckets);
  });

  it('4. March 2026: Exactly 31 unique dates including March 30 and March 31', async () => {
    const expectedBuckets = [
      { start: '2026-03-01', end: '2026-03-01', days: 1 },
      { start: '2026-03-02', end: '2026-03-08', days: 7 },
      { start: '2026-03-09', end: '2026-03-15', days: 7 },
      { start: '2026-03-16', end: '2026-03-22', days: 7 },
      { start: '2026-03-23', end: '2026-03-29', days: 7 },
      { start: '2026-03-30', end: '2026-03-31', days: 2 },
    ];
    await testMonthInvariants(2026, 3, 31, expectedBuckets);
  });

  it('5. February 2026: Exactly 28 unique dates, starts Sunday Feb 1', async () => {
    const expectedBuckets = [
      { start: '2026-02-01', end: '2026-02-01', days: 1 },
      { start: '2026-02-02', end: '2026-02-08', days: 7 },
      { start: '2026-02-09', end: '2026-02-15', days: 7 },
      { start: '2026-02-16', end: '2026-02-22', days: 7 },
      { start: '2026-02-23', end: '2026-02-28', days: 6 },
    ];
    await testMonthInvariants(2026, 2, 28, expectedBuckets);
  });

  it('6. Leap February (2024 & 2028): Exactly 29 unique dates', async () => {
    await testMonthInvariants(2024, 2, 29);
    await testMonthInvariants(2028, 2, 29);
  });

  it('7. Consecutive months (April + May 2026): Zero overlapping dates', async () => {
    fetchedDates = [];
    await reportService.getMonthlyReport(1, 2026, 4, null, null);
    const aprilDates = [...fetchedDates];

    fetchedDates = [];
    await reportService.getMonthlyReport(1, 2026, 5, null, null);
    const mayDates = [...fetchedDates];

    assert.strictEqual(aprilDates.length, 30);
    assert.strictEqual(mayDates.length, 31);

    const combinedSet = new Set([...aprilDates, ...mayDates]);
    assert.strictEqual(combinedSet.size, 61, 'Expected 61 distinct dates across April and May without overlap');

    for (const d of aprilDates) {
      assert.ok(!mayDates.includes(d), `Date ${d} in April should not be in May`);
    }
  });

  it('8. Standalone getWeeklyReport preserves complete Monday-Sunday operational week', async () => {
    fetchedDates = [];
    // Select a Wednesday mid-week: 2026-05-13
    const weeklyReport = await reportService.getWeeklyReport(1, '2026-05-13', null, null);

    assert.strictEqual(weeklyReport.reportType, 'WEEKLY');
    assert.strictEqual(weeklyReport.weekStartDate, '2026-05-11');
    assert.strictEqual(weeklyReport.weekEndDate, '2026-05-17');
    assert.strictEqual(weeklyReport.days.length, 7);
    assert.strictEqual(fetchedDates.length, 7);
    assert.deepStrictEqual(fetchedDates, [
      '2026-05-11', '2026-05-12', '2026-05-13', '2026-05-14',
      '2026-05-15', '2026-05-16', '2026-05-17'
    ]);
  });
});
