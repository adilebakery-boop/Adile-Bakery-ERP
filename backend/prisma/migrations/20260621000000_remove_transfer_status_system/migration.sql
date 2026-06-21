-- Remove the status system from ProductTransfer

-- Drop index on status column
DROP INDEX IF EXISTS "ProductTransfer_status_idx";

-- Drop columns
ALTER TABLE "ProductTransfer" DROP COLUMN IF EXISTS "status";
ALTER TABLE "ProductTransfer" DROP COLUMN IF EXISTS "isDisputed";

-- Drop the TransferStatus enum
DROP TYPE IF EXISTS "TransferStatus";
