const { getPermissionsForRole } = require('../mappings/role-permissions');
const { getPagesForRole } = require('../mappings/role-pages');
const { getCategoriesForRole } = require('../mappings/role-categories');
const { ROLES } = require('../constants/roles');

const getUserPermissions = (role) => {
  return getPermissionsForRole(role);
};

const getUserPages = (role) => {
  return getPagesForRole(role);
};

const getUserCategories = (role) => {
  return getCategoriesForRole(role);
};

const isAuthorizedForAction = (userRole, requiredPermission) => {
  const permissions = getPermissionsForRole(userRole);
  return permissions.includes(requiredPermission);
};

const canAccessPage = (userRole, page) => {
  const pages = getPagesForRole(userRole);
  return pages.includes(page);
};

const canAccessCategory = (userRole, category) => {
  const categories = getCategoriesForRole(userRole);
  return categories.includes(category);
};

const isManager = (role) => role === ROLES.MANAGER;

const isSameUserOrManager = (requestingUserId, targetUserId, userRole) => {
  return requestingUserId === targetUserId || isManager(userRole);
};

module.exports = {
  getUserPermissions,
  getUserPages,
  getUserCategories,
  isAuthorizedForAction,
  canAccessPage,
  canAccessCategory,
  isManager,
  isSameUserOrManager
};