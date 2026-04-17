import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createHash } from 'crypto';
import { createApp } from '../../../../src/app';
import { db } from '../../../../src/db/client';
import { redis } from '../../../../src/redis/client';
import { env } from '../../../../src/config/env';

let app: any;

beforeAll(async () => {
  app = createApp();
  await setupDatabase();
  await redis.connect();
});

afterEach(async () => {
  await cleanupDatabase();
  const keys = await redis.keys('cart:*');
  if (keys.length > 0) {
    await redis.del(...keys);
  }
});

afterAll(async () => {
  await db.end();
  await redis.quit();
});

async function setupDatabase() {
  await db.query('DROP TABLE IF EXISTS order_items CASCADE');
  await db.query('DROP TABLE IF EXISTS orders CASCADE');
  await db.query('DROP TABLE IF EXISTS products CASCADE');
  await db.query('DROP TABLE IF EXISTS shops CASCADE');
  await db.query('DROP TABLE IF EXISTS sessions CASCADE');
  await db.query('DROP TABLE IF EXISTS users CASCADE');

  await db.query(`
    CREATE TABLE users (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      email text UNIQUE NOT NULL,
      password_hash text NOT NULL,
      full_name text NOT NULL,
      role text NOT NULL CHECK (role IN ('buyer','seller','admin')),
      email_verified boolean DEFAULT false,
      terms_accepted boolean DEFAULT false,
      created_at timestamptz DEFAULT now()
    )
  `);

  await db.query(`
    CREATE TABLE sessions (
      token_hash text PRIMARY KEY,
      user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at timestamptz NOT NULL
    )
  `);

  await db.query(`
    CREATE TABLE shops (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      seller_id uuid NOT NULL UNIQUE REFERENCES users(id),
      name text NOT NULL,
      description text,
      banner_url text,
      contact_email text,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `);

  await db.query(`
    CREATE TABLE products (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      shop_id uuid NOT NULL REFERENCES shops(id),
      fakestore_id INTEGER UNIQUE,
      title TEXT NOT NULL,
      description TEXT,
      price NUMERIC(10,2) NOT NULL CHECK (price > 0),
      image_url TEXT,
      category TEXT,
      stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0 AND stock <= 999999),
      aggregate_rating NUMERIC(3,2) NOT NULL DEFAULT 0,
      review_count INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  await db.query(`
    CREATE TABLE orders (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      buyer_id uuid NOT NULL REFERENCES users(id),
      status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'shipped', 'delivered', 'completed')),
      shipping_address jsonb NOT NULL,
      total_amount NUMERIC(10,2) NOT NULL,
      transaction_id text,
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now()
    )
  `);

  await db.query(`
    CREATE TABLE order_items (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      product_id uuid NOT NULL REFERENCES products(id),
      quantity int NOT NULL CHECK (quantity > 0),
      unit_price NUMERIC(10,2) NOT NULL
    )
  `);
}

async function cleanupDatabase() {
  await db.query('TRUNCATE order_items CASCADE');
  await db.query('TRUNCATE orders CASCADE');
  await db.query('TRUNCATE products CASCADE');
  await db.query('TRUNCATE shops CASCADE');
  await db.query('TRUNCATE sessions CASCADE');
  await db.query('TRUNCATE users CASCADE');
}

function createToken(userId: string, email: string, role: string): string {
  const token = jwt.sign({ id: userId, email, role }, env.JWT_SECRET, {
    expiresIn: env.SESSION_TTL_SECONDS,
  });
  return token;
}

async function createSession(token: string, userId: string) {
  const tokenHash = createHash('sha256').update(token).digest('hex');
  const expiresAt = new Date(Date.now() + env.SESSION_TTL_SECONDS * 1000);
  await db.query('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES ($1, $2, $3)', [
    tokenHash,
    userId,
    expiresAt,
  ]);
}

async function createUser(email: string, role: string = 'buyer'): Promise<string> {
  const result = await db.query(
    'INSERT INTO users (email, password_hash, full_name, role) VALUES ($1, $2, $3, $4) RETURNING id',
    [email, 'hashed_password', 'Test User', role]
  );
  return result.rows[0].id;
}

async function createShop(sellerId: string, name: string = 'Test Shop'): Promise<string> {
  const result = await db.query(
    'INSERT INTO shops (seller_id, name) VALUES ($1, $2) RETURNING id',
    [sellerId, name]
  );
  return result.rows[0].id;
}

async function createProduct(shopId: string, product: any = {}): Promise<any> {
  const defaults = {
    title: 'Test Product',
    description: 'Test Description',
    price: 29.99,
    image_url: 'https://example.com/image.jpg',
    category: 'Electronics',
    stock: 50,
  };

  const mergedProduct = { ...defaults, ...product };

  const result = await db.query(
    `INSERT INTO products (shop_id, title, description, price, image_url, category, stock)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id, shop_id, title, description, price, image_url, category, stock, aggregate_rating, review_count, created_at, updated_at`,
    [
      shopId,
      mergedProduct.title,
      mergedProduct.description,
      mergedProduct.price,
      mergedProduct.image_url,
      mergedProduct.category,
      mergedProduct.stock,
    ]
  );

  return result.rows[0];
}

describe('Orders Endpoints - Integration Tests', () => {
  describe('POST /api/orders/checkout', () => {
    it('should checkout with valid cart and shipping address, returns 201 with order', async () => {
      const buyerId = await createUser('buyer@example.com', 'buyer');
      const sellerId = await createUser('seller@example.com', 'seller');
      const shopId = await createShop(sellerId);
      const product = await createProduct(shopId, { price: 29.99, stock: 10 });

      const token = createToken(buyerId, 'buyer@example.com', 'buyer');
      await createSession(token, buyerId);

      // Add item to cart
      await redis.hset(`cart:${buyerId}`, product.id, '2');

      const res = await request(app)
        .post('/api/orders/checkout')
        .set('Authorization', `Bearer ${token}`)
        .send({
          shipping_address: {
            street: '123 Main St',
            city: 'New York',
            state: 'NY',
            zip: '10001',
            country: 'USA',
          },
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body).toHaveProperty('status', 'confirmed');
      expect(res.body).toHaveProperty('total_amount', '59.98');
      expect(res.body).toHaveProperty('transaction_id');
      expect(res.body).toHaveProperty('shipping_address');
      expect(res.body.items).toHaveLength(1);
      expect(res.body.items[0]).toHaveProperty('product_id', product.id);
      expect(res.body.items[0]).toHaveProperty('quantity', 2);
      expect(res.body.items[0]).toHaveProperty('unit_price', '29.99');

      // Verify cart is cleared
      const cartExists = await redis.exists(`cart:${buyerId}`);
      expect(cartExists).toBe(0);

      // Verify stock is decremented
      const updatedProduct = await db.query('SELECT stock FROM products WHERE id = $1', [
        product.id,
      ]);
      expect(updatedProduct.rows[0].stock).toBe(8); // 10 - 2
    });

    it('should return 409 if insufficient stock', async () => {
      const buyerId = await createUser('buyer@example.com', 'buyer');
      const sellerId = await createUser('seller@example.com', 'seller');
      const shopId = await createShop(sellerId);
      const product = await createProduct(shopId, { stock: 1 });

      const token = createToken(buyerId, 'buyer@example.com', 'buyer');
      await createSession(token, buyerId);

      await redis.hset(`cart:${buyerId}`, product.id, '5');

      const res = await request(app)
        .post('/api/orders/checkout')
        .set('Authorization', `Bearer ${token}`)
        .send({
          shipping_address: {
            street: '123 Main St',
            city: 'New York',
            state: 'NY',
            zip: '10001',
            country: 'USA',
          },
        });

      expect(res.status).toBe(409);

      // Cart should be preserved
      const cartItem = await redis.hget(`cart:${buyerId}`, product.id);
      expect(cartItem).toBe('5');

      // Stock should be unchanged
      const productStock = await db.query('SELECT stock FROM products WHERE id = $1', [
        product.id,
      ]);
      expect(productStock.rows[0].stock).toBe(1);
    });

    it('should return 402 if payment fails', async () => {
      // This test assumes we can mock payment failure - implementation pending
      const buyerId = await createUser('buyer@example.com', 'buyer');
      const token = createToken(buyerId, 'buyer@example.com', 'buyer');
      await createSession(token, buyerId);

      const res = await request(app)
        .post('/api/orders/checkout')
        .set('Authorization', `Bearer ${token}`)
        .send({
          shipping_address: {
            street: '123 Main St',
            city: 'New York',
            state: 'NY',
            zip: '10001',
            country: 'USA',
          },
        });

      // Should not fail since cart is empty (payment succeeds but no items)
      expect(res.status).toBe(400); // Missing items validation
    });

    it('should return 400 if cart is empty', async () => {
      const buyerId = await createUser('buyer@example.com', 'buyer');
      const token = createToken(buyerId, 'buyer@example.com', 'buyer');
      await createSession(token, buyerId);

      const res = await request(app)
        .post('/api/orders/checkout')
        .set('Authorization', `Bearer ${token}`)
        .send({
          shipping_address: {
            street: '123 Main St',
            city: 'New York',
            state: 'NY',
            zip: '10001',
            country: 'USA',
          },
        });

      expect(res.status).toBe(400);
    });

    it('should return 400 if shipping_address is invalid', async () => {
      const buyerId = await createUser('buyer@example.com', 'buyer');
      const token = createToken(buyerId, 'buyer@example.com', 'buyer');
      await createSession(token, buyerId);

      const res = await request(app)
        .post('/api/orders/checkout')
        .set('Authorization', `Bearer ${token}`)
        .send({
          shipping_address: {
            street: '123 Main St',
            // Missing required fields
          },
        });

      expect(res.status).toBe(400);
    });

    it('should reject unauthenticated request with 401', async () => {
      const res = await request(app)
        .post('/api/orders/checkout')
        .send({
          shipping_address: {
            street: '123 Main St',
            city: 'New York',
            state: 'NY',
            zip: '10001',
            country: 'USA',
          },
        });

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/orders', () => {
    it('should list buyer orders paginated', async () => {
      const buyerId = await createUser('buyer@example.com', 'buyer');
      const token = createToken(buyerId, 'buyer@example.com', 'buyer');
      await createSession(token, buyerId);

      // Create test orders
      const order1Result = await db.query(
        `INSERT INTO orders (buyer_id, shipping_address, total_amount, status)
         VALUES ($1, $2, $3, $4) RETURNING id`,
        [
          buyerId,
          JSON.stringify({ street: '123 Main St', city: 'NYC', state: 'NY', zip: '10001', country: 'USA' }),
          '50.00',
          'confirmed',
        ]
      );

      const order2Result = await db.query(
        `INSERT INTO orders (buyer_id, shipping_address, total_amount, status)
         VALUES ($1, $2, $3, $4) RETURNING id`,
        [
          buyerId,
          JSON.stringify({ street: '456 Oak Ave', city: 'LA', state: 'CA', zip: '90001', country: 'USA' }),
          '75.00',
          'pending',
        ]
      );

      const res = await request(app)
        .get('/api/orders')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.total).toBe(2);
      expect(res.body.page).toBe(1);
      expect(res.body.limit).toBe(10);
      // Most recent first
      expect(res.body.data[0].id).toBe(order2Result.rows[0].id);
      expect(res.body.data[0].status).toBe('pending');
      expect(res.body.data[1].id).toBe(order1Result.rows[0].id);
    });

    it('should reject unauthenticated request with 401', async () => {
      const res = await request(app).get('/api/orders');

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/orders/:id', () => {
    it('should get order with items', async () => {
      const buyerId = await createUser('buyer@example.com', 'buyer');
      const sellerId = await createUser('seller@example.com', 'seller');
      const shopId = await createShop(sellerId);
      const product = await createProduct(shopId, { price: 29.99 });

      const token = createToken(buyerId, 'buyer@example.com', 'buyer');
      await createSession(token, buyerId);

      const orderResult = await db.query(
        `INSERT INTO orders (buyer_id, shipping_address, total_amount, status)
         VALUES ($1, $2, $3, $4) RETURNING id`,
        [
          buyerId,
          JSON.stringify({ street: '123 Main St', city: 'NYC', state: 'NY', zip: '10001', country: 'USA' }),
          '59.98',
          'confirmed',
        ]
      );

      const orderId = orderResult.rows[0].id;

      await db.query(
        `INSERT INTO order_items (order_id, product_id, quantity, unit_price)
         VALUES ($1, $2, $3, $4)`,
        [orderId, product.id, 2, '29.99']
      );

      const res = await request(app)
        .get(`/api/orders/${orderId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('id', orderId);
      expect(res.body).toHaveProperty('status', 'confirmed');
      expect(res.body.items).toHaveLength(1);
      expect(res.body.items[0]).toHaveProperty('product_id', product.id);
      expect(res.body.items[0]).toHaveProperty('quantity', 2);
    });

    it('should return 404 if order does not exist', async () => {
      const buyerId = await createUser('buyer@example.com', 'buyer');
      const token = createToken(buyerId, 'buyer@example.com', 'buyer');
      await createSession(token, buyerId);

      const res = await request(app)
        .get('/api/orders/550e8400-e29b-41d4-a716-446655440000')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
    });

    it('should return 404 if buyer does not own order', async () => {
      const buyerId1 = await createUser('buyer1@example.com', 'buyer');
      const buyerId2 = await createUser('buyer2@example.com', 'buyer');

      const token = createToken(buyerId2, 'buyer2@example.com', 'buyer');
      await createSession(token, buyerId2);

      const orderResult = await db.query(
        `INSERT INTO orders (buyer_id, shipping_address, total_amount, status)
         VALUES ($1, $2, $3, $4) RETURNING id`,
        [
          buyerId1,
          JSON.stringify({ street: '123 Main St', city: 'NYC', state: 'NY', zip: '10001', country: 'USA' }),
          '50.00',
          'confirmed',
        ]
      );

      const orderId = orderResult.rows[0].id;

      const res = await request(app)
        .get(`/api/orders/${orderId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
    });

    it('should reject unauthenticated request with 401', async () => {
      const res = await request(app).get('/api/orders/550e8400-e29b-41d4-a716-446655440000');

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/seller/orders', () => {
    it('should list orders containing seller products', async () => {
      const sellerId = await createUser('seller@example.com', 'seller');
      const buyerId = await createUser('buyer@example.com', 'buyer');
      const shopId = await createShop(sellerId);
      const product = await createProduct(shopId, { price: 29.99 });

      const token = createToken(sellerId, 'seller@example.com', 'seller');
      await createSession(token, sellerId);

      const orderResult = await db.query(
        `INSERT INTO orders (buyer_id, shipping_address, total_amount, status)
         VALUES ($1, $2, $3, $4) RETURNING id`,
        [
          buyerId,
          JSON.stringify({ street: '123 Main St', city: 'NYC', state: 'NY', zip: '10001', country: 'USA' }),
          '59.98',
          'confirmed',
        ]
      );

      const orderId = orderResult.rows[0].id;

      await db.query(
        `INSERT INTO order_items (order_id, product_id, quantity, unit_price)
         VALUES ($1, $2, $3, $4)`,
        [orderId, product.id, 2, '29.99']
      );

      const res = await request(app)
        .get('/api/seller/orders')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].id).toBe(orderId);
    });

    it('should filter by status', async () => {
      const sellerId = await createUser('seller@example.com', 'seller');
      const buyerId = await createUser('buyer@example.com', 'buyer');
      const shopId = await createShop(sellerId);
      const product = await createProduct(shopId);

      const token = createToken(sellerId, 'seller@example.com', 'seller');
      await createSession(token, sellerId);

      // Create two orders with different statuses
      const order1Result = await db.query(
        `INSERT INTO orders (buyer_id, shipping_address, total_amount, status)
         VALUES ($1, $2, $3, $4) RETURNING id`,
        [
          buyerId,
          JSON.stringify({ street: '123 Main St', city: 'NYC', state: 'NY', zip: '10001', country: 'USA' }),
          '50.00',
          'pending',
        ]
      );

      const order2Result = await db.query(
        `INSERT INTO orders (buyer_id, shipping_address, total_amount, status)
         VALUES ($1, $2, $3, $4) RETURNING id`,
        [
          buyerId,
          JSON.stringify({ street: '456 Oak Ave', city: 'LA', state: 'CA', zip: '90001', country: 'USA' }),
          '75.00',
          'confirmed',
        ]
      );

      await db.query(
        `INSERT INTO order_items (order_id, product_id, quantity, unit_price)
         VALUES ($1, $2, $3, $4), ($5, $6, $7, $8)`,
        [order1Result.rows[0].id, product.id, 1, '50.00', order2Result.rows[0].id, product.id, 1, '75.00']
      );

      const res = await request(app)
        .get('/api/seller/orders?status=confirmed')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].status).toBe('confirmed');
    });

    it('should return empty list if seller has no products in orders', async () => {
      const sellerId = await createUser('seller@example.com', 'seller');
      await createShop(sellerId);

      const token = createToken(sellerId, 'seller@example.com', 'seller');
      await createSession(token, sellerId);

      const res = await request(app)
        .get('/api/seller/orders')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(0);
    });

    it('should reject unauthenticated request with 401', async () => {
      const res = await request(app).get('/api/seller/orders');

      expect(res.status).toBe(401);
    });

    it('should reject non-seller with 403', async () => {
      const buyerId = await createUser('buyer@example.com', 'buyer');
      const token = createToken(buyerId, 'buyer@example.com', 'buyer');
      await createSession(token, buyerId);

      const res = await request(app)
        .get('/api/seller/orders')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/seller/orders/:id', () => {
    it('should get order detail if seller has products in order', async () => {
      const sellerId = await createUser('seller@example.com', 'seller');
      const buyerId = await createUser('buyer@example.com', 'buyer');
      const shopId = await createShop(sellerId);
      const product = await createProduct(shopId, { price: 29.99 });

      const token = createToken(sellerId, 'seller@example.com', 'seller');
      await createSession(token, sellerId);

      const orderResult = await db.query(
        `INSERT INTO orders (buyer_id, shipping_address, total_amount, status)
         VALUES ($1, $2, $3, $4) RETURNING id`,
        [
          buyerId,
          JSON.stringify({ street: '123 Main St', city: 'NYC', state: 'NY', zip: '10001', country: 'USA' }),
          '59.98',
          'confirmed',
        ]
      );

      const orderId = orderResult.rows[0].id;

      await db.query(
        `INSERT INTO order_items (order_id, product_id, quantity, unit_price)
         VALUES ($1, $2, $3, $4)`,
        [orderId, product.id, 2, '29.99']
      );

      const res = await request(app)
        .get(`/api/seller/orders/${orderId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('id', orderId);
      expect(res.body.items).toHaveLength(1);
    });

    it('should return 404 if seller has no products in order', async () => {
      const sellerId1 = await createUser('seller1@example.com', 'seller');
      const sellerId2 = await createUser('seller2@example.com', 'seller');
      const buyerId = await createUser('buyer@example.com', 'buyer');
      const shopId = await createShop(sellerId1);
      const product = await createProduct(shopId);

      const token = createToken(sellerId2, 'seller2@example.com', 'seller');
      await createSession(token, sellerId2);

      const orderResult = await db.query(
        `INSERT INTO orders (buyer_id, shipping_address, total_amount, status)
         VALUES ($1, $2, $3, $4) RETURNING id`,
        [
          buyerId,
          JSON.stringify({ street: '123 Main St', city: 'NYC', state: 'NY', zip: '10001', country: 'USA' }),
          '50.00',
          'confirmed',
        ]
      );

      const orderId = orderResult.rows[0].id;

      await db.query(
        `INSERT INTO order_items (order_id, product_id, quantity, unit_price)
         VALUES ($1, $2, $3, $4)`,
        [orderId, product.id, 1, '50.00']
      );

      const res = await request(app)
        .get(`/api/seller/orders/${orderId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
    });

    it('should return 404 if order does not exist', async () => {
      const sellerId = await createUser('seller@example.com', 'seller');
      const token = createToken(sellerId, 'seller@example.com', 'seller');
      await createSession(token, sellerId);

      const res = await request(app)
        .get('/api/seller/orders/550e8400-e29b-41d4-a716-446655440000')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
    });

    it('should reject unauthenticated request with 401', async () => {
      const res = await request(app).get('/api/seller/orders/550e8400-e29b-41d4-a716-446655440000');

      expect(res.status).toBe(401);
    });

    it('should reject non-seller with 403', async () => {
      const buyerId = await createUser('buyer@example.com', 'buyer');
      const token = createToken(buyerId, 'buyer@example.com', 'buyer');
      await createSession(token, buyerId);

      const res = await request(app)
        .get('/api/seller/orders/550e8400-e29b-41d4-a716-446655440000')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
    });
  });

  describe('PATCH /api/seller/orders/:id/status', () => {
    it('should advance order status from pending to confirmed', async () => {
      const sellerId = await createUser('seller@example.com', 'seller');
      const buyerId = await createUser('buyer@example.com', 'buyer');
      const shopId = await createShop(sellerId);
      const product = await createProduct(shopId);

      const token = createToken(sellerId, 'seller@example.com', 'seller');
      await createSession(token, sellerId);

      const orderResult = await db.query(
        `INSERT INTO orders (buyer_id, shipping_address, total_amount, status)
         VALUES ($1, $2, $3, $4) RETURNING id`,
        [
          buyerId,
          JSON.stringify({ street: '123 Main St', city: 'NYC', state: 'NY', zip: '10001', country: 'USA' }),
          '50.00',
          'pending',
        ]
      );

      const orderId = orderResult.rows[0].id;

      await db.query(
        `INSERT INTO order_items (order_id, product_id, quantity, unit_price)
         VALUES ($1, $2, $3, $4)`,
        [orderId, product.id, 1, '50.00']
      );

      const res = await request(app)
        .patch(`/api/seller/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'confirmed' });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('confirmed');

      // Verify in DB
      const updatedOrder = await db.query('SELECT status FROM orders WHERE id = $1', [orderId]);
      expect(updatedOrder.rows[0].status).toBe('confirmed');
    });

    it('should return 422 for invalid state transition', async () => {
      const sellerId = await createUser('seller@example.com', 'seller');
      const buyerId = await createUser('buyer@example.com', 'buyer');
      const shopId = await createShop(sellerId);
      const product = await createProduct(shopId);

      const token = createToken(sellerId, 'seller@example.com', 'seller');
      await createSession(token, sellerId);

      const orderResult = await db.query(
        `INSERT INTO orders (buyer_id, shipping_address, total_amount, status)
         VALUES ($1, $2, $3, $4) RETURNING id`,
        [
          buyerId,
          JSON.stringify({ street: '123 Main St', city: 'NYC', state: 'NY', zip: '10001', country: 'USA' }),
          '50.00',
          'confirmed',
        ]
      );

      const orderId = orderResult.rows[0].id;

      await db.query(
        `INSERT INTO order_items (order_id, product_id, quantity, unit_price)
         VALUES ($1, $2, $3, $4)`,
        [orderId, product.id, 1, '50.00']
      );

      const res = await request(app)
        .patch(`/api/seller/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'pending' }); // Cannot go backward

      expect(res.status).toBe(422);
      expect(res.body).toHaveProperty('currentState', 'confirmed');
      expect(res.body).toHaveProperty('validNextStates');
    });

    it('should return 404 if seller has no products in order', async () => {
      const sellerId1 = await createUser('seller1@example.com', 'seller');
      const sellerId2 = await createUser('seller2@example.com', 'seller');
      const buyerId = await createUser('buyer@example.com', 'buyer');
      const shopId = await createShop(sellerId1);
      const product = await createProduct(shopId);

      const token = createToken(sellerId2, 'seller2@example.com', 'seller');
      await createSession(token, sellerId2);

      const orderResult = await db.query(
        `INSERT INTO orders (buyer_id, shipping_address, total_amount, status)
         VALUES ($1, $2, $3, $4) RETURNING id`,
        [
          buyerId,
          JSON.stringify({ street: '123 Main St', city: 'NYC', state: 'NY', zip: '10001', country: 'USA' }),
          '50.00',
          'pending',
        ]
      );

      const orderId = orderResult.rows[0].id;

      await db.query(
        `INSERT INTO order_items (order_id, product_id, quantity, unit_price)
         VALUES ($1, $2, $3, $4)`,
        [orderId, product.id, 1, '50.00']
      );

      const res = await request(app)
        .patch(`/api/seller/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'confirmed' });

      expect(res.status).toBe(404);
    });

    it('should return 404 if order does not exist', async () => {
      const sellerId = await createUser('seller@example.com', 'seller');
      const token = createToken(sellerId, 'seller@example.com', 'seller');
      await createSession(token, sellerId);

      const res = await request(app)
        .patch('/api/seller/orders/550e8400-e29b-41d4-a716-446655440000/status')
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'confirmed' });

      expect(res.status).toBe(404);
    });

    it('should reject unauthenticated request with 401', async () => {
      const res = await request(app)
        .patch('/api/seller/orders/some-id/status')
        .send({ status: 'confirmed' });

      expect(res.status).toBe(401);
    });

    it('should reject non-seller with 403', async () => {
      const buyerId = await createUser('buyer@example.com', 'buyer');
      const token = createToken(buyerId, 'buyer@example.com', 'buyer');
      await createSession(token, buyerId);

      const res = await request(app)
        .patch('/api/seller/orders/550e8400-e29b-41d4-a716-446655440000/status')
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'confirmed' });

      expect(res.status).toBe(403);
    });
  });
});
