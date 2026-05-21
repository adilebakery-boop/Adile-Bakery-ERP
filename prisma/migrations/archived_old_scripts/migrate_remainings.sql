-- Migration script step 2: Create remaining tables and migrate remaining data

-- Create RemainingStatus enum if not exists
DO $$ BEGIN
    CREATE TYPE "RemainingStatus" AS ENUM ('DRAFT', 'FINAL');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add columns to RemainingRecord
ALTER TABLE "RemainingRecord" ADD COLUMN IF NOT EXISTS "operationalDate" DATE;
ALTER TABLE "RemainingRecord" ADD COLUMN IF NOT EXISTS "status" "RemainingStatus" DEFAULT 'FINAL';
ALTER TABLE "RemainingRecord" ADD COLUMN IF NOT EXISTS "createdBy" INTEGER DEFAULT 1;
ALTER TABLE "RemainingRecord" ADD COLUMN IF NOT EXISTS "updatedBy" INTEGER;
ALTER TABLE "RemainingRecord" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP;

-- Copy existing data: operationalDate = date, createdBy = userId
UPDATE "RemainingRecord" SET "operationalDate" = "date", "createdBy" = "userId";

-- Make operationalDate NOT NULL
ALTER TABLE "RemainingRecord" ALTER COLUMN "operationalDate" SET NOT NULL;
ALTER TABLE "RemainingRecord" ALTER COLUMN "createdBy" SET NOT NULL;
ALTER TABLE "RemainingRecord" ALTER COLUMN "status" SET DEFAULT 'FINAL';
ALTER TABLE "RemainingRecord" ALTER COLUMN "status" SET NOT NULL;
ALTER TABLE "RemainingRecord" ALTER COLUMN "updatedAt" SET DEFAULT NOW();
UPDATE "RemainingRecord" SET "updatedAt" = NOW() WHERE "updatedAt" IS NULL;
ALTER TABLE "RemainingRecord" ALTER COLUMN "updatedAt" SET NOT NULL;

-- Drop old unique constraint and create new one
ALTER TABLE "RemainingRecord" DROP CONSTRAINT IF EXISTS "RemainingRecord_productId_key";
ALTER TABLE "RemainingRecord" DROP CONSTRAINT IF EXISTS "RemainingRecord_pkey";
ALTER TABLE "RemainingRecord" ADD PRIMARY KEY ("id");

-- Create unique constraint with new fields
ALTER TABLE "RemainingRecord" DROP CONSTRAINT IF EXISTS "RemainingRecord_branchId_date_productId_key";
ALTER TABLE "RemainingRecord" ADD CONSTRAINT "RemainingRecord_branchId_operationalDate_productId_key" 
    UNIQUE ("branchId", "operationalDate", "productId");

SELECT 'Migration step 2 complete: RemainingRecord updated' as status;