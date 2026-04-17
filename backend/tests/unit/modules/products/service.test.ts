import { ProductsService } from '../../../../src/modules/products/service';
import { db } from '../../../../src/db/client';
import { ConflictError, NotFoundError, ForbiddenError, ValidationError } from '../../../../src/errors';

jest.mock('../../../../src/db/client');

describe('Products Service - Unit Tests', () => {
  let productsService: ProductsService;

  beforeEach(() => {
    jest.clearAllMocks();
    productsService = new ProductsService();
  });

  describe('createProduct()', () => {
    it('should accept valid payload and return product object without fakestore_id', async () => {
      const sellerId = 'seller-123';
      const shopId = 'shop-123';
      const payload = {
        title: 'Test Product',
        description: 'Test Description',
        price: 29.99,
        image_url: 'https://example.com/image.jpg',
        category: 'Electronics',
        stock: 50,
      };

      const mockShopRow = { id: shopId };
      const mockProductRow = {
        id: 'product-123',
        shop_id: shopId,
        fakestore_id: 123,
        title: payload.title,
        description: payload.description,
        price: payload.price,
        image_url: payload.image_url,
        category: payload.category,
        stock: payload.stock,
        aggregate_rating: 0,
        review_count: 0,
        created_at: '2025-01-01T00:00:00.000Z',
        updated_at: '2025-01-01T00:00:00.000Z',
      };

      (db.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [mockShopRow] })
        .mockResolvedValueOnce({ rows: [mockProductRow] });

      const result = await productsService.createProduct(sellerId, payload);

      expect(result).not.toHaveProperty('fakestore_id');
      expect(result).toEqual({
        id: 'product-123',
        shop_id: shopId,
        title: payload.title,
        description: payload.description,
        price: payload.price,
        image_url: payload.image_url,
        category: payload.category,
        stock: payload.stock,
        aggregate_rating: 0,
        review_count: 0,
        created_at: '2025-01-01T00:00:00.000Z',
        updated_at: '2025-01-01T00:00:00.000Z',
      });
    });

    it('should throw NotFoundError if seller has no shop', async () => {
      const sellerId = 'seller-no-shop';
      const payload = {
        title: 'Test Product',
        price: 29.99,
        stock: 50,
      };

      (db.query as jest.Mock).mockResolvedValueOnce({
        rows: [],
      });

      await expect(productsService.createProduct(sellerId, payload)).rejects.toThrow(
        'Seller must have a shop to create products'
      );
    });

    it('should re-throw unexpected errors', async () => {
      const sellerId = 'seller-123';
      const payload = {
        title: 'Test Product',
        price: 29.99,
        stock: 50,
      };

      const unexpectedError = new Error('Database connection failed');

      (db.query as jest.Mock).mockRejectedValueOnce(unexpectedError);

      await expect(productsService.createProduct(sellerId, payload)).rejects.toThrow(
        'Database connection failed'
      );
    });
  });

  describe('getProducts()', () => {
    it('should return paginated products with default page and limit', async () => {
      const mockProductRows: any[] = [
        {
          id: 'product-1',
          shop_id: 'shop-1',
          fakestore_id: 1,
          title: 'Product 1',
          description: 'Desc 1',
          price: 10.0,
          image_url: 'https://example.com/1.jpg',
          category: 'Electronics',
          stock: 50,
          aggregate_rating: 4.5,
          review_count: 10,
          created_at: '2025-01-01T00:00:00.000Z',
          updated_at: '2025-01-01T00:00:00.000Z',
        },
      ];

      (db.query as jest.Mock).mockResolvedValueOnce({
        rows: mockProductRows,
      });

      const result = await productsService.getProducts({});

      expect(result).toHaveLength(1);
      expect(result[0]).not.toHaveProperty('fakestore_id');
      expect(result[0]).toHaveProperty('id', 'product-1');
      expect(result[0]).toHaveProperty('title', 'Product 1');
      expect(db.query).toHaveBeenCalled();
    });

    it('should filter by search term (case-insensitive)', async () => {
      const mockProductRows: any[] = [];

      (db.query as jest.Mock).mockResolvedValueOnce({
        rows: mockProductRows,
      });

      await productsService.getProducts({ search: 'laptop' });

      expect(db.query).toHaveBeenCalled();
      const call = (db.query as jest.Mock).mock.calls[0];
      expect(call[0]).toContain('ILIKE');
      expect(call[1][0]).toBe('%laptop%');
      expect(call[1][1]).toBe(10); // limit
      expect(call[1][2]).toBe(0); // offset for page 1
    });

    it('should filter by search term matching category (case-insensitive)', async () => {
      const mockProductRows: any[] = [];

      (db.query as jest.Mock).mockResolvedValueOnce({
        rows: mockProductRows,
      });

      await productsService.getProducts({ search: 'electronics' });

      expect(db.query).toHaveBeenCalled();
      const call = (db.query as jest.Mock).mock.calls[0];
      expect(call[0]).toContain('ILIKE');
      expect(call[0]).toContain('category ILIKE');
      expect(call[1][0]).toBe('%electronics%');
      expect(call[1][1]).toBe(10); // limit
      expect(call[1][2]).toBe(0); // offset for page 1
    });

    it('should filter by category (exact match)', async () => {
      const mockProductRows: any[] = [];

      (db.query as jest.Mock).mockResolvedValueOnce({
        rows: mockProductRows,
      });

      await productsService.getProducts({ category: 'Electronics' });

      expect(db.query).toHaveBeenCalled();
      const call = (db.query as jest.Mock).mock.calls[0];
      expect(call[0]).toContain('category = $1');
      expect(call[1][0]).toBe('Electronics');
      expect(call[1][1]).toBe(10); // limit
      expect(call[1][2]).toBe(0); // offset for page 1
    });

    it('should filter by search and category together', async () => {
      const mockProductRows: any[] = [];

      (db.query as jest.Mock).mockResolvedValueOnce({
        rows: mockProductRows,
      });

      await productsService.getProducts({ search: 'laptop', category: 'Electronics' });

      expect(db.query).toHaveBeenCalled();
      const call = (db.query as jest.Mock).mock.calls[0];
      expect(call[0]).toContain('ILIKE');
      expect(call[0]).toContain('category = $');
    });

    it('should not expose fakestore_id in results', async () => {
      const mockProductRows: any[] = [
        {
          id: 'product-1',
          shop_id: 'shop-1',
          fakestore_id: 123,
          title: 'Product 1',
          description: 'Desc 1',
          price: 10.0,
          image_url: 'https://example.com/1.jpg',
          category: 'Electronics',
          stock: 50,
          aggregate_rating: 4.5,
          review_count: 10,
          created_at: '2025-01-01T00:00:00.000Z',
          updated_at: '2025-01-01T00:00:00.000Z',
        },
      ];

      (db.query as jest.Mock).mockResolvedValueOnce({
        rows: mockProductRows,
      });

      const result = await productsService.getProducts({});

      expect(result[0]).not.toHaveProperty('fakestore_id');
    });

    it('should handle custom page and limit', async () => {
      const mockProductRows: any[] = [];

      (db.query as jest.Mock).mockResolvedValueOnce({
        rows: mockProductRows,
      });

      await productsService.getProducts({ page: 2, limit: 20 });

      expect(db.query).toHaveBeenCalled();
      const call = (db.query as jest.Mock).mock.calls[0];
      const lastTwoParams = call[1].slice(-2);
      expect(lastTwoParams[0]).toBe(20); // limit
      expect(lastTwoParams[1]).toBe(20); // offset for page 2: (2-1)*20 = 20
    });
  });

  describe('getProductById()', () => {
    it('should return product by ID without fakestore_id', async () => {
      const productId = 'product-123';
      const mockProductRow = {
        id: productId,
        shop_id: 'shop-1',
        fakestore_id: 123,
        title: 'Test Product',
        description: 'Test Description',
        price: 29.99,
        image_url: 'https://example.com/image.jpg',
        category: 'Electronics',
        stock: 50,
        aggregate_rating: 4.5,
        review_count: 10,
        created_at: '2025-01-01T00:00:00.000Z',
        updated_at: '2025-01-01T00:00:00.000Z',
      };

      (db.query as jest.Mock).mockResolvedValueOnce({
        rows: [mockProductRow],
      });

      const result = await productsService.getProductById(productId);

      expect(result).not.toHaveProperty('fakestore_id');
      expect(result).toEqual({
        id: productId,
        shop_id: 'shop-1',
        title: 'Test Product',
        description: 'Test Description',
        price: 29.99,
        image_url: 'https://example.com/image.jpg',
        category: 'Electronics',
        stock: 50,
        aggregate_rating: 4.5,
        review_count: 10,
        created_at: '2025-01-01T00:00:00.000Z',
        updated_at: '2025-01-01T00:00:00.000Z',
      });
    });

    it('should throw NotFoundError if product not found', async () => {
      const productId = 'non-existent-product';

      (db.query as jest.Mock).mockResolvedValueOnce({
        rows: [],
      });

      await expect(productsService.getProductById(productId)).rejects.toThrow(
        'Product not found'
      );
    });
  });

  describe('updateProduct()', () => {
    it('should update product for seller and return without fakestore_id', async () => {
      const sellerId = 'seller-123';
      const productId = 'product-123';
      const payload = { title: 'Updated Title', price: 39.99 };

      const mockProductCheckRow = { shop_id: 'shop-123' };
      const mockShopRow = { id: 'shop-123' };
      const mockUpdatedProductRow = {
        id: productId,
        shop_id: 'shop-123',
        fakestore_id: 123,
        title: 'Updated Title',
        description: 'Test Description',
        price: 39.99,
        image_url: 'https://example.com/image.jpg',
        category: 'Electronics',
        stock: 50,
        aggregate_rating: 4.5,
        review_count: 10,
        created_at: '2025-01-01T00:00:00.000Z',
        updated_at: '2025-01-01T00:00:00.000Z',
      };

      (db.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [mockProductCheckRow] })
        .mockResolvedValueOnce({ rows: [mockShopRow] })
        .mockResolvedValueOnce({ rows: [mockUpdatedProductRow] });

      const result = await productsService.updateProduct(sellerId, productId, payload);

      expect(result).not.toHaveProperty('fakestore_id');
      expect(result).toEqual({
        id: productId,
        shop_id: 'shop-123',
        title: 'Updated Title',
        description: 'Test Description',
        price: 39.99,
        image_url: 'https://example.com/image.jpg',
        category: 'Electronics',
        stock: 50,
        aggregate_rating: 4.5,
        review_count: 10,
        created_at: '2025-01-01T00:00:00.000Z',
        updated_at: '2025-01-01T00:00:00.000Z',
      });
    });

    it('should throw NotFoundError if product not found', async () => {
      const sellerId = 'seller-123';
      const productId = 'non-existent-product';
      const payload = { title: 'Updated Title' };

      (db.query as jest.Mock).mockResolvedValueOnce({
        rows: [],
      });

      await expect(
        productsService.updateProduct(sellerId, productId, payload)
      ).rejects.toThrow('Product not found');
    });

    it('should throw ForbiddenError if product does not belong to seller', async () => {
      const sellerId = 'seller-123';
      const productId = 'product-456';
      const payload = { title: 'Updated Title' };

      const mockProductCheckRow = { shop_id: 'shop-999' };
      const mockShopRow = null;

      (db.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [mockProductCheckRow] })
        .mockResolvedValueOnce({ rows: [] });

      await expect(
        productsService.updateProduct(sellerId, productId, payload)
      ).rejects.toThrow('Access denied');
    });
  });

  describe('deleteProduct()', () => {
    it('should delete product for seller', async () => {
      const sellerId = 'seller-123';
      const productId = 'product-123';

      const mockProductCheckRow = { shop_id: 'shop-123' };
      const mockShopRow = { id: 'shop-123' };

      (db.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [mockProductCheckRow] })
        .mockResolvedValueOnce({ rows: [mockShopRow] })
        .mockResolvedValueOnce({ rows: [] });

      await productsService.deleteProduct(sellerId, productId);

      expect(db.query).toHaveBeenCalledTimes(3);
    });

    it('should throw NotFoundError if product not found', async () => {
      const sellerId = 'seller-123';
      const productId = 'non-existent-product';

      (db.query as jest.Mock).mockResolvedValueOnce({
        rows: [],
      });

      await expect(productsService.deleteProduct(sellerId, productId)).rejects.toThrow(
        'Product not found'
      );
    });

    it('should throw ForbiddenError if product does not belong to seller', async () => {
      const sellerId = 'seller-123';
      const productId = 'product-456';

      const mockProductCheckRow = { shop_id: 'shop-999' };

      (db.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [mockProductCheckRow] })
        .mockResolvedValueOnce({ rows: [] });

      await expect(productsService.deleteProduct(sellerId, productId)).rejects.toThrow(
        'Access denied'
      );
    });
  });

  describe('getMyProducts()', () => {
    it('should return empty result with pagination metadata when seller has no shop', async () => {
      const sellerId = 'seller-no-shop';

      (db.query as jest.Mock).mockResolvedValueOnce({
        rows: [],
      });

      const result = await productsService.getMyProducts(sellerId, { page: 1, limit: 10 });

      expect(result).toEqual({
        data: [],
        total: 0,
        page: 1,
        limit: 10,
      });
    });

    it('should return paginated list of seller\'s products without fakestore_id', async () => {
      const sellerId = 'seller-123';
      const shopId = 'shop-123';

      const mockProductRows = [
        {
          id: 'product-1',
          shop_id: shopId,
          fakestore_id: 1,
          title: 'Product 1',
          description: 'Desc 1',
          price: 10.0,
          image_url: 'https://example.com/1.jpg',
          category: 'Electronics',
          stock: 50,
          aggregate_rating: 4.5,
          review_count: 10,
          created_at: '2025-01-01T00:00:00.000Z',
          updated_at: '2025-01-01T00:00:00.000Z',
        },
      ];

      (db.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ id: shopId }] })
        .mockResolvedValueOnce({ rows: [{ count: '1' }] })
        .mockResolvedValueOnce({ rows: mockProductRows });

      const result = await productsService.getMyProducts(sellerId, { page: 1, limit: 10 });

      expect(result.data).toHaveLength(1);
      expect(result.data[0]).not.toHaveProperty('fakestore_id');
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.data[0]).toEqual({
        id: 'product-1',
        shop_id: shopId,
        title: 'Product 1',
        description: 'Desc 1',
        price: 10.0,
        image_url: 'https://example.com/1.jpg',
        category: 'Electronics',
        stock: 50,
        aggregate_rating: 4.5,
        review_count: 10,
        created_at: '2025-01-01T00:00:00.000Z',
        updated_at: '2025-01-01T00:00:00.000Z',
      });
    });

    it('should handle custom page and limit parameters', async () => {
      const sellerId = 'seller-123';
      const shopId = 'shop-123';

      (db.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ id: shopId }] })
        .mockResolvedValueOnce({ rows: [{ count: '50' }] })
        .mockResolvedValueOnce({ rows: [] });

      const result = await productsService.getMyProducts(sellerId, { page: 2, limit: 20 });

      expect(result.page).toBe(2);
      expect(result.limit).toBe(20);
      expect(result.total).toBe(50);
      expect(db.query).toHaveBeenCalledTimes(3);
      // Verify the query was called with correct offset
      const productQueryCall = (db.query as jest.Mock).mock.calls[2];
      expect(productQueryCall[1][1]).toBe(20); // limit
      expect(productQueryCall[1][2]).toBe(20); // offset for page 2: (2-1)*20
    });
  });
});
