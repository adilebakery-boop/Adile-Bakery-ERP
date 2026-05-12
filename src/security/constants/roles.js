const ROLES = {
  ADMIN: 'ADMIN',
  MANAGER: 'MANAGER',
  BAKER: 'BAKER',
  CAKE_CHEF: 'CAKE_CHEF',
  COOKIE_BAKER: 'COOKIE_BAKER',
  FETIR_CHEF: 'FETIR_CHEF',
  CASHIER: 'CASHIER'
};

const ROLE_LIST = Object.values(ROLES);

const isValidRole = (role) => ROLE_LIST.includes(role);

const isManagerOrAdmin = (role) => role === ROLES.MANAGER || role === ROLES.ADMIN;

module.exports = {
  ROLES,
  ROLE_LIST,
  isValidRole,
  isManagerOrAdmin
};