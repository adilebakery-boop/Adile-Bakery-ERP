-- Reconciliation: bring RefreshToken table in line with schema.prisma
-- Source of truth: feature/auth-system-5-critical-fixes branch
--
-- Goal: make the actual DB match what schema.prisma defines
--   - Add tokenHash column (NOT NULL, unique) using SHA256 of an empty string
--     as placeholder (intentionally invalid for HMAC verify, so all existing
--     refresh sessions are forced to re-authenticate — this is the intended
--     security upgrade behavior).
--   - Drop token column (replaced by tokenHash)
--   - Drop revoked column (superseded by @@unique([userId]))
--   - Create unique index on tokenHash
--   - Create index on tokenHash
--   - lastUsedAt and @@unique([userId]) already exist; kept as-is
--
-- All statements are wrapped in a transaction for atomicity. Use IF EXISTS /
-- IF NOT EXISTS style guards so this script is idempotent.

BEGIN;

-- Step 1: Add tokenHash column as nullable so we can backfill existing rows
ALTER TABLE "RefreshToken" ADD COLUMN IF NOT EXISTS "tokenHash" TEXT;

-- Step 2: Backfill existing rows with a deterministic placeholder.
-- The placeholder will NOT match any HMAC-SHA256 hash of a real token,
-- so verify() will return null and rotate() will throw "Refresh token
-- not found" — forcing all existing sessions to re-authenticate.
UPDATE "RefreshToken"
SET "tokenHash" = 'placeholder_' || id::text || '_invalidated_by_reconciliation'
WHERE "tokenHash" IS NULL;

-- Step 3: Enforce NOT NULL now that all rows are backfilled
ALTER TABLE "RefreshToken" ALTER COLUMN "tokenHash" SET NOT NULL;

-- Step 4: Drop obsolete columns (data is intentionally lost — security upgrade)
ALTER TABLE "RefreshToken" DROP COLUMN IF EXISTS "token";
ALTER TABLE "RefreshToken" DROP COLUMN IF EXISTS "revoked";

-- Step 5: Create unique index on tokenHash (matches schema.prisma: tokenHash @unique)
CREATE UNIQUE INDEX IF NOT EXISTS "RefreshToken_tokenHash_key" ON "RefreshToken"("tokenHash");

-- Step 6: Create non-unique index on tokenHash (matches schema.prisma: @@index([tokenHash]))
CREATE INDEX IF NOT EXISTS "RefreshToken_tokenHash_idx" ON "RefreshToken"("tokenHash");

COMMIT;
