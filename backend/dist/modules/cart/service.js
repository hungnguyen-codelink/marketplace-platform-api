"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cartService = exports.CartService = void 0;
const client_1 = require("../../redis/client");
const client_2 = require("../../db/client");
const errors_1 = require("../../errors");
class CartService {
    async getCart(userId) {
        const cartData = await client_1.redis.hgetall(`cart:${userId}`);
        if (!cartData || Object.keys(cartData).length === 0) {
            return { items: [], total: 0 };
        }
        const productIds = Object.keys(cartData);
        const placeholders = productIds.map((_, i) => `$${i + 1}`).join(',');
        const result = await client_2.db.query(`SELECT id, title, price FROM products WHERE id IN (${placeholders})`, productIds);
        const productMap = new Map(result.rows.map((p) => [p.id, { title: p.title, price: parseFloat(p.price) }]));
        let total = 0;
        const items = [];
        for (const [productId, quantityStr] of Object.entries(cartData)) {
            const quantity = parseInt(quantityStr, 10);
            const product = productMap.get(productId);
            if (product) {
                items.push({
                    product_id: productId,
                    quantity,
                    title: product.title,
                    price: product.price,
                });
                total += quantity * product.price;
            }
        }
        return {
            items,
            total: Math.round(total * 100) / 100,
        };
    }
    async addItem(userId, productId, quantity) {
        // Verify product exists
        const productResult = await client_2.db.query('SELECT id FROM products WHERE id = $1', [productId]);
        if (productResult.rows.length === 0) {
            throw new errors_1.NotFoundError('Product not found');
        }
        // Get current quantity if exists
        const currentQtyStr = await client_1.redis.hget(`cart:${userId}`, productId);
        const currentQty = currentQtyStr ? parseInt(currentQtyStr, 10) : 0;
        const newQty = currentQty + quantity;
        // Set new quantity in Redis
        await client_1.redis.hset(`cart:${userId}`, productId, newQty.toString());
        // Return updated cart
        return this.getCart(userId);
    }
    async updateItem(userId, productId, quantity) {
        // Verify item exists in cart
        const currentQtyStr = await client_1.redis.hget(`cart:${userId}`, productId);
        if (currentQtyStr === null) {
            throw new errors_1.NotFoundError('Item not in cart');
        }
        if (quantity === 0) {
            // Remove item
            await client_1.redis.hdel(`cart:${userId}`, productId);
        }
        else {
            // Update quantity
            await client_1.redis.hset(`cart:${userId}`, productId, quantity.toString());
        }
        // Return updated cart
        return this.getCart(userId);
    }
    async removeItem(userId, productId) {
        // Verify item exists in cart
        const currentQtyStr = await client_1.redis.hget(`cart:${userId}`, productId);
        if (currentQtyStr === null) {
            throw new errors_1.NotFoundError('Item not in cart');
        }
        // Remove from Redis
        await client_1.redis.hdel(`cart:${userId}`, productId);
        // Return updated cart
        return this.getCart(userId);
    }
    async clearCart(userId) {
        await client_1.redis.del(`cart:${userId}`);
        return { items: [], total: 0 };
    }
}
exports.CartService = CartService;
exports.cartService = new CartService();
