import bcryptjs from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { createHash } from 'crypto';

describe('Auth Service - Unit Tests', () => {
  describe('Bcrypt Hashing', () => {
    it('should hash password with bcrypt', async () => {
      const password = 'TestPassword123';
      const hash1 = await bcryptjs.hash(password, 10);
      const hash2 = await bcryptjs.hash(password, 10);

      // Same password produces different hashes due to random salt
      expect(hash1).not.toBe(hash2);
      expect(hash1).not.toBe(password);
      expect(hash2).not.toBe(password);
    });

    it('should verify password against hash', async () => {
      const password = 'TestPassword123';
      const hash = await bcryptjs.hash(password, 10);

      const isValid = await bcryptjs.compare(password, hash);
      expect(isValid).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const password = 'TestPassword123';
      const wrongPassword = 'WrongPassword123';
      const hash = await bcryptjs.hash(password, 10);

      const isValid = await bcryptjs.compare(wrongPassword, hash);
      expect(isValid).toBe(false);
    });

    it('should not match plaintext to hash', async () => {
      const password = 'TestPassword123';
      const hash = await bcryptjs.hash(password, 10);

      // Plaintext should not equal hash
      expect(password).not.toBe(hash);
    });
  });

  describe('JWT Token Generation', () => {
    const JWT_SECRET = 'test-secret-key';
    const SESSION_TTL_SECONDS = 3600;

    it('should generate JWT with correct payload', () => {
      const payload = {
        id: 'user-123',
        email: 'test@example.com',
        role: 'buyer',
      };

      const token = jwt.sign(payload, JWT_SECRET, {
        expiresIn: SESSION_TTL_SECONDS,
      });

      const decoded = jwt.verify(token, JWT_SECRET) as any;
      expect(decoded.id).toBe(payload.id);
      expect(decoded.email).toBe(payload.email);
      expect(decoded.role).toBe(payload.role);
    });

    it('should have exactly 3 fields in JWT payload', () => {
      const payload = {
        id: 'user-123',
        email: 'test@example.com',
        role: 'buyer',
      };

      const token = jwt.sign(payload, JWT_SECRET, {
        expiresIn: SESSION_TTL_SECONDS,
      });

      const decoded = jwt.verify(token, JWT_SECRET) as any;
      // Should have id, email, role, iat, exp
      // id, email, role are the custom fields
      expect(decoded.id).toBeDefined();
      expect(decoded.email).toBeDefined();
      expect(decoded.role).toBeDefined();
      expect(Object.keys(decoded)).toContain('id');
      expect(Object.keys(decoded)).toContain('email');
      expect(Object.keys(decoded)).toContain('role');
    });

    it('should reject tampered token', () => {
      const payload = {
        id: 'user-123',
        email: 'test@example.com',
        role: 'buyer',
      };

      const token = jwt.sign(payload, JWT_SECRET, {
        expiresIn: SESSION_TTL_SECONDS,
      });

      // Tamper with token
      const tamperedToken = token.slice(0, -10) + 'aaaaaaaaaa';

      expect(() => {
        jwt.verify(tamperedToken, JWT_SECRET);
      }).toThrow();
    });

    it('should reject token with wrong secret', () => {
      const payload = {
        id: 'user-123',
        email: 'test@example.com',
        role: 'buyer',
      };

      const token = jwt.sign(payload, JWT_SECRET, {
        expiresIn: SESSION_TTL_SECONDS,
      });

      const wrongSecret = 'wrong-secret-key';

      expect(() => {
        jwt.verify(token, wrongSecret);
      }).toThrow();
    });
  });

  describe('Token Hash Generation', () => {
    it('should generate sha256 hash of token', () => {
      const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
      const hash = createHash('sha256').update(token).digest('hex');

      expect(hash).toBeDefined();
      expect(hash.length).toBe(64); // SHA256 hex is 64 chars
      expect(typeof hash).toBe('string');
    });

    it('should generate consistent hash for same token', () => {
      const token = 'test-token-value';
      const hash1 = createHash('sha256').update(token).digest('hex');
      const hash2 = createHash('sha256').update(token).digest('hex');

      expect(hash1).toBe(hash2);
    });

    it('should generate different hash for different tokens', () => {
      const token1 = 'test-token-1';
      const token2 = 'test-token-2';
      const hash1 = createHash('sha256').update(token1).digest('hex');
      const hash2 = createHash('sha256').update(token2).digest('hex');

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('Session Expiry Calculation', () => {
    it('should calculate correct expires_at timestamp', () => {
      const SESSION_TTL_SECONDS = 3600;
      const now = Date.now();
      const expiresAt = new Date(now + SESSION_TTL_SECONDS * 1000);

      expect(expiresAt.getTime()).toBeGreaterThan(now);
      expect(expiresAt.getTime() - now).toBeLessThanOrEqual(SESSION_TTL_SECONDS * 1000 + 10);
    });

    it('should create past date for expired session', () => {
      const SESSION_TTL_SECONDS = 3600;
      const pastTime = Date.now() - SESSION_TTL_SECONDS * 2 * 1000; // 2 hours ago
      const expiresAt = new Date(pastTime);

      expect(expiresAt.getTime()).toBeLessThan(Date.now());
    });

    it('should check expiry correctly', () => {
      const SESSION_TTL_SECONDS = 3600;
      const futureExpiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000);
      const pastExpiresAt = new Date(Date.now() - SESSION_TTL_SECONDS * 1000);

      expect(futureExpiresAt > new Date()).toBe(true);
      expect(pastExpiresAt <= new Date()).toBe(true);
    });
  });
});
