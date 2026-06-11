const crypto = require("crypto");
const prisma = require("../config/prisma");

const REFRESH_TOKEN_BYTES = 40;
const REFRESH_TOKEN_EXPIRES_DAYS = 7;

const HMAC_KEY = process.env.REFRESH_TOKEN_SECRET;
if (!HMAC_KEY) {
  throw new Error("REFRESH_TOKEN_SECRET environment variable is required");
}

function hashToken(token) {
  return crypto.createHmac("sha256", HMAC_KEY).update(token).digest("hex");
}

function generateToken() {
  return crypto.randomBytes(REFRESH_TOKEN_BYTES).toString("hex");
}

function buildToken() {
  const raw = generateToken();
  const tokenHash = hashToken(raw);
  const expiresAt = new Date(
    Date.now() + REFRESH_TOKEN_EXPIRES_DAYS * 24 * 60 * 60 * 1000,
  );
  return { raw, tokenHash, expiresAt };
}

async function replaceToken(userId) {
  const { raw, tokenHash, expiresAt } = buildToken();
  const now = new Date();

  const result = await prisma.refreshToken.create({
    data: { userId, tokenHash, expiresAt, lastUsedAt: now },
  });

  if (!result) {
    throw new Error("Refresh token create failed unexpectedly");
  }

  console.log(
    "[AUTH] REFRESH_TOKEN_REPLACED",
    JSON.stringify({
      userId,
      timestamp: new Date().toISOString(),
    }),
  );

  return { token: raw, expiresAt };
}

async function create(userId) {
  return replaceToken(userId);
}

async function rotate(oldRawToken, userId) {
  const oldHash = hashToken(oldRawToken);

  const existing = await prisma.refreshToken.findUnique({
    where: { tokenHash: oldHash },
  });
  if (!existing) {
    throw new Error("Refresh token not found");
  }
  if (existing.userId !== userId) {
    throw new Error("Refresh token does not belong to this user");
  }

  await prisma.refreshToken.delete({
    where: { id: existing.id },
  });

  return replaceToken(userId);
}

async function verify(rawToken) {
  const tokenHash = hashToken(rawToken);

  const record = await prisma.refreshToken.findUnique({
    where: { tokenHash },
    include: { user: { include: { role: true, branch: true } } },
  });

  if (!record) return null;
  if (record.expiresAt < new Date()) return null;
  if (!record.user.isActive || record.user.isBlocked) return null;

  try {
    await prisma.refreshToken.update({
      where: { tokenHash },
      data: { lastUsedAt: new Date() },
    });
  } catch (err) {
    console.warn('[AUTH] Failed to update refresh token lastUsedAt', err);
  }

  return record.user;
}

async function revokeAll(userId) {
  await prisma.refreshToken.deleteMany({ where: { userId } });
}

module.exports = { create, rotate, verify, revokeAll };
