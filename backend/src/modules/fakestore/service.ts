import { db } from '../../db/client';
import { fakestoreClient } from './client';
import { redisGet, redisSet } from '../../redis/helpers';
import { env } from '../../config/env';
import { ForbiddenError, AppError } from '../../errors';
import { ImportProductsPayload } from './schemas';

const REDIS_CATEGORY_KEY = 'categories:fakestore';

interface FakestoreProduct {
  id: number;
  title?: string;
  price?: number;
  description?: string;
  category?: string;
  image?: string;
  rating?: {
    rate?: number;
    count?: number;
  };
}

interface ImportResult {
  importedIds: number[];
  count: number;
}

class FakestoreService {
  /**
   * Fetch all products from FakeStore API with field mapping
   */
  async getProducts(): Promise<any[]> {
    const products = await fakestoreClient.fetch('/products');

    if (!Array.isArray(products)) {
      return [];
    }

    return products.map((p) => this.mapFakestoreProduct(p));
  }

  /**
   * Get categories with Redis → DB → FakeStore API fallback chain
   */
  async getCategories(): Promise<string[]> {
    // Try Redis first
    const cached = await redisGet(REDIS_CATEGORY_KEY);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch {
        // Invalid JSON, proceed to next fallback
      }
    }

    // Try DB
    const dbResult = await db.query(
      'SELECT name FROM categories ORDER BY name'
    );
    if (dbResult.rows.length > 0) {
      const categories = dbResult.rows.map((row) => row.name);
      // Cache in Redis
      await redisSet(
        REDIS_CATEGORY_KEY,
        JSON.stringify(categories),
        env.FAKESTORE_CATEGORY_CACHE_TTL_SECONDS
      );
      return categories;
    }

    // Fetch from FakeStore
    const categories = await fakestoreClient.fetch('/products/categories');

    if (!Array.isArray(categories)) {
      return [];
    }

    // Populate DB
    try {
      for (const categoryName of categories) {
        await db.query(
          'INSERT INTO categories (name) VALUES ($1) ON CONFLICT (name) DO NOTHING',
          [categoryName]
        );
      }
    } catch (error) {
      // Silently fail if DB write fails
    }

    // Cache in Redis
    await redisSet(
      REDIS_CATEGORY_KEY,
      JSON.stringify(categories),
      env.FAKESTORE_CATEGORY_CACHE_TTL_SECONDS
    );

    return categories;
  }

  /**
   * Import FakeStore products into seller's shop with upsert logic
   */
  async importProducts(
    sellerId: string,
    payload: ImportProductsPayload
  ): Promise<ImportResult> {
    // Verify seller has a shop
    const shopResult = await db.query('SELECT id FROM shops WHERE seller_id = $1', [
      sellerId,
    ]);

    if (shopResult.rows.length === 0) {
      throw new ForbiddenError('Seller must have a shop to import products');
    }

    const shopId = shopResult.rows[0].id;
    const { ids, overwrite } = payload;

    // Fetch products from FakeStore
    const allProducts = await fakestoreClient.fetch('/products');
    if (!Array.isArray(allProducts)) {
      throw new AppError('Invalid FakeStore response', 502);
    }

    const productsMap = new Map(allProducts.map((p) => [p.id, p]));
    const importedIds: number[] = [];

    // Import each product
    for (const id of ids) {
      const fakestoreProduct = productsMap.get(id);
      if (!fakestoreProduct) {
        continue; // Skip if not found in FakeStore
      }

      const mapped = this.mapFakestoreProduct(fakestoreProduct);

      // Check if product already exists
      const existing = await db.query(
        'SELECT id, price, description, stock FROM products WHERE shop_id = $1 AND fakestore_id = $2',
        [shopId, id]
      );

      if (existing.rows.length > 0) {
        // Update existing product
        const existingProduct = existing.rows[0];

        if (overwrite) {
          // Replace all fields
          await db.query(
            `UPDATE products SET
             title = $1,
             description = $2,
             price = $3,
             image_url = $4,
             category = $5,
             stock = $6,
             aggregate_rating = $7,
             review_count = $8,
             updated_at = now()
             WHERE shop_id = $9 AND fakestore_id = $10`,
            [
              mapped.title,
              mapped.description,
              mapped.price,
              mapped.image_url,
              mapped.category,
              mapped.stock,
              mapped.aggregate_rating,
              mapped.review_count,
              shopId,
              id,
            ]
          );
        } else {
          // Preserve price, description, stock; update others
          await db.query(
            `UPDATE products SET
             title = $1,
             image_url = $2,
             category = $3,
             aggregate_rating = $4,
             review_count = $5,
             updated_at = now()
             WHERE shop_id = $6 AND fakestore_id = $7`,
            [
              mapped.title,
              mapped.image_url,
              mapped.category,
              mapped.aggregate_rating,
              mapped.review_count,
              shopId,
              id,
            ]
          );
        }
      } else {
        // Insert new product
        await db.query(
          `INSERT INTO products (shop_id, fakestore_id, title, description, price, image_url, category, stock, aggregate_rating, review_count)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [
            shopId,
            id,
            mapped.title,
            mapped.description,
            mapped.price,
            mapped.image_url,
            mapped.category,
            mapped.stock,
            mapped.aggregate_rating,
            mapped.review_count,
          ]
        );
      }

      importedIds.push(id);
    }

    return {
      importedIds,
      count: importedIds.length,
    };
  }

  /**
   * Map FakeStore product to internal product format with defaults
   */
  private mapFakestoreProduct(
    product: FakestoreProduct
  ): {
    fakestore_id: number;
    title: string;
    description: string;
    price: number;
    image_url: string | null;
    category: string;
    stock: number;
    aggregate_rating: number;
    review_count: number;
  } {
    const title = product.title && typeof product.title === 'string' && product.title.trim()
      ? product.title.trim()
      : 'Untitled Product';

    const description = product.description && typeof product.description === 'string'
      ? product.description
      : '';

    let price = 0.01;
    if (product.price !== null && product.price !== undefined && typeof product.price === 'number') {
      if (!isNaN(product.price) && product.price > 0) {
        price = product.price;
      }
    }

    const image_url = product.image && typeof product.image === 'string' && product.image.trim()
      ? product.image
      : null;

    const category = product.category && typeof product.category === 'string' && product.category.trim()
      ? product.category.trim()
      : 'uncategorized';

    const aggregate_rating = product.rating && typeof product.rating.rate === 'number' && !isNaN(product.rating.rate)
      ? product.rating.rate
      : 0;

    const review_count = product.rating && typeof product.rating.count === 'number' && !isNaN(product.rating.count)
      ? product.rating.count
      : 0;

    return {
      fakestore_id: product.id,
      title,
      description,
      price,
      image_url,
      category,
      stock: 0, // FakeStore has no stock field
      aggregate_rating,
      review_count,
    };
  }
}

export const fakestoreService = new FakestoreService();
