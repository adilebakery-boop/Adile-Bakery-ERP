const ROLES = require('./constants/roles');
const CATEGORIES = require('./constants/categories');
const PERMISSIONS = require('./constants/permissions');

const ROLE_PERMISSIONS = require('./mappings/role-permissions');
const ROLE_PAGE_ACCESS = require('./mappings/role-pages');
const ROLE_CATEGORIES = require('./mappings/role-categories');

const authenticate = require('./middleware/authenticate');
const authorize = require('./middleware/authorize');
const requirePermission = require('./middleware/requirePermission');
const requirePage = require('./middleware/requirePage');
const requireCategory = require('./middleware/requireCategory');

const {
  unauthorizedResponse,
  forbiddenResponse,
  invalidCredentialsResponse,
  accountBlockedResponse,
  tokenExpiredResponse,
  invalidTokenResponse,
  noTokenResponse
} = require('./errors/responses');

const permissionCheck = require('./utils/permission-check');

module.exports = {
  ROLES,
  CATEGORIES,
  PERMISSIONS,
  ROLE_PERMISSIONS,
  ROLE_PAGE_ACCESS,
  ROLE_CATEGORIES,
  authenticate,
  authorize,
  requirePermission,
  requirePage,
  requireCategory,
  unauthorizedResponse,
  forbiddenResponse,
  invalidCredentialsResponse,
  accountBlockedResponse,
  tokenExpiredResponse,
  invalidTokenResponse,
  noTokenResponse,
  ...permissionCheck
};