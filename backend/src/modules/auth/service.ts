import bcryptjs from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { createHash } from 'crypto';
import { db } from '../../db/client';
import { env } from '../../config/env';
import { AuthError, ConflictError } from '../../errors';

export interface RegisterPayload {
  email: string;
  password: string;
  full_name: string;
  role: 'buyer' | 'seller';
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface UserResponse {
  id: string;
  email: string;
  full_name: string;
  role: string;
}

export interface AuthResponse {
  user: UserResponse;
  token: string;
}

export class AuthService {
  async register(payload: RegisterPayload): Promise<AuthResponse> {
    const { email, password, full_name, role } = payload;

    // Hash password
    const passwordHash = await bcryptjs.hash(password, 10);

    // Insert user
    let userId: string;
    try {
      const result = await db.query(
        'INSERT INTO users (email, password_hash, full_name, role) VALUES ($1, $2, $3, $4) RETURNING id, email, full_name, role',
        [email, passwordHash, full_name, role]
      );
      const user = result.rows[0];
      userId = user.id;

      // Generate JWT token
      const token = jwt.sign(
        { id: userId, email, role },
        env.JWT_SECRET,
        { expiresIn: env.SESSION_TTL_SECONDS }
      );

      // Create session
      const tokenHash = createHash('sha256').update(token).digest('hex');
      const expiresAt = new Date(Date.now() + env.SESSION_TTL_SECONDS * 1000);
      await db.query(
        'INSERT INTO sessions (token_hash, user_id, expires_at) VALUES ($1, $2, $3)',
        [tokenHash, userId, expiresAt]
      );

      return {
        user: {
          id: userId,
          email,
          full_name,
          role,
        },
        token,
      };
    } catch (error: any) {
      // Handle unique constraint violation
      if (error.code === '23505' && error.constraint === 'users_email_key') {
        throw new ConflictError('Email already exists');
      }
      throw error;
    }
  }

  async login(payload: LoginPayload): Promise<AuthResponse> {
    const { email, password } = payload;

    // Find user by email
    const userResult = await db.query(
      'SELECT id, email, password_hash, full_name, role FROM users WHERE email = $1',
      [email]
    );

    if (userResult.rows.length === 0) {
      throw new AuthError('Invalid credentials');
    }

    const user = userResult.rows[0];

    // Verify password
    const isValidPassword = await bcryptjs.compare(password, user.password_hash);
    if (!isValidPassword) {
      throw new AuthError('Invalid credentials');
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      env.JWT_SECRET,
      { expiresIn: env.SESSION_TTL_SECONDS }
    );

    // Create session
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + env.SESSION_TTL_SECONDS * 1000);
    await db.query(
      'INSERT INTO sessions (token_hash, user_id, expires_at) VALUES ($1, $2, $3)',
      [tokenHash, user.id, expiresAt]
    );

    return {
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
      },
      token,
    };
  }

  async logout(tokenHash: string): Promise<void> {
    await db.query('DELETE FROM sessions WHERE token_hash = $1', [tokenHash]);
  }
}

export const authService = new AuthService();
