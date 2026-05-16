const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const START_DATE = '2026-05-01';
const END_DATE = '2026-05-13';

function randomBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function findOrCreateProduction(branchId, operationalDate, productId, shift, quantity, createdBy) {
  const existing = await prisma.productionRecord.findFirst({
    where: {
      branchId,
      operationalDate,
      productId,
      shift,
    },
  });

  if (existing) {
    return prisma.productionRecord.update({
      where: { id: existing.id },
      data: { quantity },
    });
  }

  return prisma.productionRecord.create({
    data: {
      branchId,
      operationalDate,
      productId,
      shift,
      quantity,
      productionDate: operationalDate,
      createdBy,
    },
  });
}

async function main() {
  console.log('Seeding reports data for May 1-13, 2026...');

  const branches = await prisma.branch.findMany();
  const products = await prisma.product.findMany({ where: { isActive: true } });
  const adminUser = await prisma.user.findFirst({ where: { role: { name: 'ADMIN' } } });

  if (!adminUser) {
    console.error('No admin user found. Please run seed.js first.');
    process.exit(1);
  }

  if (products.length === 0) {
    console.error('No products found. Please run seed-products.js first.');
    process.exit(1);
  }

  console.log(`Found ${branches.length} branches and ${products.length} products`);

  const startDate = new Date(START_DATE);
  const endDate = new Date(END_DATE);

  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const operationalDate = new Date(d);
    const dateStr = operationalDate.toISOString().split('T')[0];
    console.log(`\nProcessing ${dateStr}...`);

    for (const branch of branches) {
      console.log(`  Branch: ${branch.name}`);

      const dayProduction = {};
      const nightProduction = {};
      const remainingStock = {};
      const wasteStock = {};

      for (const product of products) {
        const category = product.category;

        let baseQty = 50;
        if (category === 'CREAM_CAKES' || category === 'SOFT_CAKES') baseQty = 20;
        if (category === 'COOKIES') baseQty = 100;
        if (category === 'DRINKS_AND_RETAIL_ITEMS') baseQty = 30;

        const dayQty = randomBetween(Math.floor(baseQty * 0.8), Math.floor(baseQty * 1.2));
        const nightQty = randomBetween(Math.floor(baseQty * 0.3), Math.floor(baseQty * 0.5));

        dayProduction[product.id] = dayQty;
        nightProduction[product.id] = nightQty;

        const sellable = dayQty + nightQty;
        const remaining = randomBetween(0, Math.floor(sellable * 0.3));
        const waste = randomBetween(0, Math.floor(sellable * 0.05));
        const sold = sellable - remaining - waste;

        remainingStock[product.id] = remaining;
        wasteStock[product.id] = waste;
      }

      for (const product of products) {
        if (dayProduction[product.id] > 0) {
          await findOrCreateProduction(
            branch.id,
            operationalDate,
            product.id,
            'DAY',
            dayProduction[product.id],
            adminUser.id
          );
        }

        if (nightProduction[product.id] > 0) {
          const prevDate = new Date(operationalDate);
          prevDate.setDate(prevDate.getDate() - 1);
          prevDate.setHours(0, 0, 0, 0);

          await findOrCreateProduction(
            branch.id,
            prevDate,
            product.id,
            'NIGHT',
            nightProduction[product.id],
            adminUser.id
          );
        }
      }
      console.log(`    - Production records created`);

      for (const product of products) {
        const existingRem = await prisma.remainingRecord.findFirst({
          where: {
            branchId: branch.id,
            operationalDate: operationalDate,
            productId: product.id,
          },
        });

        if (existingRem) {
          await prisma.remainingRecord.update({
            where: { id: existingRem.id },
            data: { quantity: remainingStock[product.id], status: 'FINAL' },
          });
        } else {
          await prisma.remainingRecord.create({
            data: {
              productId: product.id,
              branchId: branch.id,
              operationalDate: operationalDate,
              quantity: remainingStock[product.id],
              status: 'FINAL',
              createdBy: adminUser.id,
            },
          });
        }
      }
      console.log(`    - Remaining records created`);

      for (const product of products) {
        if (wasteStock[product.id] > 0) {
          const existingWaste = await prisma.wasteRecord.findFirst({
            where: {
              branchId: branch.id,
              operationalDate: operationalDate,
              productId: product.id,
            },
          });

          if (existingWaste) {
            await prisma.wasteRecord.update({
              where: { id: existingWaste.id },
              data: { quantity: wasteStock[product.id], reason: 'Expired/Damaged' },
            });
          } else {
            await prisma.wasteRecord.create({
              data: {
                productId: product.id,
                branchId: branch.id,
                operationalDate: operationalDate,
                quantity: wasteStock[product.id],
                reason: 'Expired/Damaged',
                createdBy: adminUser.id,
              },
            });
          }
        }
      }
      console.log(`    - Waste records created`);

      const existingClosure = await prisma.dailyClosure.findUnique({
        where: {
          branchId_operationalDate: {
            branchId: branch.id,
            operationalDate: operationalDate,
          },
        },
      });

      let closure;
      if (!existingClosure) {
        closure = await prisma.dailyClosure.create({
          data: {
            branchId: branch.id,
            operationalDate: operationalDate,
            isClosed: true,
            closedBy: adminUser.id,
            closedAt: new Date(operationalDate.getTime() + 20 * 60 * 60 * 1000),
            note: `Auto-seeded closure for ${dateStr}`,
          },
        });
      } else {
        closure = await prisma.dailyClosure.update({
          where: { id: existingClosure.id },
          data: {
            isClosed: true,
            closedBy: adminUser.id,
            closedAt: new Date(operationalDate.getTime() + 20 * 60 * 60 * 1000),
          },
        });
      }

      const existingSnapshot = await prisma.dailySnapshot.findFirst({
        where: {
          branchId: branch.id,
          operationalDate: operationalDate,
          isInvalidated: false,
        },
      });

      const snapshotItems = [];
      for (const product of products) {
        const dayProd = dayProduction[product.id] || 0;
        const nightProd = nightProduction[product.id] || 0;
        const remStock = remainingStock[product.id] || 0;
        const wasteQty = wasteStock[product.id] || 0;
        const sellable = dayProd + nightProd;
        const sold = Math.max(0, sellable - remStock - wasteQty);
        const revenue = sold * Number(product.price);

        snapshotItems.push({
          productId: product.id,
          openingStock: 0,
          dayProduction: dayProd,
          nightProduction: nightProd,
          sellableStock: sellable,
          remainingStock: remStock,
          wasteQuantity: wasteQty,
          estimatedSold: sold,
          estimatedRevenue: revenue,
        });
      }

      if (existingSnapshot) {
        await prisma.dailySnapshotItem.deleteMany({
          where: { snapshotId: existingSnapshot.id },
        });
        await prisma.dailySnapshot.update({
          where: { id: existingSnapshot.id },
          data: {
            closedBy: adminUser.id,
            closedAt: new Date(operationalDate.getTime() + 20 * 60 * 60 * 1000),
            items: {
              create: snapshotItems,
            },
          },
        });
      } else {
        await prisma.dailySnapshot.create({
          data: {
            closureId: closure.id,
            branchId: branch.id,
            operationalDate: operationalDate,
            closedBy: adminUser.id,
            closedAt: new Date(operationalDate.getTime() + 20 * 60 * 60 * 1000),
            isInvalidated: false,
            items: {
              create: snapshotItems,
            },
          },
        });
      }
      console.log(`    - Snapshot created`);
    }
  }

  console.log('\n✅ Report seeding completed successfully!');
  console.log(`   Created closures and snapshots for May 1-13, 2026`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });