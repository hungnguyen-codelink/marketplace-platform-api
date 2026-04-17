"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reviewsService = exports.ReviewsService = void 0;
const client_1 = require("../../db/client");
const errors_1 = require("../../errors");
class ReviewsService {
    async submitReview(buyerId, orderItemId, rating, text) {
        const client = await client_1.db.connect();
        try {
            await client.query('BEGIN');
            // Step 1: Look up order_item and parent order
            const orderItemResult = await client.query(`SELECT oi.id, oi.product_id, o.id as order_id, o.buyer_id, o.status
         FROM order_items oi
         JOIN orders o ON o.id = oi.order_id
         WHERE oi.id = $1`, [orderItemId]);
            if (orderItemResult.rows.length === 0) {
                await client.query('ROLLBACK');
                throw new errors_1.NotFoundError('Order item not found');
            }
            const { product_id: productId, buyer_id: orderBuyerId, status } = orderItemResult.rows[0];
            // Check if buyer owns the order
            if (orderBuyerId !== buyerId) {
                await client.query('ROLLBACK');
                throw new errors_1.ForbiddenError('Access denied');
            }
            // Check if order status is completed
            if (status !== 'completed') {
                await client.query('ROLLBACK');
                throw new errors_1.ForbiddenError('Order must be completed to leave a review');
            }
            // Step 2: Insert review and update product atomically
            let reviewResult;
            try {
                reviewResult = await client.query(`INSERT INTO reviews (order_item_id, buyer_id, product_id, rating, text)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING id, order_item_id, buyer_id, product_id, rating, text, created_at`, [orderItemId, buyerId, productId, rating, text || null]);
            }
            catch (error) {
                // Handle unique constraint violation
                if (error.code === '23505') {
                    await client.query('ROLLBACK');
                    throw new errors_1.ConflictError('Review already exists for this order item');
                }
                throw error;
            }
            const review = reviewResult.rows[0];
            // Update product aggregate_rating and review_count
            await client.query(`UPDATE products SET
          aggregate_rating = (SELECT ROUND(AVG(rating)::NUMERIC, 2) FROM reviews WHERE product_id = $1),
          review_count = (SELECT COUNT(*) FROM reviews WHERE product_id = $1)
         WHERE id = $1`, [productId]);
            await client.query('COMMIT');
            return review;
        }
        catch (error) {
            await client.query('ROLLBACK');
            throw error;
        }
        finally {
            client.release();
        }
    }
}
exports.ReviewsService = ReviewsService;
exports.reviewsService = new ReviewsService();
