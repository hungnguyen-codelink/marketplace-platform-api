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

describe('Cart Endpoints - Integration Tests', () => {
  describe('GET /api/cart', () => {
    it('should return empty cart for authenticated user with no items', async () => {
      const buyerId = await createUser('buyer@example.com', 'buyer');
      const token = createToken(buyerId, 'buyer@example.com', 'buyer');
      await createSession(token, buyerId);

      const res = await request(app)
        .get('/api/cart')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        items: [],
        total: 0,
      });
    });

    it('should return cart with items and total', async () => {
      const buyerId = await createUser('buyer@example.com', 'buyer');
      const sellerId = await createUser('seller@example.com', 'seller');
      const shopId = await createShop(sellerId);
      const product1 = await createProduct(shopId, { price: 10.0 });
      const product2 = await createProduct(shopId, { price: 20.0 });

      const token = createToken(buyerId, 'buyer@example.com', 'buyer');
      await createSession(token, buyerId);

      // Add items to cart via Redis
      await redis.hset(`cart:${buyerId}`, product1.id, '2', product2.id, '3');

      const res = await request(app)
        .get('/api/cart')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.items).toHaveLength(2);
      expect(res.body.items[0]).toHaveProperty('product_id', product1.id);
      expect(res.body.items[0]).toHaveProperty('quantity', 2);
      expect(res.body.items[0]).toHaveProperty('price', 10.0);
      expect(res.body.items[1]).toHaveProperty('quantity', 3);
      expect(res.body.total).toBe(80.0); // 2*10 + 3*20
    });

    it('should reject unauthenticated request with 401', async () => {
      const res = await request(app).get('/api/cart');

      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/cart/items', () => {
    it('should add item to cart', async () => {
      const buyerId = await createUser('buyer@example.com', 'buyer');
      const sellerId = await createUser('seller@example.com', 'seller');
      const shopId = await createShop(sellerId);
      const product = await createProduct(shopId);

      const token = createToken(buyerId, 'buyer@example.com', 'buyer');
      await createSession(token, buyerId);

      const res = await request(app)
        .post('/api/cart/items')
        .set('Authorization', `Bearer ${token}`)
        .send({ product_id: product.id, quantity: 2 });

      expect(res.status).toBe(200);
      expect(res.body.items).toHaveLength(1);
      expect(res.body.items[0]).toHaveProperty('product_id', product.id);
      expect(res.body.items[0]).toHaveProperty('quantity', 2);

      // Verify in Redis
      const cartItem = await redis.hget(`cart:${buyerId}`, product.id);
      expect(cartItem).toBe('2');
    });

    it('should increase quantity when adding existing item', async () => {
      const buyerId = await createUser('buyer@example.com', 'buyer');
      const sellerId = await createUser('seller@example.com', 'seller');
      const shopId = await createShop(sellerId);
      const product = await createProduct(shopId);

      const token = createToken(buyerId, 'buyer@example.com', 'buyer');
      await createSession(token, buyerId);

      // Add item first time
      await redis.hset(`cart:${buyerId}`, product.id, '1');

      const res = await request(app)
        .post('/api/cart/items')
        .set('Authorization', `Bearer ${token}`)
        .send({ product_id: product.id, quantity: 2 });

      expect(res.status).toBe(200);
      expect(res.body.items[0].quantity).toBe(3); // 1 + 2

      const cartItem = await redis.hget(`cart:${buyerId}`, product.id);
      expect(cartItem).toBe('3');
    });

    it('should return 404 if product does not exist', async () => {
      const buyerId = await createUser('buyer@example.com', 'buyer');
      const token = createToken(buyerId, 'buyer@example.com', 'buyer');
      await createSession(token, buyerId);

      const res = await request(app)
        .post('/api/cart/items')
        .set('Authorization', `Bearer ${token}`)
        .send({ product_id: '550e8400-e29b-41d4-a716-446655440000', quantity: 1 });

      expect(res.status).toBe(404);
    });

    it('should reject invalid quantity', async () => {
      const buyerId = await createUser('buyer@example.com', 'buyer');
      const token = createToken(buyerId, 'buyer@example.com', 'buyer');
      await createSession(token, buyerId);

      const res = await request(app)
        .post('/api/cart/items')
        .set('Authorization', `Bearer ${token}`)
        .send({ product_id: 'some-id', quantity: 0 });

      expect(res.status).toBe(400);
    });

    it('should reject unauthenticated request with 401', async () => {
      const res = await request(app)
        .post('/api/cart/items')
        .send({ product_id: 'some-id', quantity: 1 });

      expect(res.status).toBe(401);
    });
  });

  describe('PUT /api/cart/items/:productId', () => {
    it('should update item quantity', async () => {
      const buyerId = await createUser('buyer@example.com', 'buyer');
      const sellerId = await createUser('seller@example.com', 'seller');
      const shopId = await createShop(sellerId);
      const product = await createProduct(shopId);

      const token = createToken(buyerId, 'buyer@example.com', 'buyer');
      await createSession(token, buyerId);

      // Add item first
      await redis.hset(`cart:${buyerId}`, product.id, '2');

      const res = await request(app)
        .put(`/api/cart/items/${product.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ quantity: 5 });

      expect(res.status).toBe(200);
      expect(res.body.items[0].quantity).toBe(5);

      const cartItem = await redis.hget(`cart:${buyerId}`, product.id);
      expect(cartItem).toBe('5');
    });

    it('should remove item when quantity is 0', async () => {
      const buyerId = await createUser('buyer@example.com', 'buyer');
      const sellerId = await createUser('seller@example.com', 'seller');
      const shopId = await createShop(sellerId);
      const product = await createProduct(shopId);

      const token = createToken(buyerId, 'buyer@example.com', 'buyer');
      await createSession(token, buyerId);

      await redis.hset(`cart:${buyerId}`, product.id, '2');

      const res = await request(app)
        .put(`/api/cart/items/${product.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ quantity: 0 });

      expect(res.status).toBe(200);
      expect(res.body.items).toHaveLength(0);

      const cartItem = await redis.hget(`cart:${buyerId}`, product.id);
      expect(cartItem).toBeNull();
    });

    it('should return 404 if product not in cart', async () => {
      const buyerId = await createUser('buyer@example.com', 'buyer');
      const token = createToken(buyerId, 'buyer@example.com', 'buyer');
      await createSession(token, buyerId);

      const res = await request(app)
        .put(`/api/cart/items/nonexistent-id`)
        .set('Authorization', `Bearer ${token}`)
        .send({ quantity: 5 });

      expect(res.status).toBe(404);
    });

    it('should reject invalid quantity', async () => {
      const buyerId = await createUser('buyer@example.com', 'buyer');
      const token = createToken(buyerId, 'buyer@example.com', 'buyer');
      await createSession(token, buyerId);

      const res = await request(app)
        .put(`/api/cart/items/some-id`)
        .set('Authorization', `Bearer ${token}`)
        .send({ quantity: -5 });

      expect(res.status).toBe(400);
    });

    it('should reject unauthenticated request with 401', async () => {
      const res = await request(app)
        .put(`/api/cart/items/some-id`)
        .send({ quantity: 5 });

      expect(res.status).toBe(401);
    });
  });

  describe('DELETE /api/cart/items/:productId', () => {
    it('should remove item from cart', async () => {
      const buyerId = await createUser('buyer@example.com', 'buyer');
      const sellerId = await createUser('seller@example.com', 'seller');
      const shopId = await createShop(sellerId);
      const product = await createProduct(shopId);

      const token = createToken(buyerId, 'buyer@example.com', 'buyer');
      await createSession(token, buyerId);

      await redis.hset(`cart:${buyerId}`, product.id, '2');

      const res = await request(app)
        .delete(`/api/cart/items/${product.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.items).toHaveLength(0);

      const cartItem = await redis.hget(`cart:${buyerId}`, product.id);
      expect(cartItem).toBeNull();
    });

    it('should return 404 if product not in cart', async () => {
      const buyerId = await createUser('buyer@example.com', 'buyer');
      const token = createToken(buyerId, 'buyer@example.com', 'buyer');
      await createSession(token, buyerId);

      const res = await request(app)
        .delete(`/api/cart/items/nonexistent-id`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
    });

    it('should reject unauthenticated request with 401', async () => {
      const res = await request(app).delete(`/api/cart/items/some-id`);

      expect(res.status).toBe(401);
    });
  });

  describe('DELETE /api/cart', () => {
    it('should clear entire cart', async () => {
      const buyerId = await createUser('buyer@example.com', 'buyer');
      const sellerId = await createUser('seller@example.com', 'seller');
      const shopId = await createShop(sellerId);
      const product1 = await createProduct(shopId);
      const product2 = await createProduct(shopId);

      const token = createToken(buyerId, 'buyer@example.com', 'buyer');
      await createSession(token, buyerId);

      await redis.hset(`cart:${buyerId}`, product1.id, '1', product2.id, '2');

      const res = await request(app)
        .delete('/api/cart')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        items: [],
        total: 0,
      });

      // Verify Redis cart is deleted
      const exists = await redis.exists(`cart:${buyerId}`);
      expect(exists).toBe(0);
    });

    it('should handle clearing empty cart', async () => {
      const buyerId = await createUser('buyer@example.com', 'buyer');
      const token = createToken(buyerId, 'buyer@example.com', 'buyer');
      await createSession(token, buyerId);

      const res = await request(app)
        .delete('/api/cart')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        items: [],
        total: 0,
      });
    });

    it('should reject unauthenticated request with 401', async () => {
      const res = await request(app).delete('/api/cart');

      expect(res.status).toBe(401);
    });
  });
});
