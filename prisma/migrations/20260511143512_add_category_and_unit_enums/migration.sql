/*
  Warnings:

  - A unique constraint covering the columns `[name]` on the table `Product` will be added. If there are existing duplicate values, this will fail.
  - Changed the type of `category` on the `Product` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `unitType` on the `Product` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "ProductCategory" AS ENUM ('BREAD_AND_SWEET_BREADS', 'CREAM_CAKES', 'SOFT_CAKES', 'DRY_CAKES', 'DRINKS_AND_RETAIL_ITEMS', 'FETIRE_AND_SNACKS', 'COOKIES');

-- CreateEnum
CREATE TYPE "UnitType" AS ENUM ('piece', 'kg');

-- AlterTable
ALTER TABLE "Branch" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "Product" DROP COLUMN "category",
ADD COLUMN     "category" "ProductCategory" NOT NULL,
DROP COLUMN "unitType",
ADD COLUMN     "unitType" "UnitType" NOT NULL;

-- CreateIndex
CREATE INDEX "Branch_isActive_idx" ON "Branch"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Product_name_key" ON "Product"("name");

-- CreateIndex
CREATE INDEX "Product_category_idx" ON "Product"("category");
