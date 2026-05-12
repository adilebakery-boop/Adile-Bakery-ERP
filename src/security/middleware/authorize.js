const { ROLES } = require('../constants/roles');
const { forbiddenResponse } = require('../errors/responses');

const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const userRole = req.user.role;
    const allowed = allowedRoles.includes(userRole);

    if (!allowed) {
      return res.status(403).json(forbiddenResponse('Access denied. Insufficient role privileges.'));
    }

    next();
  };
};

const authorizeAny = (roles) => {
  return authorize(...roles);
};

const isManager = () => authorize(ROLES.MANAGER);

const isAdmin = () => authorize(ROLES.ADMIN);

const isManagerOrAdmin = () => authorize(ROLES.MANAGER, ROLES.ADMIN);

const isBaker = () => authorize(ROLES.BAKER);

const isCakeChef = () => authorize(ROLES.CAKE_CHEF);

const isCookieBaker = () => authorize(ROLES.COOKIE_BAKER);

const isFetirChef = () => authorize(ROLES.FETIR_CHEF);

const isCashier = () => authorize(ROLES.CASHIER);

module.exports = {
  authorize,
  authorizeAny,
  isManager,
  isAdmin,
  isManagerOrAdmin,
  isBaker,
  isCakeChef,
  isCookieBaker,
  isFetirChef,
  isCashier
};