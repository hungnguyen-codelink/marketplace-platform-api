import { redis } from '../../redis/client';
import { db } from '../../db/client';
import { NotFoundError, ForbiddenError, ConflictError, PaymentError, UnprocessableError, ValidationError } from '../../errors';

export interface ShippingAddress {
  street: string;
  city: string;
  state: string;
  zip: string;
  country: string;
}

export interface OrderItem {
  product_id: string;
  quantity: number;
  unit_price: string;
}

export interface OrderResponse {
  id: string;
  buyer_id: string;
  status: string;
  shipping_address: ShippingAddress;
  total_amount: string;
  transaction_id?: string;
  items: OrderItem[];
  created_at: string;
  updated_at: string;
}

export interface CheckoutPayload {
  shipping_address: ShippingAddress;
}

export interface GetOrdersParams {
  page?: number;
  limit?: number;
  status?: string;
}

export interface PaginatedOrderResponse {
  data: OrderResponse[];
  total: number;
  page: number;
  limit: number;
}

// State machine definition
const STATE_TRANSITIONS: Record<string, string[]> = {
  pending: ['confirmed'],
  confirmed: ['shipped'],
  shipped: ['delivered'],
  delivered: ['completed'],
  completed: [],
};

export class OrdersService {
  async checkout(buyerId: string, payload: CheckoutPayload): Promise<OrderResponse> {
    const { shipping_address } = payload;

    // Get cart from Redis
    const cartData = await redis.hgetall(`cart:${buyerId}`);

    if (!cartData || Object.keys(cartData).length === 0) {
      throw new ValidationError('Cart is empty');
    }

    const cartItems = Object.entries(cartData).map(([productId, qtyStr]) => ({
      product_id: productId,
      quantity: parseInt(qtyStr, 10),
    }));

    // Use transaction for atomic checkout
    const client = await db.connect();

    try {
      await client.query('BEGIN');

      // SELECT FOR UPDATE to lock products
      const productIds = cartItems.map((item) => item.product_id);
      const placeholders = productIds.map((_, i) => `$${i + 1}`).join(',');
      const productsResult = await client.query(
        `SELECT id, price, stock FROM products WHERE id IN (${placeholders}) FOR UPDATE`,
        productIds
      );

      if (productsResult.rows.length !== productIds.length) {
        throw new NotFoundError('One or more products not found');
      }

      const productMap = new Map<string, { price: number; stock: number }>();
      for (const p of productsResult.rows) {
        productMap.set(p.id, {
          price: parseFloat(p.price),
          stock: p.stock,
        });
      }

      // Validate stock for all items
      let totalAmount = 0;
      for (const item of cartItems) {
        const product = productMap.get(item.product_id);

        if (!product) {
          throw new NotFoundError(`Product ${item.product_id} not found`);
        }

        if (product.stock < item.quantity) {
          throw new ConflictError(`Insufficient stock for product ${item.product_id}`);
        }

        totalAmount += item.quantity * product.price;
      }

      // Call mock payment
      const paymentResult = await this.processMockPayment();

      if (paymentResult.status !== 'success') {
        throw new PaymentError('Payment failed');
      }

      // Decrement stock for all items
      for (const item of cartItems) {
        await client.query('UPDATE products SET stock = stock - $1 WHERE id = $2', [
          item.quantity,
          item.product_id,
        ]);
      }

      // Create order
      const orderResult = await client.query(
        `INSERT INTO orders (buyer_id, status, shipping_address, total_amount, transaction_id)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, buyer_id, status, shipping_address, total_amount, transaction_id, created_at, updated_at`,
        [buyerId, 'confirmed', JSON.stringify(shipping_address), totalAmount.toFixed(2), paymentResult.transaction_id]
      );

      const order = orderResult.rows[0];
      const orderId = order.id;

      // Create order items
      const itemValues: any[] = [];
      let paramCount = 1;
      let insertQuery = 'INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES';
      const valuePlaceholders: string[] = [];

      for (const item of cartItems) {
        const product = productMap.get(item.product_id)!;
        valuePlaceholders.push(`($${paramCount}, $${paramCount + 1}, $${paramCount + 2}, $${paramCount + 3})`);
        itemValues.push(orderId, item.product_id, item.quantity, product.price.toFixed(2));
        paramCount += 4;
      }

      insertQuery += ' ' + valuePlaceholders.join(', ');
      await client.query(insertQuery, itemValues);

      await client.query('COMMIT');

      // Clear cart
      await redis.del(`cart:${buyerId}`);

      // Fetch and return complete order
      return this.getOrder(buyerId, orderId);
    } catch (error) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        // rollback may fail if BEGIN never executed; swallow it
      }
      throw error;
    } finally {
      client.release();
    }
  }

  async getOrder(buyerId: string, orderId: string): Promise<OrderResponse> {
    const orderResult = await db.query(
      `SELECT id, buyer_id, status, shipping_address, total_amount, transaction_id, created_at, updated_at
       FROM orders WHERE id = $1 AND buyer_id = $2`,
      [orderId, buyerId]
    );

    if (orderResult.rows.length === 0) {
      throw new NotFoundError('Order not found');
    }

    const order = orderResult.rows[0];

    const itemsResult = await db.query(
      `SELECT product_id, quantity, unit_price FROM order_items WHERE order_id = $1`,
      [orderId]
    );

    return {
      id: order.id,
      buyer_id: order.buyer_id,
      status: order.status,
      shipping_address: order.shipping_address,
      total_amount: order.total_amount.toString(),
      transaction_id: order.transaction_id,
      items: itemsResult.rows.map((item) => ({
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.unit_price.toString(),
      })),
      created_at: order.created_at,
      updated_at: order.updated_at,
    };
  }

  async getOrders(buyerId: string, params: GetOrdersParams): Promise<PaginatedOrderResponse> {
    const page = params.page || 1;
    const limit = params.limit || 10;
    const offset = (page - 1) * limit;

    const countResult = await db.query('SELECT COUNT(*) as count FROM orders WHERE buyer_id = $1', [buyerId]);
    const total = parseInt(countResult.rows[0].count, 10);

    const ordersResult = await db.query(
      `SELECT id, buyer_id, status, shipping_address, total_amount, transaction_id, created_at, updated_at
       FROM orders WHERE buyer_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [buyerId, limit, offset]
    );

    // Batch-fetch all items with a single query
    const orderIds = ordersResult.rows.map(o => o.id);
    if (orderIds.length === 0) {
      return {
        data: [],
        total,
        page,
        limit,
      };
    }

    const placeholders = orderIds.map((_, i) => `$${i + 1}`).join(',');
    const itemsResult = await db.query(
      `SELECT order_id, product_id, quantity, unit_price FROM order_items WHERE order_id IN (${placeholders})`,
      orderIds
    );

    const itemsByOrderId = new Map<string, any[]>();
    for (const item of itemsResult.rows) {
      if (!itemsByOrderId.has(item.order_id)) {
        itemsByOrderId.set(item.order_id, []);
      }
      itemsByOrderId.get(item.order_id)!.push(item);
    }

    const orders: OrderResponse[] = [];

    for (const order of ordersResult.rows) {
      orders.push({
        id: order.id,
        buyer_id: order.buyer_id,
        status: order.status,
        shipping_address: order.shipping_address,
        total_amount: order.total_amount.toString(),
        transaction_id: order.transaction_id,
        items: (itemsByOrderId.get(order.id) || []).map((item) => ({
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.unit_price.toString(),
        })),
        created_at: order.created_at,
        updated_at: order.updated_at,
      });
    }

    return {
      data: orders,
      total,
      page,
      limit,
    };
  }

  async getSellerOrders(sellerId: string, params: GetOrdersParams): Promise<PaginatedOrderResponse> {
    const page = params.page || 1;
    const limit = params.limit || 10;
    const offset = (page - 1) * limit;

    // Get seller's shop
    const shopResult = await db.query('SELECT id FROM shops WHERE seller_id = $1', [sellerId]);

    if (shopResult.rows.length === 0) {
      // Seller has no shop yet
      return {
        data: [],
        total: 0,
        page,
        limit,
      };
    }

    const shopId = shopResult.rows[0].id;

    // Get orders that contain products from this seller's shop
    let countQuery = `
      SELECT COUNT(DISTINCT o.id) as count
      FROM orders o
      INNER JOIN order_items oi ON o.id = oi.order_id
      INNER JOIN products p ON oi.product_id = p.id
      WHERE p.shop_id = $1
    `;

    const countParams: any[] = [shopId];
    let paramCount = 2;

    if (params.status) {
      countQuery += ` AND o.status = $${paramCount}`;
      countParams.push(params.status);
      paramCount++;
    }

    const countResult = await db.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count, 10);

    let ordersQuery = `
      SELECT DISTINCT o.id, o.buyer_id, o.status, o.shipping_address, o.total_amount, o.transaction_id, o.created_at, o.updated_at
      FROM orders o
      INNER JOIN order_items oi ON o.id = oi.order_id
      INNER JOIN products p ON oi.product_id = p.id
      WHERE p.shop_id = $1
    `;

    const ordersParams: any[] = [shopId];
    paramCount = 2;

    if (params.status) {
      ordersQuery += ` AND o.status = $${paramCount}`;
      ordersParams.push(params.status);
      paramCount++;
    }

    ordersQuery += ` ORDER BY o.created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    ordersParams.push(limit, offset);

    const ordersResult = await db.query(ordersQuery, ordersParams);

    // Batch-fetch all items with a single query
    const orderIds = ordersResult.rows.map(o => o.id);
    if (orderIds.length === 0) {
      return {
        data: [],
        total,
        page,
        limit,
      };
    }

    const placeholders = orderIds.map((_, i) => `$${i + 1}`).join(',');
    const itemsResult = await db.query(
      `SELECT oi.order_id, oi.product_id, oi.quantity, oi.unit_price
       FROM order_items oi
       INNER JOIN products p ON oi.product_id = p.id
       WHERE oi.order_id IN (${placeholders}) AND p.shop_id = $${orderIds.length + 1}`,
      [...orderIds, shopId]
    );

    const itemsByOrderId = new Map<string, any[]>();
    for (const item of itemsResult.rows) {
      if (!itemsByOrderId.has(item.order_id)) {
        itemsByOrderId.set(item.order_id, []);
      }
      itemsByOrderId.get(item.order_id)!.push(item);
    }

    const orders: OrderResponse[] = [];

    for (const order of ordersResult.rows) {
      orders.push({
        id: order.id,
        buyer_id: order.buyer_id,
        status: order.status,
        shipping_address: order.shipping_address,
        total_amount: order.total_amount.toString(),
        transaction_id: order.transaction_id,
        items: (itemsByOrderId.get(order.id) || []).map((item) => ({
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.unit_price.toString(),
        })),
        created_at: order.created_at,
        updated_at: order.updated_at,
      });
    }

    return {
      data: orders,
      total,
      page,
      limit,
    };
  }

  async getSellerOrder(sellerId: string, orderId: string): Promise<OrderResponse> {
    // Get seller's shop
    const shopResult = await db.query('SELECT id FROM shops WHERE seller_id = $1', [sellerId]);

    if (shopResult.rows.length === 0) {
      throw new NotFoundError('Order not found');
    }

    const shopId = shopResult.rows[0].id;

    // Check if order exists and seller has products in it
    const orderResult = await db.query(
      `SELECT DISTINCT o.id, o.buyer_id, o.status, o.shipping_address, o.total_amount, o.transaction_id, o.created_at, o.updated_at
       FROM orders o
       INNER JOIN order_items oi ON o.id = oi.order_id
       INNER JOIN products p ON oi.product_id = p.id
       WHERE o.id = $1 AND p.shop_id = $2`,
      [orderId, shopId]
    );

    if (orderResult.rows.length === 0) {
      throw new NotFoundError('Order not found');
    }

    const order = orderResult.rows[0];

    const itemsResult = await db.query(
      `SELECT oi.product_id, oi.quantity, oi.unit_price
       FROM order_items oi
       INNER JOIN products p ON oi.product_id = p.id
       WHERE oi.order_id = $1 AND p.shop_id = $2`,
      [orderId, shopId]
    );

    return {
      id: order.id,
      buyer_id: order.buyer_id,
      status: order.status,
      shipping_address: order.shipping_address,
      total_amount: order.total_amount.toString(),
      transaction_id: order.transaction_id,
      items: itemsResult.rows.map((item) => ({
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.unit_price.toString(),
      })),
      created_at: order.created_at,
      updated_at: order.updated_at,
    };
  }


  async updateSellerOrderStatus(sellerId: string, orderId: string, newStatus: string): Promise<OrderResponse> {
    // First: Check if order exists at all
    const orderExistsResult = await db.query(
      `SELECT id, status FROM orders WHERE id = $1`,
      [orderId]
    );

    if (orderExistsResult.rows.length === 0) {
      throw new NotFoundError('Order not found');
    }

    // Get seller's shop
    const shopResult = await db.query('SELECT id FROM shops WHERE seller_id = $1', [sellerId]);

    const shopId = shopResult.rows.length > 0 ? shopResult.rows[0].id : null;

    // Second: Check if seller has products in this order
    const sellerHasProductsResult = await db.query(
      `SELECT DISTINCT o.id
       FROM orders o
       INNER JOIN order_items oi ON o.id = oi.order_id
       INNER JOIN products p ON oi.product_id = p.id
       WHERE o.id = $1 AND p.shop_id = $2`,
      [orderId, shopId]
    );

    if (sellerHasProductsResult.rows.length === 0) {
      throw new ForbiddenError('Access denied');
    }

    const currentOrder = orderExistsResult.rows[0];
    const currentStatus = currentOrder.status;

    // Validate state transition
    const validNextStates = STATE_TRANSITIONS[currentStatus] || [];

    if (!validNextStates.includes(newStatus)) {
      throw new UnprocessableError(currentStatus, validNextStates);
    }

    // Update order status
    const updateResult = await db.query(
      `UPDATE orders SET status = $1, updated_at = now() WHERE id = $2
       RETURNING id, buyer_id, status, shipping_address, total_amount, transaction_id, created_at, updated_at`,
      [newStatus, orderId]
    );

    const order = updateResult.rows[0];

    const itemsResult = await db.query(
      `SELECT product_id, quantity, unit_price FROM order_items WHERE order_id = $1`,
      [orderId]
    );

    return {
      id: order.id,
      buyer_id: order.buyer_id,
      status: order.status,
      shipping_address: order.shipping_address,
      total_amount: order.total_amount.toString(),
      transaction_id: order.transaction_id,
      items: itemsResult.rows.map((item) => ({
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.unit_price.toString(),
      })),
      created_at: order.created_at,
      updated_at: order.updated_at,
    };
  }

  private async processMockPayment(): Promise<{ status: string; transaction_id: string }> {
    // Mock payment always succeeds and returns a UUID
    const crypto = require('crypto');
    const transactionId = crypto.randomUUID();

    return {
      status: 'success',
      transaction_id: transactionId,
    };
  }
}

export const ordersService = new OrdersService();
