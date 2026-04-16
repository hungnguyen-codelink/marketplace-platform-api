import { Router } from 'express';
import { z } from 'zod';
import { authController } from './controller';
import { validate } from '../../middleware/validate';
import { authenticate } from '../../middleware/authenticate';
import { asyncHandler } from '../../utils/asyncHandler';

// Validation schemas
const registerSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  full_name: z.string().min(1, 'Full name is required'),
  role: z.enum(['buyer', 'seller'], {
    errorMap: () => ({ message: 'Role must be either "buyer" or "seller"' }),
  }),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

export const authRouter = Router();

authRouter.post(
  '/register',
  validate(registerSchema),
  asyncHandler((req, res) => authController.register(req, res))
);

authRouter.post(
  '/login',
  validate(loginSchema),
  asyncHandler((req, res) => authController.login(req, res))
);

authRouter.post(
  '/logout',
  authenticate,
  asyncHandler((req, res) => authController.logout(req, res))
);
