import { Request, Response, NextFunction } from 'express';
export declare function requireRole(...roles: string[]): (req: Request, res: Response, next: NextFunction) => void;
