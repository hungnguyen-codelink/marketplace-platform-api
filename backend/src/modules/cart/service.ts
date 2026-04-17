import { redis } from '../../redis/client';
import { db } from '../../db/client';
import { NotFoundError } from '../../errors';

export interface CartItem {
  product_id: string;
  quantity: number;
  title: string;
  price: number;
}

export interface CartResponse {
  items: CartItem[];
  total: number;
}

export class CartService {
  async getCart(userId: string): Promise<CartResponse> {
    const cartData = await redis.hgetall(`cart:${userId}`);

    if (!cartData || Object.keys(cartData).length === 0) {
      return { items: [], total: 0 };
    }

    const productIds = Object.keys(cartData);
    const placeholders = productIds.map((_, i) => `$${i + 1}`).join(',');
    const result = await db.query(`SELECT id, title, price FROM products WHERE id IN (${placeholders})`, productIds);

    const productMap = new Map(result.rows.map((p) => [p.id, { title: p.title, price: parseFloat(p.price) }]));

    let total = 0;
    const items: CartItem[] = [];

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

  async addItem(userId: string, productId: string, quantity: number): Promise<CartResponse> {
    // Verify product exists
    const productResult = await db.query('SELECT id FROM products WHERE id = $1', [productId]);

    if (productResult.rows.length === 0) {
      throw new NotFoundError('Product not found');
    }

    // Get current quantity if exists
    const currentQtyStr = await redis.hget(`cart:${userId}`, productId);
    const currentQty = currentQtyStr ? parseInt(currentQtyStr, 10) : 0;
    const newQty = currentQty + quantity;

    // Set new quantity in Redis
    await redis.hset(`cart:${userId}`, productId, newQty.toString());

    // Return updated cart
    return this.getCart(userId);
  }

  async updateItem(userId: string, productId: string, quantity: number): Promise<CartResponse> {
    // Verify item exists in cart
    const currentQtyStr = await redis.hget(`cart:${userId}`, productId);

    if (currentQtyStr === null) {
      throw new NotFoundError('Item not in cart');
    }

    if (quantity === 0) {
      // Remove item
      await redis.hdel(`cart:${userId}`, productId);
    } else {
      // Update quantity
      await redis.hset(`cart:${userId}`, productId, quantity.toString());
    }

    // Return updated cart
    return this.getCart(userId);
  }

  async removeItem(userId: string, productId: string): Promise<CartResponse> {
    // Verify item exists in cart
    const currentQtyStr = await redis.hget(`cart:${userId}`, productId);

    if (currentQtyStr === null) {
      throw new NotFoundError('Item not in cart');
    }

    // Remove from Redis
    await redis.hdel(`cart:${userId}`, productId);

    // Return updated cart
    return this.getCart(userId);
  }

  async clearCart(userId: string): Promise<CartResponse> {
    await redis.del(`cart:${userId}`);
    return { items: [], total: 0 };
  }
}

export const cartService = new CartService();
