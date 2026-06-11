-- Drop unique index on userId (multi-device support)
DROP INDEX IF EXISTS "RefreshToken_userId_key";

-- Add non-unique index for query performance
CREATE INDEX IF NOT EXISTS "RefreshToken_userId_idx" ON "RefreshToken"("userId");
