const { verifyToken } = require('../utils/jwt');

const authenticate = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No token provided',
        errors: []
      });
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);

    if (!decoded) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token',
        errors: []
      });
    }

    req.user = {
      userId: decoded.userId,
      role: decoded.role,
      branchId: decoded.branchId,
      isBlocked: decoded.isBlocked || false
    };

    if (req.user.isBlocked) {
      return res.status(403).json({
        success: false,
        message: 'Account is blocked. Contact administrator.',
        errors: []
      });
    }

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token has expired',
        errors: []
      });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token',
        errors: []
      });
    }
    return res.status(401).json({
      success: false,
      message: 'Authentication failed',
      errors: []
    });
  }
};

module.exports = { authenticate };