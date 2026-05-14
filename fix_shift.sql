-- Drop the column first
ALTER TABLE "ProductionRecord" DROP COLUMN shift;

-- Drop old enum
DROP TYPE "Shift";

-- Create new enum
CREATE TYPE "Shift" AS ENUM ('DAY', 'NIGHT');

-- Add column back with new enum
ALTER TABLE "ProductionRecord" ADD COLUMN shift "Shift" NOT NULL DEFAULT 'DAY';

-- Update existing records
UPDATE "ProductionRecord" SET shift = 'DAY';