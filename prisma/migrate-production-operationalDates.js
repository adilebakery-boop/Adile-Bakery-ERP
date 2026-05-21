const prisma = require('../src/config/prisma');
const { calculateOperationalDate, toDateString } = require('../src/utils/dateUtils');

async function recalculateOperationalDates() {
  console.log('Starting operationalDate recalculation for production records...');

  const records = await prisma.productionRecord.findMany({
    select: { id: true, productionDate: true, shift: true, operationalDate: true },
  });

  if (records.length === 0) {
    console.log('No production records found. Nothing to migrate.');
    return;
  }

  let updated = 0;
  let unchanged = 0;

  for (const record of records) {
    const newOpDate = calculateOperationalDate(record.productionDate, record.shift);
    const newOpDateStr = toDateString(newOpDate);
    const oldOpDateStr = toDateString(record.operationalDate);

    if (newOpDateStr !== oldOpDateStr) {
      await prisma.productionRecord.update({
        where: { id: record.id },
        data: { operationalDate: newOpDate },
      });
      console.log(`  Record ${record.id}: ${oldOpDateStr} → ${newOpDateStr} (shift: ${record.shift})`);
      updated++;
    } else {
      unchanged++;
    }
  }

  console.log(`\nMigration complete:`);
  console.log(`  Total records: ${records.length}`);
  console.log(`  Updated: ${updated}`);
  console.log(`  Unchanged: ${unchanged}`);
}

recalculateOperationalDates()
  .catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
