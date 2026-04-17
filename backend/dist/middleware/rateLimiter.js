"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rateLimiter = rateLimiter;
const client_1 = require("../redis/client");
const env_1 = require("../config/env");
/**
 * Rate Limiter Middleware
 *
 * Implements a sliding window rate limiter per IP using Redis.
 * - Key: `rate_limit:{ip}`
 * - On each request: INCR counter, PEXPIRE on first increment
 * - If counter > limit: return 429
 * - On Redis error: fail-open (pass through), set DEGRADED header, log warning
 */
async function rateLimiter(req, res, next) {
    try {
        const ip = req.ip || 'unknown';
        const key = `rate_limit:${ip}`;
        const windowMs = env_1.env.RATE_LIMIT_WINDOW_MS;
        const maxRequests = env_1.env.RATE_LIMIT_MAX_REQUESTS;
        // Increment counter
        const count = await client_1.redis.incr(key);
        // Set expiration only on first increment (count === 1)
        if (count === 1) {
            try {
                await client_1.redis.pexpire(key, windowMs);
            }
            catch (err) {
                console.warn('[rate-limiter] Failed to set key expiration:', err instanceof Error ? err.message : String(err));
                // Continue — limit is still enforced, just expiry may not work
            }
        }
        // Check if limit exceeded
        if (count > maxRequests) {
            return res.status(429).json({ error: 'Too many requests' });
        }
        next();
    }
    catch (error) {
        // Fail-open: log warning, set DEGRADED header, pass through
        console.warn('[rate-limiter] Redis error:', error instanceof Error ? error.message : String(error));
        res.set('X-RateLimit-Status', 'DEGRADED');
        next();
    }
}
