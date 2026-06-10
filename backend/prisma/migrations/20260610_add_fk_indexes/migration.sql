-- Add FK indexes for query performance
-- These foreign key columns are frequently used in JOINs and WHERE clauses

CREATE INDEX IF NOT EXISTS "DailyClosure_closedBy_idx" ON "DailyClosure"("closedBy");
CREATE INDEX IF NOT EXISTS "DailySnapshot_closedBy_idx" ON "DailySnapshot"("closedBy");
CREATE INDEX IF NOT EXISTS "DailySnapshot_invalidatedBy_idx" ON "DailySnapshot"("invalidatedBy");
CREATE INDEX IF NOT EXISTS "ProductionRecord_updatedBy_idx" ON "ProductionRecord"("updatedBy");
CREATE INDEX IF NOT EXISTS "RemainingRecord_updatedBy_idx" ON "RemainingRecord"("updatedBy");
CREATE INDEX IF NOT EXISTS "AuditLog_action_idx" ON "AuditLog"("action");
