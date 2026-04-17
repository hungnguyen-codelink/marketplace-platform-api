import { Router } from 'express';
import { z } from 'zod';
import { productsController } from './controller';
import { validate } from '../../middleware/validate';
import { authenticate } from '../../middleware/authenticate';
import { requireRole } from '../../middleware/requireRole';
import { asyncHandler } from '../../utils/asyncHandler';

// Validation schemas
const createProductSchema = z.object({
  title: z.string().refine((val) => val.trim().length > 0, {
    message: 'Title is required',
  }).transform((val) => val.trim()),
  description: z
    .string()
    .refine((val) => val.trim().length > 0, {
      message: 'Description must not be empty if provided',
    })
    .transform((val) => val.trim())
    .optional(),
  price: z
    .number()
    .gt(0, { message: 'Price must be greater than 0' })
    .refine((val) => /^\d+(\.\d{1,2})?$/.test(val.toString()), {
      message: 'Price must have at most 2 decimal places',
    }),
  image_url: z
    .string()
    .refine((val) => val.trim().length > 0, {
      message: 'Image URL must not be empty if provided',
    })
    .transform((val) => val.trim())
    .optional(),
  category: z
    .string()
    .refine((val) => val.trim().length > 0, {
      message: 'Category must not be empty if provided',
    })
    .transform((val) => val.trim())
    .optional(),
  stock: z
    .number()
    .int({ message: 'Stock must be an integer' })
    .gte(0, { message: 'Stock must be >= 0' })
    .lte(999999, { message: 'Stock must be <= 999999' }),
});

const updateProductSchema = z.object({
  title: z
    .string()
    .refine((val) => val.trim().length > 0, {
      message: 'Title must not be empty',
    })
    .transform((val) => val.trim())
    .optional(),
  description: z
    .string()
    .refine((val) => val.trim().length > 0, {
      message: 'Description must not be empty if provided',
    })
    .transform((val) => val.trim())
    .optional(),
  price: z
    .number()
    .gt(0, { message: 'Price must be greater than 0' })
    .refine((val) => /^\d+(\.\d{1,2})?$/.test(val.toString()), {
      message: 'Price must have at most 2 decimal places',
    })
    .optional(),
  image_url: z
    .string()
    .refine((val) => val.trim().length > 0, {
      message: 'Image URL must not be empty if provided',
    })
    .transform((val) => val.trim())
    .optional(),
  category: z
    .string()
    .refine((val) => val.trim().length > 0, {
      message: 'Category must not be empty if provided',
    })
    .transform((val) => val.trim())
    .optional(),
  stock: z
    .number()
    .int({ message: 'Stock must be an integer' })
    .gte(0, { message: 'Stock must be >= 0' })
    .lte(999999, { message: 'Stock must be <= 999999' })
    .optional(),
});

export const productsRouter = Router();

// POST /api/products — create product (seller only)
productsRouter.post(
  '/',
  authenticate,
  requireRole('seller'),
  validate(createProductSchema),
  asyncHandler((req, res) => productsController.createProduct(req, res))
);

// GET /api/products — get products with search and category filters (public, paginated)
productsRouter.get(
  '/',
  asyncHandler((req, res) => productsController.getProducts(req, res))
);

// GET /api/products/:id — get product by ID (public)
productsRouter.get(
  '/:id',
  asyncHandler((req, res) => productsController.getProductById(req, res))
);

// PUT /api/products/:id — update product (seller only)
productsRouter.put(
  '/:id',
  authenticate,
  requireRole('seller'),
  validate(updateProductSchema),
  asyncHandler((req, res) => productsController.updateProduct(req, res))
);

// DELETE /api/products/:id — delete product (seller only), returns 204 No Content
productsRouter.delete(
  '/:id',
  authenticate,
  requireRole('seller'),
  asyncHandler((req, res) => productsController.deleteProduct(req, res))
);
