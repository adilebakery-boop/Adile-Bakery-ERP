const prisma = require('../../config/prisma');
const bcrypt = require('bcrypt');
const { generateToken } = require('../../utils/jwt');

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

  if (user.branchId && user.branch && !user.branch.isActive) {
    throw new Error('Your branch is currently inactive. Contact your manager.');
  }

  const token = generateToken({
    userId: user.id,
    role: user.role.name,
    branchId: user.branchId,
    isBlocked: user.isBlocked || false,
  });

  return {
    token,
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

module.exports = {
  login,
  hashPassword,
  changePassword,
};