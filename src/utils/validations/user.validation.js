const z = require('zod');

const createUserSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),
  username: z.string().min(3, 'Username must be at least 3 characters').max(50, 'Username must be less than 50 characters'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  roleId: z.number().int().positive('Role ID must be a positive integer'),
  branchId: z.number().int().positive('Branch ID must be a positive integer').nullable().optional()
});

const updateUserSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters').optional(),
  roleId: z.number().int().positive('Role ID must be a positive integer').optional(),
  branchId: z.number().int().positive('Branch ID must be a positive integer').nullable().optional()
});

const userIdSchema = z.object({
  id: z.coerce.number().int().positive('ID must be a positive integer')
});

module.exports = {
  createUserSchema,
  updateUserSchema,
  userIdSchema
};