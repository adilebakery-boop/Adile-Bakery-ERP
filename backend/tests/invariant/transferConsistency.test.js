const { Prisma } = require('@prisma/client');
const prisma = require('../../src/config/prisma');

// Enable transfers for tests
process.env.FEATURE_TRANSFERS = 'true';

const { getInventoryFlowForAllProducts } = require('../../src/services/inventoryFlowService');
const { toDecimal } = require('../../src/utils/decimalUtils');

const TEST_PREFIX = 'TINV_';
const TEST_DATE = new Date('2026-06-19');
const TEST_DATE_STR = '2026-06-19';
const ZERO = new Prisma.Decimal(0);

// ── Helpers ──────────────────────────────────────────────────────────

async function createTestUser(role) {
  return prisma.user.create({
    data: {
      name: `${TEST_PREFIX}User`,
      username: `${TEST_PREFIX}user_${Date.now()}`,
      passwordHash: 'hash',
      roleId: role.id,
    },
  });
}

async function createTestProduct() {
  const product = await prisma.product.create({
    data: {
      name: `${TEST_PREFIX}Product_${Date.now()}`,
      name_am: `${TEST_PREFIX}Product_am`,
      price: 100,
      category: 'BREAD_AND_SWEET_BREADS',
      unitType: 'piece',
    },
  });
  await prisma.productPriceHistory.create({
    data: {
      productId: product.id,
      price: 100,
      validFrom: new Date('2026-01-01'),
      validTo: null,
    },
  });
  return product;
}

function sumFlows(flows) {
  const totals = { sellableStock: 0, production: 0, receivedTransfer: 0, sentTransfer: 0, remaining: 0, waste: 0, sold: 0 };
  for (const f of flows) {
    totals.sellableStock += f.sellableStock;
    totals.production += f.dayProduction + f.nightProduction;
    totals.receivedTransfer += f.receivedTransfer;
    totals.sentTransfer += f.sentTransfer;
    totals.remaining += f.remainingStock;
    totals.waste += f.wasteQuantity;
    totals.sold += f.estimatedSold;
  }
  return totals;
}

async function deleteIfExists(model, args) {
  try { await model.deleteMany(args); } catch (e) { if (e.code !== 'P2021') throw e; }
}

async function wipeTestData() {
  await prisma.rolloverCache.deleteMany({ where: { key: { startsWith: `${TEST_PREFIX}` } } });
  await deleteIfExists(prisma.productTransfer, { where: { product: { name: { startsWith: TEST_PREFIX } } } });
  await prisma.productionRecord.deleteMany({ where: { product: { name: { startsWith: TEST_PREFIX } } } });
  await prisma.remainingRecord.deleteMany({ where: { product: { name: { startsWith: TEST_PREFIX } } } });
  await prisma.wasteRecord.deleteMany({ where: { product: { name: { startsWith: TEST_PREFIX } } } });
  await prisma.productPriceHistory.deleteMany({ where: { product: { name: { startsWith: TEST_PREFIX } } } });
  await prisma.product.deleteMany({ where: { name: { startsWith: TEST_PREFIX } } });
  await prisma.branch.deleteMany({ where: { name: { startsWith: TEST_PREFIX } } });
  await prisma.user.deleteMany({ where: { name: { startsWith: TEST_PREFIX } } });
  await prisma.role.deleteMany({ where: { name: { startsWith: TEST_PREFIX } } });
}

// ── Setup / Teardown ────────────────────────────────────────────────

let sourceBranch, depBranch, independentBranch, product, user, adminRole;
let transferTableExists = false;

