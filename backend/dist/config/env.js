"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
const zod_1 = require("zod");
const schema = zod_1.z.object({
    DATABASE_URL: zod_1.z.string(),
    REDIS_URL: zod_1.z.string().default('redis://localhost:6379'),
    JWT_SECRET: zod_1.z.string(),
    SESSION_TTL_SECONDS: zod_1.z.coerce.number().default(86400),
    RATE_LIMIT_WINDOW_MS: zod_1.z.coerce.number().default(900000),
    RATE_LIMIT_MAX_REQUESTS: zod_1.z.coerce.number().default(100),
    FAKESTORE_BASE_URL: zod_1.z.string().default('https://fakestoreapi.com'),
    FAKESTORE_CATEGORY_CACHE_TTL_SECONDS: zod_1.z.coerce.number().default(3600),
    FAKESTORE_TIMEOUT_MS: zod_1.z.coerce.number().default(5000),
    FAKESTORE_RETRY_ATTEMPTS: zod_1.z.coerce.number().default(3),
    FAKESTORE_RETRY_BACKOFF_MS: zod_1.z.coerce.number().default(500),
    PORT: zod_1.z.coerce.number().default(3000),
});
exports.env = schema.parse(process.env);
