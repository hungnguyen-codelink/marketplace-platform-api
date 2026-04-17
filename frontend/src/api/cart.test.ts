import { describe, it, expect, vi, beforeEach } from 'vitest';
import apiClient from './client';
import { getCart, addItem, updateQty, removeItem, clearCart } from './cart';

vi.mock('./client', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

const mockGet = vi.mocked(apiClient.get);
const mockPost = vi.mocked(apiClient.post);
const mockPut = vi.mocked(apiClient.put);
const mockDelete = vi.mocked(apiClient.delete);

describe('cartApi', () => {
  beforeEach(() => {
    mockGet.mockReset();
    mockPost.mockReset();
    mockPut.mockReset();
    mockDelete.mockReset();
  });

  describe('getCart', () => {
    it('gets cart from /cart', async () => {
      const mockCart = {
        items: [
          {
            product_id: 'prod-1',
            quantity: 2,
            product: {
              id: 'prod-1',
              shop_id: 'shop-1',
              title: 'Product 1',
              price: 50,
              stock: 10,
              aggregate_rating: 4.5,
              review_count: 10,
              created_at: '2026-04-17T00:00:00Z',
              updated_at: '2026-04-17T00:00:00Z',
            },
          },
        ],
        total: 100,
      };
      mockGet.mockResolvedValue({ data: mockCart });

      const result = await getCart();

      expect(mockGet).toHaveBeenCalledWith('/cart');
      expect(result).toEqual(mockCart);
    });
  });

  describe('addItem', () => {
    it('posts to /cart/items with product_id and quantity', async () => {
      const mockCart = { items: [], total: 0 };
      mockPost.mockResolvedValue({ data: mockCart });

      const result = await addItem('prod-1', 2);

      expect(mockPost).toHaveBeenCalledWith('/cart/items', { product_id: 'prod-1', quantity: 2 });
      expect(result).toEqual(mockCart);
    });
  });

  describe('updateQty', () => {
    it('puts to /cart/items/{productId} with new quantity', async () => {
      const mockCart = { items: [], total: 0 };
      mockPut.mockResolvedValue({ data: mockCart });

      const result = await updateQty('prod-1', 5);

      expect(mockPut).toHaveBeenCalledWith('/cart/items/prod-1', { quantity: 5 });
      expect(result).toEqual(mockCart);
    });
  });

  describe('removeItem', () => {
    it('deletes from /cart/items/{productId}', async () => {
      const mockCart = { items: [], total: 0 };
      mockDelete.mockResolvedValue({ data: mockCart });

      const result = await removeItem('prod-1');

      expect(mockDelete).toHaveBeenCalledWith('/cart/items/prod-1');
      expect(result).toEqual(mockCart);
    });
  });

  describe('clearCart', () => {
    it('deletes /cart', async () => {
      const mockCart = { items: [], total: 0 };
      mockDelete.mockResolvedValue({ data: mockCart });

      const result = await clearCart();

      expect(mockDelete).toHaveBeenCalledWith('/cart');
      expect(result).toEqual(mockCart);
    });
  });
});
