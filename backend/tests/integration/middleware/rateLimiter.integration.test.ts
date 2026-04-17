import request from 'supertest';
import express from 'express';

// Must set env vars BEFORE loading any modules that use env
process.env.RATE_LIMIT_MAX_REQUESTS = '3';
process.env.RATE_LIMIT_WINDOW_MS = '5000';

// Mock Redis for integration testing
const redisStore = new Map<string, number>();

const mockRedis = {
  incr: jest.fn(async (key: string) => {
    const current = (redisStore.get(key) || 0) + 1;
    redisStore.set(key, current);
    return current;
  }),
  pexpire: jest.fn(async (key: string, ms: number) => {
    return 1;
  }),
  connect: jest.fn(async () => {}),
  disconnect: jest.fn(async () => {}),
  flushdb: jest.fn(async () => {
    redisStore.clear();
  }),
};

jest.mock('../../../src/redis/client', () => ({
  redis: mockRedis,
}));

// Must import AFTER all mocks are set up
const { rateLimiter } = require('../../../src/middleware/rateLimiter');

// Create a minimal test app with the rate limiter explicitly wired
function createTestApp() {
  const app = express();
  app.set('trust proxy', 1);
  app.use(express.json());
  app.use(rateLimiter);
  app.get('/health', (req: any, res: any) => res.json({ status: 'ok' }));
  app.get('/api/auth/me', (req: any, res: any) => res.status(401).json({ error: 'Unauthorized' }));
  app.get('/api/products', (req: any, res: any) => res.json({ products: [] }));
  return app;
}

let app: any;

beforeAll(async () => {
  app = createTestApp();
  await mockRedis.flushdb(); // Clear Redis before tests
});

afterEach(async () => {
  redisStore.clear(); // Clear store between tests
  jest.clearAllMocks(); // Clear mock calls
});

afterAll(async () => {
  // Cleanup
});

