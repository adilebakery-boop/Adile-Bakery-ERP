-- Migration script for existing ProductionRecord data
-- This script must be run BEFORE prisma db push

-- Add new columns with temporary defaults
ALTER TABLE "ProductionRecord" ADD COLUMN IF NOT EXISTS "productionDate" TIMESTAMP DEFAULT NOW();
ALTER TABLE "ProductionRecord" ADD COLUMN IF NOT EXISTS "operationalDate" DATE;
ALTER TABLE "ProductionRecord" ADD COLUMN IF NOT EXISTS "createdBy" INTEGER DEFAULT 1;
ALTER TABLE "ProductionRecord" ADD COLUMN IF NOT EXISTS "updatedBy" INTEGER;
ALTER TABLE "ProductionRecord" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP;

-- Make createdBy NOT NULL
ALTER TABLE "ProductionRecord" ALTER COLUMN "createdBy" SET NOT NULL;
ALTER TABLE "ProductionRecord" ALTER COLUMN "updatedAt" SET DEFAULT NOW();

-- Copy existing data: productionDate = createdAt, createdBy = userId
UPDATE "ProductionRecord" SET "productionDate" = "createdAt", "createdBy" = "userId";

-- Calculate operationalDate based on shift
-- DAY -> same day, NIGHT -> +1 day
UPDATE "ProductionRecord" SET "operationalDate" =
    CASE
        WHEN COALESCE("shift", 'DAY') = 'NIGHT' THEN ("createdAt" + INTERVAL '1 day')::date
        ELSE "createdAt"::date
    END
WHERE "operationalDate" IS NULL;

-- Make operationalDate NOT NULL
ALTER TABLE "ProductionRecord" ALTER COLUMN "operationalDate" SET NOT NULL;

-- Update updatedAt
UPDATE "ProductionRecord" SET "updatedAt" = NOW() WHERE "updatedAt" IS NULL;
ALTER TABLE "ProductionRecord" ALTER COLUMN "updatedAt" SET NOT NULL;
ALTER TABLE "ProductionRecord" ALTER COLUMN "updatedAt" SET DEFAULT NOW();

-- Rename userId to reference the creator properly (set to existing userId)
-- This is already done above with createdBy = userId

SELECT 'Migration step 1 complete: ProductionRecord columns added and populated' as status;