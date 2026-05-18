const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const START_DATE = '2026-04-15';
const END_DATE = '2026-05-16';

async function upsertProduction(branchId, productId, operationalDate, shift, quantity, createdBy) {
  const existing = await prisma.productionRecord.findFirst({ where: { branchId, productId, operationalDate, shift } });
  if (existing) return prisma.productionRecord.update({ where: { id: existing.id }, data: { quantity } });
  return prisma.productionRecord.create({ data: { branchId, productId, operationalDate, shift, quantity, productionDate: operationalDate, createdBy } });
}

async function upsertRemaining(branchId, productId, operationalDate, quantity, createdBy) {
  const existing = await prisma.remainingRecord.findFirst({ where: { branchId, productId, operationalDate } });
  if (existing) return prisma.remainingRecord.update({ where: { id: existing.id }, data: { quantity, status: 'FINAL' } });
  return prisma.remainingRecord.create({ data: { branchId, productId, operationalDate, quantity, status: 'FINAL', createdBy } });
}

async function main() {
  console.log('Wiping old report data...');
  await prisma.dailySnapshotItem.deleteMany({ where: {} });
  await prisma.dailySnapshot.deleteMany({ where: {} });
  await prisma.dailyClosure.deleteMany({ where: {} });
  await prisma.wasteRecord.deleteMany({ where: {} });
  await prisma.remainingRecord.deleteMany({ where: {} });
  await prisma.productionRecord.deleteMany({ where: {} });
  console.log('Old data wiped.');

  const branches = await prisma.branch.findMany({ where: { isActive: true } });
  const products = await prisma.product.findMany({ where: { isActive: true } });
  const adminUser = await prisma.user.findFirst({ where: { role: { name: 'ADMIN' } } });

  if (!adminUser) { console.error('No admin user found.'); process.exit(1); }
  if (products.length === 0) { console.error('No products found.'); process.exit(1); }

  console.log(`Branches: ${branches.length}, Products: ${products.length}`);

  const startDate = new Date(START_DATE);
  const endDate = new Date(END_DATE);

  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const operationalDate = new Date(d);
    const dateStr = operationalDate.toISOString().split('T')[0];
    process.stdout.write(`\n${dateStr} `);

    for (const branch of branches) {
      process.stdout.write('.');

      const dayProduction = {};
      const nightProduction = {};
      const remainingStock = {};
      const wasteStock = {};

      for (const product of products) {
        const dayQty = 40 + ((product.id * 7 + d.getDate() * 3) % 20);
        const nightQty = 10 + ((product.id * 5 + d.getDate() * 2) % 10);
        dayProduction[product.id] = dayQty;
        nightProduction[product.id] = nightQty;
        const sellable = dayQty + nightQty;
        remainingStock[product.id] = Math.floor(sellable * 0.15);
        wasteStock[product.id] = Math.floor(sellable * 0.03);
      }

      for (const product of products) {
        await upsertProduction(branch.id, product.id, operationalDate, 'DAY', dayProduction[product.id], adminUser.id);
        const prevDate = new Date(operationalDate);
        prevDate.setDate(prevDate.getDate() - 1);
        prevDate.setHours(0, 0, 0, 0);
        await upsertProduction(branch.id, product.id, prevDate, 'NIGHT', nightProduction[product.id], adminUser.id);
      }

      for (const product of products) {
        await upsertRemaining(branch.id, product.id, operationalDate, remainingStock[product.id], adminUser.id);
      }

      for (const product of products) {
        if (wasteStock[product.id] > 0) {
          const existing = await prisma.wasteRecord.findFirst({ where: { branchId: branch.id, productId: product.id, operationalDate } });
          if (existing) {
            await prisma.wasteRecord.update({ where: { id: existing.id }, data: { quantity: wasteStock[product.id] } });
          } else {
            await prisma.wasteRecord.create({ data: { branchId: branch.id, productId: product.id, operationalDate, quantity: wasteStock[product.id], createdBy: adminUser.id } });
          }
        }
      }

      const closure = await prisma.dailyClosure.upsert({
        where: { branchId_operationalDate: { branchId: branch.id, operationalDate } },
        update: { isClosed: true, closedBy: adminUser.id },
        create: { branchId: branch.id, operationalDate, isClosed: true, closedBy: adminUser.id, closedAt: new Date(operationalDate.getTime() + 20 * 60 * 60 * 1000) },
      });

      const snapshotItems = products.map(product => {
        const dayProd = dayProduction[product.id] || 0;
        const nightProd = nightProduction[product.id] || 0;
        const remStock = remainingStock[product.id] || 0;
        const wasteQty = wasteStock[product.id] || 0;
        const sellable = dayProd + nightProd;
        const sold = Math.max(0, sellable - remStock - wasteQty);
        const revenue = sold * Number(product.price);
        return { productId: product.id, openingStock: 0, dayProduction: dayProd, nightProduction: nightProd, sellableStock: sellable, remainingStock: remStock, wasteQuantity: wasteQty, estimatedSold: sold, estimatedRevenue: revenue };
      });

      const existingSnap = await prisma.dailySnapshot.findFirst({ where: { branchId: branch.id, operationalDate, isInvalidated: false } });
      if (existingSnap) {
        await prisma.dailySnapshotItem.deleteMany({ where: { snapshotId: existingSnap.id } });
        await prisma.dailySnapshot.update({ where: { id: existingSnap.id }, data: { closedBy: adminUser.id, closedAt: new Date(operationalDate.getTime() + 20 * 60 * 60 * 1000), items: { create: snapshotItems } } });
      } else {
        await prisma.dailySnapshot.create({ data: { closureId: closure.id, branchId: branch.id, operationalDate, closedBy: adminUser.id, closedAt: new Date(operationalDate.getTime() + 20 * 60 * 60 * 1000), isInvalidated: false, items: { create: snapshotItems } } });
      }
    }
  }

  console.log('\n\nSeed complete! April 15 - May 16, 2026 for all branches.');
}

main().catch(e => { console.error(e); process.exit(1); }).finally(async () => { await prisma.$disconnect(); });