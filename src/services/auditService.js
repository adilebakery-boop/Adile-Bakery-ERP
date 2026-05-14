const prisma = require('../config/prisma');

async function logAudit(entityType, entityId, action, oldValue, newValue, userId) {
  try {
    const auditLog = await prisma.auditLog.create({
      data: {
        entityType,
        entityId: parseInt(entityId),
        action,
        oldValue: oldValue ? JSON.parse(JSON.stringify(oldValue)) : null,
        newValue: newValue ? JSON.parse(JSON.stringify(newValue)) : null,
        userId: parseInt(userId),
      },
    });
    return auditLog;
  } catch (error) {
    console.error('[AUDIT_SERVICE] Failed to log audit:', error);
    return null;
  }
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