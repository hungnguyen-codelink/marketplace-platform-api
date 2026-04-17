import express from 'express';
import cors from 'cors';
import { errorHandler } from './middleware/errorHandler';
import { rateLimiter } from './middleware/rateLimiter';
import { authRouter } from './modules/auth/router';
import { shopsRouter } from './modules/shops/router';
import { productsRouter } from './modules/products/router';
import { fakestoreRouter } from './modules/fakestore/router';
import { cartRouter } from './modules/cart/router';
import { ordersRouter, sellerOrdersRouter } from './modules/orders/router';
import { mockPaymentRouter } from './modules/payment/router';
import { reviewsRouter } from './modules/reviews/router';
import { asyncHandler } from './utils/asyncHandler';

export function createApp() {
  const app = express();

  app.set('trust proxy', 1);
  app.use(cors());
  app.use(express.json());
  app.use(rateLimiter);

  app.get('/health', asyncHandler((_req, res) => {
    res.json({ status: 'ok' });
  }));

  app.use('/api/auth', authRouter);
  app.use('/api/shops', shopsRouter);
  app.use('/api/products', productsRouter);
  app.use('/api/fakestore', fakestoreRouter);
  app.use('/api/cart', cartRouter);
  app.use('/api/orders', ordersRouter);
  app.use('/api/seller/orders', sellerOrdersRouter);
  app.use('/api/mock-payment', mockPaymentRouter);
  app.use('/api/reviews', reviewsRouter);

  app.use(errorHandler);

  return app;
}
