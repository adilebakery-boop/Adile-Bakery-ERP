const z = require('zod');

const createProductSchema = z.object({
  name: z.string().min(1, 'Product name is required').max(100, 'Name must be less than 100 characters'),
  category: z.string().min(1, 'Category is required').max(50, 'Category must be less than 50 characters'),
  price: z.number({ invalid_type_error: 'Price must be a number' }).positive('Price must be a positive number'),
  unitType: z.string().min(1, 'Unit type is required').max(20, 'Unit type must be less than 20 characters'),
  isActive: z.boolean().optional().default(true)
});

const updateProductSchema = z.object({
  name: z.string().min(1, 'Product name is required').max(100, 'Name must be less than 100 characters').optional(),
  category: z.string().min(1, 'Category is required').max(50, 'Category must be less than 50 characters').optional(),
  price: z.number({ invalid_type_error: 'Price must be a number' }).positive('Price must be a positive number').optional(),
  unitType: z.string().min(1, 'Unit type is required').max(20, 'Unit type must be less than 20 characters').optional(),
  isActive: z.boolean().optional()
});

const productIdSchema = z.object({
  id: z.coerce.number().int().positive('ID must be a positive integer')
});

const productQuerySchema = z.object({
  category: z.string().optional(),
  isActive: z.coerce.boolean().optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20)
});

module.exports = {
  createProductSchema,
  updateProductSchema,
  productIdSchema,
  productQuerySchema
};