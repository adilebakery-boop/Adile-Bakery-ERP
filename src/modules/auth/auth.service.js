const prisma = require('../../config/prisma');
const bcrypt = require('bcrypt');
const { generateToken } = require('../../utils/jwt');

const SALT_ROUNDS = 10;

const login = async (username, password) => {
  if (!username || !password) {
    const error = new Error('Username and password are required');
    error.code = 'VALIDATION';
    throw error;
  }

  const user = await prisma.user.findUnique({
    where: { username },
    include: {
      role: true,
      branch: true,
    },
  });

  if (!user) {
    const error = new Error('Invalid username or password');
    error.code = 'INVALID_CREDENTIALS';
    throw error;
  }

  const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

  if (!isPasswordValid) {
    const error = new Error('Invalid username or password');
    error.code = 'INVALID_CREDENTIALS';
    throw error;
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

module.exports = {
  login,
  hashPassword,
};