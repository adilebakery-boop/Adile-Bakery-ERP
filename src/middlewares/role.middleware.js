const ROLES = {
  ADMIN: ['ADMIN', 'MANAGER', 'BAKER', 'CASHIER'],
  MANAGER: ['ADMIN', 'MANAGER', 'BAKER', 'CASHIER'],
  BAKER: ['BAKER'],
  CASHIER: ['CASHIER'],
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