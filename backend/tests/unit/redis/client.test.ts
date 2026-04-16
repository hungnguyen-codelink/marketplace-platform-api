describe('redis/client', () => {
  beforeEach(() => {
    // Clear module cache to re-import
    jest.resetModules();
    // Set required env vars
    process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
    process.env.JWT_SECRET = 'test-secret-key';
    process.env.REDIS_URL = 'redis://localhost:6379';
  });

  it('exports an ioredis instance', () => {
    const { redis } = require('../../../src/redis/client');
    // Check that redis is a Redis instance by checking its methods
    expect(redis).toHaveProperty('get');
    expect(redis).toHaveProperty('set');
    expect(redis).toHaveProperty('del');
    expect(redis).toHaveProperty('connect');
    expect(typeof redis.get).toBe('function');
  });

  it('has status "wait" with lazyConnect enabled', () => {
    const { redis } = require('../../../src/redis/client');
    // lazyConnect means status should be 'wait' (not 'ready')
    expect(redis.status).toBe('wait');
  });

  it('does not connect on import', () => {
    const { redis } = require('../../../src/redis/client');
    // With lazyConnect: true, it should not be connected
    // status 'wait' means not connected yet
    expect(redis.status).not.toBe('ready');
  });

  it('has error handler attached', () => {
    const { redis } = require('../../../src/redis/client');
    // Verify that error event listeners exist
    const errorListeners = redis.listeners('error');
    expect(errorListeners.length).toBeGreaterThan(0);
  });
});
