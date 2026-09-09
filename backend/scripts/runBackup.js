require('dotenv').config();
const { runBackup } = require('../src/services/backupService');

async function main() {
  console.log('[BACKUP_SCRIPT] Triggering manual backup...');
  try {
    await runBackup();
    console.log('[BACKUP_SCRIPT] Backup completed successfully.');
    process.exit(0);
  } catch (err) {
    console.error('[BACKUP_SCRIPT] Backup failed:', err);
    process.exit(1);
  }
}

main();
