const { spawn } = require('child_process');
const zlib = require('zlib');
const { S3Client, ListObjectsV2Command, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { Upload } = require('@aws-sdk/lib-storage');

let isBackupRunning = false;

async function runBackup() {
  if (isBackupRunning) {
    console.warn('[BACKUP] Backup is already running. Skipping concurrent execution.');
    return;
  }

  isBackupRunning = true;
  try {
    const { AWS_REGION, AWS_S3_BUCKET, DATABASE_URL } = process.env;

    // AWS credentials will be automatically picked up from AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY
    if (!AWS_REGION || !AWS_S3_BUCKET || !DATABASE_URL) {
      throw new Error('[BACKUP] Missing required environment variables (AWS_REGION, AWS_S3_BUCKET, DATABASE_URL)');
    }

    const s3Client = new S3Client({ region: AWS_REGION });
    
    const now = new Date();
    // Unique, sortable, unambiguous UTC timestamp: YYYY-MM-DDTHH-mm-ss
    const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const backupKey = `backups/adile-bakery-erp-db-backup-${timestamp}.sql.gz`;

    console.log(`[BACKUP] Starting DB backup stream to S3: ${backupKey}`);

    const dbUrl = process.env.DIRECT_URL || DATABASE_URL;
    await new Promise((resolve, reject) => {
      // 1. Spawn pg_dump
      const pgDump = spawn('pg_dump', [dbUrl, '--no-owner', '--no-privileges']);
      
      // 2. Gzip stream
      const gzip = zlib.createGzip();

      pgDump.stdout.pipe(gzip);

      let pgDumpExited = false;
      let uploadFinished = false;

      // Handle pg_dump errors
      pgDump.stderr.on('data', (data) => {
        console.error(`[pg_dump error] ${data.toString()}`);
      });

      pgDump.on('error', (err) => {
        reject(new Error(`[BACKUP] pg_dump failed to start: ${err.message}`));
      });

      pgDump.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`[BACKUP] pg_dump exited with code ${code}`));
        } else {
          pgDumpExited = true;
          if (uploadFinished) resolve();
        }
      });

      gzip.on('error', (err) => {
        reject(new Error(`[BACKUP] gzip stream error: ${err.message}`));
      });

      // 3. S3 Upload Stream
      const upload = new Upload({
        client: s3Client,
        params: {
          Bucket: AWS_S3_BUCKET,
          Key: backupKey,
          Body: gzip,
        },
      });

      upload.done()
        .then(() => {
          uploadFinished = true;
          if (pgDumpExited) resolve();
        })
        .catch((err) => reject(new Error(`[BACKUP] S3 upload failed: ${err.message}`)));
    });

    console.log(`[BACKUP] Successfully uploaded ${backupKey} to S3.`);

    // 4. Retention cleanup (Keep newest 4)
    await cleanupOldBackups(s3Client, AWS_S3_BUCKET);

  } catch (error) {
    console.error(`[BACKUP] Backup failed: ${error.message}`);
    throw error;
  } finally {
    isBackupRunning = false;
  }
}

async function cleanupOldBackups(s3Client, bucketName) {
  try {
    const prefix = 'backups/adile-bakery-erp-db-backup-';
    
    let allBackups = [];
    let isTruncated = true;
    let continuationToken = undefined;

    while (isTruncated) {
      const listCommand = new ListObjectsV2Command({
        Bucket: bucketName,
        Prefix: prefix,
        ContinuationToken: continuationToken,
      });

      const listResponse = await s3Client.send(listCommand);
      
      if (listResponse.Contents) {
        allBackups = allBackups.concat(listResponse.Contents);
      }
      
      isTruncated = listResponse.IsTruncated;
      continuationToken = listResponse.NextContinuationToken;
    }

    if (allBackups.length === 0) {
      console.log('[BACKUP] No existing backups found for retention cleanup.');
      return;
    }

    // Sort descending by LastModified
    const backups = allBackups.sort((a, b) => b.LastModified - a.LastModified);
    
    const maxRetained = 4;
    
    if (backups.length <= maxRetained) {
      console.log(`[BACKUP] Retention check: found ${backups.length} backups. No cleanup needed.`);
      return;
    }

    const toDelete = backups.slice(maxRetained);
    
    for (const file of toDelete) {
      console.log(`[BACKUP] Deleting old backup: ${file.Key}`);
      await s3Client.send(new DeleteObjectCommand({
        Bucket: bucketName,
        Key: file.Key,
      }));
    }
    
    console.log(`[BACKUP] Retention cleanup complete. Deleted ${toDelete.length} old backups.`);
  } catch (error) {
    // If cleanup fails, we don't fail the whole backup job, as the backup itself succeeded
    console.error(`[BACKUP] Retention cleanup failed: ${error.message}`);
  }
}

module.exports = { runBackup };
