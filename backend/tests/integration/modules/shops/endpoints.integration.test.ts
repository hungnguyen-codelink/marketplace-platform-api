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
}

async function cleanupDatabase() {
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

describe('Shops Endpoints - Integration Tests', () => {
  describe('POST /api/shops', () => {
    it('should create shop with valid payload, returns 201 with shop object', async () => {
      const sellerId = await createUser('seller@example.com', 'seller');
      const token = createToken(sellerId, 'seller@example.com', 'seller');
      await createSession(token, sellerId);

      const res = await request(app)
        .post('/api/shops')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'My Shop',
          description: 'A great shop',
          banner_url: 'https://example.com/banner.jpg',
          contact_email: 'shop@example.com',
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body).toHaveProperty('name', 'My Shop');
      expect(res.body).toHaveProperty('description', 'A great shop');
      expect(res.body).toHaveProperty('banner_url', 'https://example.com/banner.jpg');
      expect(res.body).toHaveProperty('contact_email', 'shop@example.com');
      expect(res.body).toHaveProperty('created_at');
      expect(res.body).not.toHaveProperty('seller_id');
    });

    it('should reject unauthenticated requests with 401', async () => {
      const res = await request(app)
        .post('/api/shops')
        .send({
          name: 'My Shop',
        });

      expect(res.status).toBe(401);
    });

    it('should reject non-seller roles with 403', async () => {
      const buyerId = await createUser('buyer@example.com', 'buyer');
      const token = createToken(buyerId, 'buyer@example.com', 'buyer');
      await createSession(token, buyerId);

      const res = await request(app)
        .post('/api/shops')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'My Shop',
        });

      expect(res.status).toBe(403);
    });

    it('should return 400 with field-level errors when missing name', async () => {
      const sellerId = await createUser('seller@example.com', 'seller');
      const token = createToken(sellerId, 'seller@example.com', 'seller');
      await createSession(token, sellerId);

      const res = await request(app)
        .post('/api/shops')
        .set('Authorization', `Bearer ${token}`)
        .send({
          description: 'A great shop',
        });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('errors');
      expect(res.body.errors).toHaveProperty('name');
    });

    it('should return 400 when optional fields are empty/whitespace-only', async () => {
      const sellerId = await createUser('seller@example.com', 'seller');
      const token = createToken(sellerId, 'seller@example.com', 'seller');
      await createSession(token, sellerId);

      const res = await request(app)
        .post('/api/shops')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'My Shop',
          description: '   ',
        });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('errors');
      expect(res.body.errors).toHaveProperty('description');
    });

    it('should return 409 Conflict when same seller creates shop twice (SHOP-02)', async () => {
      const sellerId = await createUser('seller@example.com', 'seller');
      const token = createToken(sellerId, 'seller@example.com', 'seller');
      await createSession(token, sellerId);

      // Create first shop
      await request(app)
        .post('/api/shops')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'My Shop',
        });

      // Try to create second shop with same seller
      const res = await request(app)
        .post('/api/shops')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Another Shop',
        });

      expect(res.status).toBe(409);
      expect(res.body.message).toBe('Seller already has a shop');
    });
  });

  describe('GET /api/shops/my', () => {
    it('should return 404 when seller has no shop yet (onboarding gate AC-09)', async () => {
      const sellerId = await createUser('seller@example.com', 'seller');
      const token = createToken(sellerId, 'seller@example.com', 'seller');
      await createSession(token, sellerId);

      const res = await request(app)
        .get('/api/shops/my')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
      expect(res.body.message).toBe('Shop not found');
    });

    it('should return 401 for unauthenticated requests', async () => {
      const res = await request(app)
        .get('/api/shops/my');

      expect(res.status).toBe(401);
    });

    it('should return 403 for non-seller roles', async () => {
      const buyerId = await createUser('buyer@example.com', 'buyer');
      const token = createToken(buyerId, 'buyer@example.com', 'buyer');
      await createSession(token, buyerId);

      const res = await request(app)
        .get('/api/shops/my')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
    });

    it('should return shop after it is created', async () => {
      const sellerId = await createUser('seller@example.com', 'seller');
      const token = createToken(sellerId, 'seller@example.com', 'seller');
      await createSession(token, sellerId);

      // Create shop
      const createRes = await request(app)
        .post('/api/shops')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'My Shop',
          description: 'A great shop',
        });

      expect(createRes.status).toBe(201);

      // Get shop
      const getRes = await request(app)
        .get('/api/shops/my')
        .set('Authorization', `Bearer ${token}`);

      expect(getRes.status).toBe(200);
      expect(getRes.body).toHaveProperty('id', createRes.body.id);
      expect(getRes.body).toHaveProperty('name', 'My Shop');
      expect(getRes.body).toHaveProperty('description', 'A great shop');
      expect(getRes.body).toHaveProperty('seller_id', sellerId);
    });
  });

  describe('PUT /api/shops/my', () => {
    it('should update current seller shop, returns 200 with updated shop object', async () => {
      const sellerId = await createUser('seller@example.com', 'seller');
      const token = createToken(sellerId, 'seller@example.com', 'seller');
      await createSession(token, sellerId);

      // Create shop
      await request(app)
        .post('/api/shops')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Original Shop',
          description: 'Original description',
        });

      // Update shop
      const res = await request(app)
        .put('/api/shops/my')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Updated Shop',
          description: 'Updated description',
        });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('name', 'Updated Shop');
      expect(res.body).toHaveProperty('description', 'Updated description');
      expect(res.body).toHaveProperty('seller_id', sellerId);
    });

    it('should return 400 with validation errors for invalid body', async () => {
      const sellerId = await createUser('seller@example.com', 'seller');
      const token = createToken(sellerId, 'seller@example.com', 'seller');
      await createSession(token, sellerId);

      // Create shop first
      await request(app)
        .post('/api/shops')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'My Shop',
        });

      // Try to update with empty description
      const res = await request(app)
        .put('/api/shops/my')
        .set('Authorization', `Bearer ${token}`)
        .send({
          description: '   ',
        });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('errors');
    });

    it('should update only provided fields, leaves others unchanged', async () => {
      const sellerId = await createUser('seller@example.com', 'seller');
      const token = createToken(sellerId, 'seller@example.com', 'seller');
      await createSession(token, sellerId);

      // Create shop
      const createRes = await request(app)
        .post('/api/shops')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Original Shop',
          description: 'Original description',
          contact_email: 'original@example.com',
        });

      const originalId = createRes.body.id;

      // Update only name
      const updateRes = await request(app)
        .put('/api/shops/my')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Updated Shop',
        });

      expect(updateRes.status).toBe(200);
      expect(updateRes.body).toHaveProperty('id', originalId);
      expect(updateRes.body).toHaveProperty('name', 'Updated Shop');
      expect(updateRes.body).toHaveProperty('description', 'Original description');
      expect(updateRes.body).toHaveProperty('contact_email', 'original@example.com');
    });

    it('should return 401 for unauthenticated requests', async () => {
      const res = await request(app)
        .put('/api/shops/my')
        .send({
          name: 'Updated Shop',
        });

      expect(res.status).toBe(401);
    });

    it('should return 403 for non-seller roles', async () => {
      const buyerId = await createUser('buyer@example.com', 'buyer');
      const token = createToken(buyerId, 'buyer@example.com', 'buyer');
      await createSession(token, buyerId);

      const res = await request(app)
        .put('/api/shops/my')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Updated Shop',
        });

      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/shops/:id', () => {
    it('should return shop by ID without auth', async () => {
      const sellerId = await createUser('seller@example.com', 'seller');
      const token = createToken(sellerId, 'seller@example.com', 'seller');
      await createSession(token, sellerId);

      // Create shop
      const createRes = await request(app)
        .post('/api/shops')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'My Shop',
          description: 'A great shop',
        });

      const shopId = createRes.body.id;

      // Get shop without auth
      const res = await request(app)
        .get(`/api/shops/${shopId}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('id', shopId);
      expect(res.body).toHaveProperty('name', 'My Shop');
      expect(res.body).toHaveProperty('description', 'A great shop');
    });

    it('should NOT return seller_id in response body for public endpoint', async () => {
      const sellerId = await createUser('seller@example.com', 'seller');
      const token = createToken(sellerId, 'seller@example.com', 'seller');
      await createSession(token, sellerId);

      // Create shop
      const createRes = await request(app)
        .post('/api/shops')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'My Shop',
        });

      const shopId = createRes.body.id;

      // Get shop
      const res = await request(app)
        .get(`/api/shops/${shopId}`);

      expect(res.status).toBe(200);
      expect(res.body).not.toHaveProperty('seller_id');
    });

    it('should return 404 if shop not found', async () => {
      const res = await request(app)
        .get('/api/shops/00000000-0000-0000-0000-000000000000');

      expect(res.status).toBe(404);
      expect(res.body.message).toBe('Shop not found');
    });
  });

  describe('Onboarding Gate Scenario (AC-09)', () => {
    it('should follow complete onboarding flow: no shop → 404 → create shop → success', async () => {
      const sellerId = await createUser('seller@example.com', 'seller');
      const token = createToken(sellerId, 'seller@example.com', 'seller');
      await createSession(token, sellerId);

      // Step 1: GET /api/shops/my returns 404 (blocks seller from proceeding)
      const noShopRes = await request(app)
        .get('/api/shops/my')
        .set('Authorization', `Bearer ${token}`);

      expect(noShopRes.status).toBe(404);

      // Step 2: POST /api/shops creates shop
      const createRes = await request(app)
        .post('/api/shops')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'New Shop',
          description: 'My shop',
        });

      expect(createRes.status).toBe(201);
      expect(createRes.body).toHaveProperty('id');

      // Step 3: GET /api/shops/my succeeds
      const withShopRes = await request(app)
        .get('/api/shops/my')
        .set('Authorization', `Bearer ${token}`);

      expect(withShopRes.status).toBe(200);
      expect(withShopRes.body).toHaveProperty('id', createRes.body.id);
      expect(withShopRes.body).toHaveProperty('name', 'New Shop');
    });
  });
});
