const prisma = require('../config/prisma');

function safeClone(value) {
  if (value === null || value === undefined) return null;
  try {
    return structuredClone(value);
  } catch {
    return JSON.parse(JSON.stringify(value));
  }
}

async function logAudit(entityType, entityId, action, oldValue, newValue, userId) {
  return prisma.auditLog.create({
    data: {
      entityType,
      entityId: parseInt(entityId),
      action,
      oldValue: safeClone(oldValue),
      newValue: safeClone(newValue),
      userId: parseInt(userId),
    },
  });
}

async function getAuditLogs(entityType, entityId, limit = 50) {
  return prisma.auditLog.findMany({
    where: { entityType, entityId: parseInt(entityId) },
    orderBy: { createdAt: 'desc' },
    take: parseInt(limit),
    include: { user: { select: { name: true, username: true } } },
  });
}

async function getAuditLogsByUser(userId, limit = 50) {
  return prisma.auditLog.findMany({
    where: { userId: parseInt(userId) },
    orderBy: { createdAt: 'desc' },
    take: parseInt(limit),
  });
}

module.exports = {
  logAudit,
  getAuditLogs,
  getAuditLogsByUser,
};