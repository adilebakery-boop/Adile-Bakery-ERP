const { verifyToken } = require('../utils/jwt');
const prisma = require('../config/prisma');

const authenticate = async (req, res, next) => {
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

    const dbUser = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, role: true, branchId: true, isBlocked: true, isActive: true },
    });

    if (!dbUser) {
      return res.status(401).json({
        success: false,
        message: 'User no longer exists',
        errors: []
      });
    }

    if (!dbUser.role || !dbUser.role.name) {
      throw Object.assign(new Error('User role configuration is invalid'), { status: 500 });
    }

    if (dbUser.isBlocked) {
      return res.status(403).json({
        success: false,
        message: 'Your account has been blocked. Contact your manager.',
        errors: []
      });
    }

    if (!dbUser.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Your account has been deactivated. Contact your manager.',
        errors: []
      });
    }

    req.user = {
      userId: dbUser.id,
      role: dbUser.role.name,
      branchId: dbUser.branchId,
      isBlocked: dbUser.isBlocked,
      isActive: dbUser.isActive,
    };

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
    if (error.status) {
      return res.status(error.status).json({
        success: false,
        message: error.message,
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

const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      req.user = null;
      return next();
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);

    if (decoded) {
      const dbUser = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: { id: true, role: true, branchId: true, isBlocked: true, isActive: true },
      });

      if (dbUser && !dbUser.isBlocked && dbUser.isActive) {
        req.user = {
          userId: dbUser.id,
          role: dbUser.role.name,
          branchId: dbUser.branchId,
          isBlocked: dbUser.isBlocked,
          isActive: dbUser.isActive,
        };
      } else {
        req.user = null;
      }
    } else {
      req.user = null;
    }

    next();
  } catch (error) {
    req.user = null;
    next();
  }
};

module.exports = { authenticate, optionalAuth };
