-- Drop old columns
ALTER TABLE "ProductionRecord" DROP COLUMN IF EXISTS "userId";
ALTER TABLE "RemainingRecord" DROP COLUMN IF EXISTS "userId";

SELECT 'Old userId columns dropped' as status;