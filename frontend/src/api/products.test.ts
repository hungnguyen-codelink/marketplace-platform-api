import { describe, it, expect, vi, beforeEach } from 'vitest';
import apiClient from './client';
import { productsApi } from './products';

vi.mock('./client', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

const mockPost = vi.mocked(apiClient.post);
const mockGet = vi.mocked(apiClient.get);
const mockPut = vi.mocked(apiClient.put);
const mockDelete = vi.mocked(apiClient.delete);

describe('productsApi', () => {
  beforeEach(() => {
    mockPost.mockReset();
    mockGet.mockReset();
    mockPut.mockReset();
    mockDelete.mockReset();
  });

  it('getProducts() gets from /api/products with pagination and filters', async () => {
    const response = {
      data: [
        {
          id: 'prod-1',
          shop_id: 'shop-1',
          title: 'Product 1',
          price: 99.99,
          stock: 10,
          aggregate_rating: 4.5,
          review_count: 5,
          created_at: '2026-04-16T00:00:00Z',
          updated_at: '2026-04-16T00:00:00Z',
        },
      ],
      total: 1,
      page: 1,
      limit: 20,
    };
    mockGet.mockResolvedValue({ data: response });

    const result = await productsApi.getProducts({ search: 'test', category: 'electronics', page: 1, limit: 20 });

    expect(mockGet).toHaveBeenCalledWith('/api/products', {
      params: { search: 'test', category: 'electronics', page: 1, limit: 20 },
    });
    expect(result).toEqual(response);
  });

  it('getProductById() gets from /api/products/:id and returns Product object', async () => {
    const product = {
      id: 'prod-1',
      shop_id: 'shop-1',
      title: 'Product 1',
      price: 99.99,
      stock: 10,
      aggregate_rating: 4.5,
      review_count: 5,
      created_at: '2026-04-16T00:00:00Z',
      updated_at: '2026-04-16T00:00:00Z',
    };
    mockGet.mockResolvedValue({ data: product });

    const result = await productsApi.getProductById('prod-1');

    expect(mockGet).toHaveBeenCalledWith('/api/products/prod-1');
    expect(result).toEqual(product);
  });

  it('getMyProducts() gets from /api/products/my and returns paginated products', async () => {
    const response = {
      data: [
        {
          id: 'prod-1',
          shop_id: 'shop-1',
          title: 'My Product 1',
          price: 99.99,
          stock: 10,
          aggregate_rating: 4.5,
          review_count: 5,
          created_at: '2026-04-16T00:00:00Z',
          updated_at: '2026-04-16T00:00:00Z',
        },
      ],
      total: 1,
      page: 1,
      limit: 20,
    };
    mockGet.mockResolvedValue({ data: response });

    const result = await productsApi.getMyProducts({ page: 1, limit: 20 });

    expect(mockGet).toHaveBeenCalledWith('/api/products/my', {
      params: { page: 1, limit: 20 },
    });
    expect(result).toEqual(response);
  });

  it('createProduct() posts to /api/products and returns Product object', async () => {
    const product = {
      id: 'prod-1',
      shop_id: 'shop-1',
      title: 'New Product',
      description: 'A new product',
      price: 99.99,
      image_url: 'https://example.com/image.jpg',
      category: 'electronics',
      stock: 50,
      aggregate_rating: 0,
      review_count: 0,
      created_at: '2026-04-16T00:00:00Z',
      updated_at: '2026-04-16T00:00:00Z',
    };
    mockPost.mockResolvedValue({ data: product });

    const result = await productsApi.createProduct({
      title: 'New Product',
      description: 'A new product',
      price: 99.99,
      image_url: 'https://example.com/image.jpg',
      category: 'electronics',
      stock: 50,
    });

    expect(mockPost).toHaveBeenCalledWith('/api/products', expect.any(Object));
    expect(result).toEqual(product);
  });

  it('updateProduct() puts to /api/products/:id and returns updated Product object', async () => {
    const updatedProduct = {
      id: 'prod-1',
      shop_id: 'shop-1',
      title: 'Updated Product',
      description: 'Updated description',
      price: 199.99,
      image_url: 'https://example.com/new-image.jpg',
      category: 'electronics',
      stock: 100,
      aggregate_rating: 4.5,
      review_count: 5,
      created_at: '2026-04-16T00:00:00Z',
      updated_at: '2026-04-17T00:00:00Z',
    };
    mockPut.mockResolvedValue({ data: updatedProduct });

    const result = await productsApi.updateProduct('prod-1', {
      title: 'Updated Product',
      description: 'Updated description',
      price: 199.99,
      image_url: 'https://example.com/new-image.jpg',
      category: 'electronics',
      stock: 100,
    });

    expect(mockPut).toHaveBeenCalledWith('/api/products/prod-1', expect.any(Object));
    expect(result).toEqual(updatedProduct);
  });

  it('deleteProduct() deletes from /api/products/:id', async () => {
    mockDelete.mockResolvedValue({ status: 204 });

    await productsApi.deleteProduct('prod-1');

    expect(mockDelete).toHaveBeenCalledWith('/api/products/prod-1');
  });
});
