import { Request, Response } from 'express';
import { reviewsService } from './service';

export class ReviewsController {
  async submitReview(req: Request, res: Response) {
    const review = await reviewsService.submitReview(
      req.user!.id,
      req.body.order_item_id,
      req.body.rating,
      req.body.text
    );
    res.status(201).json(review);
  }
}

export const reviewsController = new ReviewsController();
