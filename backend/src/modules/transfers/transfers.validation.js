const z = require('zod');

const createTransferSchema = z.object({
  productId: z.coerce.number().int().positive(),
  dependentBranchId: z.coerce.number().int().positive(),
  receivedQuantity: z.coerce.number().positive(),
  operationalDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'operationalDate must be YYYY-MM-DD'),
});

const updateSentSchema = z.object({
  sentQuantity: z.coerce.number().positive(),
});

const updateReceivedSchema = z.object({
  receivedQuantity: z.coerce.number().positive(),
});

const returnSchema = z.object({
  returnedQuantity: z.coerce.number().positive(),
});

const resolveDisputeSchema = z.object({
  receivedQuantity: z.coerce.number().positive().optional(),
  sentQuantity: z.coerce.number().positive().optional(),
  isDisputed: z.boolean().optional(),
});

const querySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().optional().default(20),
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'CLOSED']).optional(),
  isDisputed: z.coerce.boolean().optional(),
  sourceBranchId: z.coerce.number().int().positive().optional(),
  dependentBranchId: z.coerce.number().int().positive().optional(),
  productId: z.coerce.number().int().positive().optional(),
  operationalDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  search: z.string().optional(),
});

module.exports = {
  createTransferSchema,
  updateSentSchema,
  updateReceivedSchema,
  returnSchema,
  resolveDisputeSchema,
  querySchema,
};
