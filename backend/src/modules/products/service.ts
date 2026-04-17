import { db } from '../../db/client';
import { ConflictError, NotFoundError, ForbiddenError } from '../../errors';

export interface CreateProductPayload {
  title: string;
  description?: string;
  price: number;
  image_url?: string;
  category?: string;
  stock: number;
}

export interface UpdateProductPayload {
  title?: string;
  description?: string;
  price?: number;
  image_url?: string;
  category?: string;
  stock?: number;
}

export interface ProductResponse {
  id: string;
  shop_id: string;
  title: string;
  description: string | null;
  price: number;
  image_url: string | null;
  category: string | null;
  stock: number;
  aggregate_rating: number;
  review_count: number;
  created_at: string;
  updated_at: string;
}

export interface GetProductsParams {
  search?: string;
  category?: string;
  page?: number;
  limit?: number;
}

export interface PaginatedProductResponse {
  data: ProductResponse[];
  total: number;
  page: number;
  limit: number;
}

export class ProductsService {
  async createProduct(
    sellerId: string,
    payload: CreateProductPayload
  ): Promise<ProductResponse> {
    // First verify seller has a shop
    const shopResult = await db.query('SELECT id FROM shops WHERE seller_id = $1', [sellerId]);

    if (shopResult.rows.length === 0) {
      throw new ForbiddenError('Seller must have a shop to create products');
    }

    const shopId = shopResult.rows[0].id;
    const { title, description, price, image_url, category, stock } = payload;

    try {
      const result = await db.query(
        `INSERT INTO products (shop_id, title, description, price, image_url, category, stock)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id, shop_id, title, description, price, image_url, category, stock, aggregate_rating, review_count, created_at, updated_at`,
        [
          shopId,
          title,
          description || null,
          price,
          image_url || null,
          category || null,
          stock,
        ]
      );

      const product = result.rows[0];
      return {
        id: product.id,
        shop_id: product.shop_id,
        title: product.title,
        description: product.description,
        price: parseFloat(product.price),
        image_url: product.image_url,
        category: product.category,
        stock: product.stock,
        aggregate_rating: parseFloat(product.aggregate_rating),
        review_count: product.review_count,
        created_at: product.created_at,
        updated_at: product.updated_at,
      };
    } catch (error: any) {
      throw error;
    }
  }

  async getProducts(params: GetProductsParams): Promise<ProductResponse[]> {
    const page = params.page || 1;
    const limit = params.limit || 10;
    const offset = (page - 1) * limit;

    let query =
      'SELECT id, shop_id, title, description, price, image_url, category, stock, aggregate_rating, review_count, created_at, updated_at FROM products WHERE 1=1';
    const values: any[] = [];
    let paramCount = 1;

    if (params.search) {
      query += ` AND (title ILIKE $${paramCount} OR description ILIKE $${paramCount} OR category ILIKE $${paramCount})`;
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

    const result = await db.query(query, values);

    return result.rows.map((product) => ({
      id: product.id,
      shop_id: product.shop_id,
      title: product.title,
      description: product.description,
      price: parseFloat(product.price),
      image_url: product.image_url,
      category: product.category,
      stock: product.stock,
      aggregate_rating: parseFloat(product.aggregate_rating),
      review_count: product.review_count,
      created_at: product.created_at,
      updated_at: product.updated_at,
    }));
  }

  async getProductById(productId: string): Promise<ProductResponse> {
    const result = await db.query(
      'SELECT id, shop_id, title, description, price, image_url, category, stock, aggregate_rating, review_count, created_at, updated_at FROM products WHERE id = $1',
      [productId]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Product not found');
    }

    const product = result.rows[0];
    return {
      id: product.id,
      shop_id: product.shop_id,
      title: product.title,
      description: product.description,
      price: parseFloat(product.price),
      image_url: product.image_url,
      category: product.category,
      stock: product.stock,
      aggregate_rating: parseFloat(product.aggregate_rating),
      review_count: product.review_count,
      created_at: product.created_at,
      updated_at: product.updated_at,
    };
  }

  async updateProduct(
    sellerId: string,
    productId: string,
    payload: UpdateProductPayload
  ): Promise<ProductResponse> {
    // First verify the product exists
    const productResult = await db.query('SELECT shop_id FROM products WHERE id = $1', [
      productId,
    ]);

    if (productResult.rows.length === 0) {
      throw new NotFoundError('Product not found');
    }

    const productShopId = productResult.rows[0].shop_id;

    // Verify the seller owns the shop that owns this product
    const shopResult = await db.query('SELECT id FROM shops WHERE id = $1 AND seller_id = $2', [
      productShopId,
      sellerId,
    ]);

    if (shopResult.rows.length === 0) {
      throw new ForbiddenError('Access denied');
    }

    // Build update query dynamically based on provided fields
    const fields: string[] = [];
    const values: any[] = [];
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

    const result = await db.query(query, values);
    const product = result.rows[0];
    return {
      id: product.id,
      shop_id: product.shop_id,
      title: product.title,
      description: product.description,
      price: parseFloat(product.price),
      image_url: product.image_url,
      category: product.category,
      stock: product.stock,
      aggregate_rating: parseFloat(product.aggregate_rating),
      review_count: product.review_count,
      created_at: product.created_at,
      updated_at: product.updated_at,
    };
  }

  async deleteProduct(sellerId: string, productId: string): Promise<void> {
    // First verify the product exists
    const productResult = await db.query('SELECT shop_id FROM products WHERE id = $1', [
      productId,
    ]);

    if (productResult.rows.length === 0) {
      throw new NotFoundError('Product not found');
    }

    const productShopId = productResult.rows[0].shop_id;

    // Verify the seller owns the shop that owns this product
    const shopResult = await db.query('SELECT id FROM shops WHERE id = $1 AND seller_id = $2', [
      productShopId,
      sellerId,
    ]);

    if (shopResult.rows.length === 0) {
      throw new ForbiddenError('Access denied');
    }

    await db.query('DELETE FROM products WHERE id = $1', [productId]);
  }

  async getMyProducts(
    sellerId: string,
    params: { page?: number; limit?: number }
  ): Promise<PaginatedProductResponse> {
    const page = params.page || 1;
    const limit = params.limit || 10;
    const offset = (page - 1) * limit;

    // Get seller's shop
    const shopResult = await db.query('SELECT id FROM shops WHERE seller_id = $1', [sellerId]);

    // If no shop found, return empty result (seller just has no products yet)
    if (shopResult.rows.length === 0) {
      return {
        data: [],
        total: 0,
        page,
        limit,
      };
    }

    const shopId = shopResult.rows[0].id;

    // Get total count of products for this seller
    const countResult = await db.query('SELECT COUNT(*) as count FROM products WHERE shop_id = $1', [
      shopId,
    ]);
    const total = parseInt(countResult.rows[0].count, 10);

    // Get paginated products
    const productsResult = await db.query(
      `SELECT id, shop_id, title, description, price, image_url, category, stock, aggregate_rating, review_count, created_at, updated_at
       FROM products
       WHERE shop_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [shopId, limit, offset]
    );

    const data = productsResult.rows.map((product) => ({
      id: product.id,
      shop_id: product.shop_id,
      title: product.title,
      description: product.description,
      price: parseFloat(product.price),
      image_url: product.image_url,
      category: product.category,
      stock: product.stock,
      aggregate_rating: parseFloat(product.aggregate_rating),
      review_count: product.review_count,
      created_at: product.created_at,
      updated_at: product.updated_at,
    }));

    return {
      data,
      total,
      page,
      limit,
    };
  }
}

export const productsService = new ProductsService();
