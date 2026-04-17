import { Router } from 'express';
import { z } from 'zod';
import { ordersController } from './controller';
import { validate } from '../../middleware/validate';
import { authenticate } from '../../middleware/authenticate';
import { requireRole } from '../../middleware/requireRole';
import { asyncHandler } from '../../utils/asyncHandler';

// Validation schemas
const shippingAddressSchema = z.object({
  street: z.string().min(1, 'street is required'),
  city: z.string().min(1, 'city is required'),
  state: z.string().min(1, 'state is required'),
  zip: z.string().min(1, 'zip is required'),
  country: z.string().min(1, 'country is required'),
});

const checkoutSchema = z.object({
  shipping_address: shippingAddressSchema,
});

const updateOrderStatusSchema = z.object({
  status: z.enum(['confirmed', 'shipped', 'delivered', 'completed'], {
    errorMap: () => ({ message: 'status must be one of: confirmed, shipped, delivered, completed' }),
  }),
});

export const ordersRouter = Router();

// POST /api/orders/checkout — submit checkout
ordersRouter.post(
  '/checkout',
  authenticate,
  validate(checkoutSchema),
  asyncHandler((req, res) => ordersController.checkout(req, res))
);

// GET /api/orders — list buyer's orders (paginated, most recent first)
ordersRouter.get(
  '/',
  authenticate,
  asyncHandler((req, res) => ordersController.getOrders(req, res))
);

// GET /api/orders/:id — get order with items
ordersRouter.get(
  '/:id',
  authenticate,
  asyncHandler((req, res) => ordersController.getOrder(req, res))
);

export const sellerOrdersRouter = Router();

// GET /api/seller/orders — list orders containing seller's products (paginated, optional ?status= filter)
sellerOrdersRouter.get(
  '/',
  authenticate,
  requireRole('seller'),
  asyncHandler((req, res) => ordersController.getSellerOrders(req, res))
);

// GET /api/seller/orders/:id — get order detail
sellerOrdersRouter.get(
  '/:id',
  authenticate,
  requireRole('seller'),
  asyncHandler((req, res) => ordersController.getSellerOrder(req, res))
);

// PATCH /api/seller/orders/:id/status — advance order status
sellerOrdersRouter.patch(
  '/:id/status',
  authenticate,
  requireRole('seller'),
  validate(updateOrderStatusSchema),
  asyncHandler((req, res) => ordersController.updateSellerOrderStatus(req, res))
);
