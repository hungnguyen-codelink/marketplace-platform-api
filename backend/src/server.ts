import 'dotenv/config';
import { createApp } from './app';
import { env } from './config/env';
import { db } from './db/client';
import { redis } from './redis/client';

const app = createApp();

app.listen(env.PORT, async () => {
  await db.query('SELECT 1');
  await redis.connect().catch(() => {});
  console.log(`Server running on port ${env.PORT}`);
});
