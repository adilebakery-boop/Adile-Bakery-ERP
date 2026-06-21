-- Make dependentBranchId optional for SOURCE-side transfer records
ALTER TABLE "ProductTransfer" ALTER COLUMN "dependentBranchId" DROP NOT NULL;

-- Add default value for receivedQuantity (SOURCE records will use 0)
ALTER TABLE "ProductTransfer" ALTER COLUMN "receivedQuantity" SET DEFAULT 0;