beforeAll(async () => {
  try {
    await prisma.productTransfer.findFirst();
    transferTableExists = true;
  } catch (e) {
    if (e.code === 'P2021') {
      console.warn('⚠ ProductTransfer table does not exist — skipping transfer tests. Run the Phase 1 migration first.');
    } else {
      throw e;
    }
  }

  if (!transferTableExists) return;

  // Clean any leftovers from previous interrupted runs
  await wipeTestData();

  adminRole = await prisma.role.create({ data: { name: `${TEST_PREFIX}ADMIN` } });
  user = await createTestUser(adminRole);

  sourceBranch = await prisma.branch.create({
    data: { name: `${TEST_PREFIX}SOURCE`, branchType: 'SOURCE', name_am: `${TEST_PREFIX}SOURCE_am` },
  });
  depBranch = await prisma.branch.create({
    data: { name: `${TEST_PREFIX}DEPENDENT`, branchType: 'DEPENDENT', sourceBranchId: sourceBranch.id, name_am: `${TEST_PREFIX}DEPENDENT_am` },
  });
  independentBranch = await prisma.branch.create({
    data: { name: `${TEST_PREFIX}INDEPENDENT`, branchType: 'INDEPENDENT', name_am: `${TEST_PREFIX}INDEPENDENT_am` },
  });

  product = await createTestProduct();
});

afterAll(async () => {
  if (transferTableExists) await wipeTestData();
  await prisma.$disconnect();
});

