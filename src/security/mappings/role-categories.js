const { ROLES } = require('../constants/roles');
const { CATEGORIES } = require('../constants/categories');

const ROLE_CATEGORIES = {
  [ROLES.ADMIN]: [
    CATEGORIES.BREAD_AND_SWEET_BREADS,
    CATEGORIES.CREAM_CAKES,
    CATEGORIES.SOFT_CAKES,
    CATEGORIES.DRY_CAKES,
    CATEGORIES.DRINKS_AND_RETAIL_ITEMS,
    CATEGORIES.FETIRE_AND_SNACKS,
    CATEGORIES.COOKIES
  ],
  [ROLES.MANAGER]: [
    CATEGORIES.BREAD_AND_SWEET_BREADS,
    CATEGORIES.CREAM_CAKES,
    CATEGORIES.SOFT_CAKES,
    CATEGORIES.DRY_CAKES,
    CATEGORIES.DRINKS_AND_RETAIL_ITEMS,
    CATEGORIES.FETIRE_AND_SNACKS,
    CATEGORIES.COOKIES
  ],
  [ROLES.BAKER]: [
    CATEGORIES.BREAD_AND_SWEET_BREADS
  ],
  [ROLES.CAKE_CHEF]: [
    CATEGORIES.CREAM_CAKES,
    CATEGORIES.SOFT_CAKES,
    CATEGORIES.DRY_CAKES
  ],
  [ROLES.COOKIE_BAKER]: [
    CATEGORIES.COOKIES
  ],
  [ROLES.FETIR_CHEF]: [
    CATEGORIES.FETIRE_AND_SNACKS
  ],
  [ROLES.CASHIER]: [
    CATEGORIES.DRINKS_AND_RETAIL_ITEMS
  ]
};

const getCategoriesForRole = (role) => {
  return ROLE_CATEGORIES[role] || [];
};

const hasRoleAccessToCategory = (role, category) => {
  const categories = ROLE_CATEGORIES[role] || [];
  return categories.includes(category);
};

const canAccessAnyCategory = (role, categories) => {
  const allowedCategories = ROLE_CATEGORIES[role] || [];
  return categories.some(category => allowedCategories.includes(category));
};

module.exports = {
  ROLE_CATEGORIES,
  getCategoriesForRole,
  hasRoleAccessToCategory,
  canAccessAnyCategory
};