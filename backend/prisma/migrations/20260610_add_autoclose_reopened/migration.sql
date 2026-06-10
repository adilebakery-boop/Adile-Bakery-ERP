-- Add autoCloseAt and reopenedAt columns to DailyClosure
-- These columns exist in schema.prisma but were never added via migration
-- Both are nullable DateTime? so no backfill needed

ALTER TABLE "DailyClosure" ADD COLUMN IF NOT EXISTS "autoCloseAt" TIMESTAMP(3);
ALTER TABLE "DailyClosure" ADD COLUMN IF NOT EXISTS "reopenedAt" TIMESTAMP(3);
CREATE INDEX IF NOT EXISTS "DailyClosure_autoCloseAt_idx" ON "DailyClosure"("autoCloseAt");
