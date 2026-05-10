const PERMISSIONS = {
  // User management
  USERS_CREATE: 'users:create',
  USERS_UPDATE: 'users:update',
  USERS_DELETE: 'users:delete',
  USERS_VIEW: 'users:view',
  USERS_BLOCK: 'users:block',

  // Profile management
  PROFILE_UPDATE: 'profile:update',
  PROFILE_PASSWORD_CHANGE: 'profile:password-change',

  // Product management
  PRODUCTS_CREATE: 'products:create',
  PRODUCTS_UPDATE: 'products:update',
  PRODUCTS_DELETE: 'products:delete',
  PRODUCTS_VIEW: 'products:view',
  PRODUCTS_MANAGE: 'products:manage',

  // Branch management
  BRANCHES_CREATE: 'branches:create',
  BRANCHES_UPDATE: 'branches:update',
  BRANCHES_DELETE: 'branches:delete',
  BRANCHES_VIEW: 'branches:view',
  BRANCHES_MANAGE: 'branches:manage',

  // Production
  PRODUCTION_CREATE: 'production:create',
  PRODUCTION_UPDATE: 'production:update',
  PRODUCTION_DELETE: 'production:delete',
  PRODUCTION_VIEW: 'production:view',

  // Remaining
  REMAINING_CREATE: 'remaining:create',
  REMAINING_UPDATE: 'remaining:update',
  REMAINING_DELETE: 'remaining:delete',
  REMAINING_VIEW: 'remaining:view',

  // Reports
  REPORTS_VIEW: 'reports:view',
  REPORTS_EXPORT: 'reports:export',

  // Dashboard
  DASHBOARD_VIEW: 'dashboard:view',

  // Category ownership
  CATEGORY_ACCESS: 'category:access'
};

const PERMISSION_LIST = Object.values(PERMISSIONS);

const hasPermission = (userPermissions, requiredPermission) => {
  return userPermissions.includes(requiredPermission);
};

const hasAnyPermission = (userPermissions, requiredPermissions) => {
  return requiredPermissions.some(permission => userPermissions.includes(permission));
};

const hasAllPermissions = (userPermissions, requiredPermissions) => {
  return requiredPermissions.every(permission => userPermissions.includes(permission));
};

module.exports = {
  PERMISSIONS,
  PERMISSION_LIST,
  hasPermission,
  hasAnyPermission,
  hasAllPermissions
};