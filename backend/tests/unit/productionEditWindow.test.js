const { describe, it } = require('node:test');
const assert = require('node:assert');
const {
  canEditOperationalRecord,
  getAddisAbabaDate,
  formatDateInTimezone,
  EDIT_WINDOW_DAYS,
} = require('../../src/utils/dateUtils');
const { subDays, addDays } = require('date-fns');

describe('canEditOperationalRecord - 3-day edit window across roles', () => {
  const roles = [
    'ADMIN',
    'MANAGER',
    'BAKER',
    'CAKE_CHEF',
    'COOKIE_BAKER',
    'FETIR_CHEF',
    'CASHIER',
  ];

  // Reference today in Addis Ababa timezone
  const addisNow = getAddisAbabaDate();
  const today = new Date(Date.UTC(addisNow.getFullYear(), addisNow.getMonth(), addisNow.getDate()));

  const todayStr = formatDateInTimezone(today, 'yyyy-MM-dd');
  const yesterdayStr = formatDateInTimezone(subDays(today, 1), 'yyyy-MM-dd');
  const twoDaysAgoStr = formatDateInTimezone(subDays(today, 2), 'yyyy-MM-dd');
  const threeDaysAgoStr = formatDateInTimezone(subDays(today, 3), 'yyyy-MM-dd');
  const fourDaysAgoStr = formatDateInTimezone(subDays(today, 4), 'yyyy-MM-dd');
  const fiveDaysAgoStr = formatDateInTimezone(subDays(today, 5), 'yyyy-MM-dd');
  const tomorrowStr = formatDateInTimezone(addDays(today, 1), 'yyyy-MM-dd');

  it('exports EDIT_WINDOW_DAYS as 3', () => {
    assert.strictEqual(EDIT_WINDOW_DAYS, 3);
  });

  for (const role of roles) {
    describe(`Role: ${role}`, () => {
      const maxDays = (role === 'ADMIN' || role === 'MANAGER') ? 5 : 3;
      it(`allows today (${todayStr})`, () => {
        assert.strictEqual(canEditOperationalRecord(todayStr, role), true);
      });
      it(`allows yesterday (${yesterdayStr})`, () => {
        assert.strictEqual(canEditOperationalRecord(yesterdayStr, role), true);
      });
      // two days ago is within both windows
      it('allows two days ago', () => {
        assert.strictEqual(canEditOperationalRecord(twoDaysAgoStr, role), true);
      });
      if (maxDays === 5) {
        it('allows four days ago (within 5-day window)', () => {
          assert.strictEqual(canEditOperationalRecord(fourDaysAgoStr, role), true);
        });
      }
      it(`rejects ${maxDays} days ago`, () => {
        const dateStr = maxDays === 5 ? fiveDaysAgoStr : threeDaysAgoStr;
        assert.strictEqual(canEditOperationalRecord(dateStr, role), false);
      });
      it('rejects future date', () => {
        assert.strictEqual(canEditOperationalRecord(tomorrowStr, role), false);
      });
    });
  }

  it('handles Date object input as well as YYYY-MM-DD string', () => {
    const role = 'BAKER';
    const twoDaysAgoDate = subDays(today, 2);
    const threeDaysAgoDate = subDays(today, 3);

    assert.strictEqual(canEditOperationalRecord(twoDaysAgoDate, role), true);
    assert.strictEqual(canEditOperationalRecord(threeDaysAgoDate, role), false);
  });

  it('returns false for null or undefined operationalDate', () => {
    assert.strictEqual(canEditOperationalRecord(null, 'ADMIN'), false);
    assert.strictEqual(canEditOperationalRecord(undefined, 'BAKER'), false);
    assert.strictEqual(canEditOperationalRecord('', 'MANAGER'), false);
  });
});
