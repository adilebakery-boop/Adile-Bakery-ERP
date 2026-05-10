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

const isStaff = () => authorize(ROLES.STAFF);

const isCakeChef = () => authorize(ROLES.CAKE_CHEF);

const isFetirChef = () => authorize(ROLES.FETIR_CHEF);

const isCashier = () => authorize(ROLES.CASHIER);

const isManagerOrAdmin = () => authorize(ROLES.MANAGER);

module.exports = {
  authorize,
  authorizeAny,
  isManager,
  isStaff,
  isCakeChef,
  isFetirChef,
  isCashier,
  isManagerOrAdmin
};