const cron = require('node-cron');
const backupService = require('./backupService');

const BACKUP_CRON_EXPRESSION = '0 3 * * 0'; // Every Sunday at 03:00
const BACKUP_TIMEZONE = 'UTC';

async function executeScheduledBackup() {
  console.log('[BACKUP_SCHEDULER] Triggering scheduled weekly database backup...');
  try {
    await backupService.runBackup();
    console.log('[BACKUP_SCHEDULER] Scheduled backup completed successfully.');
  } catch (err) {
    // Catch and log error so a backup failure NEVER crashes the Express API server
    console.error('[BACKUP_SCHEDULER] Scheduled backup failed:', err?.message || err);
  }
}

function startBackupScheduler() {
  console.log(
    `[BACKUP_SCHEDULER] Initializing backup scheduler: cron="${BACKUP_CRON_EXPRESSION}", timezone="${BACKUP_TIMEZONE}" (Sundays at 03:00 UTC)`
  );

  // Register cron schedule ONLY.
  // CRITICAL: DO NOT execute a backup on startup/restart.
  const task = cron.schedule(
    BACKUP_CRON_EXPRESSION,
    () => {
      executeScheduledBackup().catch((err) => {
        console.error('[BACKUP_SCHEDULER] Unexpected error during scheduled run:', err?.message || err);
      });
    },
    {
      scheduled: true,
      timezone: BACKUP_TIMEZONE,
    }
  );

  return task;
}

module.exports = {
  startBackupScheduler,
  executeScheduledBackup,
  BACKUP_CRON_EXPRESSION,
  BACKUP_TIMEZONE,
};
