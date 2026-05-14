const prisma = require('../config/prisma');
const inventoryFlowService = require('./inventoryFlowService');

async function verifyBakeryScenario() {
  console.log('=== Bakery Verification Scenario ===\n');

  const branchId = 1;
  const testDate = '2026-05-13';

  console.log('Scenario:');
  console.log('  Previous remaining (May 12) = 30');
  console.log('  Previous night production (May 12 NIGHT -> May 13) = 210');
  console.log('  Current day production (May 13 DAY) = 200');
  console.log('  Current remaining (May 13) = 80');
  console.log('  Waste = 5\n');

  try {
    const product = await prisma.product.findFirst({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { id: 'asc' }
    });

    if (!product) {
      console.log('❌ No products found in database');
      return;
    }

    console.log(`Using product ID: ${product.id} (${product.name})\n`);

    const [opening, dayProd, nightProd, sellable, remaining, waste, sold, revenue] = await Promise.all([
      inventoryFlowService.getOpeningStock(branchId, testDate, product.id),
      inventoryFlowService.getDayProduction(branchId, testDate, product.id),
      inventoryFlowService.getNightProduction(branchId, testDate, product.id),
      inventoryFlowService.getSellableStock(branchId, testDate, product.id),
      inventoryFlowService.getRemainingStock(branchId, testDate, product.id),
      inventoryFlowService.getWasteQuantity(branchId, testDate, product.id),
      inventoryFlowService.getEstimatedSold(branchId, testDate, product.id),
      inventoryFlowService.getEstimatedRevenue(branchId, testDate, product.id),
    ]);

    console.log('Calculated Results:');
    console.log(`  Opening Stock: ${inventoryFlowService.decimalToNumber(opening)} (expected: 240)`);
    console.log(`  Day Production: ${inventoryFlowService.decimalToNumber(dayProd)} (expected: 200)`);
    console.log(`  Night Production: ${inventoryFlowService.decimalToNumber(nightProd)} (expected: 0)`);
    console.log(`  Sellable Stock: ${inventoryFlowService.decimalToNumber(sellable)} (expected: 440)`);
    console.log(`  Remaining Stock: ${inventoryFlowService.decimalToNumber(remaining)} (expected: 80)`);
    console.log(`  Waste: ${inventoryFlowService.decimalToNumber(waste)} (expected: 5)`);
    console.log(`  Estimated Sold: ${inventoryFlowService.decimalToNumber(sold)} (expected: 355)`);
    console.log(`  Estimated Revenue: ${inventoryFlowService.decimalToNumber(revenue)}\n`);

    const openNum = inventoryFlowService.decimalToNumber(opening);
    const sellableNum = inventoryFlowService.decimalToNumber(sellable);
    const soldNum = inventoryFlowService.decimalToNumber(sold);

    if (openNum === 240 && sellableNum === 440 && soldNum === 355) {
      console.log('✅ VERIFICATION PASSED - Calculations match expected values');
    } else {
      console.log('❌ VERIFICATION FAILED - Calculations do not match');
      console.log(`   Opening: got ${openNum}, expected 240`);
      console.log(`   Sellable: got ${sellableNum}, expected 440`);
      console.log(`   Sold: got ${soldNum}, expected 355`);
    }
  } catch (error) {
    console.log('❌ Error during verification:', error.message);
    console.error(error.stack);
  }
}

async function verifyNightProductionRule() {
  console.log('\n=== Night Production Rule Verification ===\n');
  console.log('Rule: NIGHT production on May 13 -> operationalDate = May 14\n');

  const productionDate = '2026-05-13';
  const shift = 'NIGHT';

  const calculated = inventoryFlowService.calculateOperationalDate(productionDate, shift);
  const expected = '2026-05-14';

  const calcStr = calculated.toISOString().split('T')[0];
  
  if (calcStr === expected) {
    console.log('✅ PASSED: calculateOperationalDate(May 13, NIGHT) = May 14');
  } else {
    console.log('❌ FAILED: calculateOperationalDate returned unexpected date');
    console.log(`   Got: ${calcStr}`);
    console.log(`   Expected: ${expected}`);
  }

  const dayCalc = inventoryFlowService.calculateOperationalDate(productionDate, 'DAY');
  const dayCalcStr = dayCalc.toISOString().split('T')[0];
  const dayExpected = '2026-05-13';
  
  if (dayCalcStr === dayExpected) {
    console.log('✅ PASSED: calculateOperationalDate(May 13, DAY) = May 13');
  } else {
    console.log(`❌ FAILED: DAY calculation incorrect - got ${dayCalcStr}, expected ${dayExpected}`);
  }
}

async function main() {
  await verifyBakeryScenario();
  await verifyNightProductionRule();
  await prisma.$disconnect();
}

main().catch(console.error);