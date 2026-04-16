import { Request, Response, NextFunction } from 'express';
import { ForbiddenError } from '../errors';

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      throw new ForbiddenError('Forbidden');
    }
    next();
  };
}
