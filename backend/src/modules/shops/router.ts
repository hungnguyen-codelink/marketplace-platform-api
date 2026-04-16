import { Router } from 'express';
import { z } from 'zod';
import { shopsController } from './controller';
import { validate } from '../../middleware/validate';
import { authenticate } from '../../middleware/authenticate';
import { requireRole } from '../../middleware/requireRole';
import { asyncHandler } from '../../utils/asyncHandler';

// Validation schemas
const createShopSchema = z.object({
  name: z.string().refine((val) => val.trim().length > 0, {
    message: 'Name is required',
  }).transform((val) => val.trim()),
  description: z
    .string()
    .refine((val) => val.trim().length > 0, {
      message: 'Description must not be empty if provided',
    })
    .transform((val) => val.trim())
    .optional(),
  banner_url: z
    .string()
    .refine((val) => val.trim().length > 0, {
      message: 'Banner URL must not be empty if provided',
    })
    .transform((val) => val.trim())
    .optional(),
  contact_email: z
    .string()
    .refine((val) => val.trim().length > 0, {
      message: 'Contact email must not be empty if provided',
    })
    .transform((val) => val.trim())
    .optional(),
});

const updateShopSchema = z.object({
  name: z
    .string()
    .refine((val) => val.trim().length > 0, {
      message: 'Name must not be empty',
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
  banner_url: z
    .string()
    .refine((val) => val.trim().length > 0, {
      message: 'Banner URL must not be empty if provided',
    })
    .transform((val) => val.trim())
    .optional(),
  contact_email: z
    .string()
    .refine((val) => val.trim().length > 0, {
      message: 'Contact email must not be empty if provided',
    })
    .transform((val) => val.trim())
    .optional(),
});

export const shopsRouter = Router();

// POST /api/shops — create shop (seller only)
shopsRouter.post(
  '/',
  authenticate,
  requireRole('seller'),
  validate(createShopSchema),
  asyncHandler((req, res) => shopsController.createShop(req, res))
);

// GET /api/shops/my — get current seller's shop (seller only)
shopsRouter.get(
  '/my',
  authenticate,
  requireRole('seller'),
  asyncHandler((req, res) => shopsController.getMyShop(req, res))
);

// PUT /api/shops/my — update current seller's shop (seller only)
shopsRouter.put(
  '/my',
  authenticate,
  requireRole('seller'),
  validate(updateShopSchema),
  asyncHandler(async (req, res) => {
    // Need to fetch the shop ID first
    const { shopsService } = await import('./service');
    const shop = await shopsService.getShopBySellerId(req.user!.id);
    // Attach shop ID to request body for controller
    req.body.shopId = shop.id;
    return shopsController.updateMyShop(req, res);
  })
);

// GET /api/shops/:id — get shop by ID (public)
shopsRouter.get(
  '/:id',
  asyncHandler((req, res) => shopsController.getShopById(req, res))
);
