"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reviewsController = exports.ReviewsController = void 0;
const service_1 = require("./service");
class ReviewsController {
    async submitReview(req, res) {
        const review = await service_1.reviewsService.submitReview(req.user.id, req.body.order_item_id, req.body.rating, req.body.text);
        res.status(201).json(review);
    }
}
exports.ReviewsController = ReviewsController;
exports.reviewsController = new ReviewsController();
