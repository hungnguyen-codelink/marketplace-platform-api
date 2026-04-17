import { describe, it, expect, vi, beforeEach } from 'vitest';
import apiClient from './client';
import {
  checkoutOrder,
  getOrders,
  getOrder,
  getSellerOrders,
  getSellerOrder,
  updateSellerOrderStatus,
} from './orders';

vi.mock('./client', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
    patch: vi.fn(),
  },
}));

const mockPost = vi.mocked(apiClient.post);
const mockGet = vi.mocked(apiClient.get);
const mockPatch = vi.mocked(apiClient.patch);

describe('ordersApi', () => {
  beforeEach(() => {
    mockPost.mockReset();
    mockGet.mockReset();
    mockPatch.mockReset();
  });

  describe('checkoutOrder', () => {
    it('posts shipping address to /orders/checkout and returns order', async () => {
      const mockOrder = {
        id: 'ord-1',
        buyer_id: 'buyer-1',
        status: 'pending',
        shipping_address: {
          street: '123 Main St',
          city: 'Boston',
          state: 'MA',
          zip: '02101',
          country: 'USA',
        },
        total_amount: 100,
        created_at: '2026-04-17T00:00:00Z',
        updated_at: '2026-04-17T00:00:00Z',
      };
      mockPost.mockResolvedValue({ data: mockOrder });

      const address = {
        street: '123 Main St',
        city: 'Boston',
        state: 'MA',
        zip: '02101',
        country: 'USA',
      };
      const result = await checkoutOrder(address);

      expect(mockPost).toHaveBeenCalledWith('/orders/checkout', { shipping_address: address });
      expect(result).toEqual(mockOrder);
    });
  });

  describe('getOrders', () => {
    it('gets orders without params', async () => {
      const mockResponse = {
        data: [{ id: 'ord-1', status: 'pending' }],
        total: 1,
        page: 1,
        limit: 10,
      };
      mockGet.mockResolvedValue({ data: mockResponse });

      const result = await getOrders();

      expect(mockGet).toHaveBeenCalledWith('/orders', { params: undefined });
      expect(result).toEqual(mockResponse);
    });

    it('gets orders with pagination params', async () => {
      const mockResponse = {
        data: [{ id: 'ord-1', status: 'pending' }],
        total: 10,
        page: 2,
        limit: 5,
      };
      mockGet.mockResolvedValue({ data: mockResponse });

      const result = await getOrders({ page: 2, limit: 5 });

      expect(mockGet).toHaveBeenCalledWith('/orders', { params: { page: 2, limit: 5 } });
      expect(result).toEqual(mockResponse);
    });
  });

  describe('getOrder', () => {
    it('gets order by id', async () => {
      const mockOrder = {
        id: 'ord-1',
        buyer_id: 'buyer-1',
        status: 'pending',
        shipping_address: {
          street: '123 Main St',
          city: 'Boston',
          state: 'MA',
          zip: '02101',
          country: 'USA',
        },
        total_amount: 100,
        items: [],
        created_at: '2026-04-17T00:00:00Z',
        updated_at: '2026-04-17T00:00:00Z',
      };
      mockGet.mockResolvedValue({ data: mockOrder });

      const result = await getOrder('ord-1');

      expect(mockGet).toHaveBeenCalledWith('/orders/ord-1');
      expect(result).toEqual(mockOrder);
    });
  });

  describe('getSellerOrders', () => {
    it('gets seller orders without params', async () => {
      const mockResponse = {
        data: [{ id: 'ord-1', status: 'pending' }],
        total: 1,
        page: 1,
        limit: 10,
      };
      mockGet.mockResolvedValue({ data: mockResponse });

      const result = await getSellerOrders();

      expect(mockGet).toHaveBeenCalledWith('/seller/orders', { params: undefined });
      expect(result).toEqual(mockResponse);
    });

    it('gets seller orders with filters and pagination', async () => {
      const mockResponse = {
        data: [{ id: 'ord-1', status: 'pending' }],
        total: 5,
        page: 1,
        limit: 10,
      };
      mockGet.mockResolvedValue({ data: mockResponse });

      const result = await getSellerOrders({ status: 'pending', page: 1, limit: 10 });

      expect(mockGet).toHaveBeenCalledWith('/seller/orders', {
        params: { status: 'pending', page: 1, limit: 10 },
      });
      expect(result).toEqual(mockResponse);
    });
  });

  describe('getSellerOrder', () => {
    it('gets seller order by id', async () => {
      const mockOrder = {
        id: 'ord-1',
        buyer_id: 'buyer-1',
        status: 'pending',
        shipping_address: {
          street: '123 Main St',
          city: 'Boston',
          state: 'MA',
          zip: '02101',
          country: 'USA',
        },
        total_amount: 100,
        items: [],
        created_at: '2026-04-17T00:00:00Z',
        updated_at: '2026-04-17T00:00:00Z',
      };
      mockGet.mockResolvedValue({ data: mockOrder });

      const result = await getSellerOrder('ord-1');

      expect(mockGet).toHaveBeenCalledWith('/seller/orders/ord-1');
      expect(result).toEqual(mockOrder);
    });
  });

  describe('updateSellerOrderStatus', () => {
    it('patches order status and returns updated order', async () => {
      const mockOrder = {
        id: 'ord-1',
        status: 'confirmed',
        updated_at: '2026-04-17T01:00:00Z',
      };
      mockPatch.mockResolvedValue({ data: mockOrder });

      const result = await updateSellerOrderStatus('ord-1', 'confirmed');

      expect(mockPatch).toHaveBeenCalledWith('/seller/orders/ord-1/status', { status: 'confirmed' });
      expect(result).toEqual(mockOrder);
    });
  });
});
