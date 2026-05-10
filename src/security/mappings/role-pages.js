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

const ROLE_PAGE_ACCESS = {
  [ROLES.MANAGER]: [
    PAGES.DASHBOARD,
    PAGES.PRODUCTION,
    PAGES.REMAINING,
    PAGES.REPORTS,
    PAGES.PRODUCTS,
    PAGES.BRANCHES,
    PAGES.USERS,
    PAGES.PROFILE
  ],

  [ROLES.STAFF]: [
    PAGES.DASHBOARD,
    PAGES.PRODUCTION,
    PAGES.REMAINING,
    PAGES.PROFILE
  ],

  [ROLES.CAKE_CHEF]: [
    PAGES.DASHBOARD,
    PAGES.PRODUCTION,
    PAGES.REMAINING,
    PAGES.PROFILE
  ],

  [ROLES.FETIR_CHEF]: [
    PAGES.DASHBOARD,
    PAGES.PRODUCTION,
    PAGES.REMAINING,
    PAGES.PROFILE
  ],

  [ROLES.CASHIER]: [
    PAGES.DASHBOARD,
    PAGES.PRODUCTION,
    PAGES.REMAINING,
    PAGES.PROFILE
  ]
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