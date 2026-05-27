const prisma = require('../../config/prisma');
const bcrypt = require('bcrypt');
const { generateToken } = require('../../utils/jwt');
const refreshTokenUtil = require('../../utils/refreshToken');

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
    throw new Error('Invalid credentials');
  }

  const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

  if (!isPasswordValid) {
    throw new Error('Invalid credentials');
  }

  if (user.isBlocked) {
    throw new Error('Your account has been blocked. Contact your manager.');
  }

  if (!user.isActive) {
    throw new Error('Your account has been deactivated. Contact your manager.');
  }

  if (user.branchId && user.branch && !user.branch.isActive) {
    throw new Error('Your branch is currently inactive. Contact your manager.');
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
    },
  };
};

const refreshAccessToken = async (refreshTokenValue) => {
  const user = await refreshTokenUtil.verify(refreshTokenValue);
  if (!user) {
    throw new Error('Invalid or expired refresh token');
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
    },
  };
};

const hashPassword = async (password) => {
  return bcrypt.hash(password, SALT_ROUNDS);
};

const changePassword = async (userId, currentPassword, newPassword) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error('User not found');

  const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!isValid) throw new Error('Current password is incorrect');

  const newHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: newHash },
  });
};

const resetPassword = async (targetUserId, newPassword) => {
  const user = await prisma.user.findUnique({ where: { id: targetUserId } });
  if (!user) throw new Error('User not found');

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