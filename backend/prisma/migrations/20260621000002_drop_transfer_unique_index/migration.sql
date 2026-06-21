-- The previous migration (20260621000001) tried to drop the unique CONSTRAINT,
-- but the original migration (20260620000000_add_transfer_system_phase1)
-- created a standalone UNIQUE INDEX (not a constraint-backed index).
-- ALTER TABLE ... DROP CONSTRAINT was a no-op, so the unique index survived.
-- This migration drops the remaining unique index directly.

DROP INDEX IF EXISTS "ProductTransfer_productId_sourceBranchId_dependentBranchId_oper";
