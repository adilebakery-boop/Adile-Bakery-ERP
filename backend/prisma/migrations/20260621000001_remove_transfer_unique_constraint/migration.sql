-- Drop the unique constraint on productId, sourceBranchId, dependentBranchId, operationalDate
-- to allow multiple transfers of the same product between same branches on the same date

ALTER TABLE "ProductTransfer" DROP CONSTRAINT IF EXISTS "ProductTransfer_productId_sourceBranchId_dependentBranchId_operationalDate_key";
