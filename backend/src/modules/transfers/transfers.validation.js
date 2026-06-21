const z = require('zod');

const createTransferSchema = z.object({
  branchType: z.enum(['SOURCE', 'DEPENDENT']).default('DEPENDENT'),
  productId: z.coerce.number().int().positive(),
  dependentBranchId: z.coerce.number().int().positive().optional(),
  sourceBranchId: z.coerce.number().int().positive().optional(),
  receivedQuantity: z.coerce.number().positive().optional(),
  sentQuantity: z.coerce.number().positive().optional(),
  operationalDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'operationalDate must be YYYY-MM-DD'),
}).superRefine((data, ctx) => {
  if (data.branchType === 'DEPENDENT') {
    if (!data.dependentBranchId) {
      ctx.addIssue({ code: 'custom', path: ['dependentBranchId'], message: 'dependentBranchId is required for DEPENDENT transfers' });
    }
    if (!data.receivedQuantity) {
      ctx.addIssue({ code: 'custom', path: ['receivedQuantity'], message: 'receivedQuantity is required for DEPENDENT transfers' });
    }
  }
  if (data.branchType === 'SOURCE') {
    if (!data.sourceBranchId) {
      ctx.addIssue({ code: 'custom', path: ['sourceBranchId'], message: 'sourceBranchId is required for SOURCE transfers' });
    }
    if (!data.sentQuantity) {
      ctx.addIssue({ code: 'custom', path: ['sentQuantity'], message: 'sentQuantity is required for SOURCE transfers' });
    }
  }
});

const updateSentSchema = z.object({
  sentQuantity: z.coerce.number().positive(),
});

const updateReceivedSchema = z.object({
  receivedQuantity: z.coerce.number().positive(),
});

const querySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().optional().default(20),
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
  querySchema,
};
