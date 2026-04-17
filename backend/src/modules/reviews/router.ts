import { Router } from 'express';
import { z } from 'zod';
import { reviewsController } from './controller';
import { validate } from '../../middleware/validate';
import { authenticate } from '../../middleware/authenticate';
import { requireRole } from '../../middleware/requireRole';
import { asyncHandler } from '../../utils/asyncHandler';

// Validation schema
const submitReviewSchema = z.object({
  order_item_id: z.string().uuid('order_item_id must be a valid UUID'),
  rating: z.number().int().min(1).max(5),
  text: z.string().optional(),
});

export const reviewsRouter = Router();

// POST /api/reviews — submit review for order item
reviewsRouter.post(
  '/',
  authenticate,
  requireRole('buyer'),
  validate(submitReviewSchema),
  asyncHandler((req, res) => reviewsController.submitReview(req, res))
);
