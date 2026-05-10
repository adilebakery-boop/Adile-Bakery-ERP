const ROLES = {
  MANAGER: 'MANAGER',
  STAFF: 'STAFF',
  CAKE_CHEF: 'CAKE_CHEF',
  FETIR_CHEF: 'FETIR_CHEF',
  CASHIER: 'CASHIER'
};

const ROLE_LIST = Object.values(ROLES);

const isValidRole = (role) => ROLE_LIST.includes(role);

module.exports = {
  ROLES,
  ROLE_LIST,
  isValidRole
};