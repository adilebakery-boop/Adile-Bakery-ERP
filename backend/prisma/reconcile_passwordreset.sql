-- Reconciliation step 2: drop non-unique PasswordReset_userId_idx so that
-- prisma db push can add the unique constraint on userId (matching schema.prisma:
-- `userId Int @unique`).
--
-- This is safe because the PasswordReset table is currently empty (verified).

BEGIN;
DROP INDEX IF EXISTS "PasswordReset_userId_idx";
COMMIT;
