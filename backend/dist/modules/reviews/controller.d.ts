import { Request, Response } from 'express';
export declare class ReviewsController {
    submitReview(req: Request, res: Response): Promise<void>;
}
export declare const reviewsController: ReviewsController;
