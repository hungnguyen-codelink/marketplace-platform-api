import request from 'supertest';
import { createHash } from 'crypto';
import jwt from 'jsonwebtoken';
import bcryptjs from 'bcryptjs';
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
}

async function cleanupDatabase() {
  await db.query('TRUNCATE sessions CASCADE');
  await db.query('TRUNCATE users CASCADE');
}

describe('Auth Endpoints - Integration Tests', () => {
  describe('POST /api/auth/register', () => {
    it('should return 201 with user and token on valid request', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'user@example.com',
          password: 'password123',
          full_name: 'Test User',
          role: 'buyer',
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('user');
      expect(res.body).toHaveProperty('token');
      expect(res.body.user).toHaveProperty('id');
      expect(res.body.user).toHaveProperty('email');
      expect(res.body.user).toHaveProperty('full_name');
      expect(res.body.user).toHaveProperty('role');
      expect(res.body.user.email).toBe('user@example.com');
      expect(res.body.user.full_name).toBe('Test User');
      expect(res.body.user.role).toBe('buyer');
      expect(res.body.token).toBeDefined();
    });

    it('should create sessions row with correct expires_at', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'user@example.com',
          password: 'password123',
          full_name: 'Test User',
          role: 'buyer',
        });

      const token = res.body.token;
      const tokenHash = createHash('sha256').update(token).digest('hex');
      const sessionResult = await db.query(
        'SELECT expires_at FROM sessions WHERE token_hash = $1',
        [tokenHash]
      );

      expect(sessionResult.rows.length).toBe(1);
      expect(sessionResult.rows[0].expires_at).toBeDefined();
      const expiresAt = new Date(sessionResult.rows[0].expires_at);
      const now = new Date();
      expect(expiresAt > now).toBe(true);
    });

    it('should hash password before insertion', async () => {
      const password = 'password123';
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'user@example.com',
          password,
          full_name: 'Test User',
          role: 'buyer',
        });

      const userResult = await db.query(
        'SELECT password_hash FROM users WHERE email = $1',
        ['user@example.com']
      );

      const passwordHash = userResult.rows[0].password_hash;
      expect(passwordHash).not.toBe(password);
      const isMatch = await bcryptjs.compare(password, passwordHash);
      expect(isMatch).toBe(true);
    });

    it('should return 409 on duplicate email', async () => {
      await request(app)
        .post('/api/auth/register')
        .send({
          email: 'user@example.com',
          password: 'password123',
          full_name: 'Test User',
          role: 'buyer',
        });

      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'user@example.com',
          password: 'different123',
          full_name: 'Another User',
          role: 'seller',
        });

      expect(res.status).toBe(409);
      expect(res.body.message).toBe('Email already exists');
    });

    it('should return 400 for missing role field', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'user@example.com',
          password: 'password123',
          full_name: 'Test User',
        });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('errors');
      expect(res.body.errors).toHaveProperty('role');
    });

    it('should return 400 for role="admin"', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'user@example.com',
          password: 'password123',
          full_name: 'Test User',
          role: 'admin',
        });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('errors');
      expect(res.body.errors).toHaveProperty('role');
    });

    it('should return 400 for invalid role', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'user@example.com',
          password: 'password123',
          full_name: 'Test User',
          role: 'invalid',
        });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('errors');
      expect(res.body.errors).toHaveProperty('role');
    });

    it('should create user with role="buyer"', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'buyer@example.com',
          password: 'password123',
          full_name: 'Buyer User',
          role: 'buyer',
        });

      expect(res.status).toBe(201);
      expect(res.body.user.role).toBe('buyer');
    });

    it('should create user with role="seller"', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'seller@example.com',
          password: 'password123',
          full_name: 'Seller User',
          role: 'seller',
        });

      expect(res.status).toBe(201);
      expect(res.body.user.role).toBe('seller');
    });

    it('should return 400 for password less than 8 chars', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'user@example.com',
          password: 'short',
          full_name: 'Test User',
          role: 'buyer',
        });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('errors');
      expect(res.body.errors).toHaveProperty('password');
    });

    it('should return 400 for invalid email format', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'not-an-email',
          password: 'password123',
          full_name: 'Test User',
          role: 'buyer',
        });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('errors');
      expect(res.body.errors).toHaveProperty('email');
    });

    it('should return 400 for empty full_name', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'user@example.com',
          password: 'password123',
          full_name: '',
          role: 'buyer',
        });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('errors');
      expect(res.body.errors).toHaveProperty('full_name');
    });

    it('should handle concurrent duplicate email requests', async () => {
      const payload = {
        email: 'concurrent@example.com',
        password: 'password123',
        full_name: 'Concurrent User',
        role: 'buyer',
      };

      const [res1, res2] = await Promise.all([
        request(app).post('/api/auth/register').send(payload),
        request(app).post('/api/auth/register').send(payload),
      ]);

      // One should succeed, one should fail with 409
      const results = [res1, res2];
      const successCount = results.filter((r) => r.status === 201).length;
      const conflictCount = results.filter((r) => r.status === 409).length;

      expect(successCount + conflictCount).toBe(2);
      expect(successCount).toBeGreaterThanOrEqual(1);
      expect(conflictCount).toBeGreaterThanOrEqual(1);
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      // Create a test user
      const passwordHash = await bcryptjs.hash('password123', 10);
      await db.query(
        'INSERT INTO users (email, password_hash, full_name, role) VALUES ($1, $2, $3, $4)',
        ['user@example.com', passwordHash, 'Test User', 'buyer']
      );
    });

    it('should return 200 with user and token on valid credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'user@example.com',
          password: 'password123',
        });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('user');
      expect(res.body).toHaveProperty('token');
      expect(res.body.user.email).toBe('user@example.com');
      expect(res.body.user.full_name).toBe('Test User');
      expect(res.body.user.role).toBe('buyer');
    });

    it('should create sessions row linked to user', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'user@example.com',
          password: 'password123',
        });

      const token = res.body.token;
      const tokenHash = createHash('sha256').update(token).digest('hex');
      const sessionResult = await db.query(
        'SELECT user_id, expires_at FROM sessions WHERE token_hash = $1',
        [tokenHash]
      );

      expect(sessionResult.rows.length).toBe(1);
      expect(sessionResult.rows[0].user_id).toBeDefined();
    });

    it('should return 401 for invalid email', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'password123',
        });

      expect(res.status).toBe(401);
      expect(res.body.message).toBe('Invalid credentials');
    });

    it('should return 401 for invalid password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'user@example.com',
          password: 'wrongpassword',
        });

      expect(res.status).toBe(401);
      expect(res.body.message).toBe('Invalid credentials');
    });

    it('should return 400 for invalid email format', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'not-an-email',
          password: 'password123',
        });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('errors');
    });
  });

  describe('POST /api/auth/logout', () => {
    let token: string;
    let tokenHash: string;
    let userId: string;

    beforeEach(async () => {
      // Create and login user
      const registerRes = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'user@example.com',
          password: 'password123',
          full_name: 'Test User',
          role: 'buyer',
        });

      token = registerRes.body.token;
      userId = registerRes.body.user.id;
      tokenHash = createHash('sha256').update(token).digest('hex');
    });

    it('should delete session and return 204 with valid JWT', async () => {
      const res = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(204);

      // Verify session is deleted
      const sessionResult = await db.query(
        'SELECT * FROM sessions WHERE token_hash = $1',
        [tokenHash]
      );
      expect(sessionResult.rows.length).toBe(0);
    });

    it('should return 401 when missing Authorization header', async () => {
      const res = await request(app).post('/api/auth/logout');

      expect(res.status).toBe(401);
      expect(res.body.message).toBe('Unauthorized');
    });

    it('should return 401 for malformed Authorization header', async () => {
      const res = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', 'InvalidFormat');

      expect(res.status).toBe(401);
      expect(res.body.message).toBe('Unauthorized');
    });

    it('should return 401 for revoked session', async () => {
      // Delete the session manually
      await db.query('DELETE FROM sessions WHERE token_hash = $1', [tokenHash]);

      const res = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(401);
    });

    it('should isolate sessions between users', async () => {
      // Create second user
      const registerRes2 = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'user2@example.com',
          password: 'password456',
          full_name: 'Test User 2',
          role: 'seller',
        });

      const token2 = registerRes2.body.token;
      const tokenHash2 = createHash('sha256').update(token2).digest('hex');

      // Logout user 1
      const res1 = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${token}`);

      expect(res1.status).toBe(204);

      // User 2's session should still exist
      const sessionResult = await db.query(
        'SELECT * FROM sessions WHERE token_hash = $1',
        [tokenHash2]
      );
      expect(sessionResult.rows.length).toBe(1);

      // User 1's session should be deleted
      const sessionResult1 = await db.query(
        'SELECT * FROM sessions WHERE token_hash = $1',
        [tokenHash]
      );
      expect(sessionResult1.rows.length).toBe(0);
    });
  });

  describe('Session expiry validation', () => {
    it('should reject expired token', async () => {
      // Create user manually with past expires_at
      const passwordHash = await bcryptjs.hash('password123', 10);
      const userResult = await db.query(
        'INSERT INTO users (email, password_hash, full_name, role) VALUES ($1, $2, $3, $4) RETURNING id',
        ['expired@example.com', passwordHash, 'Expired User', 'buyer']
      );

      const userId = userResult.rows[0].id;
      const token = jwt.sign(
        { id: userId, email: 'expired@example.com', role: 'buyer' },
        env.JWT_SECRET,
        { expiresIn: env.SESSION_TTL_SECONDS }
      );

      const tokenHash = createHash('sha256').update(token).digest('hex');
      const pastExpiry = new Date(Date.now() - 1000); // 1 second in the past

      await db.query(
        'INSERT INTO sessions (token_hash, user_id, expires_at) VALUES ($1, $2, $3)',
        [tokenHash, userId, pastExpiry]
      );

      const res = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(401);
    });
  });

  describe('Validation error response format', () => {
    it('should return structured field errors on register validation failure', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'invalid-email',
          password: 'short',
          full_name: '',
        });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('message');
      expect(res.body).toHaveProperty('errors');
      expect(typeof res.body.errors).toBe('object');
      expect(res.body.errors.email).toBeDefined();
      expect(res.body.errors.password).toBeDefined();
      expect(res.body.errors.full_name).toBeDefined();
    });

    it('should return structured field errors on login validation failure', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'invalid-email',
        });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('message');
      expect(res.body).toHaveProperty('errors');
      expect(typeof res.body.errors).toBe('object');
    });
  });

  describe('JWT payload structure', () => {
    it('should issue JWT with id, email, role payload', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'jwt@example.com',
          password: 'password123',
          full_name: 'JWT Test',
          role: 'buyer',
        });

      const token = res.body.token;
      const decoded = jwt.verify(token, env.JWT_SECRET) as any;

      expect(decoded.id).toBeDefined();
      expect(decoded.email).toBe('jwt@example.com');
      expect(decoded.role).toBe('buyer');
    });
  });
});
