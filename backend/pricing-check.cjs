const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
async function main() {
  // Check first 5 snapshot items for pricing
  const items = await p.dailySnapshotItem.findMany({
    take: 10,
    orderBy: { id: 'asc' },
    include: { snapshot: { select: { operationalDate: true, branchId: true } } }
  });
  console.log('First 10 snapshot items:');
  items.forEach(i => {
    console.log(`  id=${i.id} productId=${i.productId} snapshotPrice=${i.snapshotPrice} revenue=${i.estimatedRevenue} date=${i.snapshot.operationalDate.toISOString().split('T')[0]}`);
  });

  // Check PriceHistory entries
  const ph = await p.productPriceHistory.findMany({ take: 10, orderBy: { id: 'asc' } });
  console.log('\nPriceHistory:');
  ph.forEach(h => {
    console.log(`  id=${h.id} productId=${h.productId} price=${h.price} from=${h.validFrom.toISOString().split('T')[0]} to=${h.validTo?.toISOString().split('T')[0] || 'null'}`);
  });

  // Check product prices
  const prods = await p.product.findMany({ orderBy: { id: 'asc' } });
  console.log('\nProducts:');
  prods.forEach(pr => console.log(`  id=${pr.id} ${pr.name} price=${pr.price}`));

  // Pick a specific product and check its snapshot prices across months
  const p12Items = await p.dailySnapshotItem.findMany({
    where: { productId: 12 },
    include: { snapshot: { select: { operationalDate: true } } },
    orderBy: { snapshot: { operationalDate: 'asc' } }
  });
  console.log(`\nProduct 12 (Drinks 2) snapshot items: ${p12Items.length}`);
  const prices = [...new Set(p12Items.map(i => Number(i.snapshotPrice)))].sort((a,b) => a-b);
  console.log(`Distinct snapshot prices: ${prices.join(', ')}`);

  await p.$disconnect();
}
main().catch(e => { console.error(e.message); process.exit(1); });
