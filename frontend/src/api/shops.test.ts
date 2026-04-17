import { describe, it, expect, vi, beforeEach } from 'vitest';
import apiClient from './client';
import { shopsApi } from './shops';

vi.mock('./client', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
    put: vi.fn(),
  },
}));

const mockPost = vi.mocked(apiClient.post);
const mockGet = vi.mocked(apiClient.get);
const mockPut = vi.mocked(apiClient.put);

describe('shopsApi', () => {
  beforeEach(() => {
    mockPost.mockReset();
    mockGet.mockReset();
    mockPut.mockReset();
  });

  it('createShop() posts to /api/shops and returns Shop object', async () => {
    const shop = {
      id: 'shop-1',
      seller_id: 'seller-1',
      name: 'My Shop',
      description: 'A great shop',
      banner_url: 'https://example.com/banner.jpg',
      contact_email: 'shop@example.com',
      created_at: '2026-04-16T00:00:00Z',
    };
    mockPost.mockResolvedValue({ data: shop });

    const result = await shopsApi.createShop({
      name: 'My Shop',
      description: 'A great shop',
      banner_url: 'https://example.com/banner.jpg',
      contact_email: 'shop@example.com',
    });

    expect(mockPost).toHaveBeenCalledWith('/api/shops', expect.any(Object));
    expect(result).toEqual(shop);
  });

  it('getMyShop() gets from /api/shops/my and returns Shop object', async () => {
    const shop = {
      id: 'shop-1',
      seller_id: 'seller-1',
      name: 'My Shop',
      description: 'A great shop',
      banner_url: 'https://example.com/banner.jpg',
      contact_email: 'shop@example.com',
      created_at: '2026-04-16T00:00:00Z',
    };
    mockGet.mockResolvedValue({ data: shop });

    const result = await shopsApi.getMyShop();

    expect(mockGet).toHaveBeenCalledWith('/api/shops/my');
    expect(result).toEqual(shop);
  });

  it('updateMyShop() puts to /api/shops/my and returns updated Shop object', async () => {
    const updatedShop = {
      id: 'shop-1',
      seller_id: 'seller-1',
      name: 'Updated Shop',
      description: 'Updated description',
      banner_url: 'https://example.com/new-banner.jpg',
      contact_email: 'newemail@example.com',
      created_at: '2026-04-16T00:00:00Z',
    };
    mockPut.mockResolvedValue({ data: updatedShop });

    const result = await shopsApi.updateMyShop({
      name: 'Updated Shop',
      description: 'Updated description',
      banner_url: 'https://example.com/new-banner.jpg',
      contact_email: 'newemail@example.com',
    });

    expect(mockPut).toHaveBeenCalledWith('/api/shops/my', expect.any(Object));
    expect(result).toEqual(updatedShop);
  });

  it('getShopById(id) gets from /api/shops/:id and returns Shop object', async () => {
    const shop = {
      id: 'shop-1',
      name: 'Public Shop',
      description: 'A great shop',
      banner_url: 'https://example.com/banner.jpg',
      contact_email: 'shop@example.com',
      created_at: '2026-04-16T00:00:00Z',
    };
    mockGet.mockResolvedValue({ data: shop });

    const result = await shopsApi.getShopById('shop-1');

    expect(mockGet).toHaveBeenCalledWith('/api/shops/shop-1');
    expect(result).toEqual(shop);
  });
});
