-- Create new enum type
CREATE TYPE "Shift_new" AS ENUM ('MORNING', 'AFTERNOON', 'EVENING');

-- Update existing records to new values before dropping old column
UPDATE "ProductionRecord" SET shift = NULL;

-- Alter column to use new type
ALTER TABLE "ProductionRecord" ALTER COLUMN shift TYPE "Shift_new" USING 'MORNING';

-- Drop old enum and rename new one
DROP TYPE "Shift";
ALTER TYPE "Shift_new" RENAME TO "Shift";

-- Re-insert the data with new shift values based on original time
UPDATE "ProductionRecord" SET shift = 'MORNING';