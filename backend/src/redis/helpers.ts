import { redis } from './client';

export const redisGet = async (key: string): Promise<string | null> => {
  try {
    return await redis.get(key);
  } catch {
    return null;
  }
};

export const redisSet = async (
  key: string,
  value: string,
  ttlSeconds?: number
): Promise<void> => {
  try {
    if (ttlSeconds) {
      await redis.set(key, value, 'EX', ttlSeconds);
    } else {
      await redis.set(key, value);
    }
  } catch {
    /* fail silently */
  }
};

export const redisDel = async (key: string): Promise<void> => {
  try {
    await redis.del(key);
  } catch {
    /* fail silently */
  }
};
