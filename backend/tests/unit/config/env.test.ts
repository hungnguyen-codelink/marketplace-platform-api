import { z } from 'zod';

describe('env', () => {
  // Save original env
  const originalEnv = process.env;

  beforeEach(() => {
    // Clear module cache to reload env on each test
    jest.resetModules();
    // Reset env to fresh state
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    // Restore original env
    process.env = originalEnv;
  });

  it('parses required variables', () => {
    process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
    process.env.JWT_SECRET = 'test-secret-key';

    const { env } = require('../../../src/config/env');

    expect(env.DATABASE_URL).toBe('postgresql://test:test@localhost:5432/test');
    expect(env.JWT_SECRET).toBe('test-secret-key');
  });

  it('uses default value for SESSION_TTL_SECONDS when not set', () => {
    process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
    process.env.JWT_SECRET = 'test-secret-key';
    delete process.env.SESSION_TTL_SECONDS;

    const { env } = require('../../../src/config/env');

    expect(env.SESSION_TTL_SECONDS).toBe(86400);
  });

  it('uses default value for PORT when not set', () => {
    process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
    process.env.JWT_SECRET = 'test-secret-key';
    delete process.env.PORT;

    const { env } = require('../../../src/config/env');

    expect(env.PORT).toBe(3000);
  });

  it('uses default value for REDIS_URL when not set', () => {
    process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
    process.env.JWT_SECRET = 'test-secret-key';
    delete process.env.REDIS_URL;

    const { env } = require('../../../src/config/env');

    expect(env.REDIS_URL).toBe('redis://localhost:6379');
  });

  it('throws ZodError when DATABASE_URL is missing', () => {
    delete process.env.DATABASE_URL;
    process.env.JWT_SECRET = 'test-secret-key';

    expect(() => {
      require('../../../src/config/env');
    }).toThrow();
  });

  it('throws ZodError when JWT_SECRET is missing', () => {
    process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
    delete process.env.JWT_SECRET;

    expect(() => {
      require('../../../src/config/env');
    }).toThrow();
  });
});
