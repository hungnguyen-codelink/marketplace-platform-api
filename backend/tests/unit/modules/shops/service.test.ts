import { ShopsService } from '../../../../src/modules/shops/service';
import { db } from '../../../../src/db/client';
import { ConflictError, NotFoundError, ForbiddenError } from '../../../../src/errors';

jest.mock('../../../../src/db/client');

describe('Shops Service - Unit Tests', () => {
  let shopsService: ShopsService;

  beforeEach(() => {
    jest.clearAllMocks();
    shopsService = new ShopsService();
  });

  describe('createShop()', () => {
    it('should accept valid payload and return shop object with id, seller_id, timestamps', async () => {
      const sellerId = 'seller-123';
      const payload = {
        name: 'Test Shop',
        description: 'Test Description',
        banner_url: 'https://example.com/banner.png',
        contact_email: 'contact@example.com',
      };

      const mockShopRow = {
        id: 'shop-123',
        seller_id: sellerId,
        name: payload.name,
        description: payload.description,
        banner_url: payload.banner_url,
        contact_email: payload.contact_email,
        created_at: '2025-01-01T00:00:00.000Z',
      };

      (db.query as jest.Mock).mockResolvedValueOnce({
        rows: [mockShopRow],
      });

      const result = await shopsService.createShop(sellerId, payload);

      expect(result).toEqual(mockShopRow);
      expect(db.query).toHaveBeenCalledWith(
        'INSERT INTO shops (seller_id, name, description, banner_url, contact_email) VALUES ($1, $2, $3, $4, $5) RETURNING id, seller_id, name, description, banner_url, contact_email, created_at',
        [
          sellerId,
          payload.name,
          payload.description,
          payload.banner_url,
          payload.contact_email,
        ]
      );
    });

    it('should accept payload with only name and convert undefined optional fields to null', async () => {
      const sellerId = 'seller-456';
      const payload = {
        name: 'Another Shop',
      };

      const mockShopRow = {
        id: 'shop-456',
        seller_id: sellerId,
        name: payload.name,
        description: null,
        banner_url: null,
        contact_email: null,
        created_at: '2025-01-01T00:00:00.000Z',
      };

      (db.query as jest.Mock).mockResolvedValueOnce({
        rows: [mockShopRow],
      });

      const result = await shopsService.createShop(sellerId, payload);

      expect(result).toEqual(mockShopRow);
      expect(db.query).toHaveBeenCalledWith(
        'INSERT INTO shops (seller_id, name, description, banner_url, contact_email) VALUES ($1, $2, $3, $4, $5) RETURNING id, seller_id, name, description, banner_url, contact_email, created_at',
        [sellerId, payload.name, null, null, null]
      );
    });

    it('should throw ConflictError on seller_id UNIQUE constraint violation (PG error code 23505)', async () => {
      const sellerId = 'seller-789';
      const payload = { name: 'Shop' };

      const conflictError = new Error('Duplicate key value violates unique constraint "shops_seller_id_key"');
      (conflictError as any).code = '23505';
      (conflictError as any).constraint = 'shops_seller_id_key';

      (db.query as jest.Mock).mockRejectedValueOnce(conflictError);

      await expect(shopsService.createShop(sellerId, payload)).rejects.toThrow(
        'Seller already has a shop'
      );
    });

    it('should throw NotFoundError on FK constraint violation for non-existent seller (PG error code 23503)', async () => {
      const sellerId = 'non-existent-seller';
      const payload = { name: 'Shop' };

      const fkError = new Error('Insert or update on table "shops" violates foreign key constraint');
      (fkError as any).code = '23503';

      (db.query as jest.Mock).mockRejectedValueOnce(fkError);

      await expect(shopsService.createShop(sellerId, payload)).rejects.toThrow(
        'Seller not found'
      );
    });

    it('should re-throw unexpected errors', async () => {
      const sellerId = 'seller-123';
      const payload = { name: 'Shop' };

      const unexpectedError = new Error('Database connection failed');

      (db.query as jest.Mock).mockRejectedValueOnce(unexpectedError);

      await expect(shopsService.createShop(sellerId, payload)).rejects.toThrow(
        'Database connection failed'
      );
    });
  });

  describe('getShopBySellerId()', () => {
    it('should return shop when seller has shop', async () => {
      const sellerId = 'seller-123';
      const mockShopRow = {
        id: 'shop-123',
        seller_id: sellerId,
        name: 'Test Shop',
        description: 'Test Description',
        banner_url: 'https://example.com/banner.png',
        contact_email: 'contact@example.com',
        created_at: '2025-01-01T00:00:00.000Z',
      };

      (db.query as jest.Mock).mockResolvedValueOnce({
        rows: [mockShopRow],
      });

      const result = await shopsService.getShopBySellerId(sellerId);

      expect(result).toEqual(mockShopRow);
      expect(db.query).toHaveBeenCalledWith(
        'SELECT id, seller_id, name, description, banner_url, contact_email, created_at FROM shops WHERE seller_id = $1',
        [sellerId]
      );
    });

    it('should throw NotFoundError when seller has no shop', async () => {
      const sellerId = 'seller-no-shop';

      (db.query as jest.Mock).mockResolvedValueOnce({
        rows: [],
      });

      await expect(shopsService.getShopBySellerId(sellerId)).rejects.toThrow(
        'Shop not found'
      );
    });
  });

  describe('getShopById()', () => {
    it('should return shop by ID', async () => {
      const shopId = 'shop-123';
      const mockShopRow = {
        id: shopId,
        name: 'Test Shop',
        description: 'Test Description',
        banner_url: 'https://example.com/banner.png',
        contact_email: 'contact@example.com',
        created_at: '2025-01-01T00:00:00.000Z',
      };

      (db.query as jest.Mock).mockResolvedValueOnce({
        rows: [mockShopRow],
      });

      const result = await shopsService.getShopById(shopId);

      expect(result).toEqual(mockShopRow);
      expect(db.query).toHaveBeenCalledWith(
        'SELECT id, name, description, banner_url, contact_email, created_at FROM shops WHERE id = $1',
        [shopId]
      );
    });

    it('should throw NotFoundError if shop not found', async () => {
      const shopId = 'non-existent-shop';

      (db.query as jest.Mock).mockResolvedValueOnce({
        rows: [],
      });

      await expect(shopsService.getShopById(shopId)).rejects.toThrow(
        'Shop not found'
      );
    });
  });

  describe('updateShop()', () => {
    it('should update name and return updated shop', async () => {
      const sellerId = 'seller-123';
      const shopId = 'shop-123';
      const payload = { name: 'Updated Shop Name' };

      const mockShopCheckRow = { seller_id: sellerId };
      const mockUpdatedShopRow = {
        id: shopId,
        seller_id: sellerId,
        name: 'Updated Shop Name',
        description: null,
        banner_url: null,
        contact_email: null,
        created_at: '2025-01-01T00:00:00.000Z',
      };

      (db.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [mockShopCheckRow] })
        .mockResolvedValueOnce({ rows: [mockUpdatedShopRow] });

      const result = await shopsService.updateShop(sellerId, shopId, payload);

      expect(result).toEqual(mockUpdatedShopRow);
      expect(db.query).toHaveBeenNthCalledWith(
        1,
        'SELECT seller_id FROM shops WHERE id = $1',
        [shopId]
      );
    });

    it('should update name, description, banner_url, and contact_email', async () => {
      const sellerId = 'seller-123';
      const shopId = 'shop-123';
      const payload = {
        name: 'New Name',
        description: 'New Description',
        banner_url: 'https://example.com/new-banner.png',
        contact_email: 'new@example.com',
      };

      const mockShopCheckRow = { seller_id: sellerId };
      const mockUpdatedShopRow = {
        id: shopId,
        seller_id: sellerId,
        ...payload,
        created_at: '2025-01-01T00:00:00.000Z',
      };

      (db.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [mockShopCheckRow] })
        .mockResolvedValueOnce({ rows: [mockUpdatedShopRow] });

      const result = await shopsService.updateShop(sellerId, shopId, payload);

      expect(result).toEqual(mockUpdatedShopRow);
    });

    it('should throw ForbiddenError if requesting seller_id does not match shop seller_id', async () => {
      const sellerId = 'seller-123';
      const shopId = 'shop-456';
      const payload = { name: 'Updated Name' };

      const mockShopCheckRow = { seller_id: 'seller-999' };

      (db.query as jest.Mock).mockResolvedValueOnce({
        rows: [mockShopCheckRow],
      });

      await expect(
        shopsService.updateShop(sellerId, shopId, payload)
      ).rejects.toThrow('Access denied');
    });

    it('should throw NotFoundError if shop not found', async () => {
      const sellerId = 'seller-123';
      const shopId = 'non-existent-shop';
      const payload = { name: 'Updated Name' };

      (db.query as jest.Mock).mockResolvedValueOnce({
        rows: [],
      });

      await expect(
        shopsService.updateShop(sellerId, shopId, payload)
      ).rejects.toThrow('Shop not found');
    });

    it('should return current shop when no fields provided to update', async () => {
      const sellerId = 'seller-123';
      const shopId = 'shop-123';
      const payload = {};

      const mockShopCheckRow = { seller_id: sellerId };
      const mockCurrentShopRow = {
        id: shopId,
        seller_id: sellerId,
        name: 'Test Shop',
        description: null,
        banner_url: null,
        contact_email: null,
        created_at: '2025-01-01T00:00:00.000Z',
      };

      (db.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [mockShopCheckRow] })
        .mockResolvedValueOnce({ rows: [mockCurrentShopRow] });

      const result = await shopsService.updateShop(sellerId, shopId, payload);

      expect(result).toEqual(mockCurrentShopRow);
    });
  });
});