describe('rateLimiter Middleware - Integration Tests', () => {
  describe('Rate limiting enforcement', () => {
    it('should allow requests under the limit', async () => {
      const res1 = await request(app).get('/health').set('X-Forwarded-For', '192.168.1.100');
      expect(res1.status).toBe(200);

      const res2 = await request(app).get('/health').set('X-Forwarded-For', '192.168.1.100');
      expect(res2.status).toBe(200);

      const res3 = await request(app).get('/health').set('X-Forwarded-For', '192.168.1.100');
      expect(res3.status).toBe(200);
    });

    it('should return 429 when limit is exceeded', async () => {
      const ip = '10.0.0.1';

      // First 3 requests should succeed
      for (let i = 0; i < 3; i++) {
        const res = await request(app).get('/health').set('X-Forwarded-For', ip);
        expect(res.status).toBe(200);
      }

      // 4th request should be rate limited
      const res4 = await request(app).get('/health').set('X-Forwarded-For', ip);
      expect(res4.status).toBe(429);
      expect(res4.body).toEqual({ error: 'Too many requests' });
    });

    it('should return correct error JSON on rate limit', async () => {
      const ip = '10.0.0.2';

      // Use up the limit
      for (let i = 0; i < 3; i++) {
        await request(app).get('/health').set('X-Forwarded-For', ip);
      }

      // Next request hits limit
      const res = await request(app).get('/health').set('X-Forwarded-For', ip);
      expect(res.status).toBe(429);
      expect(res.body).toEqual({ error: 'Too many requests' });
      expect(res.body.error).toBe('Too many requests');
    });
  });

  describe('Per-IP isolation', () => {
    it('should maintain separate counters for different IPs', async () => {
      const ip1 = '10.0.0.10';
      const ip2 = '10.0.0.20';

      // IP1: make 3 requests
      for (let i = 0; i < 3; i++) {
        const res = await request(app).get('/health').set('X-Forwarded-For', ip1);
        expect(res.status).toBe(200);
      }

      // IP1: 4th request should fail
      let res = await request(app).get('/health').set('X-Forwarded-For', ip1);
      expect(res.status).toBe(429);

      // IP2: should not be limited (separate counter)
      res = await request(app).get('/health').set('X-Forwarded-For', ip2);
      expect(res.status).toBe(200);

      // IP2: can make more requests
      for (let i = 0; i < 2; i++) {
        res = await request(app).get('/health').set('X-Forwarded-For', ip2);
        expect(res.status).toBe(200);
      }

      // IP2: 4th request should fail
      res = await request(app).get('/health').set('X-Forwarded-For', ip2);
      expect(res.status).toBe(429);
    });

    it('should not count requests from different IPs towards same limit', async () => {
      // Each IP gets its own 3-request allowance
      const ips = ['10.0.0.100', '10.0.0.101', '10.0.0.102'];

      for (const ip of ips) {
        for (let i = 0; i < 3; i++) {
          const res = await request(app).get('/health').set('X-Forwarded-For', ip);
          expect(res.status).toBe(200);
        }
      }

      // All IPs should be at the limit
      for (const ip of ips) {
        const res = await request(app).get('/health').set('X-Forwarded-For', ip);
        expect(res.status).toBe(429);
      }
    });
  });

  describe('Sliding window behavior', () => {
    it('should apply pexpire with correct window duration', async () => {
      const ip = '10.0.0.50';

      // Make first request to trigger pexpire
      await request(app).get('/health').set('X-Forwarded-For', ip);

      // Verify pexpire was called with correct window
      expect(mockRedis.pexpire).toHaveBeenCalledWith('rate_limit:10.0.0.50', 5000);
    });

    it('should not reset expiry on subsequent requests', async () => {
      const ip = '10.0.0.51';

      // First request
      await request(app).get('/health').set('X-Forwarded-For', ip);
      const firstCallCount = mockRedis.pexpire.mock.calls.length;

      // Second request should not call pexpire again
      await request(app).get('/health').set('X-Forwarded-For', ip);
      const secondCallCount = mockRedis.pexpire.mock.calls.length;

      expect(secondCallCount).toBe(firstCallCount); // No new pexpire call
    });
  });

  describe('Request passing with rate limiter', () => {
    it('should pass through valid requests to route handlers', async () => {
      const ip = '192.168.1.1';

      const res = await request(app).get('/health').set('X-Forwarded-For', ip);
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ status: 'ok' });
    });

    it('should not affect rate limiting of 429 responses', async () => {
      const ip = '192.168.1.2';

      // Use up limit
      for (let i = 0; i < 3; i++) {
        await request(app).get('/health').set('X-Forwarded-For', ip);
      }

      // All subsequent requests should be 429
      for (let i = 0; i < 5; i++) {
        const res = await request(app).get('/health').set('X-Forwarded-For', ip);
        expect(res.status).toBe(429);
      }
    });
  });

  describe('Rate limiting across different endpoints', () => {
    it('should apply rate limit across all endpoints', async () => {
      const ip = '10.0.0.200';

      // Request different endpoints
      let res = await request(app).get('/health').set('X-Forwarded-For', ip);
      expect(res.status).toBe(200);

      res = await request(app).get('/api/auth/me').set('X-Forwarded-For', ip);
      expect(res.status).not.toBe(429); // Will fail auth but not rate limit

      res = await request(app).get('/api/products').set('X-Forwarded-For', ip);
      expect(res.status).not.toBe(429);

      // Total count should increment
      res = await request(app).get('/health').set('X-Forwarded-For', ip);
      expect(res.status).toBe(429); // Should hit limit after 4 requests
    });
  });

  describe('Rate limit response format', () => {
    it('should return proper Content-Type for rate limit error', async () => {
      const ip = '10.0.0.300';

      // Use up limit
      for (let i = 0; i < 3; i++) {
        await request(app).get('/health').set('X-Forwarded-For', ip);
      }

      const res = await request(app).get('/health').set('X-Forwarded-For', ip);
      expect(res.status).toBe(429);
      expect(res.type).toBe('application/json');
    });

    it('should include proper headers in rate limit response', async () => {
      const ip = '10.0.0.400';

      // Use up limit
      for (let i = 0; i < 3; i++) {
        await request(app).get('/health').set('X-Forwarded-For', ip);
      }

      const res = await request(app).get('/health').set('X-Forwarded-For', ip);
      expect(res.status).toBe(429);
      expect(res.headers['content-type']).toMatch(/application\/json/);
    });
  });

  describe('X-Forwarded-For header handling', () => {
    it('should extract IP from X-Forwarded-For header', async () => {
      const ip = '203.0.113.1';

      // Make requests with X-Forwarded-For
      for (let i = 0; i < 3; i++) {
        const res = await request(app).get('/health').set('X-Forwarded-For', ip);
        expect(res.status).toBe(200);
      }

      // 4th should be rate limited
      const res = await request(app).get('/health').set('X-Forwarded-For', ip);
      expect(res.status).toBe(429);
    });
  });
});
