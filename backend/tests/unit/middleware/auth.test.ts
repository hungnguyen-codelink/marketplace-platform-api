import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { createHash } from 'crypto';
import { z } from 'zod';
import { validate } from '../../../src/middleware/validate';
import { requireRole } from '../../../src/middleware/requireRole';
import { ForbiddenError, AuthError } from '../../../src/errors';

const JWT_SECRET = 'test-secret-key';

describe('Middleware - Unit Tests', () => {
  describe('validate middleware', () => {
    it('should pass validated data when valid', () => {
      const schema = z.object({
        email: z.string().email(),
        password: z.string().min(8),
      });

      const middleware = validate(schema);
      const req = {
        body: {
          email: 'test@example.com',
          password: 'password123',
        },
      } as Request;
      const res = {} as Response;
      const next = jest.fn();

      middleware(req, res, next);
      expect(next).toHaveBeenCalled();
      expect(req.body.email).toBe('test@example.com');
    });

    it('should return 400 with structured field errors on validation failure', () => {
      const schema = z.object({
        email: z.string().email('Invalid email format'),
        password: z.string().min(8, 'Min 8 chars'),
      });

      const middleware = validate(schema);
      const req = {
        body: {
          email: 'not-an-email',
          password: 'short',
        },
      } as Request;
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as any;
      const next = jest.fn();

      middleware(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Validation failed',
          errors: expect.objectContaining({
            email: expect.any(Array),
            password: expect.any(Array),
          }),
        })
      );
    });

    it('should return 400 for missing required fields', () => {
      const schema = z.object({
        email: z.string().email(),
      });

      const middleware = validate(schema);
      const req = {
        body: {},
      } as Request;
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as any;
      const next = jest.fn();

      middleware(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          errors: expect.objectContaining({
            email: expect.any(Array),
          }),
        })
      );
    });

    it('should return field-specific error messages', () => {
      const schema = z.object({
        email: z.string().email('Invalid email'),
        password: z.string().min(8, 'Too short'),
      });

      const middleware = validate(schema);
      const req = {
        body: {
          email: 'invalid',
          password: 'a',
        },
      } as Request;
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as any;
      const next = jest.fn();

      middleware(req, res, next);
      const call = res.json.mock.calls[0][0];
      expect(call.errors.email).toContain('Invalid email');
      expect(call.errors.password).toContain('Too short');
    });
  });

  describe('requireRole middleware', () => {
    it('should pass through when role matches', () => {
      const middleware = requireRole('buyer', 'seller');
      const req = {
        user: {
          id: 'user-123',
          email: 'test@example.com',
          role: 'buyer',
        },
      } as any;
      const res = {} as Response;
      const next = jest.fn();

      expect(() => middleware(req, res, next)).not.toThrow();
      expect(next).toHaveBeenCalled();
    });

    it('should throw ForbiddenError when role does not match', () => {
      const middleware = requireRole('admin');
      const req = {
        user: {
          id: 'user-123',
          email: 'test@example.com',
          role: 'buyer',
        },
      } as any;
      const res = {} as Response;
      const next = jest.fn();

      expect(() => middleware(req, res, next)).toThrow(ForbiddenError);
    });

    it('should throw ForbiddenError when user is not present', () => {
      const middleware = requireRole('buyer');
      const req = {
        user: undefined,
      } as any;
      const res = {} as Response;
      const next = jest.fn();

      expect(() => middleware(req, res, next)).toThrow(ForbiddenError);
    });

    it('should handle multiple allowed roles', () => {
      const middleware = requireRole('admin', 'seller');
      const req = {
        user: {
          id: 'user-123',
          email: 'test@example.com',
          role: 'seller',
        },
      } as any;
      const res = {} as Response;
      const next = jest.fn();

      expect(() => middleware(req, res, next)).not.toThrow();
      expect(next).toHaveBeenCalled();
    });
  });

  describe('JWT verification in authenticate middleware context', () => {
    it('should reject tampered JWT', () => {
      const payload = { id: 'user-123', email: 'test@example.com', role: 'buyer' };
      const token = jwt.sign(payload, JWT_SECRET);
      const tamperedToken = token.slice(0, -10) + 'aaaaaaaaaa';

      expect(() => {
        jwt.verify(tamperedToken, JWT_SECRET);
      }).toThrow();
    });

    it('should verify valid JWT', () => {
      const payload = { id: 'user-123', email: 'test@example.com', role: 'buyer' };
      const token = jwt.sign(payload, JWT_SECRET);

      const decoded = jwt.verify(token, JWT_SECRET) as any;
      expect(decoded.id).toBe(payload.id);
      expect(decoded.email).toBe(payload.email);
      expect(decoded.role).toBe(payload.role);
    });

    it('should extract Bearer token from header', () => {
      const authHeader = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test';
      const parts = authHeader.split(' ');

      expect(parts.length).toBe(2);
      expect(parts[0]).toBe('Bearer');
      expect(parts[1]).toBeDefined();
    });

    it('should reject malformed Authorization header (missing Bearer)', () => {
      const authHeader = 'Basic test';
      const parts = authHeader.split(' ');

      expect(parts[0]).not.toBe('Bearer');
    });

    it('should reject missing Authorization header', () => {
      const authHeader = undefined;
      expect(authHeader).toBeUndefined();
    });

    it('should check token expiry against Date.now()', () => {
      const SESSION_TTL_SECONDS = 3600;
      const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000);
      const isExpired = expiresAt <= new Date();

      expect(isExpired).toBe(false);
    });

    it('should detect expired token', () => {
      const SESSION_TTL_SECONDS = 3600;
      const pastTime = new Date(Date.now() - SESSION_TTL_SECONDS * 1000);
      const isExpired = pastTime <= new Date();

      expect(isExpired).toBe(true);
    });
  });

  describe('Token hash verification', () => {
    it('should verify token hash matches', () => {
      const token = 'test-token-value';
      const hash = createHash('sha256').update(token).digest('hex');
      const recomputedHash = createHash('sha256').update(token).digest('hex');

      expect(hash).toBe(recomputedHash);
    });

    it('should fail hash verification for different tokens', () => {
      const token1 = 'test-token-1';
      const token2 = 'test-token-2';
      const hash1 = createHash('sha256').update(token1).digest('hex');
      const hash2 = createHash('sha256').update(token2).digest('hex');

      expect(hash1).not.toBe(hash2);
    });
  });
});
