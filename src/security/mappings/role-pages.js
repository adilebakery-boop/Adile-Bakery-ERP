const { ROLES } = require('../constants/roles');

const PAGES = {
  DASHBOARD: 'dashboard',
  PRODUCTION: 'production',
  REMAINING: 'remaining',
  REPORTS: 'reports',
  PRODUCTS: 'products',
  BRANCHES: 'branches',
  USERS: 'users',
  PROFILE: 'profile'
};

const MANAGER_PAGES = [
  PAGES.DASHBOARD,
  PAGES.PRODUCTION,
  PAGES.REMAINING,
  PAGES.REPORTS,
  PAGES.PRODUCTS,
  PAGES.BRANCHES,
  PAGES.USERS,
  PAGES.PROFILE
];

const STAFF_PAGES = [
  PAGES.DASHBOARD,
  PAGES.PRODUCTION,
  PAGES.REMAINING,
  PAGES.PROFILE
];

const ROLE_PAGE_ACCESS = {
  [ROLES.ADMIN]: MANAGER_PAGES,
  [ROLES.MANAGER]: MANAGER_PAGES,
  [ROLES.BAKER]: STAFF_PAGES,
  [ROLES.CAKE_CHEF]: STAFF_PAGES,
  [ROLES.COOKIE_BAKER]: STAFF_PAGES,
  [ROLES.FETIR_CHEF]: STAFF_PAGES,
  [ROLES.CASHIER]: STAFF_PAGES
};

const getPagesForRole = (role) => {
  return ROLE_PAGE_ACCESS[role] || [];
};

const hasRoleAccessToPage = (role, page) => {
  const pages = ROLE_PAGE_ACCESS[role] || [];
  return pages.includes(page);
};

const canAccessAnyPage = (role, pages) => {
  const allowedPages = ROLE_PAGE_ACCESS[role] || [];
  return pages.some(page => allowedPages.includes(page));
};

module.exports = {
  PAGES,
  ROLE_PAGE_ACCESS,
  getPagesForRole,
  hasRoleAccessToPage,
  canAccessAnyPage
};