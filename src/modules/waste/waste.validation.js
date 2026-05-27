const z = require('zod');

const createWasteSchema = z.object({
  productId: z.coerce.number().int('Product ID must be an integer').positive('Product ID must be positive'),
  quantity: z.number({ invalid_type_error: 'Quantity must be a number' })
    .positive('Quantity must be greater than 0')
    .max(999999.99, 'Quantity must not exceed 999999.99'),
  branchId: z.coerce.number().int('Branch ID must be an integer').positive('Branch ID must be positive'),
  operationalDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD format'),
  reason: z.string().max(500, 'Reason must not exceed 500 characters').optional(),
});

const updateWasteSchema = z.object({
  quantity: z.number({ invalid_type_error: 'Quantity must be a number' })
    .positive('Quantity must be greater than 0')
    .max(999999.99, 'Quantity must not exceed 999999.99')
    .optional(),
  reason: z.string().max(500, 'Reason must not exceed 500 characters').optional(),
});

const wasteIdSchema = z.object({
  id: z.coerce.number().int('ID must be an integer').positive('ID must be positive'),
});

const querySchema = z.object({
  branchId: z.coerce.number().int().positive().optional(),
  productId: z.coerce.number().int().positive().optional(),
  operationalDate: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

module.exports = {
  createWasteSchema,
  updateWasteSchema,
  wasteIdSchema,
  querySchema,
};
