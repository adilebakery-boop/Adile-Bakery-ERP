const CATEGORIES = {
  BREAD_AND_SWEET_BREADS: 'BREAD_AND_SWEET_BREADS',
  CREAM_CAKES: 'CREAM_CAKES',
  SOFT_CAKES: 'SOFT_CAKES',
  DRY_CAKES: 'DRY_CAKES',
  COOKIES: 'COOKIES',
  FETIRE_AND_SNACKS: 'FETIRE_AND_SNACKS',
  DRINKS_AND_RETAIL_ITEMS: 'DRINKS_AND_RETAIL_ITEMS',
};

const ROLE_CATEGORIES = {
  ADMIN: Object.values(CATEGORIES),
  MANAGER: Object.values(CATEGORIES),
  BAKER: [CATEGORIES.BREAD_AND_SWEET_BREADS],
  CAKE_CHEF: [CATEGORIES.CREAM_CAKES, CATEGORIES.SOFT_CAKES, CATEGORIES.DRY_CAKES],
  COOKIE_BAKER: [CATEGORIES.COOKIES],
  FETIR_CHEF: [CATEGORIES.FETIRE_AND_SNACKS],
  CASHIER: [CATEGORIES.DRINKS_AND_RETAIL_ITEMS],
};

const ADMIN_MANAGER_ROLES = ['ADMIN', 'MANAGER'];

function isAdminOrManager(role) {
  return ADMIN_MANAGER_ROLES.includes(role);
}

function getAllowedCategories(role) {
  return ROLE_CATEGORIES[role] || [];
}

function buildProductionAccessFilter(user) {
  const where = {};

  if (!isAdminOrManager(user.role)) {
    if (user.userId) {
      where.createdBy = parseInt(user.userId);
    }
  }

  return where;
}

function buildRemainingAccessFilter(user) {
  const where = {};

  if (!isAdminOrManager(user.role)) {
    const categories = getAllowedCategories(user.role);
    if (categories.length > 0) {
      where.product = { category: { in: categories } };
    }
  }

  return where;
}

function buildWasteAccessFilter(user) {
  const where = {};

  if (!isAdminOrManager(user.role)) {
    if (user.userId) {
      where.createdBy = parseInt(user.userId);
    }
    const categories = getAllowedCategories(user.role);
    if (categories.length > 0) {
      where.product = { category: { in: categories } };
    }
  }

  return where;
}

function canCreateForCategory(user, category) {
  if (isAdminOrManager(user.role)) return true;
  const allowed = getAllowedCategories(user.role);
  return allowed.includes(category);
}

module.exports = {
  CATEGORIES,
  ROLE_CATEGORIES,
  ADMIN_MANAGER_ROLES,
  isAdminOrManager,
  getAllowedCategories,
  buildProductionAccessFilter,
  buildRemainingAccessFilter,
  buildWasteAccessFilter,
  canCreateForCategory,
};