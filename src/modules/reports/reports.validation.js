const z = require('zod');

const categories = ['BREAD_AND_SWEET_BREADS', 'CREAM_CAKES', 'SOFT_CAKES', 'DRY_CAKES', 'DRINKS_AND_RETAIL_ITEMS', 'FETIRE_AND_SNACKS', 'COOKIES'];

const reportQuerySchema = z.object({
  branchId: z.string().optional(),
  operationalDate: z.string().optional(),
  category: z.enum(categories).optional(),
  productId: z.coerce.number().int().positive().optional(),
});

const exportQuerySchema = z.object({
  type: z.enum(['daily', 'weekly', 'monthly', 'yearly'], { errorMap: () => ({ message: 'Type must be daily, weekly, monthly, or yearly' }) }),
  branchId: z.string().optional(),
  operationalDate: z.string().optional(),
  category: z.enum(categories).optional(),
  productId: z.coerce.number().int().positive().optional(),
});

module.exports = {
  reportQuerySchema,
  exportQuerySchema,
};
