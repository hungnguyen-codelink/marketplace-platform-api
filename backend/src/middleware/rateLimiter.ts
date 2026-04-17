import { Request, Response, NextFunction } from 'express';
import { redis } from '../redis/client';
import { env } from '../config/env';

/**
 * Rate Limiter Middleware
 *
 * Implements a sliding window rate limiter per IP using Redis.
 * - Key: `rate_limit:{ip}`
 * - On each request: INCR counter, PEXPIRE on first increment
 * - If counter > limit: return 429
 * - On Redis error: fail-open (pass through), set DEGRADED header, log warning
 */
export async function rateLimiter(req: Request, res: Response, next: NextFunction) {
  try {
    const ip = req.ip || 'unknown';
    const key = `rate_limit:${ip}`;
    const windowMs = env.RATE_LIMIT_WINDOW_MS;
    const maxRequests = env.RATE_LIMIT_MAX_REQUESTS;

    // Increment counter
    const count = await redis.incr(key);

    // Set expiration only on first increment (count === 1)
    if (count === 1) {
      await redis.pexpire(key, windowMs);
    }

    // Check if limit exceeded
    if (count > maxRequests) {
      return res.status(429).json({ error: 'Too many requests' });
    }

    next();
  } catch (error) {
    // Fail-open: log warning, set DEGRADED header, pass through
    console.warn('[rate-limiter] Redis error:', error instanceof Error ? error.message : String(error));
    res.set('X-RateLimit-Status', 'DEGRADED');
    next();
  }
}
