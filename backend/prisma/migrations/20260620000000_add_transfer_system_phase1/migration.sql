-- Add TRANSFER_OPERATOR to existing RoleName enum
ALTER TYPE "RoleName" ADD VALUE 'TRANSFER_OPERATOR';

-- Create new enums
CREATE TYPE "BranchType" AS ENUM ('SOURCE', 'DEPENDENT', 'INDEPENDENT');
CREATE TYPE "TransferStatus" AS ENUM ('PENDING', 'APPROVED', 'CLOSED');

-- Alter Branch table: add branchType and sourceBranchId
ALTER TABLE "Branch"
  ADD COLUMN "branchType" "BranchType" NOT NULL DEFAULT 'INDEPENDENT',
  ADD COLUMN "sourceBranchId" INTEGER;

CREATE INDEX "Branch_sourceBranchId_idx" ON "Branch"("sourceBranchId");
ALTER TABLE "Branch" ADD CONSTRAINT "Branch_sourceBranchId_fkey"
  FOREIGN KEY ("sourceBranchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Alter DailySnapshotItem: add transfer fields
ALTER TABLE "DailySnapshotItem"
  ADD COLUMN "receivedTransfer" DECIMAL(12,3) NOT NULL DEFAULT 0,
  ADD COLUMN "sentTransfer" DECIMAL(12,3) NOT NULL DEFAULT 0;

-- Create ProductTransfer table
CREATE TABLE "ProductTransfer" (
    "id" SERIAL NOT NULL,
    "productId" INTEGER NOT NULL,
    "sourceBranchId" INTEGER NOT NULL,
    "dependentBranchId" INTEGER NOT NULL,
    "operationalDate" DATE NOT NULL,
    "receivedQuantity" DECIMAL(12,3) NOT NULL,
    "sentQuantity" DECIMAL(12,3),
    "returnedQuantity" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "status" "TransferStatus" NOT NULL DEFAULT 'PENDING',
    "isDisputed" BOOLEAN NOT NULL DEFAULT false,
    "createdBy" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductTransfer_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ProductTransfer_sourceBranchId_operationalDate_idx" ON "ProductTransfer"("sourceBranchId", "operationalDate");
CREATE INDEX "ProductTransfer_dependentBranchId_operationalDate_idx" ON "ProductTransfer"("dependentBranchId", "operationalDate");
CREATE INDEX "ProductTransfer_status_idx" ON "ProductTransfer"("status");
CREATE INDEX "ProductTransfer_operationalDate_idx" ON "ProductTransfer"("operationalDate");
CREATE UNIQUE INDEX "ProductTransfer_productId_sourceBranchId_dependentBranchId_operationalDate_key"
  ON "ProductTransfer"("productId", "sourceBranchId", "dependentBranchId", "operationalDate");

ALTER TABLE "ProductTransfer" ADD CONSTRAINT "ProductTransfer_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProductTransfer" ADD CONSTRAINT "ProductTransfer_sourceBranchId_fkey"
  FOREIGN KEY ("sourceBranchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProductTransfer" ADD CONSTRAINT "ProductTransfer_dependentBranchId_fkey"
  FOREIGN KEY ("dependentBranchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
