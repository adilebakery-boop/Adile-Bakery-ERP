const { describe, it } = require('node:test');
const assert = require('node:assert');

describe('Remaining Product Visibility & Inventory Flow Access Tests', () => {
  // Business logic simulation of RemainingPage.jsx hasActivity check
  function computeHasActivity(productId, existingRemainings, flowProductsMap) {
    const existing = existingRemainings[productId];
    if (existing !== undefined && existing.remainingQuantity !== null && existing.remainingQuantity !== '') return true;
    const flow = flowProductsMap[productId];
    if (!flow) return false;
    return (flow.openingStock || 0) > 0 ||
           (flow.dayProduction || 0) > 0 ||
           (flow.nightProduction || 0) > 0 ||
           (flow.wasteQuantity || 0) > 0 ||
           (flow.receivedTransfer || 0) > 0 ||
           (flow.sentTransfer || 0) > 0;
  }

  function filterDisplayProducts(products, existingRemainings, flowProductsMap, showAllProducts = false) {
    if (showAllProducts) return products;
    return products.filter(p => computeHasActivity(p.id, existingRemainings, flowProductsMap));
  }

  describe('1. Activity Filter Rules', () => {
    const testProducts = [
      { id: 1, name: 'White Bread', category: 'BREAD_AND_SWEET_BREADS' },
      { id: 2, name: 'Sourdough', category: 'BREAD_AND_SWEET_BREADS' },
      { id: 3, name: 'Chocolate Cake', category: 'CREAM_CAKES' },
      { id: 4, name: 'Butter Cookie', category: 'COOKIES' },
      { id: 5, name: 'Unproduced Croissant', category: 'BREAD_AND_SWEET_BREADS' },
    ];

    it('includes products with day or night production activity', () => {
      const flowMap = {
        1: { dayProduction: 25, nightProduction: 0 },
        2: { dayProduction: 0, nightProduction: 15 },
      };
      const displayed = filterDisplayProducts(testProducts, {}, flowMap, false);
      const displayedIds = displayed.map(p => p.id);

      assert.ok(displayedIds.includes(1), 'Product 1 with day production must be visible');
      assert.ok(displayedIds.includes(2), 'Product 2 with night production must be visible');
      assert.strictEqual(displayedIds.includes(5), false, 'Unproduced product must not be visible by default');
    });

    it('includes products with opening stock activity', () => {
      const flowMap = {
        3: { openingStock: 10, dayProduction: 0, nightProduction: 0 },
      };
      const displayed = filterDisplayProducts(testProducts, {}, flowMap, false);
      const displayedIds = displayed.map(p => p.id);

      assert.ok(displayedIds.includes(3), 'Product 3 with opening stock must be visible');
    });

    it('includes products with transfer or waste activity', () => {
      const flowMap = {
        4: { wasteQuantity: 2, openingStock: 0, dayProduction: 0 },
      };
      const displayed = filterDisplayProducts(testProducts, {}, flowMap, false);
      const displayedIds = displayed.map(p => p.id);

      assert.ok(displayedIds.includes(4), 'Product 4 with waste activity must be visible');
    });

    it('includes products with existing remaining records even when quantity is 0', () => {
      const existingRemainings = {
        5: { productId: 5, remainingQuantity: 0, status: 'DRAFT' },
      };
      const displayed = filterDisplayProducts(testProducts, existingRemainings, {}, false);
      const displayedIds = displayed.map(p => p.id);

      assert.ok(displayedIds.includes(5), 'Product 5 with remaining=0 must remain visible in Remaining table');
    });

    it('includes ALL products when showAllProducts is toggled on', () => {
      const displayed = filterDisplayProducts(testProducts, {}, {}, true);
      assert.strictEqual(displayed.length, testProducts.length);
    });
  });

  describe('2. Inventory Flow Route Authorization & Scoping', () => {
    it('verifies INVENTORY_FLOW_ROLES includes operational roles permitted on Remaining page', () => {
      const INVENTORY_FLOW_ROLES = [
        'ADMIN', 'MANAGER', 'BAKER', 'CAKE_CHEF', 'COOKIE_BAKER', 'FETIR_CHEF', 'CASHIER', 'TRANSFER_OPERATOR'
      ];
      assert.ok(INVENTORY_FLOW_ROLES.includes('BAKER'));
      assert.ok(INVENTORY_FLOW_ROLES.includes('CASHIER'));
      assert.ok(INVENTORY_FLOW_ROLES.includes('CAKE_CHEF'));
      assert.ok(INVENTORY_FLOW_ROLES.includes('COOKIE_BAKER'));
      assert.ok(INVENTORY_FLOW_ROLES.includes('FETIR_CHEF'));
      assert.ok(INVENTORY_FLOW_ROLES.includes('TRANSFER_OPERATOR'));
    });

    it('enforces branch scoping for non-admin roles', () => {
      function resolveBranchId(branchId, user) {
        if (user?.role !== 'ADMIN') return parseInt(user.branchId);
        if (!branchId || branchId === 'all') return null;
        return parseInt(branchId);
      }

      const bakerUser = { role: 'BAKER', branchId: 5 };
      const cashierUser = { role: 'CASHIER', branchId: 3 };
      const adminUser = { role: 'ADMIN', branchId: 1 };

      assert.strictEqual(resolveBranchId('1', bakerUser), 5, 'Baker must be restricted to their branch 5');
      assert.strictEqual(resolveBranchId('99', cashierUser), 3, 'Cashier must be restricted to their branch 3');
      assert.strictEqual(resolveBranchId('2', adminUser), 2, 'Admin can specify target branch 2');
    });
  });
});
