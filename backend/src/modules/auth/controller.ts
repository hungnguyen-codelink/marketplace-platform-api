import { Request, Response } from 'express';
import { createHash } from 'crypto';
import { authService } from './service';

export class AuthController {
  async register(req: Request, res: Response) {
    const result = await authService.register(req.body);
    res.status(201).json(result);
  }

  async login(req: Request, res: Response) {
    const result = await authService.login(req.body);
    res.status(200).json(result);
  }

  async logout(req: Request, res: Response) {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1] || '';
    const tokenHash = createHash('sha256').update(token).digest('hex');
    await authService.logout(tokenHash);
    res.status(204).send();
  }
}

export const authController = new AuthController();
