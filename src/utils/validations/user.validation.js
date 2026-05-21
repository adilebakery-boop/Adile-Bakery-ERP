const z = require('zod');

const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must be less than 128 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');

const createUserSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),
  username: z.string().min(3, 'Username must be at least 3 characters').max(50, 'Username must be less than 50 characters'),
  password: passwordSchema,
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
  userIdSchema,
  passwordSchema
};
