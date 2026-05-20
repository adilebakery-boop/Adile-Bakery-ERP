/*
  Warnings:

  - The values [MORNING,AFTERNOON,EVENING] on the enum `Shift` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `userId` on the `ProductionRecord` table. All the data in the column will be lost.
  - You are about to drop the column `date` on the `RemainingRecord` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `RemainingRecord` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[branchId,operationalDate,productId]` on the table `RemainingRecord` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `createdBy` to the `ProductionRecord` table without a default value. This is not possible if the table is not empty.
  - Added the required column `operationalDate` to the `ProductionRecord` table without a default value. This is not possible if the table is not empty.
  - Added the required column `productionDate` to the `ProductionRecord` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `ProductionRecord` table without a default value. This is not possible if the table is not empty.
  - Added the required column `createdBy` to the `RemainingRecord` table without a default value. This is not possible if the table is not empty.
  - Added the required column `operationalDate` to the `RemainingRecord` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `RemainingRecord` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "RemainingStatus" AS ENUM ('DRAFT', 'FINAL');

-- AlterEnum
BEGIN;
CREATE TYPE "Shift_new" AS ENUM ('DAY', 'NIGHT');
ALTER TABLE "ProductionRecord" ALTER COLUMN "shift" TYPE "Shift_new" USING ("shift"::text::"Shift_new");
ALTER TYPE "Shift" RENAME TO "Shift_old";
ALTER TYPE "Shift_new" RENAME TO "Shift";
DROP TYPE "Shift_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "ProductionRecord" DROP CONSTRAINT "ProductionRecord_userId_fkey";

-- DropForeignKey
ALTER TABLE "RemainingRecord" DROP CONSTRAINT "RemainingRecord_userId_fkey";

-- DropIndex
DROP INDEX "ProductionRecord_branchId_idx";

-- DropIndex
DROP INDEX "ProductionRecord_createdAt_idx";

-- DropIndex
DROP INDEX "ProductionRecord_productId_idx";

-- DropIndex
DROP INDEX "ProductionRecord_userId_idx";

-- DropIndex
DROP INDEX "RemainingRecord_branchId_idx";

-- DropIndex
DROP INDEX "RemainingRecord_date_idx";

-- DropIndex
DROP INDEX "RemainingRecord_productId_branchId_date_key";

-- DropIndex
DROP INDEX "RemainingRecord_productId_idx";

-- DropIndex
DROP INDEX "RemainingRecord_userId_idx";

-- AlterTable
ALTER TABLE "Branch" ADD COLUMN     "name_am" TEXT;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "costPrice" DECIMAL(12,2),
ADD COLUMN     "name_am" TEXT,
ADD COLUMN     "sellingPrice" DECIMAL(12,2),
ALTER COLUMN "price" SET DATA TYPE DECIMAL(12,2);

-- AlterTable
ALTER TABLE "ProductionRecord" DROP COLUMN "userId",
ADD COLUMN     "createdBy" INTEGER NOT NULL,
ADD COLUMN     "operationalDate" DATE NOT NULL,
ADD COLUMN     "productionDate" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "updatedBy" INTEGER,
ALTER COLUMN "quantity" SET DATA TYPE DECIMAL(12,3);

-- AlterTable
ALTER TABLE "RemainingRecord" DROP COLUMN "date",
DROP COLUMN "userId",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "createdBy" INTEGER NOT NULL,
ADD COLUMN     "operationalDate" DATE NOT NULL,
ADD COLUMN     "status" "RemainingStatus" NOT NULL DEFAULT 'FINAL',
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "updatedBy" INTEGER,
ALTER COLUMN "quantity" SET DATA TYPE DECIMAL(12,3);

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "WasteRecord" (
    "id" SERIAL NOT NULL,
    "productId" INTEGER NOT NULL,
    "branchId" INTEGER NOT NULL,
    "operationalDate" DATE NOT NULL,
    "quantity" DECIMAL(12,3) NOT NULL,
    "reason" TEXT,
    "createdBy" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WasteRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyClosure" (
    "id" SERIAL NOT NULL,
    "branchId" INTEGER NOT NULL,
    "operationalDate" DATE NOT NULL,
    "isClosed" BOOLEAN NOT NULL DEFAULT false,
    "closedBy" INTEGER,
    "closedAt" TIMESTAMP(3),
    "note" TEXT,

    CONSTRAINT "DailyClosure_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailySnapshot" (
    "id" SERIAL NOT NULL,
    "closureId" INTEGER NOT NULL,
    "branchId" INTEGER NOT NULL,
    "operationalDate" DATE NOT NULL,
    "closedBy" INTEGER,
    "closedAt" TIMESTAMP(3),
    "isInvalidated" BOOLEAN NOT NULL DEFAULT false,
    "invalidatedAt" TIMESTAMP(3),
    "invalidatedBy" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DailySnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailySnapshotItem" (
    "id" SERIAL NOT NULL,
    "snapshotId" INTEGER NOT NULL,
    "productId" INTEGER NOT NULL,
    "openingStock" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "dayProduction" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "nightProduction" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "sellableStock" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "remainingStock" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "wasteQuantity" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "estimatedSold" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "estimatedRevenue" DECIMAL(12,2) NOT NULL DEFAULT 0,

    CONSTRAINT "DailySnapshotItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReopenLog" (
    "id" SERIAL NOT NULL,
    "branchId" INTEGER NOT NULL,
    "operationalDate" DATE NOT NULL,
    "reopenedBy" INTEGER NOT NULL,
    "reopenedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reason" TEXT,

    CONSTRAINT "ReopenLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" SERIAL NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "oldValue" JSONB,
    "newValue" JSONB,
    "userId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WasteRecord_branchId_operationalDate_productId_idx" ON "WasteRecord"("branchId", "operationalDate", "productId");

-- CreateIndex
CREATE INDEX "WasteRecord_createdBy_idx" ON "WasteRecord"("createdBy");

-- CreateIndex
CREATE INDEX "DailyClosure_branchId_idx" ON "DailyClosure"("branchId");

-- CreateIndex
CREATE INDEX "DailyClosure_isClosed_idx" ON "DailyClosure"("isClosed");

-- CreateIndex
CREATE UNIQUE INDEX "DailyClosure_branchId_operationalDate_key" ON "DailyClosure"("branchId", "operationalDate");

-- CreateIndex
CREATE UNIQUE INDEX "DailySnapshot_closureId_key" ON "DailySnapshot"("closureId");

-- CreateIndex
CREATE INDEX "DailySnapshot_branchId_idx" ON "DailySnapshot"("branchId");

-- CreateIndex
CREATE INDEX "DailySnapshot_isInvalidated_idx" ON "DailySnapshot"("isInvalidated");

-- CreateIndex
CREATE INDEX "DailySnapshot_operationalDate_idx" ON "DailySnapshot"("operationalDate");

-- CreateIndex
CREATE UNIQUE INDEX "DailySnapshotItem_snapshotId_productId_key" ON "DailySnapshotItem"("snapshotId", "productId");

-- CreateIndex
CREATE INDEX "ReopenLog_reopenedBy_idx" ON "ReopenLog"("reopenedBy");

-- CreateIndex
CREATE INDEX "ReopenLog_reopenedAt_idx" ON "ReopenLog"("reopenedAt");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "ProductionRecord_branchId_operationalDate_productId_idx" ON "ProductionRecord"("branchId", "operationalDate", "productId");

-- CreateIndex
CREATE INDEX "ProductionRecord_productId_operationalDate_idx" ON "ProductionRecord"("productId", "operationalDate");

-- CreateIndex
CREATE INDEX "ProductionRecord_shift_idx" ON "ProductionRecord"("shift");

-- CreateIndex
CREATE INDEX "ProductionRecord_createdBy_idx" ON "ProductionRecord"("createdBy");

-- CreateIndex
CREATE INDEX "ProductionRecord_operationalDate_idx" ON "ProductionRecord"("operationalDate");

-- CreateIndex
CREATE INDEX "RemainingRecord_branchId_operationalDate_productId_idx" ON "RemainingRecord"("branchId", "operationalDate", "productId");

-- CreateIndex
CREATE INDEX "RemainingRecord_createdBy_idx" ON "RemainingRecord"("createdBy");

-- CreateIndex
CREATE INDEX "RemainingRecord_status_idx" ON "RemainingRecord"("status");

-- CreateIndex
CREATE UNIQUE INDEX "RemainingRecord_branchId_operationalDate_productId_key" ON "RemainingRecord"("branchId", "operationalDate", "productId");

-- CreateIndex
CREATE INDEX "User_isActive_idx" ON "User"("isActive");

-- CreateIndex
CREATE INDEX "User_deletedAt_idx" ON "User"("deletedAt");

-- AddForeignKey
ALTER TABLE "ProductionRecord" ADD CONSTRAINT "ProductionRecord_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionRecord" ADD CONSTRAINT "ProductionRecord_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RemainingRecord" ADD CONSTRAINT "RemainingRecord_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RemainingRecord" ADD CONSTRAINT "RemainingRecord_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WasteRecord" ADD CONSTRAINT "WasteRecord_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WasteRecord" ADD CONSTRAINT "WasteRecord_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WasteRecord" ADD CONSTRAINT "WasteRecord_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyClosure" ADD CONSTRAINT "DailyClosure_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyClosure" ADD CONSTRAINT "DailyClosure_closedBy_fkey" FOREIGN KEY ("closedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailySnapshot" ADD CONSTRAINT "DailySnapshot_closureId_fkey" FOREIGN KEY ("closureId") REFERENCES "DailyClosure"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailySnapshot" ADD CONSTRAINT "DailySnapshot_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailySnapshot" ADD CONSTRAINT "DailySnapshot_closedBy_fkey" FOREIGN KEY ("closedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailySnapshot" ADD CONSTRAINT "DailySnapshot_invalidatedBy_fkey" FOREIGN KEY ("invalidatedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailySnapshotItem" ADD CONSTRAINT "DailySnapshotItem_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "DailySnapshot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailySnapshotItem" ADD CONSTRAINT "DailySnapshotItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReopenLog" ADD CONSTRAINT "ReopenLog_branchId_operationalDate_fkey" FOREIGN KEY ("branchId", "operationalDate") REFERENCES "DailyClosure"("branchId", "operationalDate") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReopenLog" ADD CONSTRAINT "ReopenLog_reopenedBy_fkey" FOREIGN KEY ("reopenedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
