"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reviewsRouter = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const controller_1 = require("./controller");
const validate_1 = require("../../middleware/validate");
const authenticate_1 = require("../../middleware/authenticate");
const requireRole_1 = require("../../middleware/requireRole");
const asyncHandler_1 = require("../../utils/asyncHandler");
// Validation schema
const submitReviewSchema = zod_1.z.object({
    order_item_id: zod_1.z.string().uuid('order_item_id must be a valid UUID'),
    rating: zod_1.z.number().int().min(1).max(5),
    text: zod_1.z.string().optional(),
});
exports.reviewsRouter = (0, express_1.Router)();
// POST /api/reviews — submit review for order item
exports.reviewsRouter.post('/', authenticate_1.authenticate, (0, requireRole_1.requireRole)('buyer'), (0, validate_1.validate)(submitReviewSchema), (0, asyncHandler_1.asyncHandler)((req, res) => controller_1.reviewsController.submitReview(req, res)));
