const crypto = require("crypto");
const prisma = require("../config/prisma");

const REFRESH_TOKEN_BYTES = 40;
const REFRESH_TOKEN_EXPIRES_DAYS = 7;

function generateToken() {
  return crypto.randomBytes(REFRESH_TOKEN_BYTES).toString("hex");
}

async function create(userId) {
  const token = generateToken();
  const expiresAt = new Date(
    Date.now() + REFRESH_TOKEN_EXPIRES_DAYS * 24 * 60 * 60 * 1000,
  );

  await prisma.refreshToken.create({
    data: { token, userId, expiresAt },
  });

  return { token, expiresAt };
}

async function rotate(oldToken, userId) {
  await prisma.refreshToken.updateMany({
    where: { token: oldToken, userId },
    data: { revoked: true },
  });

  return create(userId);
}

async function verify(token) {
  const record = await prisma.refreshToken.findUnique({
    where: { token },
    include: { user: { include: { role: true, branch: true } } },
  });

  if (!record) return null;
  if (record.revoked) return null;
  if (record.expiresAt < new Date()) return null;
  if (!record.user.isActive || record.user.isBlocked) return null;

  return record.user;
}

async function revokeAll(userId) {
  await prisma.refreshToken.updateMany({
    where: { userId, revoked: false },
    data: { revoked: true },
  });
}

module.exports = { create, rotate, verify, revokeAll };
