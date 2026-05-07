const z = require('zod');

const ShiftEnum = z.enum(['MORNING', 'AFTERNOON', 'EVENING']);

const createProductionSchema = z.object({
  productId: z.number().int().positive('Product ID must be a positive integer'),
  quantity: z.number({ invalid_type_error: 'Quantity must be a number' }).positive('Quantity must be a positive number'),
  branchId: z.number().int().positive('Branch ID must be a positive integer'),
  shift: ShiftEnum
});

const updateProductionSchema = z.object({
  productId: z.number().int().positive('Product ID must be a positive integer').optional(),
  quantity: z.number({ invalid_type_error: 'Quantity must be a number' }).positive('Quantity must be a positive number').optional(),
  branchId: z.number().int().positive('Branch ID must be a positive integer').optional(),
  shift: ShiftEnum.optional()
});

const productionIdSchema = z.object({
  id: z.coerce.number().int().positive('ID must be a positive integer')
});

const productionQuerySchema = z.object({
  branchId: z.coerce.number().int().positive().optional(),
  productId: z.coerce.number().int().positive().optional(),
  shift: ShiftEnum.optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Start date must be YYYY-MM-DD format').optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'End date must be YYYY-MM-DD format').optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20)
});

module.exports = {
  createProductionSchema,
  updateProductionSchema,
  productionIdSchema,
  productionQuerySchema
};