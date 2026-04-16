import { Request, Response, NextFunction } from 'express';
import { AppError, UnprocessableError } from '../errors';

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  if (err instanceof UnprocessableError) {
    return res.status(422).json({
      message: err.message,
      currentState: err.currentState,
      validNextStates: err.validNextStates,
    });
  }

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ message: err.message });
  }

  console.error('[unhandled]', err);
  res.status(500).json({ message: 'Internal server error' });
};
