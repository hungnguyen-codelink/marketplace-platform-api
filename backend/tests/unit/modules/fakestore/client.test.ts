import { fakestoreClient } from '../../../../src/modules/fakestore/client';
import { AppError } from '../../../../src/errors';

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch as any;

describe('FakeStore HTTP Client', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('timeout', () => {
    it('should abort request after FAKESTORE_TIMEOUT_MS', async () => {
      mockFetch.mockImplementationOnce(() => {
        const error: any = new Error('Request timeout');
        error.name = 'AbortError';
        return Promise.reject(error);
      });

      await expect(fakestoreClient.fetch('/products')).rejects.toThrow();
    });
  });

  describe('retry logic', () => {
    it('should retry on 5xx responses', async () => {
      mockFetch
        .mockResolvedValueOnce(
          new Response(JSON.stringify({}), { status: 500 })
        )
        .mockResolvedValueOnce(
          new Response(JSON.stringify({}), { status: 502 })
        )
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ id: 1, title: 'Product' }), { status: 200 })
        );

      const result = await fakestoreClient.fetch('/products');
      expect(result).toEqual({ id: 1, title: 'Product' });
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it('should retry on network errors', async () => {
      mockFetch
        .mockRejectedValueOnce(new Error('ECONNREFUSED'))
        .mockRejectedValueOnce(new Error('ETIMEDOUT'))
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ id: 1, title: 'Product' }), { status: 200 })
        );

      const result = await fakestoreClient.fetch('/products');
      expect(result).toEqual({ id: 1, title: 'Product' });
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it('should use exponential backoff: 500ms, 1000ms, 2000ms', async () => {
      jest.useFakeTimers();
      mockFetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ id: 1 }), { status: 200 })
        );

      const promise = fakestoreClient.fetch('/products');

      // First retry after 500ms
      await jest.advanceTimersByTimeAsync(500);
      expect(mockFetch).toHaveBeenCalledTimes(2);

      // Second retry after 1000ms more
      await jest.advanceTimersByTimeAsync(1000);
      expect(mockFetch).toHaveBeenCalledTimes(3);

      const result = await promise;
      expect(result).toEqual({ id: 1 });

      jest.useRealTimers();
    });

    it('should not retry on 4xx responses', async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ error: 'Not found' }), { status: 404 })
      );

      await expect(fakestoreClient.fetch('/products')).rejects.toThrow();
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should throw descriptive error after exhausting retries', async () => {
      mockFetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'));

      await expect(fakestoreClient.fetch('/products')).rejects.toThrow(AppError);
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });
  });

  describe('successful responses', () => {
    it('should return parsed JSON on 200 response', async () => {
      const mockData = { id: 1, title: 'Product', price: 10.99 };
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify(mockData), { status: 200 })
      );

      const result = await fakestoreClient.fetch('/products');
      expect(result).toEqual(mockData);
    });

    it('should construct full URL from base URL and path', async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({}), { status: 200 })
      );

      await fakestoreClient.fetch('/products/1');
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('https://fakestoreapi.com/products/1'),
        expect.any(Object)
      );
    });
  });
});
