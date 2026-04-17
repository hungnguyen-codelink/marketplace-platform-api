import { Request, Response, NextFunction } from 'express';
/**
 * Rate Limiter Middleware
 *
 * Implements a sliding window rate limiter per IP using Redis.
 * - Key: `rate_limit:{ip}`
 * - On each request: INCR counter, PEXPIRE on first increment
 * - If counter > limit: return 429
 * - On Redis error: fail-open (pass through), set DEGRADED header, log warning
 */
export declare function rateLimiter(req: Request, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
