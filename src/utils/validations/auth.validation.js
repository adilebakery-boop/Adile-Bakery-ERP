const z = require('zod');

const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required')
});

const registerSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),
  username: z.string().min(3, 'Username must be at least 3 characters').max(50, 'Username must be less than 50 characters'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  roleId: z.number().int().positive('Role ID must be a positive integer'),
  branchId: z.number().int().positive('Branch ID must be a positive integer').nullable().optional()
});

module.exports = {
  loginSchema,
  registerSchema
};