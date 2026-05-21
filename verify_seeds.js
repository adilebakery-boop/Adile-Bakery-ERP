const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verify() {
  console.log('=== POST-SEED VERIFICATION ===\n');

  // Products
  const products = await prisma.product.findMany({ orderBy: { id: 'asc' } });
  console.log('Products (' + products.length + '):');
  products.forEach(p => console.log('  ID:' + p.id + ' | ' + p.name + ' | ' + p.category + ' | ' + p.price + ' | ' + p.unitType));

  // Counts
  const prodCount = await prisma.productionRecord.count();
  const remCount = await prisma.remainingRecord.count();
  const wasteCount = await prisma.wasteRecord.count();
  const closureCount = await prisma.dailyClosure.count();
  const snapshotCount = await prisma.dailySnapshot.count();
  const snapshotItemCount = await prisma.dailySnapshotItem.count();
  console.log('\nRecord counts:');
  console.log('  ProductionRecord: ' + prodCount);
  console.log('  RemainingRecord: ' + remCount);
  console.log('  WasteRecord: ' + wasteCount);
  console.log('  DailyClosure: ' + closureCount);
  console.log('  DailySnapshot: ' + snapshotCount);
  console.log('  DailySnapshotItem: ' + snapshotItemCount);

  // Date range check
  const firstProd = await prisma.productionRecord.findFirst({ orderBy: { operationalDate: 'asc' }, select: { operationalDate: true } });
  const lastProd = await prisma.productionRecord.findFirst({ orderBy: { operationalDate: 'desc' }, select: { operationalDate: true } });
  console.log('\nProduction date range: ' + firstProd.operationalDate.toISOString().split('T')[0] + ' to ' + lastProd.operationalDate.toISOString().split('T')[0]);

  // Branch coverage
  const branchProds = await prisma.productionRecord.groupBy({ by: ['branchId'], _count: { id: true } });
  console.log('\nProductions per branch:');
  branchProds.forEach(bp => console.log('  Branch ' + bp.branchId + ': ' + bp._count.id + ' records'));

  // Category coverage
  const catProducts = await prisma.product.groupBy({ by: ['category'], _count: { id: true } });
  console.log('\nProducts per category:');
  catProducts.forEach(cp => console.log('  ' + cp.category + ': ' + cp._count.id));

  // Check for orphaned records
  const orphanProds = await prisma.productionRecord.count({ where: { productId: { notIn: products.map(p => p.id) } } });
  const orphanRem = await prisma.remainingRecord.count({ where: { productId: { notIn: products.map(p => p.id) } } });
  const orphanWaste = await prisma.wasteRecord.count({ where: { productId: { notIn: products.map(p => p.id) } } });
  console.log('\nOrphaned records:');
  console.log('  Production: ' + orphanProds);
  console.log('  Remaining: ' + orphanRem);
  console.log('  Waste: ' + orphanWaste);

  // Revenue sample
  const sampleSnap = await prisma.dailySnapshotItem.findFirst({
    where: { estimatedRevenue: { gt: 0 } },
    include: { product: true },
    orderBy: { estimatedRevenue: 'desc' }
  });
  if (sampleSnap) {
    console.log('\nSample snapshot item (highest revenue):');
    console.log('  Product: ' + sampleSnap.product.name);
    console.log('  Sold: ' + sampleSnap.estimatedSold);
    console.log('  Revenue: ' + sampleSnap.estimatedRevenue);
  }

  await prisma.$disconnect();
  console.log('\n=== VERIFICATION COMPLETE ===');
}

verify().catch(e => { console.error(e); process.exit(1); });
