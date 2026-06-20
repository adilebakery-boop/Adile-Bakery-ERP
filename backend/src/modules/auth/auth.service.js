const prisma = require('../../config/prisma');
const bcrypt = require('bcrypt');
const { generateToken } = require('../../utils/jwt');
const refreshTokenUtil = require('../../utils/refreshToken');
const AppError = require('../../utils/AppError');

const SALT_ROUNDS = 10;

const login = async (username, password) => {
  const user = await prisma.user.findUnique({
    where: { username },
    include: {
      role: true,
      branch: true,
    },
  });

  if (!user) {
    throw new AppError('Invalid credentials', 401, 'AUTH_TOKEN');
  }

  const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

  if (!isPasswordValid) {
    throw new AppError('Invalid credentials', 401, 'AUTH_TOKEN');
  }

  if (user.isBlocked) {
    throw new AppError('Your account has been blocked. Contact your manager.', 403, 'AUTH_ROLE');
  }

  if (!user.isActive) {
    throw new AppError('Your account has been deactivated. Contact your manager.', 403, 'AUTH_ROLE');
  }

  if (user.branchId && user.branch && !user.branch.isActive) {
    throw new AppError('Your branch is currently inactive. Contact your manager.', 403, 'AUTH_ROLE');
  }

  const token = generateToken({
    userId: user.id,
    role: user.role.name,
    branchId: user.branchId,
    isBlocked: user.isBlocked || false,
    isActive: user.isActive,
  });

  const refreshToken = await refreshTokenUtil.create(user.id);

  return {
    token,
    refreshToken: refreshToken.token,
    user: {
      id: user.id,
      name: user.name,
      username: user.username,
      role: user.role.name,
      branchId: user.branchId,
      branchName: user.branch?.name || null,
      branchType: user.branch?.branchType || null,
    },
  };
};

const refreshAccessToken = async (refreshTokenValue) => {
  const user = await refreshTokenUtil.verify(refreshTokenValue);
  if (!user) {
throw new AppError('Invalid or expired refresh token', 401, 'AUTH_TOKEN');
  }

  const newRefresh = await refreshTokenUtil.rotate(refreshTokenValue, user.id);

  const token = generateToken({
    userId: user.id,
    role: user.role.name,
    branchId: user.branchId,
    isBlocked: user.isBlocked || false,
    isActive: user.isActive,
  });

  return {
    token,
    refreshToken: newRefresh.token,
    user: {
      id: user.id,
      name: user.name,
      username: user.username,
      role: user.role.name,
      branchId: user.branchId,
      branchName: user.branch?.name || null,
      branchType: user.branch?.branchType || null,
    },
  };
};

const hashPassword = async (password) => {
  return bcrypt.hash(password, SALT_ROUNDS);
};

const changePassword = async (userId, currentPassword, newPassword) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError('User not found', 404, 'AUTH_TOKEN');

  const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!isValid) throw new AppError('Current password is incorrect', 401, 'AUTH_TOKEN');

  const newHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: newHash },
  });
};

const resetPassword = async (targetUserId, newPassword) => {
  const user = await prisma.user.findUnique({ where: { id: targetUserId } });
  if (!user) throw new AppError('User not found', 404, 'AUTH_TOKEN');

  const newHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  await prisma.user.update({
    where: { id: targetUserId },
    data: { passwordHash: newHash },
  });
};

const logout = async (userId) => {
  await refreshTokenUtil.revokeAll(userId);
};

module.exports = {
  login,
  refreshAccessToken,
  logout,
  hashPassword,
  changePassword,
  resetPassword,
};