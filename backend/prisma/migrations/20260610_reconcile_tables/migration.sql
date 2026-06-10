-- Combine both reconciliation scripts into one migration

-- === RefreshToken reconciliation ===
-- Align RefreshToken table with schema.prisma: add tokenHash, drop token/revoked

ALTER TABLE "RefreshToken" ADD COLUMN IF NOT EXISTS "tokenHash" TEXT;

UPDATE "RefreshToken"
SET "tokenHash" = 'placeholder_' || id::text || '_invalidated_by_reconciliation'
WHERE "tokenHash" IS NULL;

ALTER TABLE "RefreshToken" ALTER COLUMN "tokenHash" SET NOT NULL;

ALTER TABLE "RefreshToken" DROP COLUMN IF EXISTS "token";
ALTER TABLE "RefreshToken" DROP COLUMN IF EXISTS "revoked";

CREATE UNIQUE INDEX IF NOT EXISTS "RefreshToken_tokenHash_key" ON "RefreshToken"("tokenHash");
CREATE INDEX IF NOT EXISTS "RefreshToken_tokenHash_idx" ON "RefreshToken"("tokenHash");

-- === PasswordReset reconciliation ===
-- Drop non-unique index to allow adding unique constraint on userId

DROP INDEX IF EXISTS "PasswordReset_userId_idx";
