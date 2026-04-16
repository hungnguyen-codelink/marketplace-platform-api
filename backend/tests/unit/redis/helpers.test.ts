import { redisGet, redisSet, redisDel } from '../../../src/redis/helpers';

// Mock the redis client
jest.mock('../../../src/redis/client', () => ({
  redis: {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  },
}));

import { redis } from '../../../src/redis/client';

describe('redis helpers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('redisGet', () => {
    it('returns value when redis.get succeeds', async () => {
      (redis.get as jest.Mock).mockResolvedValue('test-value');

      const result = await redisGet('test-key');

      expect(result).toBe('test-value');
      expect(redis.get).toHaveBeenCalledWith('test-key');
    });

    it('returns null when redis.get throws', async () => {
      (redis.get as jest.Mock).mockRejectedValue(new Error('Redis error'));

      const result = await redisGet('test-key');

      expect(result).toBeNull();
      expect(redis.get).toHaveBeenCalledWith('test-key');
    });

    it('returns null when redis.get returns null', async () => {
      (redis.get as jest.Mock).mockResolvedValue(null);

      const result = await redisGet('nonexistent-key');

      expect(result).toBeNull();
    });
  });

  describe('redisSet', () => {
    it('calls redis.set with value only when TTL is not provided', async () => {
      (redis.set as jest.Mock).mockResolvedValue('OK');

      await redisSet('test-key', 'test-value');

      expect(redis.set).toHaveBeenCalledWith('test-key', 'test-value');
    });

    it('calls redis.set with EX and TTL when ttlSeconds is provided', async () => {
      (redis.set as jest.Mock).mockResolvedValue('OK');

      await redisSet('test-key', 'test-value', 3600);

      expect(redis.set).toHaveBeenCalledWith(
        'test-key',
        'test-value',
        'EX',
        3600
      );
    });

    it('silently swallows errors from redis.set', async () => {
      (redis.set as jest.Mock).mockRejectedValue(
        new Error('Redis connection error')
      );

      // Should not throw
      await expect(redisSet('test-key', 'test-value')).resolves.toBeUndefined();
      expect(redis.set).toHaveBeenCalled();
    });

    it('silently swallows errors from redis.set with TTL', async () => {
      (redis.set as jest.Mock).mockRejectedValue(
        new Error('Redis connection error')
      );

      // Should not throw
      await expect(redisSet('test-key', 'test-value', 3600)).resolves.toBeUndefined();
      expect(redis.set).toHaveBeenCalled();
    });
  });

  describe('redisDel', () => {
    it('calls redis.del with the correct key', async () => {
      (redis.del as jest.Mock).mockResolvedValue(1);

      await redisDel('test-key');

      expect(redis.del).toHaveBeenCalledWith('test-key');
    });

    it('silently swallows errors from redis.del', async () => {
      (redis.del as jest.Mock).mockRejectedValue(
        new Error('Redis connection error')
      );

      // Should not throw
      await expect(redisDel('test-key')).resolves.toBeUndefined();
      expect(redis.del).toHaveBeenCalled();
    });
  });
});
