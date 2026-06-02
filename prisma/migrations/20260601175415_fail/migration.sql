-- CreateIndex
CREATE INDEX "ProductionRecord_branchId_operationalDate_idx" ON "ProductionRecord"("branchId", "operationalDate");

-- CreateIndex
CREATE INDEX "ProductionRecord_productId_idx" ON "ProductionRecord"("productId");

-- CreateIndex
CREATE INDEX "RemainingRecord_branchId_operationalDate_idx" ON "RemainingRecord"("branchId", "operationalDate");

-- CreateIndex
CREATE INDEX "RemainingRecord_productId_idx" ON "RemainingRecord"("productId");

-- CreateIndex
CREATE INDEX "ReopenLog_branchId_operationalDate_idx" ON "ReopenLog"("branchId", "operationalDate");

-- CreateIndex
CREATE INDEX "WasteRecord_branchId_operationalDate_idx" ON "WasteRecord"("branchId", "operationalDate");

-- CreateIndex
CREATE INDEX "WasteRecord_productId_idx" ON "WasteRecord"("productId");
