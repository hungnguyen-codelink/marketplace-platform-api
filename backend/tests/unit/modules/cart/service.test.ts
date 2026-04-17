import { CartService } from '../../../../src/modules/cart/service';
import { db } from '../../../../src/db/client';
import { redis } from '../../../../src/redis/client';
import { NotFoundError } from '../../../../src/errors';

jest.mock('../../../../src/db/client');
jest.mock('../../../../src/redis/client');

describe('CartService - Unit Tests', () => {
  let cartService: CartService;

  beforeEach(() => {
    jest.clearAllMocks();
    cartService = new CartService();
  });

  describe('getCart()', () => {
    it('should return empty array for items and total 0 if cart is new (empty)', async () => {
      const userId = 'user-123';

      (redis.hgetall as jest.Mock).mockResolvedValueOnce({});

      const result = await cartService.getCart(userId);

      expect(result).toEqual({ items: [], total: 0 });
      expect(redis.hgetall).toHaveBeenCalledWith(`cart:${userId}`);
    });

    it('should return product details fetched from mocked DB and compute total price', async () => {
      const userId = 'user-123';
      const cartData = {
        'product-1': '2',
        'product-2': '3',
      };

      const mockProducts = [
        { id: 'product-1', title: 'Product 1', price: '10.50' },
        { id: 'product-2', title: 'Product 2', price: '20.00' },
      ];

      (redis.hgetall as jest.Mock).mockResolvedValueOnce(cartData);
      (db.query as jest.Mock).mockResolvedValueOnce({ rows: mockProducts });

      const result = await cartService.getCart(userId);

      expect(result.items).toHaveLength(2);
      expect(result.items).toContainEqual({
        product_id: 'product-1',
        quantity: 2,
        title: 'Product 1',
        price: 10.50,
      });
      expect(result.items).toContainEqual({
        product_id: 'product-2',
        quantity: 3,
        title: 'Product 2',
        price: 20.00,
      });
      expect(result.total).toBe(2 * 10.50 + 3 * 20.00);
    });

    it('should handle null cartData from Redis gracefully', async () => {
      const userId = 'user-123';

      (redis.hgetall as jest.Mock).mockResolvedValueOnce(null);

      const result = await cartService.getCart(userId);

      expect(result).toEqual({ items: [], total: 0 });
    });
  });

  describe('addItem()', () => {
    it('should throw NotFoundError if product does not exist', async () => {
      const userId = 'user-123';
      const productId = 'non-existent-product';
      const quantity = 1;

      (db.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      await expect(cartService.addItem(userId, productId, quantity)).rejects.toThrow(
        'Product not found'
      );
    });

    it('should write hash field cart:{userId} with product_id=quantity to Redis', async () => {
      const userId = 'user-123';
      const productId = 'product-1';
      const quantity = 2;

      const mockProduct = { id: productId };

      (db.query as jest.Mock).mockResolvedValueOnce({ rows: [mockProduct] });
      (redis.hget as jest.Mock).mockResolvedValueOnce(null);
      (redis.hset as jest.Mock).mockResolvedValueOnce(1);
      (redis.hgetall as jest.Mock).mockResolvedValueOnce({ 'product-1': '2' });
      (db.query as jest.Mock).mockResolvedValueOnce({
        rows: [{ id: productId, title: 'Product 1', price: '10.00' }],
      });

      await cartService.addItem(userId, productId, quantity);

      expect(redis.hset).toHaveBeenCalledWith(`cart:${userId}`, productId, '2');
    });

    it('should add to existing quantity if product already in cart', async () => {
      const userId = 'user-123';
      const productId = 'product-1';
      const quantity = 3;

      const mockProduct = { id: productId };

      (db.query as jest.Mock).mockResolvedValueOnce({ rows: [mockProduct] });
      (redis.hget as jest.Mock).mockResolvedValueOnce('2');
      (redis.hset as jest.Mock).mockResolvedValueOnce(0);
      (redis.hgetall as jest.Mock).mockResolvedValueOnce({ 'product-1': '5' });
      (db.query as jest.Mock).mockResolvedValueOnce({
        rows: [{ id: productId, title: 'Product 1', price: '10.00' }],
      });

      await cartService.addItem(userId, productId, quantity);

      expect(redis.hset).toHaveBeenCalledWith(`cart:${userId}`, productId, '5');
    });
  });

  describe('updateItem()', () => {
    it('should throw NotFoundError if item not in cart', async () => {
      const userId = 'user-123';
      const productId = 'product-1';
      const quantity = 5;

      (redis.hget as jest.Mock).mockResolvedValueOnce(null);

      await expect(cartService.updateItem(userId, productId, quantity)).rejects.toThrow(
        'Item not in cart'
      );
    });

    it('should update existing quantity in Redis hash', async () => {
      const userId = 'user-123';
      const productId = 'product-1';
      const quantity = 5;

      (redis.hget as jest.Mock).mockResolvedValueOnce('2');
      (redis.hset as jest.Mock).mockResolvedValueOnce(0);
      (redis.hgetall as jest.Mock).mockResolvedValueOnce({ 'product-1': '5' });
      (db.query as jest.Mock).mockResolvedValueOnce({
        rows: [{ id: productId, title: 'Product 1', price: '10.00' }],
      });

      await cartService.updateItem(userId, productId, quantity);

      expect(redis.hset).toHaveBeenCalledWith(`cart:${userId}`, productId, '5');
    });

    it('should remove item if quantity is 0', async () => {
      const userId = 'user-123';
      const productId = 'product-1';

      (redis.hget as jest.Mock).mockResolvedValueOnce('2');
      (redis.hdel as jest.Mock).mockResolvedValueOnce(1);
      (redis.hgetall as jest.Mock).mockResolvedValueOnce({});

      await cartService.updateItem(userId, productId, 0);

      expect(redis.hdel).toHaveBeenCalledWith(`cart:${userId}`, productId);
    });
  });

  describe('removeItem()', () => {
    it('should throw NotFoundError if item not in cart', async () => {
      const userId = 'user-123';
      const productId = 'product-1';

      (redis.hget as jest.Mock).mockResolvedValueOnce(null);

      await expect(cartService.removeItem(userId, productId)).rejects.toThrow(
        'Item not in cart'
      );
    });

    it('should delete hash field from Redis', async () => {
      const userId = 'user-123';
      const productId = 'product-1';

      (redis.hget as jest.Mock).mockResolvedValueOnce('2');
      (redis.hdel as jest.Mock).mockResolvedValueOnce(1);
      (redis.hgetall as jest.Mock).mockResolvedValueOnce({});

      await cartService.removeItem(userId, productId);

      expect(redis.hdel).toHaveBeenCalledWith(`cart:${userId}`, productId);
    });
  });

  describe('clearCart()', () => {
    it('should delete entire cart:{userId} key from Redis', async () => {
      const userId = 'user-123';

      (redis.del as jest.Mock).mockResolvedValueOnce(1);

      const result = await cartService.clearCart(userId);

      expect(redis.del).toHaveBeenCalledWith(`cart:${userId}`);
      expect(result).toEqual({ items: [], total: 0 });
    });

    it('should return empty cart even if key did not exist', async () => {
      const userId = 'user-123';

      (redis.del as jest.Mock).mockResolvedValueOnce(0);

      const result = await cartService.clearCart(userId);

      expect(redis.del).toHaveBeenCalledWith(`cart:${userId}`);
      expect(result).toEqual({ items: [], total: 0 });
    });
  });
});
