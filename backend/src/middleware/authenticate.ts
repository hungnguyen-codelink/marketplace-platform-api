import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { createHash } from 'crypto';
import { env } from '../config/env';
import { db } from '../db/client';
import { AuthError } from '../errors';

interface JwtPayload {
  id: string;
  email: string;
  role: string;
}

export async function authenticate(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      throw new AuthError('Unauthorized');
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      throw new AuthError('Unauthorized');
    }

    const token = parts[1];
    let decoded: JwtPayload;

    try {
      decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    } catch (error) {
      throw new AuthError('Unauthorized');
    }

    // Check if session exists and hasn't expired
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const sessionResult = await db.query(
      'SELECT expires_at FROM sessions WHERE token_hash = $1',
      [tokenHash]
    );

    if (sessionResult.rows.length === 0) {
      throw new AuthError('Unauthorized');
    }

    const { expires_at } = sessionResult.rows[0];
    if (new Date(expires_at) <= new Date()) {
      throw new AuthError('Unauthorized');
    }

    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
    };

    // Attach raw token to request for use in logout
    req.rawToken = token;

    next();
  } catch (error) {
    if (error instanceof AuthError) {
      return next(error);
    }
    next(error);
  }
}
