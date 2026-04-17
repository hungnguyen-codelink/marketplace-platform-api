import express from 'express';
import cors from 'cors';
import { errorHandler } from './middleware/errorHandler';
import { authRouter } from './modules/auth/router';
import { shopsRouter } from './modules/shops/router';
import { productsRouter } from './modules/products/router';
import { asyncHandler } from './utils/asyncHandler';

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.get('/health', asyncHandler((_req, res) => {
    res.json({ status: 'ok' });
  }));

  app.use('/api/auth', authRouter);
  app.use('/api/shops', shopsRouter);
  app.use('/api/products', productsRouter);

  app.use(errorHandler);

  return app;
}
