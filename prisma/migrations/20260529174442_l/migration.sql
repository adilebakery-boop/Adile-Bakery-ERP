-- AlterTable
ALTER TABLE "DailySnapshotItem" ADD COLUMN     "snapshotPrice" DECIMAL(12,2);

-- CreateTable
CREATE TABLE "ProductPriceHistory" (
    "id" SERIAL NOT NULL,
    "productId" INTEGER NOT NULL,
    "price" DECIMAL(12,2) NOT NULL,
    "validFrom" TIMESTAMP(3) NOT NULL,
    "validTo" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductPriceHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProductPriceHistory_productId_validFrom_idx" ON "ProductPriceHistory"("productId", "validFrom");

-- CreateIndex
CREATE INDEX "ProductPriceHistory_productId_validTo_idx" ON "ProductPriceHistory"("productId", "validTo");

-- CreateIndex
CREATE INDEX "ProductPriceHistory_productId_validFrom_validTo_idx" ON "ProductPriceHistory"("productId", "validFrom", "validTo");

-- CreateIndex
CREATE INDEX "DailySnapshotItem_productId_idx" ON "DailySnapshotItem"("productId");

-- AddForeignKey
ALTER TABLE "ProductPriceHistory" ADD CONSTRAINT "ProductPriceHistory_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
