-- Enforce one refresh token per user at DB level.
-- Add lastUsedAt for usage tracking.

-- Step 1: Add lastUsedAt column
ALTER TABLE "RefreshToken" ADD COLUMN "lastUsedAt" TIMESTAMP(3);

-- Step 2: Backfill existing rows
UPDATE "RefreshToken" SET "lastUsedAt" = "createdAt" WHERE "lastUsedAt" IS NULL;

-- Step 3: Make lastUsedAt NOT NULL with default
ALTER TABLE "RefreshToken" ALTER COLUMN "lastUsedAt" SET NOT NULL;
ALTER TABLE "RefreshToken" ALTER COLUMN "lastUsedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- Step 4: Drop old userId index (replaced by unique constraint)
DROP INDEX IF EXISTS "RefreshToken_userId_idx";

-- Step 5: Deduplicate — keep only the latest row per userId
DELETE FROM "RefreshToken" a
USING (
  SELECT "userId", MAX(id) as "maxId"
  FROM "RefreshToken"
  GROUP BY "userId"
  HAVING COUNT(*) > 1
) b
WHERE a."userId" = b."userId" AND a.id <> b."maxId";

-- Step 6: Enforce one token per user at DB level
CREATE UNIQUE INDEX "RefreshToken_userId_key" ON "RefreshToken"("userId");