// ── Tests ────────────────────────────────────────────────────────────
if (!transferTableExists) {
  test.skip('ProductTransfer table not available — run Phase 1 migration', () => {});
} else {

describe('Transfer invariants', () => {
  beforeAll(async () => {
    // Seed operational data for all three branches
    // SOURCE: production 100, remaining 10
    await prisma.productionRecord.create({
      data: { productId: product.id, quantity: 100, branchId: sourceBranch.id, shift: 'DAY', createdBy: user.id, operationalDate: TEST_DATE, productionDate: TEST_DATE },
    });
    await prisma.remainingRecord.create({
      data: { productId: product.id, quantity: 10, branchId: sourceBranch.id, createdBy: user.id, operationalDate: TEST_DATE, status: 'FINAL' },
    });

    // DEPENDENT: no production, remaining 5
    await prisma.remainingRecord.create({
      data: { productId: product.id, quantity: 5, branchId: depBranch.id, createdBy: user.id, operationalDate: TEST_DATE, status: 'FINAL' },
    });

    // INDEPENDENT: production 50, remaining 3
    await prisma.productionRecord.create({
      data: { productId: product.id, quantity: 50, branchId: independentBranch.id, shift: 'DAY', createdBy: user.id, operationalDate: TEST_DATE, productionDate: TEST_DATE },
    });
    await prisma.remainingRecord.create({
      data: { productId: product.id, quantity: 3, branchId: independentBranch.id, createdBy: user.id, operationalDate: TEST_DATE, status: 'FINAL' },
    });

    // Transfer 30 from SOURCE → DEPENDENT (APPROVED)
    await prisma.productTransfer.create({
      data: { productId: product.id, sourceBranchId: sourceBranch.id, dependentBranchId: depBranch.id, operationalDate: TEST_DATE, receivedQuantity: 30, sentQuantity: 30, status: 'APPROVED', createdBy: user.id },
    });
  });

  // ── Invariant 1: SOURCE branch ─────────────────────────────────────
  test('SOURCE sellableStock = opening + production - sentTransfer', async () => {
    // opening = 0 (no previous day remaining), production = 100, sent = 30
    // sellableStock = 0 + 100 - 30 = 70
    const flows = await getInventoryFlowForAllProducts(sourceBranch.id, TEST_DATE);
    const sf = flows.find(f => f.product.id === product.id);
    expect(sf).toBeDefined();
    expect(sf.sellableStock).toBe(70);
    expect(sf.sentTransfer).toBe(30);
    expect(sf.receivedTransfer).toBe(0);
  });

  // ── Invariant 2: DEPENDENT branch ──────────────────────────────────
  test('DEPENDENT sellableStock = receivedTransfer (no production, no opening)', async () => {
    // sellableStock = 0 + 0 + 30 = 30
    const flows = await getInventoryFlowForAllProducts(depBranch.id, TEST_DATE);
    const df = flows.find(f => f.product.id === product.id);
    expect(df).toBeDefined();
    expect(df.sellableStock).toBe(30);
    expect(df.receivedTransfer).toBe(30);
    expect(df.sentTransfer).toBe(0);
    expect(df.dayProduction).toBe(0);
    expect(df.nightProduction).toBe(0);
  });

  // ── Invariant 3: INDEPENDENT branch unaffected ─────────────────────
  test('INDEPENDENT sellableStock = opening + production (no transfer adjustment)', async () => {
    const flows = await getInventoryFlowForAllProducts(independentBranch.id, TEST_DATE);
    const inf = flows.find(f => f.product.id === product.id);
    expect(inf).toBeDefined();
    // opening = 0, production = 50, no transfers → sellableStock = 50
    expect(inf.sellableStock).toBe(50);
    expect(inf.receivedTransfer).toBe(0);
    expect(inf.sentTransfer).toBe(0);
  });

  // ── Invariant 4: System conservation ───────────────────────────────
  test('Σ sellableStock across SOURCE + DEPENDENT = Σ production (transfers net to zero)', async () => {
    const [sFlows, dFlows] = await Promise.all([
      getInventoryFlowForAllProducts(sourceBranch.id, TEST_DATE),
      getInventoryFlowForAllProducts(depBranch.id, TEST_DATE),
    ]);
    const sTotals = sumFlows(sFlows);
    const dTotals = sumFlows(dFlows);
    // Combined sellable = SOURCE(70) + DEPENDENT(30) = 100 = SOURCE production(100)
    expect(sTotals.sellableStock + dTotals.sellableStock).toBe(sTotals.production + dTotals.production);
    // Combined sent = combined received (net zero)
    expect(sTotals.sentTransfer).toBe(dTotals.receivedTransfer);
    expect(sTotals.receivedTransfer).toBe(dTotals.sentTransfer);
  });

  // ── Invariant 5: estimatedSold formula holds ───────────────────────
  test('estimatedSold = sellableStock - remainingStock - wasteQuantity', async () => {
    const [sFlows, dFlows, iFlows] = await Promise.all([
      getInventoryFlowForAllProducts(sourceBranch.id, TEST_DATE),
      getInventoryFlowForAllProducts(depBranch.id, TEST_DATE),
      getInventoryFlowForAllProducts(independentBranch.id, TEST_DATE),
    ]);
    for (const flow of [...sFlows, ...dFlows, ...iFlows]) {
      const expected = Math.max(flow.sellableStock - flow.remainingStock - flow.wasteQuantity, 0);
      expect(flow.estimatedSold).toBe(expected);
    }
  });
});

describe('Transfer status inclusion', () => {
  let p2;

  beforeAll(async () => {
    p2 = await createTestProduct();

    // Add production for SOURCE on this product too
    await prisma.productionRecord.create({
      data: { productId: p2.id, quantity: 50, branchId: sourceBranch.id, shift: 'DAY', createdBy: user.id, operationalDate: TEST_DATE, productionDate: TEST_DATE },
    });
    await prisma.remainingRecord.create({
      data: { productId: p2.id, quantity: 2, branchId: sourceBranch.id, createdBy: user.id, operationalDate: TEST_DATE, status: 'FINAL' },
    });

    // PENDING transfer
    await prisma.productTransfer.create({
      data: { productId: p2.id, sourceBranchId: sourceBranch.id, dependentBranchId: depBranch.id, operationalDate: TEST_DATE, receivedQuantity: 10, sentQuantity: 10, status: 'PENDING', createdBy: user.id },
    });
  });

  test('PENDING transfers are included in sellableStock adjustment', async () => {
    const flows = await getInventoryFlowForAllProducts(sourceBranch.id, TEST_DATE);
    const f = flows.find(f => f.product.id === p2.id);
    expect(f).toBeDefined();
    // production 50 - PENDING sent 10 = sellableStock 40
    expect(f.sellableStock).toBe(50 - 10);
    expect(f.sentTransfer).toBe(10);
  });
});

describe('Zero transfer edge case', () => {
  test('SOURCE with zero transfers behaves like INDEPENDENT', async () => {
    // TransferSystemProduct — only production, no transfers
    const p3 = await createTestProduct();
    await prisma.productionRecord.create({
      data: { productId: p3.id, quantity: 25, branchId: sourceBranch.id, shift: 'NIGHT', createdBy: user.id, operationalDate: TEST_DATE, productionDate: TEST_DATE },
    });

    const flows = await getInventoryFlowForAllProducts(sourceBranch.id, TEST_DATE);
    const f = flows.find(f => f.product.id === p3.id);
    expect(f).toBeDefined();
    expect(f.sellableStock).toBe(25); // 0 opening + 25 night prod - 0 sent
    expect(f.sentTransfer).toBe(0);
    expect(f.receivedTransfer).toBe(0);
  });
});

// ── Phase 4: Integrity service tests ─────────────────────────────────
describe('Transfer balance invariant (integrityService)', () => {
  let balanceProduct;

  beforeAll(async () => {
    balanceProduct = await createTestProduct();
    // Create two matching transfers and one mismatched
    await prisma.productTransfer.create({
      data: { productId: balanceProduct.id, sourceBranchId: sourceBranch.id, dependentBranchId: depBranch.id, operationalDate: new Date('2026-06-20'), receivedQuantity: 10, sentQuantity: 10, status: 'APPROVED', createdBy: user.id },
    });
    await prisma.productTransfer.create({
      data: { productId: balanceProduct.id, sourceBranchId: sourceBranch.id, dependentBranchId: depBranch.id, operationalDate: new Date('2026-06-20'), receivedQuantity: 5, sentQuantity: 5, status: 'PENDING', createdBy: user.id },
    });
    // Mismatch: sent 15 but received 12
    await prisma.productTransfer.create({
      data: { productId: balanceProduct.id, sourceBranchId: sourceBranch.id, dependentBranchId: depBranch.id, operationalDate: new Date('2026-06-21'), receivedQuantity: 12, sentQuantity: 15, status: 'APPROVED', createdBy: user.id },
    });
  });

  test('detects system balance and per-record mismatches', async () => {
    const { checkTransferBalance } = require('../../src/services/integrityService');
    const result = await checkTransferBalance();
    // Total sent = 10 + 5 + 15 = 30, total received = 10 + 5 + 12 = 27
    expect(result.systemBalance.ok).toBe(false);
    expect(result.systemBalance.sent).toBe(30);
    expect(result.systemBalance.received).toBe(27);
    // One record should be newly disputed
    expect(result.perRecord.disputes).toBe(1);
    expect(result.perRecord.ok).toBe(false);
    // Verify the mismatched transfer is now marked disputed
    const disputed = await prisma.productTransfer.findMany({ where: { isDisputed: true } });
    expect(disputed.length).toBeGreaterThanOrEqual(1);
  });
});

describe('Snapshot consistency invariant', () => {
  test('sellableStock formula holds for transfer-adjusted items', async () => {
    // Verify that the already-computed flow formula is correct
    const flows = await getInventoryFlowForAllProducts(sourceBranch.id, TEST_DATE);
    for (const f of flows) {
      const base = f.openingStock + f.dayProduction + f.nightProduction;
      const transferAdj = f.receivedTransfer - f.sentTransfer;
      expect(f.sellableStock).toBe(base + transferAdj);
    }
  });
});

describe('Dependent/source correctness', () => {
  test('DEPENDENT has zero production, stock comes only from transfers', async () => {
    const flows = await getInventoryFlowForAllProducts(depBranch.id, TEST_DATE);
    const f = flows.find(f => f.product.id === product.id);
    expect(f).toBeDefined();
    // opening = 0, production = 0, received = 30, sent = 0
    expect(f.openingStock).toBe(0);
    expect(f.dayProduction).toBe(0);
    expect(f.nightProduction).toBe(0);
    expect(f.receivedTransfer).toBe(30);
    expect(f.sellableStock).toBe(30);
  });

  test('SOURCE production is reduced by sentTransfer', async () => {
    const flows = await getInventoryFlowForAllProducts(sourceBranch.id, TEST_DATE);
    const f = flows.find(f => f.product.id === product.id);
    expect(f).toBeDefined();
    // opening = 0, production = 100, sent = 30, sellable = 70
    expect(f.dayProduction).toBe(100);
    expect(f.sentTransfer).toBe(30);
    expect(f.sellableStock).toBe(70);
  });

  test('INDEPENDENT branch has no transfer fields', async () => {
    const flows = await getInventoryFlowForAllProducts(independentBranch.id, TEST_DATE);
    const f = flows.find(f => f.product.id === product.id);
    expect(f).toBeDefined();
    expect(f.receivedTransfer).toBe(0);
    expect(f.sentTransfer).toBe(0);
    expect(f.sellableStock).toBe(50); // 50 production only
  });
});

} // end if (transferTableExists)
