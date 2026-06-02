const prisma = require('../config/prisma');

async function debugVerification() {
  console.log('=== Debug Verification ===\n');

  const branchId = 1;
  const testDate = new Date('2026-05-13');
  const prevDay = new Date('2026-05-12');

  console.log('testDate:', testDate.toISOString());
  console.log('prevDay:', prevDay.toISOString());

  // Check previous remaining
  const prevRemaining = await prisma.remainingRecord.findFirst({
    where: { branchId: branchId, operationalDate: prevDay, productId: 1, status: 'FINAL' },
    select: { quantity: true, operationalDate: true },
  });
  console.log('\n1. Previous remaining (May 12, product 1):', prevRemaining);

  // Check previous night production (from May 12, operational date = May 13)
  const prevNightProd = await prisma.productionRecord.findMany({
    where: { branchId: branchId, productionDate: prevDay, shift: 'NIGHT', productId: 1 },
    select: { id: true, productionDate: true, operationalDate: true, quantity: true, shift: true },
  });
  console.log('\n2. Previous night production (May 12 NIGHT, product 1):', prevNightProd);

  // Check day production for May 13
  const dayProd = await prisma.productionRecord.findMany({
    where: { branchId: branchId, operationalDate: testDate, shift: 'DAY', productId: 1 },
    select: { id: true, productionDate: true, operationalDate: true, quantity: true, shift: true },
  });
  console.log('\n3. Day production (May 13 DAY, product 1):', dayProd);

  // Check night production for May 13 (should be 0 for product 1)
  const nightProd = await prisma.productionRecord.findMany({
    where: { branchId: branchId, operationalDate: testDate, shift: 'NIGHT', productId: 1 },
    select: { id: true, productionDate: true, operationalDate: true, quantity: true, shift: true },
  });
  console.log('\n4. Night production (May 13 NIGHT, product 1):', nightProd);

  // Check remaining for May 13
  const remaining = await prisma.remainingRecord.findFirst({
    where: { branchId: branchId, operationalDate: testDate, productId: 1, status: 'FINAL' },
    select: { quantity: true, operationalDate: true },
  });
  console.log('\n5. Remaining (May 13, product 1):', remaining);

  // Check waste for May 13
  const waste = await prisma.wasteRecord.findMany({
    where: { branchId: branchId, operationalDate: testDate, productId: 1 },
    select: { id: true, quantity: true, reason: true },
  });
  console.log('\n6. Waste (May 13, product 1):', waste);

  // Expected opening = 30 + 210 = 240
  const expectedOpening = 240;
  const prevRemQty = prevRemaining?.quantity ? Number(prevRemaining.quantity) : 0;
  const prevNightQty = prevNightProd.reduce((sum, p) => sum + Number(p.quantity), 0);
  console.log('\n7. Calculated opening:', prevRemQty, '+', prevNightQty, '=', prevRemQty + prevNightQty);
  console.log('   Expected:', expectedOpening);

  // Expected sellable = opening + dayProd = 240 + 200 = 440
  const dayProdQty = dayProd.reduce((sum, p) => sum + Number(p.quantity), 0);
  console.log('\n8. Calculated sellable:', prevRemQty + prevNightQty, '+', dayProdQty, '=', prevRemQty + prevNightQty + dayProdQty);

  // Expected sold = sellable - remaining - waste = 440 - 80 - 5 = 355
  const remainingQty = remaining?.quantity ? Number(remaining.quantity) : 0;
  const wasteQty = waste.reduce((sum, w) => sum + Number(w.quantity), 0);
  const sold = prevRemQty + prevNightQty + dayProdQty - remainingQty - wasteQty;
  console.log('\n9. Calculated sold:', prevRemQty + prevNightQty + dayProdQty, '-', remainingQty, '-', wasteQty, '=', sold);
  console.log('   Expected: 355');

  await prisma.$disconnect();
}

debugVerification().catch(console.error);