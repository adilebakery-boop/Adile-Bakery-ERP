const z = require('zod');

const createBranchSchema = z.object({
  name: z.string().min(1, 'Branch name is required').max(100, 'Name must be less than 100 characters')
});

const updateBranchSchema = z.object({
  name: z.string().min(1, 'Branch name is required').max(100, 'Name must be less than 100 characters').optional()
});

const branchIdSchema = z.object({
  id: z.coerce.number().int().positive('ID must be a positive integer')
});

module.exports = {
  createBranchSchema,
  updateBranchSchema,
  branchIdSchema
};