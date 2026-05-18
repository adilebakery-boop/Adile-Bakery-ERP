const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
(async () => {
  console.log('Wiping all report data...');
  await prisma.dailySnapshotItem.deleteMany({});
  await prisma.dailySnapshot.deleteMany({});
  await prisma.dailyClosure.deleteMany({});
  await prisma.wasteRecord.deleteMany({});
  await prisma.remainingRecord.deleteMany({});
  await prisma.productionRecord.deleteMany({});
  console.log('Report data wiped.');

  console.log('Wiping all products...');
  await prisma.product.deleteMany({});
  console.log('Products wiped.');

  await prisma.$disconnect();
  console.log('Done. Fresh database - run seed-products.js then seed-reports.js');
})();