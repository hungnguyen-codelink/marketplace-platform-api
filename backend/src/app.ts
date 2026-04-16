import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { errorHandler } from './middleware/errorHandler';

// Wrapper to catch async errors
const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<void> | void) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.get('/health', asyncHandler((_req, res) => {
    res.json({ status: 'ok' });
  }));

  app.use(errorHandler);

  return app;
}
