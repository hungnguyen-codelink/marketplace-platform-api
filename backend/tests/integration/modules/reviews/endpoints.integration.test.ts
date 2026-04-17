import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createHash } from 'crypto';
import { createApp } from '../../../../src/app';
import { db } from '../../../../src/db/client';
import { env } from '../../../../src/config/env';

let app: any;

beforeAll(async () => {
  app = createApp();
  await setupDatabase();
});

afterEach(async () => {
  await cleanupDatabase();
});

afterAll(async () => {
  await db.end();
});

async function setupDatabase() {
  await db.query('DROP TABLE IF EXISTS reviews CASCADE');
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
      aggregate_rating NUMERIC(3,2) NOT NULL DEFAULT 0.00,
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

  await db.query(`
    CREATE TABLE reviews (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      order_item_id uuid NOT NULL REFERENCES order_items(id) UNIQUE,
      buyer_id uuid NOT NULL REFERENCES users(id),
      product_id uuid NOT NULL REFERENCES products(id),
      rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
      text TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
}

async function cleanupDatabase() {
  await db.query('TRUNCATE reviews CASCADE');
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

async function createOrder(
  buyerId: string,
  status: string = 'completed',
  items: Array<{ productId: string; quantity: number; unitPrice: string }> = []
): Promise<{ orderId: string; orderItemIds: string[] }> {
  const orderResult = await db.query(
    `INSERT INTO orders (buyer_id, status, shipping_address, total_amount)
     VALUES ($1, $2, $3, $4)
     RETURNING id`,
    [
      buyerId,
      status,
      JSON.stringify({
        street: '123 Main St',
        city: 'New York',
        state: 'NY',
        zip: '10001',
        country: 'USA',
      }),
      '100.00',
    ]
  );

  const orderId = orderResult.rows[0].id;
  const orderItemIds: string[] = [];

  for (const item of items) {
    const itemResult = await db.query(
      `INSERT INTO order_items (order_id, product_id, quantity, unit_price)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [orderId, item.productId, item.quantity, item.unitPrice]
    );
    orderItemIds.push(itemResult.rows[0].id);
  }

  return { orderId, orderItemIds };
}

