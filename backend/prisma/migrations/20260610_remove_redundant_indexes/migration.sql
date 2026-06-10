-- Remove redundant indexes
-- ProductionRecord: branchId_operationalDate_idx is covered by composite (branchId, productId, operationalDate)
-- RemainingRecord: branchId_operationalDate_idx is covered by the unique constraint (branchId, productId, operationalDate)

DROP INDEX IF EXISTS "ProductionRecord_branchId_operationalDate_idx";
DROP INDEX IF EXISTS "RemainingRecord_branchId_operationalDate_idx";
