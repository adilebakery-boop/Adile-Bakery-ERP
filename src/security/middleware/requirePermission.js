const { getPermissionsForRole } = require('../mappings/role-permissions');
const { forbiddenResponse } = require('../errors/responses');

const requirePermission = (permission) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const userPermissions = getPermissionsForRole(req.user.role);

    if (!userPermissions.includes(permission)) {
      return res.status(403).json(
        forbiddenResponse(`Permission denied. Required: ${permission}`)
      );
    }

    next();
  };
};

const requirePermissions = (...permissions) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const userPermissions = getPermissionsForRole(req.user.role);
    const hasAllPermissions = permissions.every(p => userPermissions.includes(p));

    if (!hasAllPermissions) {
      return res.status(403).json(
        forbiddenResponse('Permission denied. Required all permissions.')
      );
    }

    next();
  };
};

const requireAnyPermission = (...permissions) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const userPermissions = getPermissionsForRole(req.user.role);
    const hasAnyPermission = permissions.some(p => userPermissions.includes(p));

    if (!hasAnyPermission) {
      return res.status(403).json(
        forbiddenResponse('Permission denied. Required one of the permissions.')
      );
    }

    next();
  };
};

module.exports = {
  requirePermission,
  requirePermissions,
  requireAnyPermission
};