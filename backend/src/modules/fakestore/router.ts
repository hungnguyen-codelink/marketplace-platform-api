import { Router } from 'express';
import { fakestoreController } from './controller';
import { importProductsSchema } from './schemas';
import { authenticate } from '../../middleware/authenticate';
import { requireRole } from '../../middleware/requireRole';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../utils/asyncHandler';

export const fakestoreRouter = Router();

// GET /api/fakestore/products — fetch all products from FakeStore (seller only)
fakestoreRouter.get(
  '/products',
  authenticate,
  requireRole('seller'),
  asyncHandler((req, res) => fakestoreController.getProducts(req, res))
);

// GET /api/fakestore/categories — fetch categories with cache chain (public)
fakestoreRouter.get(
  '/categories',
  asyncHandler((req, res) => fakestoreController.getCategories(req, res))
);

// POST /api/fakestore/import — import selected products (seller only)
fakestoreRouter.post(
  '/import',
  authenticate,
  requireRole('seller'),
  validate(importProductsSchema),
  asyncHandler((req, res) => fakestoreController.importProducts(req, res))
);
