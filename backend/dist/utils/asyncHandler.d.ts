import { Request, Response, NextFunction } from 'express';
/**
 * Wrapper to catch async errors in route handlers
 */
export declare const asyncHandler: (fn: (req: Request, res: Response, next: NextFunction) => Promise<void> | void) => (req: Request, res: Response, next: NextFunction) => void;
