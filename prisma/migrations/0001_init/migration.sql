-- CreateEnum
CREATE TYPE "ClosureType" AS ENUM ('MANUAL', 'AUTO_FINALIZE');

-- CreateEnum
CREATE TYPE "ProductCategory" AS ENUM ('BREAD_AND_SWEET_BREADS', 'CREAM_CAKES', 'SOFT_CAKES', 'DRY_CAKES', 'DRINKS_AND_RETAIL_ITEMS', 'FETIRE_AND_SNACKS', 'COOKIES');

-- CreateEnum
CREATE TYPE "RemainingStatus" AS ENUM ('DRAFT', 'FINAL');

-- CreateEnum
CREATE TYPE "RoleName" AS ENUM ('ADMIN', 'MANAGER', 'BAKER', 'CAKE_CHEF', 'COOKIE_BAKER', 'FETIR_CHEF', 'CASHIER');

-- CreateEnum
CREATE TYPE "Shift" AS ENUM ('DAY', 'NIGHT');

-- CreateEnum
CREATE TYPE "UnitType" AS ENUM ('piece', 'kg');

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

-- CreateTable
CREATE TABLE "Branch" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "address" TEXT,
    "phone" TEXT,
    "name_am" TEXT,
    CONSTRAINT "Branch_pkey" PRIMARY KEY ("id")
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
    "closureType" "ClosureType" NOT NULL DEFAULT 'MANUAL',
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
CREATE TABLE "PasswordReset" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "otpHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PasswordReset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "price" DECIMAL(12,2) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "category" "ProductCategory" NOT NULL,
    "unitType" "UnitType" NOT NULL,
    "costPrice" DECIMAL(12,2),
    "name_am" TEXT,
    "sellingPrice" DECIMAL(12,2),
    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductionRecord" (
    "id" SERIAL NOT NULL,
    "productId" INTEGER NOT NULL,
    "quantity" DECIMAL(12,3) NOT NULL,
    "branchId" INTEGER NOT NULL,
    "shift" "Shift" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" INTEGER NOT NULL,
    "operationalDate" DATE NOT NULL,
    "productionDate" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" INTEGER,
    CONSTRAINT "ProductionRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RemainingRecord" (
    "id" SERIAL NOT NULL,
    "productId" INTEGER NOT NULL,
    "quantity" DECIMAL(12,3) NOT NULL,
    "branchId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" INTEGER NOT NULL,
    "operationalDate" DATE NOT NULL,
    "status" "RemainingStatus" NOT NULL DEFAULT 'FINAL',
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" INTEGER,
    "autoFinalizedAt" TIMESTAMP(3),
    CONSTRAINT "RemainingRecord_pkey" PRIMARY KEY ("id")
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
CREATE TABLE "Role" (
    "id" SERIAL NOT NULL,
    "name" "RoleName" NOT NULL,
    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "roleId" INTEGER NOT NULL,
    "branchId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isBlocked" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "email" TEXT,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

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

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt" ASC);
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType" ASC, "entityId" ASC);
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId" ASC);
CREATE INDEX "Branch_isActive_idx" ON "Branch"("isActive" ASC);
CREATE UNIQUE INDEX "Branch_name_key" ON "Branch"("name" ASC);
CREATE INDEX "DailyClosure_branchId_idx" ON "DailyClosure"("branchId" ASC);
CREATE UNIQUE INDEX "DailyClosure_branchId_operationalDate_key" ON "DailyClosure"("branchId" ASC, "operationalDate" ASC);
CREATE INDEX "DailyClosure_isClosed_idx" ON "DailyClosure"("isClosed" ASC);
CREATE INDEX "DailySnapshot_branchId_idx" ON "DailySnapshot"("branchId" ASC);
CREATE UNIQUE INDEX "DailySnapshot_closureId_key" ON "DailySnapshot"("closureId" ASC);
CREATE INDEX "DailySnapshot_isInvalidated_idx" ON "DailySnapshot"("isInvalidated" ASC);
CREATE INDEX "DailySnapshot_operationalDate_idx" ON "DailySnapshot"("operationalDate" ASC);
CREATE UNIQUE INDEX "DailySnapshotItem_snapshotId_productId_key" ON "DailySnapshotItem"("snapshotId" ASC, "productId" ASC);
CREATE INDEX "PasswordReset_expiresAt_idx" ON "PasswordReset"("expiresAt" ASC);
CREATE INDEX "PasswordReset_userId_idx" ON "PasswordReset"("userId" ASC);
CREATE INDEX "Product_category_idx" ON "Product"("category" ASC);
CREATE INDEX "Product_isActive_idx" ON "Product"("isActive" ASC);
CREATE UNIQUE INDEX "Product_name_key" ON "Product"("name" ASC);
CREATE INDEX "ProductionRecord_branchId_operationalDate_productId_idx" ON "ProductionRecord"("branchId" ASC, "operationalDate" ASC, "productId" ASC);
CREATE INDEX "ProductionRecord_createdBy_idx" ON "ProductionRecord"("createdBy" ASC);
CREATE INDEX "ProductionRecord_operationalDate_idx" ON "ProductionRecord"("operationalDate" ASC);
CREATE INDEX "ProductionRecord_productId_operationalDate_idx" ON "ProductionRecord"("productId" ASC, "operationalDate" ASC);
CREATE INDEX "ProductionRecord_shift_idx" ON "ProductionRecord"("shift" ASC);
CREATE INDEX "RemainingRecord_branchId_operationalDate_productId_idx" ON "RemainingRecord"("branchId" ASC, "operationalDate" ASC, "productId" ASC);
CREATE UNIQUE INDEX "RemainingRecord_branchId_operationalDate_productId_key" ON "RemainingRecord"("branchId" ASC, "operationalDate" ASC, "productId" ASC);
CREATE INDEX "RemainingRecord_createdBy_idx" ON "RemainingRecord"("createdBy" ASC);
CREATE INDEX "RemainingRecord_status_idx" ON "RemainingRecord"("status" ASC);
CREATE INDEX "ReopenLog_reopenedAt_idx" ON "ReopenLog"("reopenedAt" ASC);
CREATE INDEX "ReopenLog_reopenedBy_idx" ON "ReopenLog"("reopenedBy" ASC);
CREATE UNIQUE INDEX "Role_name_key" ON "Role"("name" ASC);
CREATE INDEX "User_branchId_idx" ON "User"("branchId" ASC);
CREATE INDEX "User_deletedAt_idx" ON "User"("deletedAt" ASC);
CREATE UNIQUE INDEX "User_email_key" ON "User"("email" ASC);
CREATE INDEX "User_isActive_idx" ON "User"("isActive" ASC);
CREATE INDEX "User_roleId_idx" ON "User"("roleId" ASC);
CREATE INDEX "User_username_idx" ON "User"("username" ASC);
CREATE UNIQUE INDEX "User_username_key" ON "User"("username" ASC);
CREATE INDEX "WasteRecord_branchId_operationalDate_productId_idx" ON "WasteRecord"("branchId" ASC, "operationalDate" ASC, "productId" ASC);
CREATE INDEX "WasteRecord_createdBy_idx" ON "WasteRecord"("createdBy" ASC);

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DailyClosure" ADD CONSTRAINT "DailyClosure_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DailyClosure" ADD CONSTRAINT "DailyClosure_closedBy_fkey" FOREIGN KEY ("closedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "DailySnapshot" ADD CONSTRAINT "DailySnapshot_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DailySnapshot" ADD CONSTRAINT "DailySnapshot_closedBy_fkey" FOREIGN KEY ("closedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "DailySnapshot" ADD CONSTRAINT "DailySnapshot_closureId_fkey" FOREIGN KEY ("closureId") REFERENCES "DailyClosure"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DailySnapshot" ADD CONSTRAINT "DailySnapshot_invalidatedBy_fkey" FOREIGN KEY ("invalidatedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "DailySnapshotItem" ADD CONSTRAINT "DailySnapshotItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DailySnapshotItem" ADD CONSTRAINT "DailySnapshotItem_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "DailySnapshot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PasswordReset" ADD CONSTRAINT "PasswordReset_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProductionRecord" ADD CONSTRAINT "ProductionRecord_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProductionRecord" ADD CONSTRAINT "ProductionRecord_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProductionRecord" ADD CONSTRAINT "ProductionRecord_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProductionRecord" ADD CONSTRAINT "ProductionRecord_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RemainingRecord" ADD CONSTRAINT "RemainingRecord_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RemainingRecord" ADD CONSTRAINT "RemainingRecord_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RemainingRecord" ADD CONSTRAINT "RemainingRecord_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RemainingRecord" ADD CONSTRAINT "RemainingRecord_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ReopenLog" ADD CONSTRAINT "ReopenLog_branchId_operationalDate_fkey" FOREIGN KEY ("branchId", "operationalDate") REFERENCES "DailyClosure"("branchId", "operationalDate") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ReopenLog" ADD CONSTRAINT "ReopenLog_reopenedBy_fkey" FOREIGN KEY ("reopenedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "User" ADD CONSTRAINT "User_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "User" ADD CONSTRAINT "User_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WasteRecord" ADD CONSTRAINT "WasteRecord_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WasteRecord" ADD CONSTRAINT "WasteRecord_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WasteRecord" ADD CONSTRAINT "WasteRecord_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
