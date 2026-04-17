import { Request, Response, NextFunction } from 'express';
import { rateLimiter } from '../../../src/middleware/rateLimiter';
import * as redisModule from '../../../src/redis/client';

// Mock redis module
jest.mock('../../../src/redis/client');
const mockRedis = redisModule.redis as jest.Mocked<any>;

// Mock env
jest.mock('../../../src/config/env', () => ({
  env: {
    RATE_LIMIT_WINDOW_MS: 60000,
    RATE_LIMIT_MAX_REQUESTS: 10,
    REDIS_URL: 'redis://localhost:6379',
  },
}));

describe('rateLimiter Middleware - Unit Tests', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    req = {
      ip: '127.0.0.1',
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
    };

    next = jest.fn();
  });

  describe('Counter below limit', () => {
    it('should call next() when counter is below limit', async () => {
      mockRedis.incr.mockResolvedValue(5);
      mockRedis.pexpire.mockResolvedValue(1);

      await rateLimiter(req as Request, res as Response, next);

      expect(mockRedis.incr).toHaveBeenCalledWith('rate_limit:127.0.0.1');
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should not set expiry when counter is not 1', async () => {
      mockRedis.incr.mockResolvedValue(5);

      await rateLimiter(req as Request, res as Response, next);

      expect(mockRedis.pexpire).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalled();
    });

    it('should set expiry only on first increment (count === 1)', async () => {
      mockRedis.incr.mockResolvedValue(1);
      mockRedis.pexpire.mockResolvedValue(1);

      await rateLimiter(req as Request, res as Response, next);

      expect(mockRedis.pexpire).toHaveBeenCalledWith('rate_limit:127.0.0.1', 60000);
      expect(next).toHaveBeenCalled();
    });
  });

  describe('Counter at limit', () => {
    it('should call next() when counter equals limit', async () => {
      mockRedis.incr.mockResolvedValue(10);

      await rateLimiter(req as Request, res as Response, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe('Counter exceeds limit', () => {
    it('should return 429 when counter exceeds limit', async () => {
      mockRedis.incr.mockResolvedValue(11);

      await rateLimiter(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(429);
      expect(res.json).toHaveBeenCalledWith({ error: 'Too many requests' });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return correct error format on rate limit', async () => {
      mockRedis.incr.mockResolvedValue(15);

      await rateLimiter(req as Request, res as Response, next);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Too many requests',
        })
      );
    });
  });

  describe('IP extraction', () => {
    it('should use req.ip for rate limit key', async () => {
      const customIp = '192.168.1.100';
      req = {
        ip: customIp,
      };
      mockRedis.incr.mockResolvedValue(1);

      await rateLimiter(req as Request, res as Response, next);

      expect(mockRedis.incr).toHaveBeenCalledWith(`rate_limit:${customIp}`);
    });

    it('should use "unknown" when req.ip is missing', async () => {
      req = {
        ip: undefined,
      };
      mockRedis.incr.mockResolvedValue(1);

      await rateLimiter(req as Request, res as Response, next);

      expect(mockRedis.incr).toHaveBeenCalledWith('rate_limit:unknown');
    });

    it('should handle different IPs independently', async () => {
      // First IP
      req = { ip: '10.0.0.1' };
      mockRedis.incr.mockResolvedValue(5);
      await rateLimiter(req as Request, res as Response, next);

      // Second IP
      jest.clearAllMocks();
      req = { ip: '10.0.0.2' };
      mockRedis.incr.mockResolvedValue(1);
      await rateLimiter(req as Request, res as Response, next);

      expect(mockRedis.incr).toHaveBeenLastCalledWith('rate_limit:10.0.0.2');
    });
  });

  describe('Redis failure - fail-open behavior', () => {
    it('should catch redis.incr error and set DEGRADED header', async () => {
      const error = new Error('Redis connection failed');
      mockRedis.incr.mockRejectedValue(error);

      await rateLimiter(req as Request, res as Response, next);

      expect(res.set).toHaveBeenCalledWith('X-RateLimit-Status', 'DEGRADED');
      expect(next).toHaveBeenCalled();
    });

    it('should pass through request on Redis error', async () => {
      mockRedis.incr.mockRejectedValue(new Error('Redis down'));

      await rateLimiter(req as Request, res as Response, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should log warning on Redis error', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      const error = new Error('Redis timeout');
      mockRedis.incr.mockRejectedValue(error);

      await rateLimiter(req as Request, res as Response, next);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[rate-limiter] Redis error:'),
        expect.stringContaining('Redis timeout')
      );

      consoleSpy.mockRestore();
    });

    it('should handle non-Error objects thrown by Redis', async () => {
      mockRedis.incr.mockRejectedValue('String error');
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      await rateLimiter(req as Request, res as Response, next);

      expect(res.set).toHaveBeenCalledWith('X-RateLimit-Status', 'DEGRADED');
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should not crash on pexpire error during first increment', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      mockRedis.incr.mockResolvedValue(1);
      mockRedis.pexpire.mockRejectedValue(new Error('PEXPIRE failed'));

      await rateLimiter(req as Request, res as Response, next);

      // When pexpire fails independently, the request should still pass through
      // because INCR succeeded and the limit was enforced correctly
      expect(next).toHaveBeenCalled();
      expect(res.set).not.toHaveBeenCalledWith('X-RateLimit-Status', 'DEGRADED');
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[rate-limiter] Failed to set key expiration:'),
        expect.stringContaining('PEXPIRE failed')
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Window calculation', () => {
    it('should use RATE_LIMIT_WINDOW_MS for pexpire', async () => {
      mockRedis.incr.mockResolvedValue(1);
      mockRedis.pexpire.mockResolvedValue(1);

      await rateLimiter(req as Request, res as Response, next);

      expect(mockRedis.pexpire).toHaveBeenCalledWith(
        expect.any(String),
        60000 // From mocked env
      );
    });
  });

  describe('Multiple requests from same IP', () => {
    it('should increment counter for each request from same IP', async () => {
      const ip = '10.0.0.50';
      req = { ip };

      // First request
      mockRedis.incr.mockResolvedValue(1);
      mockRedis.pexpire.mockResolvedValue(1);
      await rateLimiter(req as Request, res as Response, next);
      expect(mockRedis.incr).toHaveBeenNthCalledWith(1, 'rate_limit:10.0.0.50');

      // Second request
      jest.clearAllMocks();
      mockRedis.incr.mockResolvedValue(2);
      await rateLimiter(req as Request, res as Response, next);
      expect(mockRedis.incr).toHaveBeenNthCalledWith(1, 'rate_limit:10.0.0.50');

      // Verify pexpire only called on first
      expect(mockRedis.pexpire).not.toHaveBeenCalled();
    });
  });
});
