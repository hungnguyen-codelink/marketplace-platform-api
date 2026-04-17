import { Request, Response } from 'express';
import { cartService } from './service';

export class CartController {
  async getCart(req: Request, res: Response) {
    const cart = await cartService.getCart(req.user!.id);
    res.status(200).json(cart);
  }

  async addItem(req: Request, res: Response) {
    const cart = await cartService.addItem(req.user!.id, req.body.product_id, req.body.quantity);
    res.status(200).json(cart);
  }

  async updateItem(req: Request, res: Response) {
    const cart = await cartService.updateItem(req.user!.id, req.params.productId, req.body.quantity);
    res.status(200).json(cart);
  }

  async removeItem(req: Request, res: Response) {
    const cart = await cartService.removeItem(req.user!.id, req.params.productId);
    res.status(200).json(cart);
  }

  async clearCart(req: Request, res: Response) {
    const cart = await cartService.clearCart(req.user!.id);
    res.status(200).json(cart);
  }
}

export const cartController = new CartController();
