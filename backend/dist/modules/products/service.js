"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.productsService = exports.ProductsService = void 0;
const client_1 = require("../../db/client");
const errors_1 = require("../../errors");
class ProductsService {
    async createProduct(sellerId, payload) {
        // First verify seller has a shop
        const shopResult = await client_1.db.query('SELECT id FROM shops WHERE seller_id = $1', [sellerId]);
        if (shopResult.rows.length === 0) {
            throw new errors_1.ForbiddenError('Seller must have a shop to create products');
        }
        const shopId = shopResult.rows[0].id;
        const { title, description, price, image_url, category, stock } = payload;
        try {
            const result = await client_1.db.query(`INSERT INTO products (shop_id, title, description, price, image_url, category, stock)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id, shop_id, title, description, price, image_url, category, stock, aggregate_rating, review_count, created_at, updated_at`, [
                shopId,
                title,
                description || null,
                price,
                image_url || null,
                category || null,
                stock,
            ]);
            const product = result.rows[0];
            return {
                id: product.id,
                shop_id: product.shop_id,
                title: product.title,
                description: product.description,
                price: product.price,
                image_url: product.image_url,
                category: product.category,
                stock: product.stock,
                aggregate_rating: product.aggregate_rating,
                review_count: product.review_count,
                created_at: product.created_at,
                updated_at: product.updated_at,
            };
        }
        catch (error) {
            throw error;
        }
    }
    async getProducts(params) {
        const page = params.page || 1;
        const limit = params.limit || 10;
        const offset = (page - 1) * limit;
        let query = 'SELECT id, shop_id, title, description, price, image_url, category, stock, aggregate_rating, review_count, created_at, updated_at FROM products WHERE 1=1';
        const values = [];
        let paramCount = 1;
        if (params.search) {
            query += ` AND (title ILIKE $${paramCount} OR description ILIKE $${paramCount})`;
            values.push(`%${params.search}%`);
            paramCount++;
        }
        if (params.category) {
            query += ` AND category = $${paramCount}`;
            values.push(params.category);
            paramCount++;
        }
        query += ` ORDER BY created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
        values.push(limit, offset);
        const result = await client_1.db.query(query, values);
        return result.rows.map((product) => ({
            id: product.id,
            shop_id: product.shop_id,
            title: product.title,
            description: product.description,
            price: product.price,
            image_url: product.image_url,
            category: product.category,
            stock: product.stock,
            aggregate_rating: product.aggregate_rating,
            review_count: product.review_count,
            created_at: product.created_at,
            updated_at: product.updated_at,
        }));
    }
    async getProductById(productId) {
        const result = await client_1.db.query('SELECT id, shop_id, title, description, price, image_url, category, stock, aggregate_rating, review_count, created_at, updated_at FROM products WHERE id = $1', [productId]);
        if (result.rows.length === 0) {
            throw new errors_1.NotFoundError('Product not found');
        }
        const product = result.rows[0];
        return {
            id: product.id,
            shop_id: product.shop_id,
            title: product.title,
            description: product.description,
            price: product.price,
            image_url: product.image_url,
            category: product.category,
            stock: product.stock,
            aggregate_rating: product.aggregate_rating,
            review_count: product.review_count,
            created_at: product.created_at,
            updated_at: product.updated_at,
        };
    }
    async updateProduct(sellerId, productId, payload) {
        // First verify the product exists
        const productResult = await client_1.db.query('SELECT shop_id FROM products WHERE id = $1', [
            productId,
        ]);
        if (productResult.rows.length === 0) {
            throw new errors_1.NotFoundError('Product not found');
        }
        const productShopId = productResult.rows[0].shop_id;
        // Verify the seller owns the shop that owns this product
        const shopResult = await client_1.db.query('SELECT id FROM shops WHERE id = $1 AND seller_id = $2', [
            productShopId,
            sellerId,
        ]);
        if (shopResult.rows.length === 0) {
            throw new errors_1.ForbiddenError('Access denied');
        }
        // Build update query dynamically based on provided fields
        const fields = [];
        const values = [];
        let paramCount = 1;
        if (payload.title !== undefined) {
            fields.push(`title = $${paramCount}`);
            values.push(payload.title);
            paramCount++;
        }
        if (payload.description !== undefined) {
            fields.push(`description = $${paramCount}`);
            values.push(payload.description || null);
            paramCount++;
        }
        if (payload.price !== undefined) {
            fields.push(`price = $${paramCount}`);
            values.push(payload.price);
            paramCount++;
        }
        if (payload.image_url !== undefined) {
            fields.push(`image_url = $${paramCount}`);
            values.push(payload.image_url || null);
            paramCount++;
        }
        if (payload.category !== undefined) {
            fields.push(`category = $${paramCount}`);
            values.push(payload.category || null);
            paramCount++;
        }
        if (payload.stock !== undefined) {
            fields.push(`stock = $${paramCount}`);
            values.push(payload.stock);
            paramCount++;
        }
        if (fields.length === 0) {
            // No fields to update, just return current product
            return this.getProductById(productId);
        }
        fields.push(`updated_at = now()`);
        values.push(productId);
        const query = `UPDATE products SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING id, shop_id, title, description, price, image_url, category, stock, aggregate_rating, review_count, created_at, updated_at`;
        const result = await client_1.db.query(query, values);
        const product = result.rows[0];
        return {
            id: product.id,
            shop_id: product.shop_id,
            title: product.title,
            description: product.description,
            price: product.price,
            image_url: product.image_url,
            category: product.category,
            stock: product.stock,
            aggregate_rating: product.aggregate_rating,
            review_count: product.review_count,
            created_at: product.created_at,
            updated_at: product.updated_at,
        };
    }
    async deleteProduct(sellerId, productId) {
        // First verify the product exists
        const productResult = await client_1.db.query('SELECT shop_id FROM products WHERE id = $1', [
            productId,
        ]);
        if (productResult.rows.length === 0) {
            throw new errors_1.NotFoundError('Product not found');
        }
        const productShopId = productResult.rows[0].shop_id;
        // Verify the seller owns the shop that owns this product
        const shopResult = await client_1.db.query('SELECT id FROM shops WHERE id = $1 AND seller_id = $2', [
            productShopId,
            sellerId,
        ]);
        if (shopResult.rows.length === 0) {
            throw new errors_1.ForbiddenError('Access denied');
        }
        await client_1.db.query('DELETE FROM products WHERE id = $1', [productId]);
    }
}
exports.ProductsService = ProductsService;
exports.productsService = new ProductsService();
