const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const cron = require('node-cron');
const backupService = require('../../src/services/backupService');
const {
  startBackupScheduler,
  executeScheduledBackup,
  BACKUP_CRON_EXPRESSION,
  BACKUP_TIMEZONE,
} = require('../../src/services/backupScheduler');

describe('backupScheduler', () => {
  it('exports the correct cron expression and timezone', () => {
    assert.strictEqual(BACKUP_CRON_EXPRESSION, '0 3 * * 0');
    assert.strictEqual(BACKUP_TIMEZONE, 'UTC');
    assert.strictEqual(cron.validate(BACKUP_CRON_EXPRESSION), true);
  });

  it('registers the cron job with UTC timezone and does NOT run backup on startup', () => {
    let backupCalled = false;
    const originalRunBackup = backupService.runBackup;
    backupService.runBackup = async () => {
      backupCalled = true;
    };

    let scheduleCalledWith = null;
    const originalSchedule = cron.schedule;
    cron.schedule = (exp, fn, opts) => {
      scheduleCalledWith = { exp, fn, opts };
      return { stop: () => {} };
    };

    try {
      const task = startBackupScheduler();

      // Verify cron schedule parameters
      assert.strictEqual(scheduleCalledWith.exp, '0 3 * * 0');
      assert.strictEqual(scheduleCalledWith.opts.scheduled, true);
      assert.strictEqual(scheduleCalledWith.opts.timezone, 'UTC');

      // CRITICAL: Verify runBackup was NOT called on startup
      assert.strictEqual(backupCalled, false, 'runBackup must not be invoked on startup');
      assert.ok(task);
    } finally {
      backupService.runBackup = originalRunBackup;
      cron.schedule = originalSchedule;
    }
  });

  it('executes runBackup when scheduled backup is triggered', async () => {
    let backupCalled = false;
    const originalRunBackup = backupService.runBackup;
    backupService.runBackup = async () => {
      backupCalled = true;
    };

    try {
      await executeScheduledBackup();
      assert.strictEqual(backupCalled, true, 'runBackup must be called');
    } finally {
      backupService.runBackup = originalRunBackup;
    }
  });

  it('catches backup failures, logs the error, and does NOT throw or crash', async () => {
    const originalRunBackup = backupService.runBackup;
    backupService.runBackup = async () => {
      throw new Error('Simulated S3 connection timeout');
    };

    let errorLogged = false;
    const originalConsoleError = console.error;
    console.error = (...args) => {
      if (args[0] && args[0].includes('[BACKUP_SCHEDULER] Scheduled backup failed:')) {
        errorLogged = true;
      }
    };

    try {
      // Must resolve without throwing
      await executeScheduledBackup();
      assert.strictEqual(errorLogged, true, 'Failure must be logged');
    } finally {
      backupService.runBackup = originalRunBackup;
      console.error = originalConsoleError;
    }
  });
});
