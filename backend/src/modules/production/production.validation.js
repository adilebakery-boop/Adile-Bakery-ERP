const z = require('zod');
const { validateQuantityForUnitType } = require('../../utils/unitTypeValidation');

const shifts = ['DAY', 'NIGHT'];

const createProductionSchema = z.object({
  productId: z.coerce.number().int('Product ID must be an integer').positive('Product ID must be positive'),
  branchId: z.coerce.number().int('Branch ID must be an integer').positive('Branch ID must be positive'),
  shift: z.enum(shifts, { errorMap: () => ({ message: 'Invalid shift. Must be DAY or NIGHT' }) }),
  quantity: z.coerce.number({ invalid_type_error: 'Quantity must be a number' })
    .positive('Quantity must be greater than 0')
    .max(999999.99, 'Quantity must not exceed 999999.99'),
  productionDate: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Production date must be in YYYY-MM-DD format'),
});

const updateProductionSchema = z.object({
  quantity: z.coerce.number({ invalid_type_error: 'Quantity must be a number' })
    .positive('Quantity must be greater than 0')
    .max(999999.99, 'Quantity must not exceed 999999.99')
    .optional(),
  shift: z.enum(shifts, { errorMap: () => ({ message: 'Invalid shift' }) }).optional(),
});

function validateProductionQuantity(quantity, unitType) {
  const validation = validateQuantityForUnitType(quantity, unitType);
  if (!validation.valid) {
    const error = new Error(validation.message);
    error.name = 'ValidationError';
    throw error;
  }
}

const productionIdSchema = z.object({
  id: z.coerce.number().int('Production ID must be an integer').positive('Production ID must be positive'),
});

const querySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  branchId: z.coerce.number().int().positive().optional(),
  productId: z.coerce.number().int().positive().optional(),
  shift: z.enum(shifts).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  userId: z.coerce.number().int().positive().optional(),
  sortBy: z.enum(['createdAt', 'quantity', 'shift']).optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

module.exports = {
  createProductionSchema,
  updateProductionSchema,
  productionIdSchema,
  querySchema,
  shifts,
  validateProductionQuantity,
};