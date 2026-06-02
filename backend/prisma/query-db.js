const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('=== 1. Count of records per table ===');
  const tables = ['ProductionRecord', 'WasteRecord', 'RemainingRecord', 'DailyClosure', 'DailySnapshot', 'DailySnapshotItem', 'Branch', 'Product', 'User'];
  for (const t of tables) {
    const count = await prisma[t.charAt(0).toLowerCase() + t.slice(1)].count();
    console.log(`${t.padEnd(20)} ${count}`);
  }

  console.log('\n=== 2. operationalDate distribution: ProductionRecord ===');
  const prodDates = await prisma.$queryRawUnsafe(`SELECT "operationalDate"::text, COUNT(*)::int as cnt FROM "ProductionRecord" GROUP BY "operationalDate" ORDER BY "operationalDate"`);
  for (const r of prodDates) console.log(`${r.operationalDate}  ${r.cnt}`);

  console.log('\n=== 3a. operationalDate distribution: WasteRecord ===');
  const wasteDates = await prisma.$queryRawUnsafe(`SELECT "operationalDate"::text, COUNT(*)::int as cnt FROM "WasteRecord" GROUP BY "operationalDate" ORDER BY "operationalDate"`);
  for (const r of wasteDates) console.log(`${r.operationalDate}  ${r.cnt}`);

  console.log('\n=== 3b. operationalDate distribution: RemainingRecord ===');
  const remDates = await prisma.$queryRawUnsafe(`SELECT "operationalDate"::text, COUNT(*)::int as cnt FROM "RemainingRecord" GROUP BY "operationalDate" ORDER BY "operationalDate"`);
  for (const r of remDates) console.log(`${r.operationalDate}  ${r.cnt}`);

  console.log('\n=== 4. Branch relationships (ProductionRecord) ===');
  const branchRel = await prisma.$queryRawUnsafe(`SELECT p."branchId", b.name, COUNT(*)::int as prod_count FROM "ProductionRecord" p LEFT JOIN "Branch" b ON p."branchId" = b.id GROUP BY p."branchId", b.name ORDER BY p."branchId"`);
  for (const r of branchRel) console.log(`${r.branchId}  ${r.name || '(null)'}  ${r.prod_count}`);

  console.log('\n=== 5. Production records May 25-30 ===');
  const prodMay = await prisma.$queryRawUnsafe(`SELECT "operationalDate"::text, COUNT(*)::int as cnt FROM "ProductionRecord" WHERE "operationalDate" >= '2026-05-25' AND "operationalDate" <= '2026-05-30' GROUP BY "operationalDate" ORDER BY "operationalDate"`);
  for (const r of prodMay) console.log(`${r.operationalDate}  ${r.cnt}`);

  console.log('\n=== 6. Waste records May 25-30 ===');
  const wasteMay = await prisma.$queryRawUnsafe(`SELECT "operationalDate"::text, COUNT(*)::int as cnt FROM "WasteRecord" WHERE "operationalDate" >= '2026-05-25' AND "operationalDate" <= '2026-05-30' GROUP BY "operationalDate" ORDER BY "operationalDate"`);
  for (const r of wasteMay) console.log(`${r.operationalDate}  ${r.cnt}`);

  console.log('\n=== 7. Remaining records May 25-30 ===');
  const remMay = await prisma.$queryRawUnsafe(`SELECT "operationalDate"::text, COUNT(*)::int as cnt FROM "RemainingRecord" WHERE "operationalDate" >= '2026-05-25' AND "operationalDate" <= '2026-05-30' GROUP BY "operationalDate" ORDER BY "operationalDate"`);
  for (const r of remMay) console.log(`${r.operationalDate}  ${r.cnt}`);

  console.log('\n=== 8. Orphan production records (no product) ===');
  const orphan = await prisma.$queryRawUnsafe(`SELECT COUNT(*)::int as cnt FROM "ProductionRecord" p WHERE NOT EXISTS (SELECT 1 FROM "Product" pr WHERE pr.id = p."productId")`);
  console.log(`orphan_production  ${orphan[0].cnt}`);

  console.log('\n=== 9. Branches ===');
  const branches = await prisma.$queryRawUnsafe(`SELECT id, name, "isActive" FROM "Branch" ORDER BY id`);
  for (const r of branches) console.log(`${r.id}  ${r.name}  ${r.isActive}`);

  console.log('\n=== 10. Products ===');
  const products = await prisma.$queryRawUnsafe(`SELECT id, name, category, "isActive" FROM "Product" ORDER BY id`);
  for (const r of products) console.log(`${r.id}  ${r.name}  ${r.category}  ${r.isActive}`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
