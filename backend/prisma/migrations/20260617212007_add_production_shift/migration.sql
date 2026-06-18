-- CreateEnum
CREATE TYPE "ProductionShift" AS ENUM ('DAY', 'NIGHT', 'BOTH');

-- AlterTable
ALTER TABLE "Product" ADD COLUMN "productionShift" "ProductionShift" NOT NULL DEFAULT 'BOTH';
