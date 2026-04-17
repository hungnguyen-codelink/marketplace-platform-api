import { Router } from 'express';
import { z } from 'zod';
import { cartController } from './controller';
import { validate } from '../../middleware/validate';
import { authenticate } from '../../middleware/authenticate';
import { asyncHandler } from '../../utils/asyncHandler';

// Validation schemas
const addItemSchema = z.object({
  product_id: z.string().uuid('product_id must be a valid UUID'),
  quantity: z.number().int().gt(0, 'quantity must be greater than 0'),
});

const updateItemSchema = z.object({
  quantity: z.number().int().gte(0, 'quantity must be >= 0'),
});

export const cartRouter = Router();

// GET /api/cart — get current user's cart with product details and total
cartRouter.get(
  '/',
  authenticate,
  asyncHandler((req, res) => cartController.getCart(req, res))
);

// POST /api/cart/items — add item { product_id, quantity }
cartRouter.post(
  '/items',
  authenticate,
  validate(addItemSchema),
  asyncHandler((req, res) => cartController.addItem(req, res))
);

// PUT /api/cart/items/:productId — update quantity { quantity } (quantity=0 removes item)
cartRouter.put(
  '/items/:productId',
  authenticate,
  validate(updateItemSchema),
  asyncHandler((req, res) => cartController.updateItem(req, res))
);

// DELETE /api/cart/items/:productId — remove item
cartRouter.delete(
  '/items/:productId',
  authenticate,
  asyncHandler((req, res) => cartController.removeItem(req, res))
);

// DELETE /api/cart — clear entire cart
cartRouter.delete(
  '/',
  authenticate,
  asyncHandler((req, res) => cartController.clearCart(req, res))
);
