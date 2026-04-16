import { z } from 'zod';

const schema = z.object({
  DATABASE_URL: z.string(),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  JWT_SECRET: z.string(),
  SESSION_TTL_SECONDS: z.coerce.number().default(86400),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(900000),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().default(100),
  FAKESTORE_BASE_URL: z.string().default('https://fakestoreapi.com'),
  FAKESTORE_CATEGORY_CACHE_TTL_SECONDS: z.coerce.number().default(3600),
  FAKESTORE_TIMEOUT_MS: z.coerce.number().default(5000),
  FAKESTORE_RETRY_ATTEMPTS: z.coerce.number().default(3),
  FAKESTORE_RETRY_BACKOFF_MS: z.coerce.number().default(500),
  PORT: z.coerce.number().default(3000),
});

export const env = schema.parse(process.env);
