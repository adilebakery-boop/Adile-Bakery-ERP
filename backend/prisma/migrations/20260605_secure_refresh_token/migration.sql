-- Secure refresh token upgrade:
--   1. Add tokenHash column (replaces plaintext token)
--   2. Backfill existing rows with SHA256(token) as placeholder
--   3. Drop old columns and indexes
--   4. Create new constraints for tokenHash

-- Enable pgcrypto for sha256 if not already enabled
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Step 1: Add nullable tokenHash column
ALTER TABLE "RefreshToken" ADD COLUMN "tokenHash" TEXT;

-- Step 2: Backfill existing tokens with SHA256 hash
-- NOTE: Code now uses HMAC-SHA256, so existing tokens will be invalidated.
--       This is intentional — security upgrade forces re-authentication.
UPDATE "RefreshToken"
SET "tokenHash" = encode(digest("token", 'sha256'), 'hex')
WHERE "tokenHash" IS NULL;

-- Step 3: Make tokenHash NOT NULL after backfill
ALTER TABLE "RefreshToken" ALTER COLUMN "tokenHash" SET NOT NULL;

-- Step 4: Drop old columns and their indexes
DROP INDEX IF EXISTS "RefreshToken_token_key";
DROP INDEX IF EXISTS "RefreshToken_token_idx";
ALTER TABLE "RefreshToken" DROP COLUMN "token";
ALTER TABLE "RefreshToken" DROP COLUMN "revoked";

-- Step 5: Create new indexes matching Prisma naming convention
CREATE UNIQUE INDEX "RefreshToken_tokenHash_key" ON "RefreshToken"("tokenHash");
CREATE INDEX "RefreshToken_tokenHash_idx" ON "RefreshToken"("tokenHash");
