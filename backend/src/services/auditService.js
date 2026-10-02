const prisma = require('../config/prisma');

function safeClone(value) {
  if (value === null || value === undefined) return null;
  try {
    return structuredClone(value);
  } catch {
    return JSON.parse(JSON.stringify(value));
  }
}

async function logAudit(entityType, entityId, action, oldValue, newValue, actor) {
  let employeeId = null;
  let actorName = 'System';

  if (typeof actor === 'object' && actor !== null) {
    if (actor.employeeId) {
      employeeId = parseInt(actor.employeeId);
    } else if (actor.userId) {
      employeeId = parseInt(actor.userId);
    }
    actorName = actor.name || actor.actorName || (employeeId ? `Employee #${employeeId}` : 'System');
  } else if (typeof actor === 'number' || (typeof actor === 'string' && !isNaN(actor) && String(actor).trim() !== '')) {
    const parsedId = parseInt(actor);
    if (parsedId > 0) {
      employeeId = parsedId;
      actorName = `Employee #${employeeId}`;
    } else {
      actorName = 'System';
    }
  } else if (typeof actor === 'string' && actor) {
    actorName = actor;
  }

  return prisma.auditLog.create({
    data: {
      entityType,
      entityId: parseInt(entityId),
      action,
      oldValue: safeClone(oldValue),
      newValue: safeClone(newValue),
      employeeId,
      actorName,
    },
  });
}

async function getAuditLogs(entityType, entityId, limit = 50) {
  return prisma.auditLog.findMany({
    where: { entityType, entityId: parseInt(entityId) },
    orderBy: { createdAt: 'desc' },
    take: parseInt(limit),
    include: { employee: { select: { id: true, name: true, employeeCode: true } } },
  });
}

async function getAuditLogsByUser(employeeId, limit = 50) {
  return prisma.auditLog.findMany({
    where: { employeeId: parseInt(employeeId) },
    orderBy: { createdAt: 'desc' },
    take: parseInt(limit),
  });
}

module.exports = {
  logAudit,
  getAuditLogs,
  getAuditLogsByUser,
};