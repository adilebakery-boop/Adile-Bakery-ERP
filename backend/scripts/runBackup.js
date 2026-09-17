require('dotenv').config();
const { runBackup } = require('../src/services/backupService');

if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log('Usage: npm run backup');
  console.log('Executes a PostgreSQL pg_dump stream to AWS S3 and applies retention cleanup.');
  console.log('\nRequired Environment Variables:');
  console.log('  AWS_REGION             AWS region (e.g. eu-north-1)');
  console.log('  AWS_S3_BUCKET          S3 bucket name (e.g. adile-bakery-erp-db-backups)');
  console.log('  DATABASE_URL           PostgreSQL connection string (or DIRECT_URL)');
  console.log('  AWS_ACCESS_KEY_ID      AWS access key');
  console.log('  AWS_SECRET_ACCESS_KEY  AWS secret key');
  process.exit(0);
}

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
