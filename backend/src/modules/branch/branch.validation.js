const z = require('zod');

const createBranchSchema = z.object({
  name: z.string()
    .min(1, 'Branch name is required')
    .max(100, 'Branch name must not exceed 100 characters')
    .transform(val => val.trim()),
});

const updateBranchSchema = z.object({
  name: z.string()
    .min(1, 'Branch name is required')
    .max(100, 'Branch name must not exceed 100 characters')
    .transform(val => val.trim())
    .optional(),
  isActive: z.boolean().optional(),
});

const branchIdSchema = z.object({
  id: z.coerce.number().int('Branch ID must be an integer').positive('Branch ID must be positive'),
});

const querySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(10),
  search: z.string().optional(),
  sortBy: z.enum(['name', 'createdAt']).optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

module.exports = {
  createBranchSchema,
  updateBranchSchema,
  branchIdSchema,
  querySchema,
};