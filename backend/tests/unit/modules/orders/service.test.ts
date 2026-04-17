import { OrdersService } from '../../../../src/modules/orders/service';
import { db } from '../../../../src/db/client';
import { redis } from '../../../../src/redis/client';
import { ConflictError, PaymentError, NotFoundError, ForbiddenError, UnprocessableError, ValidationError } from '../../../../src/errors';

jest.mock('../../../../src/db/client');
jest.mock('../../../../src/redis/client');

describe('OrdersService - Unit Tests', () => {
  let ordersService: OrdersService;
  let mockClient: any;

  beforeEach(() => {
    jest.resetAllMocks();
    jest.clearAllMocks();
    ordersService = new OrdersService();

    mockClient = {
      query: jest.fn(),
      release: jest.fn(),
    };

    (db.connect as jest.Mock).mockResolvedValue(mockClient);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('checkout()', () => {
    it('should throw ValidationError if cart is empty', async () => {
      const buyerId = 'buyer-123';
      const payload = {
        shipping_address: {
          street: '123 Main St',
          city: 'New York',
          state: 'NY',
          zip: '10001',
          country: 'USA',
        },
      };

      (redis.hgetall as jest.Mock).mockResolvedValueOnce({});

      await expect(ordersService.checkout(buyerId, payload)).rejects.toThrow('Cart is empty');
    });

    it('should create order with status confirmed when stock is sufficient', async () => {
      const buyerId = 'buyer-123';
      const payload = {
        shipping_address: {
          street: '123 Main St',
          city: 'New York',
          state: 'NY',
          zip: '10001',
          country: 'USA',
        },
      };

      const cartData = { 'product-1': '2' };
      const mockProducts = [{ id: 'product-1', price: '10.00', stock: 10 }];
      const mockOrder = {
        id: 'order-123',
        buyer_id: buyerId,
        status: 'confirmed',
        shipping_address: JSON.stringify(payload.shipping_address),
        total_amount: '20.00',
        transaction_id: 'txn-123',
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
      };
      const mockOrderItems = [
        { product_id: 'product-1', quantity: 2, unit_price: '10.00' },
      ];

      (redis.hgetall as jest.Mock).mockResolvedValueOnce(cartData);
      (mockClient.query as jest.Mock)
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: mockProducts }) // SELECT FOR UPDATE
        .mockResolvedValueOnce(undefined) // UPDATE stock
        .mockResolvedValueOnce({ rows: [mockOrder] }) // INSERT order
        .mockResolvedValueOnce(undefined) // INSERT order_items
        .mockResolvedValueOnce(undefined) // COMMIT
        .mockResolvedValueOnce({ rows: [mockOrder] }) // getOrder query
        .mockResolvedValueOnce({ rows: mockOrderItems }); // getOrder items
      (redis.del as jest.Mock).mockResolvedValueOnce(1);
      (db.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [mockOrder] })
        .mockResolvedValueOnce({ rows: mockOrderItems });

      const result = await ordersService.checkout(buyerId, payload);

      expect(result.status).toBe('confirmed');
      expect(result.items).toHaveLength(1);
      expect(redis.del).toHaveBeenCalledWith(`cart:${buyerId}`);
    });

    it('should decrement stock on successful checkout', async () => {
      const buyerId = 'buyer-123';
      const payload = {
        shipping_address: {
          street: '123 Main St',
          city: 'New York',
          state: 'NY',
          zip: '10001',
          country: 'USA',
        },
      };

      const cartData = { 'product-1': '2' };
      const mockProducts = [{ id: 'product-1', price: '10.00', stock: 10 }];
      const mockOrder = {
        id: 'order-123',
        buyer_id: buyerId,
        status: 'confirmed',
        shipping_address: JSON.stringify(payload.shipping_address),
        total_amount: '20.00',
        transaction_id: 'txn-123',
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
      };
      const mockOrderItems = [
        { product_id: 'product-1', quantity: 2, unit_price: '10.00' },
      ];

      (redis.hgetall as jest.Mock).mockResolvedValueOnce(cartData);
      (mockClient.query as jest.Mock)
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: mockProducts }) // SELECT FOR UPDATE
        .mockResolvedValueOnce(undefined) // UPDATE stock
        .mockResolvedValueOnce({ rows: [mockOrder] }) // INSERT order
        .mockResolvedValueOnce(undefined) // INSERT order_items
        .mockResolvedValueOnce(undefined) // COMMIT
        .mockResolvedValueOnce({ rows: [mockOrder] }) // getOrder query
        .mockResolvedValueOnce({ rows: mockOrderItems }); // getOrder items
      (redis.del as jest.Mock).mockResolvedValueOnce(1);
      (db.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [mockOrder] })
        .mockResolvedValueOnce({ rows: mockOrderItems });

      await ordersService.checkout(buyerId, payload);

      const updateStockCall = (mockClient.query as jest.Mock).mock.calls.find(
        call => call[0].includes('UPDATE products SET stock')
      );
      expect(updateStockCall).toBeDefined();
      expect(updateStockCall[1]).toEqual([2, 'product-1']);
    });

    it('should throw ConflictError if insufficient stock', async () => {
      const buyerId = 'buyer-123';
      const payload = {
        shipping_address: {
          street: '123 Main St',
          city: 'New York',
          state: 'NY',
          zip: '10001',
          country: 'USA',
        },
      };

      const cartData = { 'product-1': '10' };
      const mockProducts = [{ id: 'product-1', price: '10.00', stock: 5 }];

      (redis.hgetall as jest.Mock).mockResolvedValueOnce(cartData);
      (mockClient.query as jest.Mock)
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: mockProducts }) // SELECT FOR UPDATE
        .mockResolvedValueOnce(undefined); // ROLLBACK
      (mockClient.query as jest.Mock).mockResolvedValueOnce(undefined); // ROLLBACK

      await expect(ordersService.checkout(buyerId, payload)).rejects.toThrow(ConflictError);
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });

    it('should throw PaymentError if payment fails', async () => {
      const buyerId = 'buyer-123';
      const payload = {
        shipping_address: {
          street: '123 Main St',
          city: 'New York',
          state: 'NY',
          zip: '10001',
          country: 'USA',
        },
      };

      const cartData = { 'product-1': '2' };
      const mockProducts = [{ id: 'product-1', price: '10.00', stock: 10 }];

      (redis.hgetall as jest.Mock).mockResolvedValueOnce(cartData);

      // Mock processMockPayment to return failure
      jest.spyOn(ordersService as any, 'processMockPayment').mockResolvedValueOnce({
        status: 'failed',
        transaction_id: '',
      });

      (mockClient.query as jest.Mock)
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: mockProducts }) // SELECT FOR UPDATE
        .mockResolvedValueOnce(undefined); // ROLLBACK
      (mockClient.query as jest.Mock).mockResolvedValueOnce(undefined); // ROLLBACK

      await expect(ordersService.checkout(buyerId, payload)).rejects.toThrow(PaymentError);
    });

    it('should capture product unit_price at purchase time', async () => {
      const buyerId = 'buyer-123';
      const payload = {
        shipping_address: {
          street: '123 Main St',
          city: 'New York',
          state: 'NY',
          zip: '10001',
          country: 'USA',
        },
      };

      const cartData = { 'product-1': '2' };
      const mockProducts = [{ id: 'product-1', price: '10.00', stock: 10 }];
      const mockOrder = {
        id: 'order-123',
        buyer_id: buyerId,
        status: 'confirmed',
        shipping_address: JSON.stringify(payload.shipping_address),
        total_amount: '20.00',
        transaction_id: 'txn-123',
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
      };
      const mockOrderItems = [
        { product_id: 'product-1', quantity: 2, unit_price: '10.00' },
      ];

      (redis.hgetall as jest.Mock).mockResolvedValueOnce(cartData);
      (mockClient.query as jest.Mock)
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: mockProducts }) // SELECT FOR UPDATE
        .mockResolvedValueOnce(undefined) // UPDATE stock
        .mockResolvedValueOnce({ rows: [mockOrder] }) // INSERT order
        .mockResolvedValueOnce(undefined) // INSERT order_items
        .mockResolvedValueOnce(undefined) // COMMIT
        .mockResolvedValueOnce({ rows: [mockOrder] }) // getOrder query
        .mockResolvedValueOnce({ rows: mockOrderItems }); // getOrder items
      (redis.del as jest.Mock).mockResolvedValueOnce(1);
      (db.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [mockOrder] })
        .mockResolvedValueOnce({ rows: mockOrderItems });

      const result = await ordersService.checkout(buyerId, payload);

      expect(result.items[0].unit_price).toBe('10.00');
    });

    it('should rollback DB and Redis on payment failure', async () => {
      const buyerId = 'buyer-123';
      const payload = {
        shipping_address: {
          street: '123 Main St',
          city: 'New York',
          state: 'NY',
          zip: '10001',
          country: 'USA',
        },
      };

      const cartData = { 'product-1': '2' };
      const mockProducts = [{ id: 'product-1', price: '10.00', stock: 10 }];

      (redis.hgetall as jest.Mock).mockResolvedValueOnce(cartData);

      // Mock payment failure
      jest.spyOn(ordersService as any, 'processMockPayment').mockResolvedValueOnce({
        status: 'failed',
        transaction_id: '',
      });

      (mockClient.query as jest.Mock)
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: mockProducts }) // SELECT FOR UPDATE
        .mockResolvedValueOnce(undefined); // ROLLBACK

      await expect(ordersService.checkout(buyerId, payload)).rejects.toThrow(PaymentError);

      // Verify rollback was called
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      // Verify cart was NOT cleared
      expect(redis.del).not.toHaveBeenCalled();
    });
  });

  describe('getOrders()', () => {
    it('should return paginated orders most recent first', async () => {
      const buyerId = 'buyer-123';
      const params = { page: 1, limit: 10 };

      const mockOrders = [
        {
          id: 'order-2',
          buyer_id: buyerId,
          status: 'confirmed',
          shipping_address: JSON.stringify({ street: '123 St', city: 'NY', state: 'NY', zip: '10001', country: 'USA' }),
          total_amount: '30.00',
          transaction_id: 'txn-2',
          created_at: '2025-01-02T00:00:00Z',
          updated_at: '2025-01-02T00:00:00Z',
        },
        {
          id: 'order-1',
          buyer_id: buyerId,
          status: 'pending',
          shipping_address: JSON.stringify({ street: '456 Ave', city: 'LA', state: 'CA', zip: '90001', country: 'USA' }),
          total_amount: '20.00',
          transaction_id: 'txn-1',
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z',
        },
      ];

      const mockItems = [
        { order_id: 'order-2', product_id: 'product-1', quantity: 3, unit_price: '10.00' },
        { order_id: 'order-1', product_id: 'product-2', quantity: 2, unit_price: '10.00' },
      ];

      (db.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ count: '2' }] }) // count
        .mockResolvedValueOnce({ rows: mockOrders }) // orders
        .mockResolvedValueOnce({ rows: mockItems }); // items

      const result = await ordersService.getOrders(buyerId, params);

      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.data).toHaveLength(2);
      expect(result.data[0].id).toBe('order-2');
      expect(result.data[1].id).toBe('order-1');
    });

    it('should handle pagination with custom page and limit', async () => {
      const buyerId = 'buyer-123';
      const params = { page: 2, limit: 20 };

      (db.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ count: '50' }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      const result = await ordersService.getOrders(buyerId, params);

      expect(result.total).toBe(50);
      expect(result.page).toBe(2);
      expect(result.limit).toBe(20);
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT $2 OFFSET $3'),
        [buyerId, 20, 20]
      );
    });
  });

  describe('getOrder()', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should return order for buyer', async () => {
      const buyerId = 'buyer-123';
      const orderId = 'order-123';

      const mockOrder = {
        id: orderId,
        buyer_id: buyerId,
        status: 'confirmed',
        shipping_address: JSON.stringify({ street: '123 St', city: 'NY', state: 'NY', zip: '10001', country: 'USA' }),
        total_amount: '20.00',
        transaction_id: 'txn-123',
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
      };

      const mockItems = [{ product_id: 'product-1', quantity: 2, unit_price: '10.00' }];

      (db.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [mockOrder] })
        .mockResolvedValueOnce({ rows: mockItems });

      const result = await ordersService.getOrder(buyerId, orderId);

      expect(result.id).toBe(orderId);
      expect(result.buyer_id).toBe(buyerId);
      expect(result.status).toBe('confirmed');
      expect(result.items).toHaveLength(1);
    });

    it('should throw NotFoundError if buyer is not order owner', async () => {
      const buyerId = 'buyer-123';
      const orderId = 'order-456';

      (db.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      await expect(ordersService.getOrder(buyerId, orderId)).rejects.toThrow('Order not found');
    });
  });

  describe('getSellerOrders()', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should return orders containing seller products only', async () => {
      const sellerId = 'seller-123';
      const shopId = 'shop-123';

      const mockOrders = [
        {
          id: 'order-1',
          buyer_id: 'buyer-1',
          status: 'confirmed',
          shipping_address: JSON.stringify({ street: '123 St', city: 'NY', state: 'NY', zip: '10001', country: 'USA' }),
          total_amount: '20.00',
          transaction_id: 'txn-1',
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z',
        },
      ];

      const mockItems = [{ order_id: 'order-1', product_id: 'product-1', quantity: 2, unit_price: '10.00' }];

      (db.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ id: shopId }] }) // shop query
        .mockResolvedValueOnce({ rows: [{ count: '1' }] }) // count
        .mockResolvedValueOnce({ rows: mockOrders }) // orders
        .mockResolvedValueOnce({ rows: mockItems }); // items

      const result = await ordersService.getSellerOrders(sellerId, {});

      expect(result.data).toHaveLength(1);
      expect(result.data[0].id).toBe('order-1');
      expect(result.total).toBe(1);
    });

    it('should return empty result if seller has no shop', async () => {
      const sellerId = 'seller-no-shop';

      (db.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      const result = await ordersService.getSellerOrders(sellerId, {});

      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  describe('getSellerOrder()', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should return order if seller has products in it', async () => {
      const sellerId = 'seller-123';
      const shopId = 'shop-123';
      const orderId = 'order-123';

      const mockOrder = {
        id: orderId,
        buyer_id: 'buyer-1',
        status: 'confirmed',
        shipping_address: JSON.stringify({ street: '123 St', city: 'NY', state: 'NY', zip: '10001', country: 'USA' }),
        total_amount: '20.00',
        transaction_id: 'txn-1',
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
      };

      const mockItems = [{ product_id: 'product-1', quantity: 2, unit_price: '10.00' }];

      (db.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ id: shopId }] }) // shop
        .mockResolvedValueOnce({ rows: [mockOrder] }) // order
        .mockResolvedValueOnce({ rows: mockItems }); // items

      const result = await ordersService.getSellerOrder(sellerId, orderId);

      expect(result.id).toBe(orderId);
      expect(result.items).toHaveLength(1);
    });

    it('should throw NotFoundError if seller has no products in order', async () => {
      const sellerId = 'seller-123';
      const shopId = 'shop-123';
      const orderId = 'order-456';

      (db.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ id: shopId }] }) // shop
        .mockResolvedValueOnce({ rows: [] }); // no order

      await expect(ordersService.getSellerOrder(sellerId, orderId)).rejects.toThrow('Order not found');
    });
  });

  describe('updateSellerOrderStatus()', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should allow valid transition pending to confirmed', async () => {
      const sellerId = 'seller-123';
      const shopId = 'shop-123';
      const orderId = 'order-123';

      const mockOrder = {
        id: orderId,
        status: 'pending',
        buyer_id: 'buyer-1',
        shipping_address: JSON.stringify({ street: '123 St', city: 'NY', state: 'NY', zip: '10001', country: 'USA' }),
        total_amount: '20.00',
        transaction_id: 'txn-1',
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
      };

      const mockItems = [{ product_id: 'product-1', quantity: 2, unit_price: '10.00' }];

      (db.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [mockOrder] }) // order exists
        .mockResolvedValueOnce({ rows: [{ id: shopId }] }) // seller shop
        .mockResolvedValueOnce({ rows: [{ id: orderId }] }) // seller has products
        .mockResolvedValueOnce({ rows: [{ ...mockOrder, status: 'confirmed' }] }) // updated order
        .mockResolvedValueOnce({ rows: mockItems }); // items

      const result = await ordersService.updateSellerOrderStatus(sellerId, orderId, 'confirmed');

      expect(result.status).toBe('confirmed');
    });

    it('should return 422 for invalid transition pending to shipped', async () => {
      const sellerId = 'seller-123';
      const shopId = 'shop-123';
      const orderId = 'order-123';

      const mockOrder = {
        id: orderId,
        status: 'pending',
      };

      (db.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [mockOrder] }) // order exists
        .mockResolvedValueOnce({ rows: [{ id: shopId }] }) // seller shop
        .mockResolvedValueOnce({ rows: [{ id: orderId }] }); // seller has products

      await expect(
        ordersService.updateSellerOrderStatus(sellerId, orderId, 'shipped')
      ).rejects.toThrow(UnprocessableError);

      const error: any = new UnprocessableError('pending', ['confirmed']);
      expect(error.currentState).toBe('pending');
      expect(error.validNextStates).toEqual(['confirmed']);
    });

    it('should throw ForbiddenError if seller does not have products in order', async () => {
      const sellerId = 'seller-123';
      const shopId = 'shop-123';
      const orderId = 'order-456';

      const mockOrder = {
        id: orderId,
        status: 'pending',
      };

      (db.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [mockOrder] }) // order exists
        .mockResolvedValueOnce({ rows: [{ id: shopId }] }) // seller shop
        .mockResolvedValueOnce({ rows: [] }); // seller has NO products

      await expect(
        ordersService.updateSellerOrderStatus(sellerId, orderId, 'confirmed')
      ).rejects.toThrow('Access denied');
    });

    it('should enforce full state machine: pending→confirmed→shipped→delivered→completed', async () => {
      const sellerId = 'seller-123';
      const shopId = 'shop-123';
      const orderId = 'order-123';

      const transitions = [
        { from: 'pending', to: 'confirmed', valid: true },
        { from: 'confirmed', to: 'shipped', valid: true },
        { from: 'shipped', to: 'delivered', valid: true },
        { from: 'delivered', to: 'completed', valid: true },
        { from: 'pending', to: 'shipped', valid: false },
        { from: 'confirmed', to: 'delivered', valid: false },
        { from: 'completed', to: 'pending', valid: false },
      ];

      for (const transition of transitions) {
        jest.clearAllMocks();

        const mockOrder = {
          id: orderId,
          status: transition.from,
        };

        if (transition.valid) {
          const updatedOrder = {
            ...mockOrder,
            status: transition.to,
            buyer_id: 'buyer-1',
            shipping_address: JSON.stringify({ street: '123 St', city: 'NY', state: 'NY', zip: '10001', country: 'USA' }),
            total_amount: '20.00',
            transaction_id: 'txn-1',
            created_at: '2025-01-01T00:00:00Z',
            updated_at: '2025-01-01T00:00:00Z',
          };

          const mockItems = [{ product_id: 'product-1', quantity: 2, unit_price: '10.00' }];

          (db.query as jest.Mock)
            .mockResolvedValueOnce({ rows: [mockOrder] })
            .mockResolvedValueOnce({ rows: [{ id: shopId }] })
            .mockResolvedValueOnce({ rows: [{ id: orderId }] })
            .mockResolvedValueOnce({ rows: [updatedOrder] })
            .mockResolvedValueOnce({ rows: mockItems });

          const result = await ordersService.updateSellerOrderStatus(sellerId, orderId, transition.to);
          expect(result.status).toBe(transition.to);
        } else {
          (db.query as jest.Mock)
            .mockResolvedValueOnce({ rows: [mockOrder] })
            .mockResolvedValueOnce({ rows: [{ id: shopId }] })
            .mockResolvedValueOnce({ rows: [{ id: orderId }] });

          await expect(
            ordersService.updateSellerOrderStatus(sellerId, orderId, transition.to)
          ).rejects.toThrow(UnprocessableError);
        }
      }
    });
  });
});
