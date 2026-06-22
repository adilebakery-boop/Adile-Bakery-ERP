const ROLES = {
  ADMIN: ['ADMIN'],
  MANAGER: ['MANAGER'],
  BAKER: ['BAKER'],
  COOKIE_BAKER: ['COOKIE_BAKER'],
  CAKE_CHEF: ['CAKE_CHEF'],
  FETIR_CHEF: ['FETIR_CHEF'],
  CASHIER: ['CASHIER'],
  TRANSFER_OPERATOR: ['TRANSFER_OPERATOR'],
};

const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const userRole = req.user.role;
    const allowed = allowedRoles.includes(userRole);

    if (!allowed) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions',
      });
    }

    next();
  };
};

const allowRoles = (...roles) => authorize(...roles);

module.exports = { authorize, allowRoles, ROLES };