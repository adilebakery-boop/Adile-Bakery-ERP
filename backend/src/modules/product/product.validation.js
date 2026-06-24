const z = require('zod');

const ProductCategory = [
  'BREAD_AND_SWEET_BREADS',
  'CREAM_CAKES',
  'SOFT_CAKES',
  'DRY_CAKES',
  'DRINKS_AND_RETAIL_ITEMS',
  'FETIRE_AND_SNACKS',
  'COOKIES',
];

const UnitType = ['piece', 'kg'];
const ProductionShift = ['DAY', 'NIGHT', 'BOTH'];

const createProductSchema = z.object({
  name: z.string()
    .min(1, 'Product name is required')
    .max(100, 'Product name must not exceed 100 characters')
    .transform(val => val.trim()),
  category: z.enum(ProductCategory, { errorMap: () => ({ message: 'Invalid product category' }) }),
  price: z.coerce.number({ invalid_type_error: 'Price must be a number' })
    .positive('Price must be positive')
    .max(999999.99, 'Price must not exceed 999999.99'),
  unitType: z.enum(UnitType, { errorMap: () => ({ message: 'Invalid unit type' }) }),
  productionShift: z.enum(ProductionShift, { errorMap: () => ({ message: 'Invalid production shift' }) }).optional(),
});

const updateProductSchema = z.object({
  name: z.string()
    .min(1, 'Product name is required')
    .max(100, 'Product name must not exceed 100 characters')
    .transform(val => val.trim())
    .optional(),
  category: z.enum(ProductCategory, { errorMap: () => ({ message: 'Invalid product category' }) }).optional(),
  price: z.coerce.number({ invalid_type_error: 'Price must be a number' })
    .positive('Price must be positive')
    .max(999999.99, 'Price must not exceed 999999.99')
    .optional(),
  unitType: z.enum(UnitType, { errorMap: () => ({ message: 'Invalid unit type' }) }).optional(),
  productionShift: z.enum(ProductionShift, { errorMap: () => ({ message: 'Invalid production shift' }) }).optional(),
  isActive: z.boolean().optional(),
});

const productIdSchema = z.object({
  id: z.coerce.number().int('Product ID must be an integer').positive('Product ID must be positive'),
});

const querySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(10),
  search: z.string().optional(),
  category: z.enum(ProductCategory).optional(),
  isActive: z.coerce.boolean().optional(),
  sortBy: z.enum(['name', 'price', 'category', 'createdAt']).optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

module.exports = {
  createProductSchema,
  updateProductSchema,
  productIdSchema,
  querySchema,
  ProductCategory,
  UnitType,
  ProductionShift,
};