const { verifyToken } = require('../../utils/jwt');
const { unauthorizedResponse, forbiddenResponse } = require('../errors/responses');

const authenticate = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json(unauthorizedResponse('No token provided'));
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);

    if (!decoded) {
      return res.status(401).json(unauthorizedResponse('Invalid token'));
    }

    req.user = {
      userId: decoded.userId,
      role: decoded.role,
      branchId: decoded.branchId,
      isBlocked: decoded.isBlocked || false
    };

    if (req.user.isBlocked) {
      return res.status(403).json(forbiddenResponse('Account is blocked. Contact administrator.'));
    }

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json(unauthorizedResponse('Token has expired'));
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json(unauthorizedResponse('Invalid token'));
    }
    return res.status(401).json(unauthorizedResponse('Authentication failed'));
  }
};

const optionalAuth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      req.user = null;
      return next();
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);

    if (decoded && !decoded.isBlocked) {
      req.user = {
        userId: decoded.userId,
        role: decoded.role,
        branchId: decoded.branchId,
        isBlocked: decoded.isBlocked || false
      };
    } else {
      req.user = null;
    }

    next();
  } catch (error) {
    req.user = null;
    next();
  }
};

module.exports = {
  authenticate,
  optionalAuth
};