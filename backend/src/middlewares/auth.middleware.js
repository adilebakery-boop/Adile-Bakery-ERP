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
      select: {
        id: true,
        employeeId: true,
        roleId: true,
        role: true,
        branchId: true,
        isBlocked: true,
        isActive: true,
        username: true,
        employee: {
          select: { id: true, name: true, status: true },
        },
      },
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

    if (dbUser.employee && dbUser.employee.status !== 'ACTIVE') {
      return res.status(403).json({
        success: false,
        message: 'Your employee record is no longer active. Contact your manager.',
        errors: []
      });
    }

    req.user = {
      userId: dbUser.id,
      employeeId: dbUser.employeeId || dbUser.employee?.id || dbUser.id,
      name: dbUser.employee?.name || dbUser.username,
      role: dbUser.role.name,
      roleId: dbUser.roleId,
      branchId: dbUser.branchId,
      isBlocked: dbUser.isBlocked,
      isActive: dbUser.isActive,
    };

    next();
  } catch (error) {
    next(error);
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
        select: {
          id: true,
          employeeId: true,
          roleId: true,
          role: true,
          branchId: true,
          isBlocked: true,
          isActive: true,
          username: true,
          employee: {
            select: { id: true, name: true, status: true },
          },
        },
      });

      if (
        dbUser &&
        !dbUser.isBlocked &&
        dbUser.isActive &&
        (!dbUser.employee || dbUser.employee.status === 'ACTIVE')
      ) {
        req.user = {
          userId: dbUser.id,
          employeeId: dbUser.employeeId || dbUser.employee?.id || dbUser.id,
          name: dbUser.employee?.name || dbUser.username,
          role: dbUser.role.name,
          roleId: dbUser.roleId,
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
