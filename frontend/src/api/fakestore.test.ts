import { describe, it, expect, vi, beforeEach } from 'vitest';
import apiClient from './client';
import { fakestoreApi } from './fakestore';
import type { FakestoreProduct } from '../types';

vi.mock('./client', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

const mockGet = vi.mocked(apiClient.get);
const mockPost = vi.mocked(apiClient.post);

describe('[API] fakestoreApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getProducts', () => {
    it('[API] GET /api/fakestore/products returns FakestoreProduct[]', async () => {
      const mockProducts: FakestoreProduct[] = [
        {
          fakestore_id: 1,
          title: 'Test Product',
          price: 99.99,
          description: 'A test product',
          category: 'electronics',
          image_url: 'https://example.com/image.jpg',
          aggregate_rating: 4.5,
          review_count: 10,
        },
      ];

      mockGet.mockResolvedValue({ data: mockProducts });

      const result = await fakestoreApi.getProducts();

      expect(mockGet).toHaveBeenCalledWith('/api/fakestore/products', expect.any(Object));
      expect(result).toEqual(mockProducts);
    });

    it('[API] GET /api/fakestore/products handles empty array', async () => {
      mockGet.mockResolvedValue({ data: [] });

      const result = await fakestoreApi.getProducts();

      expect(result).toEqual([]);
    });

    it('[API] GET /api/fakestore/products handles API errors', async () => {
      const error = new Error('Network error');
      mockGet.mockRejectedValue(error);

      await expect(fakestoreApi.getProducts()).rejects.toThrow('Network error');
    });
  });

  describe('importProducts', () => {
    it('[API] POST /api/fakestore/import with ids and overwrite=true', async () => {
      const mockResponse = {
        importedIds: [1, 2, 3],
        count: 3,
      };

      mockPost.mockResolvedValue({ data: mockResponse });

      const result = await fakestoreApi.importProducts([1, 2, 3], true);

      expect(mockPost).toHaveBeenCalledWith('/api/fakestore/import', {
        ids: [1, 2, 3],
        overwrite: true,
      });
      expect(result).toEqual(mockResponse);
    });

    it('[API] POST /api/fakestore/import with ids and overwrite=false', async () => {
      const mockResponse = {
        importedIds: [1, 2],
        count: 2,
      };

      mockPost.mockResolvedValue({ data: mockResponse });

      const result = await fakestoreApi.importProducts([1, 2], false);

      expect(mockPost).toHaveBeenCalledWith('/api/fakestore/import', {
        ids: [1, 2],
        overwrite: false,
      });
      expect(result).toEqual(mockResponse);
    });

    it('[API] POST /api/fakestore/import handles empty ids array', async () => {
      const mockResponse = {
        importedIds: [],
        count: 0,
      };

      mockPost.mockResolvedValue({ data: mockResponse });

      const result = await fakestoreApi.importProducts([], false);

      expect(result).toEqual(mockResponse);
    });

    it('[API] POST /api/fakestore/import handles API errors', async () => {
      const error = new Error('Import failed');
      mockPost.mockRejectedValue(error);

      await expect(fakestoreApi.importProducts([1, 2], true)).rejects.toThrow('Import failed');
    });
  });
});