describe('Reviews Endpoints - Integration Tests', () => {
  describe('POST /api/reviews', () => {
    it('should require authentication', async () => {
      const res = await request(app)
        .post('/api/reviews')
        .send({
          order_item_id: 'order-item-123',
          rating: 5,
          text: 'Great!',
        });

      expect(res.status).toBe(401);
    });

    it('should require buyer role', async () => {
      const sellerId = await createUser('seller@example.com', 'seller');
      const token = createToken(sellerId, 'seller@example.com', 'seller');
      await createSession(token, sellerId);

      const res = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${token}`)
        .send({
          order_item_id: 'order-item-123',
          rating: 5,
          text: 'Great!',
        });

      expect(res.status).toBe(403);
    });

    it('should return 404 when order_item not found', async () => {
      const buyerId = await createUser('buyer@example.com', 'buyer');
      const token = createToken(buyerId, 'buyer@example.com', 'buyer');
      await createSession(token, buyerId);

      const res = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${token}`)
        .send({
          order_item_id: 'nonexistent-item-id',
          rating: 5,
          text: 'Great!',
        });

      expect(res.status).toBe(404);
      expect(res.body.message).toContain('Order item not found');
    });

    it('should return 403 when trying to review another buyer\'s order (AC-04)', async () => {
      const buyerId1 = await createUser('buyer1@example.com', 'buyer');
      const buyerId2 = await createUser('buyer2@example.com', 'buyer');
      const sellerId = await createUser('seller@example.com', 'seller');
      const shopId = await createShop(sellerId);
      const product = await createProduct(shopId);

      const { orderItemIds } = await createOrder(buyerId1, 'completed', [
        { productId: product.id, quantity: 1, unitPrice: '29.99' },
      ]);

      const token = createToken(buyerId2, 'buyer2@example.com', 'buyer');
      await createSession(token, buyerId2);

      const res = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${token}`)
        .send({
          order_item_id: orderItemIds[0],
          rating: 5,
          text: 'Great!',
        });

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('Access denied');
    });

    it('should return 403 when order status is not completed (AC-04)', async () => {
      const statuses = ['pending', 'confirmed', 'shipped', 'delivered'];

      for (const status of statuses) {
        const buyerId = await createUser(`buyer-${status}@example.com`, 'buyer');
        const sellerId = await createUser(`seller-${status}@example.com`, 'seller');
        const shopId = await createShop(sellerId);
        const product = await createProduct(shopId);

        const { orderItemIds } = await createOrder(buyerId, status, [
          { productId: product.id, quantity: 1, unitPrice: '29.99' },
        ]);

        const token = createToken(buyerId, `buyer-${status}@example.com`, 'buyer');
        await createSession(token, buyerId);

        const res = await request(app)
          .post('/api/reviews')
          .set('Authorization', `Bearer ${token}`)
          .send({
            order_item_id: orderItemIds[0],
            rating: 5,
            text: 'Great!',
          });

        expect(res.status).toBe(403);
        expect(res.body.message).toContain('Order must be completed to leave a review');
      }
    });

    it('should return 201 with review for completed order', async () => {
      const buyerId = await createUser('buyer@example.com', 'buyer');
      const sellerId = await createUser('seller@example.com', 'seller');
      const shopId = await createShop(sellerId);
      const product = await createProduct(shopId);

      const { orderItemIds } = await createOrder(buyerId, 'completed', [
        { productId: product.id, quantity: 1, unitPrice: '29.99' },
      ]);

      const token = createToken(buyerId, 'buyer@example.com', 'buyer');
      await createSession(token, buyerId);

      const res = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${token}`)
        .send({
          order_item_id: orderItemIds[0],
          rating: 5,
          text: 'Excellent product!',
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body).toHaveProperty('order_item_id', orderItemIds[0]);
      expect(res.body).toHaveProperty('buyer_id', buyerId);
      expect(res.body).toHaveProperty('product_id', product.id);
      expect(res.body).toHaveProperty('rating', 5);
      expect(res.body).toHaveProperty('text', 'Excellent product!');
      expect(res.body).toHaveProperty('created_at');
    });

    it('should return 409 on duplicate review attempt (REV-05)', async () => {
      const buyerId = await createUser('buyer@example.com', 'buyer');
      const sellerId = await createUser('seller@example.com', 'seller');
      const shopId = await createShop(sellerId);
      const product = await createProduct(shopId);

      const { orderItemIds } = await createOrder(buyerId, 'completed', [
        { productId: product.id, quantity: 1, unitPrice: '29.99' },
      ]);

      const token = createToken(buyerId, 'buyer@example.com', 'buyer');
      await createSession(token, buyerId);

      // First review succeeds
      const res1 = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${token}`)
        .send({
          order_item_id: orderItemIds[0],
          rating: 5,
          text: 'Great!',
        });

      expect(res1.status).toBe(201);

      // Second review fails with 409
      const res2 = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${token}`)
        .send({
          order_item_id: orderItemIds[0],
          rating: 3,
          text: 'Actually not great',
        });

      expect(res2.status).toBe(409);
      expect(res2.body.message).toContain('Review already exists');
    });

    it('should validate rating is between 1 and 5', async () => {
      const buyerId = await createUser('buyer@example.com', 'buyer');
      const token = createToken(buyerId, 'buyer@example.com', 'buyer');
      await createSession(token, buyerId);

      const invalidRatings = [0, 6, 2.5, -1];

      for (const rating of invalidRatings) {
        const res = await request(app)
          .post('/api/reviews')
          .set('Authorization', `Bearer ${token}`)
          .send({
            order_item_id: 'order-item-123',
            rating,
            text: 'Test',
          });

        expect(res.status).toBe(400);
      }
    });

    it('should accept optional text field', async () => {
      const buyerId = await createUser('buyer@example.com', 'buyer');
      const sellerId = await createUser('seller@example.com', 'seller');
      const shopId = await createShop(sellerId);
      const product = await createProduct(shopId);

      const { orderItemIds } = await createOrder(buyerId, 'completed', [
        { productId: product.id, quantity: 1, unitPrice: '29.99' },
      ]);

      const token = createToken(buyerId, 'buyer@example.com', 'buyer');
      await createSession(token, buyerId);

      const res = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${token}`)
        .send({
          order_item_id: orderItemIds[0],
          rating: 4,
        });

      expect(res.status).toBe(201);
      expect(res.body.rating).toBe(4);
      expect(res.body.text).toBeNull();
    });

    it('should update product aggregate_rating correctly with single review (AC-10)', async () => {
      const buyerId = await createUser('buyer@example.com', 'buyer');
      const sellerId = await createUser('seller@example.com', 'seller');
      const shopId = await createShop(sellerId);
      const product = await createProduct(shopId);

      const { orderItemIds } = await createOrder(buyerId, 'completed', [
        { productId: product.id, quantity: 1, unitPrice: '29.99' },
      ]);

      const token = createToken(buyerId, 'buyer@example.com', 'buyer');
      await createSession(token, buyerId);

      await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${token}`)
        .send({
          order_item_id: orderItemIds[0],
          rating: 5,
          text: 'Perfect!',
        });

      const productResult = await db.query(
        'SELECT aggregate_rating, review_count FROM products WHERE id = $1',
        [product.id]
      );

      expect(productResult.rows[0].aggregate_rating).toBe('5.00');
      expect(productResult.rows[0].review_count).toBe(1);
    });

    it('should update product aggregate_rating correctly with multiple reviews (AC-10)', async () => {
      const buyerId1 = await createUser('buyer1@example.com', 'buyer');
      const buyerId2 = await createUser('buyer2@example.com', 'buyer');
      const buyerId3 = await createUser('buyer3@example.com', 'buyer');
      const sellerId = await createUser('seller@example.com', 'seller');
      const shopId = await createShop(sellerId);
      const product = await createProduct(shopId);

      // Create 3 orders for same product
      const { orderItemIds: items1 } = await createOrder(buyerId1, 'completed', [
        { productId: product.id, quantity: 1, unitPrice: '29.99' },
      ]);
      const { orderItemIds: items2 } = await createOrder(buyerId2, 'completed', [
        { productId: product.id, quantity: 1, unitPrice: '29.99' },
      ]);
      const { orderItemIds: items3 } = await createOrder(buyerId3, 'completed', [
        { productId: product.id, quantity: 1, unitPrice: '29.99' },
      ]);

      const token1 = createToken(buyerId1, 'buyer1@example.com', 'buyer');
      const token2 = createToken(buyerId2, 'buyer2@example.com', 'buyer');
      const token3 = createToken(buyerId3, 'buyer3@example.com', 'buyer');

      await createSession(token1, buyerId1);
      await createSession(token2, buyerId2);
      await createSession(token3, buyerId3);

      // Submit reviews: 5, 4, 3
      // Expected average: (5 + 4 + 3) / 3 = 4.00
      await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${token1}`)
        .send({ order_item_id: items1[0], rating: 5, text: 'Excellent' });

      await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${token2}`)
        .send({ order_item_id: items2[0], rating: 4, text: 'Good' });

      await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${token3}`)
        .send({ order_item_id: items3[0], rating: 3, text: 'Okay' });

      const productResult = await db.query(
        'SELECT aggregate_rating, review_count FROM products WHERE id = $1',
        [product.id]
      );

      expect(productResult.rows[0].aggregate_rating).toBe('4.00');
      expect(productResult.rows[0].review_count).toBe(3);
    });

    it('should use 2 decimal precision for aggregate_rating (AC-10)', async () => {
      const buyerId1 = await createUser('buyer1@example.com', 'buyer');
      const buyerId2 = await createUser('buyer2@example.com', 'buyer');
      const sellerId = await createUser('seller@example.com', 'seller');
      const shopId = await createShop(sellerId);
      const product = await createProduct(shopId);

      const { orderItemIds: items1 } = await createOrder(buyerId1, 'completed', [
        { productId: product.id, quantity: 1, unitPrice: '29.99' },
      ]);
      const { orderItemIds: items2 } = await createOrder(buyerId2, 'completed', [
        { productId: product.id, quantity: 1, unitPrice: '29.99' },
      ]);

      const token1 = createToken(buyerId1, 'buyer1@example.com', 'buyer');
      const token2 = createToken(buyerId2, 'buyer2@example.com', 'buyer');

      await createSession(token1, buyerId1);
      await createSession(token2, buyerId2);

      // Reviews: 4, 3
      // Expected: (4 + 3) / 2 = 3.50
      await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${token1}`)
        .send({ order_item_id: items1[0], rating: 4 });

      await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${token2}`)
        .send({ order_item_id: items2[0], rating: 3 });

      const productResult = await db.query(
        'SELECT aggregate_rating, review_count FROM products WHERE id = $1',
        [product.id]
      );

      expect(productResult.rows[0].aggregate_rating).toBe('3.50');
      expect(productResult.rows[0].review_count).toBe(2);
    });
  });
});
