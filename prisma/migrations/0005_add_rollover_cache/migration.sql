-- CreateTable
CREATE TABLE "RolloverCache" (
    "key" TEXT NOT NULL,
    "processedAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RolloverCache_pkey" PRIMARY KEY ("key")
);
