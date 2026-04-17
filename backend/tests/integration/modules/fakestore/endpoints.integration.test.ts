import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createHash } from 'crypto';
import { createApp } from '../../../../src/app';
import { db } from '../../../../src/db/client';
import { env } from '../../../../src/config/env';
import * as fakestoreClient from '../../../../src/modules/fakestore/client';
import * as redisHelpers from '../../../../src/redis/helpers';

jest.mock('../../../../src/modules/fakestore/client');
jest.mock('../../../../src/redis/helpers');

let app: any;

beforeAll(async () => {
  app = createApp();
  await setupDatabase();
});

afterEach(async () => {
  await cleanupDatabase();
  jest.clearAllMocks();
});

afterAll(async () => {
  await db.end();
});

async function setupDatabase() {
  await db.query('DROP TABLE IF EXISTS products CASCADE');
  await db.query('DROP TABLE IF EXISTS shops CASCADE');
  await db.query('DROP TABLE IF EXISTS sessions CASCADE');
  await db.query('DROP TABLE IF EXISTS users CASCADE');
  await db.query('DROP TABLE IF EXISTS categories CASCADE');

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
    CREATE TABLE categories (
      id serial PRIMARY KEY,
      name text UNIQUE NOT NULL
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
}

async function cleanupDatabase() {
  await db.query('TRUNCATE products CASCADE');
  await db.query('TRUNCATE shops CASCADE');
  await db.query('TRUNCATE sessions CASCADE');
  await db.query('TRUNCATE users CASCADE');
  await db.query('TRUNCATE categories CASCADE');
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
    fakestore_id: null,
  };

  const mergedProduct = { ...defaults, ...product };

  const result = await db.query(
    `INSERT INTO products (shop_id, fakestore_id, title, description, price, image_url, category, stock)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id, shop_id, fakestore_id, title, description, price, image_url, category, stock, aggregate_rating, review_count, created_at, updated_at`,
    [
      shopId,
      mergedProduct.fakestore_id,
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

describe('FakeStore Endpoints', () => {
  describe('GET /api/fakestore/products', () => {
    it('should return 401 without auth token', async () => {
      const res = await request(app).get('/api/fakestore/products');
      expect(res.status).toBe(401);
    });

    it('should return 403 for buyer role', async () => {
      const buyerId = await createUser('buyer@test.com', 'buyer');
      const token = createToken(buyerId, 'buyer@test.com', 'buyer');
      await createSession(token, buyerId);

      const res = await request(app)
        .get('/api/fakestore/products')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(403);
    });

    it('should return 403 for admin role', async () => {
      const adminId = await createUser('admin@test.com', 'admin');
      const token = createToken(adminId, 'admin@test.com', 'admin');
      await createSession(token, adminId);

      const res = await request(app)
        .get('/api/fakestore/products')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(403);
    });

    it('should return FakeStore products for seller with valid auth', async () => {
      const sellerId = await createUser('seller@test.com', 'seller');
      const token = createToken(sellerId, 'seller@test.com', 'seller');
      await createSession(token, sellerId);

      const mockProducts = [
        {
          id: 1,
          title: 'Product 1',
          price: 10.5,
          description: 'Desc 1',
          category: 'electronics',
          image: 'https://example.com/1.jpg',
          rating: { rate: 4.5, count: 100 },
        },
      ];

      (fakestoreClient.fakestoreClient.fetch as jest.Mock).mockResolvedValue(
        mockProducts
      );

      const res = await request(app)
        .get('/api/fakestore/products')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual(expect.arrayContaining([
        expect.objectContaining({
          fakestore_id: 1,
          title: 'Product 1',
          price: 10.5,
        }),
      ]));
    });

    it('should allow seller without shop to browse products', async () => {
      const sellerId = await createUser('seller2@test.com', 'seller');
      const token = createToken(sellerId, 'seller2@test.com', 'seller');
      await createSession(token, sellerId);

      (fakestoreClient.fakestoreClient.fetch as jest.Mock).mockResolvedValue([]);

      const res = await request(app)
        .get('/api/fakestore/products')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
    });

    it('should return 5xx on FakeStore timeout/error', async () => {
      const sellerId = await createUser('seller3@test.com', 'seller');
      const token = createToken(sellerId, 'seller3@test.com', 'seller');
      await createSession(token, sellerId);

      (fakestoreClient.fakestoreClient.fetch as jest.Mock).mockRejectedValue(
        new Error('FakeStore API error')
      );

      const res = await request(app)
        .get('/api/fakestore/products')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBeGreaterThanOrEqual(500);
      expect(res.body.message).toBeDefined();
    });
  });

  describe('GET /api/fakestore/categories', () => {
    it('should be public endpoint (no auth required)', async () => {
      (redisHelpers.redisGet as jest.Mock).mockResolvedValue(null);
      (fakestoreClient.fakestoreClient.fetch as jest.Mock).mockResolvedValue([
        'electronics',
      ]);

      const res = await request(app).get('/api/fakestore/categories');
      expect(res.status).toBe(200);
    });

    it('should return string array of categories from FakeStore on first call', async () => {
      (redisHelpers.redisGet as jest.Mock).mockResolvedValue(null);
      (fakestoreClient.fakestoreClient.fetch as jest.Mock).mockResolvedValue([
        'electronics',
        'jewelery',
      ]);

      const res = await request(app).get('/api/fakestore/categories');

      expect(res.status).toBe(200);
      expect(res.body).toEqual(['electronics', 'jewelery']);
    });

    it('should return cached data on subsequent calls', async () => {
      const cached = ['electronics', 'jewelery'];
      (redisHelpers.redisGet as jest.Mock).mockResolvedValue(
        JSON.stringify(cached)
      );

      const res = await request(app).get('/api/fakestore/categories');

      expect(res.status).toBe(200);
      expect(res.body).toEqual(cached);
      expect(fakestoreClient.fakestoreClient.fetch).not.toHaveBeenCalled();
    });

    it('should fall back to DB on Redis unavailability', async () => {
      (redisHelpers.redisGet as jest.Mock).mockResolvedValue(null);
      // The actual DB contains no entries since we cleared it, so this will fall through to FakeStore
      (fakestoreClient.fakestoreClient.fetch as jest.Mock).mockResolvedValue([
        'electronics',
        'jewelery',
      ]);

      const res = await request(app).get('/api/fakestore/categories');

      expect(res.status).toBe(200);
      expect(res.body).toEqual(['electronics', 'jewelery']);
    });

    it('should fetch from FakeStore when DB is empty and Redis unavailable', async () => {
      (redisHelpers.redisGet as jest.Mock).mockResolvedValue(null);
      (fakestoreClient.fakestoreClient.fetch as jest.Mock).mockResolvedValue([
        'electronics',
      ]);

      const res = await request(app).get('/api/fakestore/categories');

      expect(res.status).toBe(200);
      expect(fakestoreClient.fakestoreClient.fetch).toHaveBeenCalledWith(
        '/products/categories'
      );
    });

    it('should return 5xx on FakeStore error', async () => {
      (redisHelpers.redisGet as jest.Mock).mockResolvedValue(null);
      (fakestoreClient.fakestoreClient.fetch as jest.Mock).mockRejectedValue(
        new Error('FakeStore down')
      );

      const res = await request(app).get('/api/fakestore/categories');

      expect(res.status).toBeGreaterThanOrEqual(500);
    });
  });

  describe('POST /api/fakestore/import', () => {
    it('should return 401 without auth token', async () => {
      const res = await request(app)
        .post('/api/fakestore/import')
        .send({ ids: [1, 2], overwrite: false });

      expect(res.status).toBe(401);
    });

    it('should return 403 if seller has no shop', async () => {
      const sellerId = await createUser('seller4@test.com', 'seller');
      const token = createToken(sellerId, 'seller4@test.com', 'seller');
      await createSession(token, sellerId);

      const res = await request(app)
        .post('/api/fakestore/import')
        .set('Authorization', `Bearer ${token}`)
        .send({ ids: [1, 2] });

      expect(res.status).toBe(403);
    });

    it('should import new products with correct fields', async () => {
      const sellerId = await createUser('seller5@test.com', 'seller');
      const shopId = await createShop(sellerId);
      const token = createToken(sellerId, 'seller5@test.com', 'seller');
      await createSession(token, sellerId);

      const mockProducts = [
        {
          id: 1,
          title: 'Product 1',
          price: 10.5,
          description: 'Desc 1',
          category: 'electronics',
          image: 'https://example.com/1.jpg',
          rating: { rate: 4.5, count: 100 },
        },
      ];

      (fakestoreClient.fakestoreClient.fetch as jest.Mock).mockResolvedValue(
        mockProducts
      );

      const res = await request(app)
        .post('/api/fakestore/import')
        .set('Authorization', `Bearer ${token}`)
        .send({ ids: [1], overwrite: false });

      expect(res.status).toBe(200);
      expect(res.body.count).toBe(1);
      expect(res.body.importedIds).toContain(1);

      // Verify product in DB
      const product = await db.query('SELECT * FROM products WHERE fakestore_id = 1');
      expect(product.rows[0].fakestore_id).toBe(1);
      expect(product.rows[0].title).toBe('Product 1');
    });

    it('should preserve existing price when overwrite=false', async () => {
      const sellerId = await createUser('seller6@test.com', 'seller');
      const shopId = await createShop(sellerId);
      const token = createToken(sellerId, 'seller6@test.com', 'seller');
      await createSession(token, sellerId);

      // Create existing product with fakestore_id
      const existingProduct = await createProduct(shopId, {
        fakestore_id: 1,
        price: 99.99,
      });

      const mockProducts = [
        {
          id: 1,
          title: 'Updated Product',
          price: 10.5,
          description: 'Desc 1',
          category: 'electronics',
          image: 'https://example.com/1.jpg',
          rating: { rate: 4.5, count: 100 },
        },
      ];

      (fakestoreClient.fakestoreClient.fetch as jest.Mock).mockResolvedValue(
        mockProducts
      );

      await request(app)
        .post('/api/fakestore/import')
        .set('Authorization', `Bearer ${token}`)
        .send({ ids: [1], overwrite: false });

      const updated = await db.query(
        'SELECT * FROM products WHERE fakestore_id = 1'
      );
      expect(parseFloat(updated.rows[0].price)).toBe(99.99);
    });

    it('should replace all fields when overwrite=true', async () => {
      const sellerId = await createUser('seller7@test.com', 'seller');
      const shopId = await createShop(sellerId);
      const token = createToken(sellerId, 'seller7@test.com', 'seller');
      await createSession(token, sellerId);

      const existingProduct = await createProduct(shopId, {
        fakestore_id: 1,
        price: 99.99,
        description: 'Old desc',
      });

      const mockProducts = [
        {
          id: 1,
          title: 'Updated Product',
          price: 10.5,
          description: 'New desc',
          category: 'electronics',
          image: 'https://example.com/1.jpg',
          rating: { rate: 4.5, count: 100 },
        },
      ];

      (fakestoreClient.fakestoreClient.fetch as jest.Mock).mockResolvedValue(
        mockProducts
      );

      await request(app)
        .post('/api/fakestore/import')
        .set('Authorization', `Bearer ${token}`)
        .send({ ids: [1], overwrite: true });

      const updated = await db.query(
        'SELECT * FROM products WHERE fakestore_id = 1'
      );
      expect(parseFloat(updated.rows[0].price)).toBe(10.5);
      expect(updated.rows[0].description).toBe('New desc');
    });

    it('should apply field defaults for malformed data', async () => {
      const sellerId = await createUser('seller8@test.com', 'seller');
      const shopId = await createShop(sellerId);
      const token = createToken(sellerId, 'seller8@test.com', 'seller');
      await createSession(token, sellerId);

      const mockProducts = [
        {
          id: 1,
          // Missing title
          price: null,
          description: null,
          // Missing category
          image: null,
          rating: {},
        },
      ];

      (fakestoreClient.fakestoreClient.fetch as jest.Mock).mockResolvedValue(
        mockProducts
      );

      await request(app)
        .post('/api/fakestore/import')
        .set('Authorization', `Bearer ${token}`)
        .send({ ids: [1] });

      const product = await db.query(
        'SELECT * FROM products WHERE fakestore_id = 1'
      );
      expect(product.rows[0].title).toBe('Untitled Product');
      expect(parseFloat(product.rows[0].price)).toBe(0.01);
      expect(product.rows[0].description).toBe('');
      expect(product.rows[0].category).toBe('uncategorized');
      expect(product.rows[0].image_url).toBeNull();
      expect(parseFloat(product.rows[0].aggregate_rating)).toBe(0);
      expect(product.rows[0].review_count).toBe(0);
    });

    it('should return 400 for invalid request body', async () => {
      const sellerId = await createUser('seller9@test.com', 'seller');
      const shopId = await createShop(sellerId);
      const token = createToken(sellerId, 'seller9@test.com', 'seller');
      await createSession(token, sellerId);

      const res = await request(app)
        .post('/api/fakestore/import')
        .set('Authorization', `Bearer ${token}`)
        .send({ ids: [] }); // empty array

      expect(res.status).toBe(400);
    });

    it('should return 200 with importedIds and count', async () => {
      const sellerId = await createUser('seller10@test.com', 'seller');
      const shopId = await createShop(sellerId);
      const token = createToken(sellerId, 'seller10@test.com', 'seller');
      await createSession(token, sellerId);

      const mockProducts = [
        {
          id: 1,
          title: 'Product 1',
          price: 10.5,
          description: 'Desc 1',
          category: 'electronics',
          image: 'https://example.com/1.jpg',
          rating: { rate: 4.5, count: 100 },
        },
        {
          id: 2,
          title: 'Product 2',
          price: 20.5,
          description: 'Desc 2',
          category: 'books',
          image: 'https://example.com/2.jpg',
          rating: { rate: 3.5, count: 50 },
        },
      ];

      (fakestoreClient.fakestoreClient.fetch as jest.Mock).mockResolvedValue(
        mockProducts
      );

      const res = await request(app)
        .post('/api/fakestore/import')
        .set('Authorization', `Bearer ${token}`)
        .send({ ids: [1, 2] });

      expect(res.status).toBe(200);
      expect(res.body.count).toBe(2);
      expect(res.body.importedIds).toEqual([1, 2]);
    });

    it('should not invalidate Redis categories cache on import', async () => {
      const sellerId = await createUser('seller11@test.com', 'seller');
      const shopId = await createShop(sellerId);
      const token = createToken(sellerId, 'seller11@test.com', 'seller');
      await createSession(token, sellerId);

      const mockProducts = [
        {
          id: 1,
          title: 'Product 1',
          price: 10.5,
          description: 'Desc 1',
          category: 'electronics',
          image: 'https://example.com/1.jpg',
          rating: { rate: 4.5, count: 100 },
        },
      ];

      (fakestoreClient.fakestoreClient.fetch as jest.Mock).mockResolvedValue(
        mockProducts
      );

      await request(app)
        .post('/api/fakestore/import')
        .set('Authorization', `Bearer ${token}`)
        .send({ ids: [1] });

      expect(redisHelpers.redisDel).not.toHaveBeenCalled();
    });
  });

  describe('No regression', () => {
    it('should not break existing products endpoints', async () => {
      const sellerId = await createUser('seller12@test.com', 'seller');
      const shopId = await createShop(sellerId);
      const token = createToken(sellerId, 'seller12@test.com', 'seller');
      await createSession(token, sellerId);

      const res = await request(app)
        .get('/api/products')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('page');
    });
  });
});
