const z = require('zod');

const createRemainingSchema = z.object({
  productId: z.coerce.number().int('Product ID must be an integer').positive('Product ID must be positive'),
  quantity: z.coerce.number({ invalid_type_error: 'Quantity must be a number' })
    .positive('Quantity must be positive')
    .max(999999.99, 'Quantity must not exceed 999999.99'),
  branchId: z.coerce.number().int('Branch ID must be an integer').positive('Branch ID must be positive'),
  operationalDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD format').optional(),
  status: z.enum(['DRAFT', 'FINAL']).optional(),
});

const bulkItemSchema = z.object({
  productId: z.coerce.number().int().positive('Product ID must be positive'),
  remainingQuantity: z.coerce.number({ invalid_type_error: 'Quantity must be a number' })
    .positive('Quantity must be positive')
    .max(999999.99, 'Quantity must not exceed 999999.99'),
  status: z.enum(['DRAFT', 'FINAL']).optional(),
});

const createBulkSchema = z.object({
  branchId: z.coerce.number().int('Branch ID must be an integer').positive('Branch ID must be positive'),
  operationalDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD format').optional(),
  items: z.array(bulkItemSchema).min(1, 'At least one item is required'),
});

const updateRemainingSchema = z.object({
  quantity: z.coerce.number({ invalid_type_error: 'Quantity must be a number' })
    .positive('Quantity must be positive')
    .max(999999.99, 'Quantity must not exceed 999999.99')
    .optional(),
  status: z.enum(['DRAFT', 'FINAL']).optional(),
});

const remainingIdSchema = z.object({
  id: z.coerce.number().int('ID must be an integer').positive('ID must be positive'),
});

const querySchema = z.object({
  branchId: z.coerce.number().int().positive().optional(),
  productId: z.coerce.number().int().positive().optional(),
  operationalDate: z.string().optional(),
  status: z.enum(['DRAFT', 'FINAL']).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
});

module.exports = {
  createRemainingSchema,
  createBulkSchema,
  updateRemainingSchema,
  remainingIdSchema,
  querySchema,
};
