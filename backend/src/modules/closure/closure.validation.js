const z = require('zod');

const closeDaySchema = z.object({
  branchId: z.coerce.number().int('Branch ID must be an integer').positive('Branch ID must be positive'),
  operationalDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD format'),
  note: z.string().max(500, 'Note must not exceed 500 characters').optional(),
});

const reopenDaySchema = z.object({
  branchId: z.coerce.number().int('Branch ID must be an integer').positive('Branch ID must be positive'),
  operationalDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD format'),
  reason: z.string().max(500, 'Reason must not exceed 500 characters').optional(),
});

const querySchema = z.object({
  branchId: z.coerce.number().int().positive().optional(),
  operationalDate: z.string().optional(),
});

module.exports = {
  closeDaySchema,
  reopenDaySchema,
  querySchema,
};
