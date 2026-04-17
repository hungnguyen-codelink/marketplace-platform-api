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
}

async function cleanupDatabase() {
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

describe('Products Endpoints - Integration Tests', () => {
  describe('POST /api/products', () => {
    it('should create product with valid payload, returns 201 with product object', async () => {
      const sellerId = await createUser('seller@example.com', 'seller');
      const token = createToken(sellerId, 'seller@example.com', 'seller');
      await createSession(token, sellerId);
      await createShop(sellerId);

      const res = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'Laptop',
          description: 'A great laptop',
          price: 999.99,
          image_url: 'https://example.com/laptop.jpg',
          category: 'Electronics',
          stock: 100,
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body).toHaveProperty('title', 'Laptop');
      expect(res.body).toHaveProperty('description', 'A great laptop');
      expect(res.body).toHaveProperty('price', 999.99);
      expect(res.body).toHaveProperty('stock', 100);
      expect(res.body).toHaveProperty('category', 'Electronics');
      expect(res.body).not.toHaveProperty('fakestore_id');
    });

    it('should reject unauthenticated requests with 401', async () => {
      const res = await request(app)
        .post('/api/products')
        .send({
          title: 'Laptop',
          price: 999.99,
          stock: 100,
        });

      expect(res.status).toBe(401);
    });

    it('should reject non-seller roles with 403', async () => {
      const buyerId = await createUser('buyer@example.com', 'buyer');
      const token = createToken(buyerId, 'buyer@example.com', 'buyer');
      await createSession(token, buyerId);

      const res = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'Laptop',
          price: 999.99,
          stock: 100,
        });

      expect(res.status).toBe(403);
    });

    it('should return 400 when title is missing', async () => {
      const sellerId = await createUser('seller@example.com', 'seller');
      const token = createToken(sellerId, 'seller@example.com', 'seller');
      await createSession(token, sellerId);
      await createShop(sellerId);

      const res = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${token}`)
        .send({
          price: 999.99,
          stock: 100,
        });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('errors');
      expect(res.body.errors).toHaveProperty('title');
    });

    it('should return 400 when price is invalid (0 or negative)', async () => {
      const sellerId = await createUser('seller@example.com', 'seller');
      const token = createToken(sellerId, 'seller@example.com', 'seller');
      await createSession(token, sellerId);
      await createShop(sellerId);

      const res = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'Laptop',
          price: 0,
          stock: 100,
        });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('errors');
    });

    it('should return 400 when price has more than 2 decimal places', async () => {
      const sellerId = await createUser('seller@example.com', 'seller');
      const token = createToken(sellerId, 'seller@example.com', 'seller');
      await createSession(token, sellerId);
      await createShop(sellerId);

      const res = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'Laptop',
          price: 999.999,
          stock: 100,
        });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('errors');
    });

    it('should return 400 when stock is negative', async () => {
      const sellerId = await createUser('seller@example.com', 'seller');
      const token = createToken(sellerId, 'seller@example.com', 'seller');
      await createSession(token, sellerId);
      await createShop(sellerId);

      const res = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'Laptop',
          price: 999.99,
          stock: -1,
        });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('errors');
    });

    it('should return 400 when stock exceeds 999999', async () => {
      const sellerId = await createUser('seller@example.com', 'seller');
      const token = createToken(sellerId, 'seller@example.com', 'seller');
      await createSession(token, sellerId);
      await createShop(sellerId);

      const res = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'Laptop',
          price: 999.99,
          stock: 1000000,
        });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('errors');
    });

    it('should return 400 when stock has decimal places', async () => {
      const sellerId = await createUser('seller@example.com', 'seller');
      const token = createToken(sellerId, 'seller@example.com', 'seller');
      await createSession(token, sellerId);
      await createShop(sellerId);

      const res = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'Laptop',
          price: 999.99,
          stock: 50.5,
        });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('errors');
    });

    it('should return 403 when seller has no shop (gate)', async () => {
      const sellerId = await createUser('seller@example.com', 'seller');
      const token = createToken(sellerId, 'seller@example.com', 'seller');
      await createSession(token, sellerId);

      const res = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'Laptop',
          price: 999.99,
          stock: 100,
        });

      expect(res.status).toBe(403);
      expect(res.body.message).toBe('Seller must have a shop to create products');
    });

    it('should accept optional fields (description, image_url, category)', async () => {
      const sellerId = await createUser('seller@example.com', 'seller');
      const token = createToken(sellerId, 'seller@example.com', 'seller');
      await createSession(token, sellerId);
      await createShop(sellerId);

      const res = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'Laptop',
          price: 999.99,
          stock: 100,
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('title', 'Laptop');
    });
  });

  describe('GET /api/products', () => {
    it('should return paginated products with default limit=10', async () => {
      const sellerId = await createUser('seller@example.com', 'seller');
      const shopId = await createShop(sellerId);

      for (let i = 0; i < 15; i++) {
        await createProduct(shopId, { title: `Product ${i}` });
      }

      const res = await request(app).get('/api/products');

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(10);
      expect(res.body[0]).not.toHaveProperty('fakestore_id');
    });

    it('should support custom limit', async () => {
      const sellerId = await createUser('seller@example.com', 'seller');
      const shopId = await createShop(sellerId);

      for (let i = 0; i < 15; i++) {
        await createProduct(shopId, { title: `Product ${i}` });
      }

      const res = await request(app).get('/api/products?limit=5');

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(5);
    });

    it('should support pagination with page parameter', async () => {
      const sellerId = await createUser('seller@example.com', 'seller');
      const shopId = await createShop(sellerId);

      for (let i = 0; i < 25; i++) {
        await createProduct(shopId, { title: `Product ${i}` });
      }

      const res = await request(app).get('/api/products?limit=10&page=2');

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(10);
    });

    it('should filter by search term (case-insensitive)', async () => {
      const sellerId = await createUser('seller@example.com', 'seller');
      const shopId = await createShop(sellerId);

      await createProduct(shopId, { title: 'Laptop', description: 'Fast laptop' });
      await createProduct(shopId, { title: 'Mouse', description: 'Wireless mouse' });
      await createProduct(shopId, { title: 'LAPTOP STAND', description: 'Adjustable' });

      const res = await request(app).get('/api/products?search=laptop');

      expect(res.status).toBe(200);
      expect(res.body.length).toBeGreaterThanOrEqual(2);
      expect(res.body.some((p: any) => p.title.toLowerCase().includes('laptop'))).toBe(true);
    });

    it('should filter by search term matching category (case-insensitive)', async () => {
      const sellerId = await createUser('seller@example.com', 'seller');
      const shopId = await createShop(sellerId);

      await createProduct(shopId, { title: 'Office Chair', description: 'Comfortable seating', category: 'Furniture' });
      await createProduct(shopId, { title: 'Desk Lamp', description: 'LED light', category: 'Electronics' });
      await createProduct(shopId, { title: 'Random Item', description: 'No match here', category: 'FURNITURE' });

      const res = await request(app).get('/api/products?search=furniture');

      expect(res.status).toBe(200);
      expect(res.body.length).toBeGreaterThanOrEqual(2);
      expect(res.body.some((p: any) => p.category && p.category.toLowerCase() === 'furniture')).toBe(true);
    });

    it('should filter by category (exact match)', async () => {
      const sellerId = await createUser('seller@example.com', 'seller');
      const shopId = await createShop(sellerId);

      await createProduct(shopId, { category: 'Electronics' });
      await createProduct(shopId, { category: 'Furniture' });
      await createProduct(shopId, { category: 'Electronics' });

      const res = await request(app).get('/api/products?category=Electronics');

      expect(res.status).toBe(200);
      expect(res.body.length).toBeGreaterThanOrEqual(2);
      expect(res.body.every((p: any) => p.category === 'Electronics')).toBe(true);
    });

    it('should filter by search and category together', async () => {
      const sellerId = await createUser('seller@example.com', 'seller');
      const shopId = await createShop(sellerId);

      await createProduct(shopId, { title: 'Laptop', category: 'Electronics' });
      await createProduct(shopId, { title: 'Desk', category: 'Furniture' });
      await createProduct(shopId, { title: 'Mouse', category: 'Electronics' });

      const res = await request(app).get('/api/products?search=mouse&category=Electronics');

      expect(res.status).toBe(200);
      expect(res.body.every((p: any) => p.category === 'Electronics')).toBe(true);
    });

    it('should not expose fakestore_id in response', async () => {
      const sellerId = await createUser('seller@example.com', 'seller');
      const shopId = await createShop(sellerId);

      await createProduct(shopId);

      const res = await request(app).get('/api/products');

      expect(res.status).toBe(200);
      expect(res.body[0]).not.toHaveProperty('fakestore_id');
    });
  });

  describe('GET /api/products/:id', () => {
    it('should return product by ID without fakestore_id', async () => {
      const sellerId = await createUser('seller@example.com', 'seller');
      const shopId = await createShop(sellerId);
      const product = await createProduct(shopId, {
        title: 'Laptop',
        description: 'A great laptop',
        price: 999.99,
        category: 'Electronics',
        stock: 50,
      });

      const res = await request(app).get(`/api/products/${product.id}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('id', product.id);
      expect(res.body).toHaveProperty('title', 'Laptop');
      expect(res.body).toHaveProperty('description', 'A great laptop');
      expect(res.body).not.toHaveProperty('fakestore_id');
    });

    it('should return 404 if product not found', async () => {
      const res = await request(app).get('/api/products/00000000-0000-0000-0000-000000000000');

      expect(res.status).toBe(404);
      expect(res.body.message).toBe('Product not found');
    });

    it('should be publicly accessible without auth', async () => {
      const sellerId = await createUser('seller@example.com', 'seller');
      const shopId = await createShop(sellerId);
      const product = await createProduct(shopId);

      const res = await request(app).get(`/api/products/${product.id}`);

      expect(res.status).toBe(200);
    });
  });

  describe('PUT /api/products/:id', () => {
    it('should update product for seller, returns 200 with updated product', async () => {
      const sellerId = await createUser('seller@example.com', 'seller');
      const token = createToken(sellerId, 'seller@example.com', 'seller');
      await createSession(token, sellerId);
      const shopId = await createShop(sellerId);
      const product = await createProduct(shopId, { title: 'Original Title', price: 99.99 });

      const res = await request(app)
        .put(`/api/products/${product.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'Updated Title',
          price: 149.99,
        });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('title', 'Updated Title');
      expect(res.body).toHaveProperty('price', 149.99);
      expect(res.body).not.toHaveProperty('fakestore_id');
    });

    it('should update only provided fields, leaves others unchanged', async () => {
      const sellerId = await createUser('seller@example.com', 'seller');
      const token = createToken(sellerId, 'seller@example.com', 'seller');
      await createSession(token, sellerId);
      const shopId = await createShop(sellerId);
      const product = await createProduct(shopId, {
        title: 'Original Title',
        description: 'Original Description',
        price: 99.99,
      });

      const res = await request(app)
        .put(`/api/products/${product.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'Updated Title',
        });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('title', 'Updated Title');
      expect(res.body).toHaveProperty('description', 'Original Description');
      expect(res.body).toHaveProperty('price', 99.99);
    });

    it('should return 401 for unauthenticated requests', async () => {
      const sellerId = await createUser('seller@example.com', 'seller');
      const shopId = await createShop(sellerId);
      const product = await createProduct(shopId);

      const res = await request(app)
        .put(`/api/products/${product.id}`)
        .send({
          title: 'Updated Title',
        });

      expect(res.status).toBe(401);
    });

    it('should return 403 for non-seller roles', async () => {
      const sellerId = await createUser('seller@example.com', 'seller');
      const shopId = await createShop(sellerId);
      const product = await createProduct(shopId);

      const buyerId = await createUser('buyer@example.com', 'buyer');
      const token = createToken(buyerId, 'buyer@example.com', 'buyer');
      await createSession(token, buyerId);

      const res = await request(app)
        .put(`/api/products/${product.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'Updated Title',
        });

      expect(res.status).toBe(403);
    });

    it('should return 403 if seller tries to update another seller\'s product', async () => {
      const seller1Id = await createUser('seller1@example.com', 'seller');
      const seller2Id = await createUser('seller2@example.com', 'seller');

      const shop1Id = await createShop(seller1Id);
      const product = await createProduct(shop1Id);

      const token = createToken(seller2Id, 'seller2@example.com', 'seller');
      await createSession(token, seller2Id);
      await createShop(seller2Id);

      const res = await request(app)
        .put(`/api/products/${product.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'Updated Title',
        });

      expect(res.status).toBe(403);
      expect(res.body.message).toBe('Access denied');
    });

    it('should return 404 if product not found', async () => {
      const sellerId = await createUser('seller@example.com', 'seller');
      const token = createToken(sellerId, 'seller@example.com', 'seller');
      await createSession(token, sellerId);
      await createShop(sellerId);

      const res = await request(app)
        .put('/api/products/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'Updated Title',
        });

      expect(res.status).toBe(404);
      expect(res.body.message).toBe('Product not found');
    });

    it('should return 400 on validation error', async () => {
      const sellerId = await createUser('seller@example.com', 'seller');
      const token = createToken(sellerId, 'seller@example.com', 'seller');
      await createSession(token, sellerId);
      const shopId = await createShop(sellerId);
      const product = await createProduct(shopId);

      const res = await request(app)
        .put(`/api/products/${product.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          price: 0,
        });

      expect(res.status).toBe(400);
    });
  });

  describe('DELETE /api/products/:id', () => {
    it('should delete product for seller, returns 204 No Content', async () => {
      const sellerId = await createUser('seller@example.com', 'seller');
      const token = createToken(sellerId, 'seller@example.com', 'seller');
      await createSession(token, sellerId);
      const shopId = await createShop(sellerId);
      const product = await createProduct(shopId);

      const res = await request(app)
        .delete(`/api/products/${product.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(204);
      expect(res.body).toEqual({});
    });

    it('should return 401 for unauthenticated requests', async () => {
      const sellerId = await createUser('seller@example.com', 'seller');
      const shopId = await createShop(sellerId);
      const product = await createProduct(shopId);

      const res = await request(app).delete(`/api/products/${product.id}`);

      expect(res.status).toBe(401);
    });

    it('should return 403 for non-seller roles', async () => {
      const sellerId = await createUser('seller@example.com', 'seller');
      const shopId = await createShop(sellerId);
      const product = await createProduct(shopId);

      const buyerId = await createUser('buyer@example.com', 'buyer');
      const token = createToken(buyerId, 'buyer@example.com', 'buyer');
      await createSession(token, buyerId);

      const res = await request(app)
        .delete(`/api/products/${product.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
    });

    it('should return 403 if seller tries to delete another seller\'s product', async () => {
      const seller1Id = await createUser('seller1@example.com', 'seller');
      const seller2Id = await createUser('seller2@example.com', 'seller');

      const shop1Id = await createShop(seller1Id);
      const product = await createProduct(shop1Id);

      const token = createToken(seller2Id, 'seller2@example.com', 'seller');
      await createSession(token, seller2Id);
      await createShop(seller2Id);

      const res = await request(app)
        .delete(`/api/products/${product.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
      expect(res.body.message).toBe('Access denied');
    });

    it('should return 404 if product not found', async () => {
      const sellerId = await createUser('seller@example.com', 'seller');
      const token = createToken(sellerId, 'seller@example.com', 'seller');
      await createSession(token, sellerId);
      await createShop(sellerId);

      const res = await request(app)
        .delete('/api/products/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
      expect(res.body.message).toBe('Product not found');
    });
  });
});
