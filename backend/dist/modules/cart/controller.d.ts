import { Request, Response } from 'express';
export declare class CartController {
    getCart(req: Request, res: Response): Promise<void>;
    addItem(req: Request, res: Response): Promise<void>;
    updateItem(req: Request, res: Response): Promise<void>;
    removeItem(req: Request, res: Response): Promise<void>;
    clearCart(req: Request, res: Response): Promise<void>;
}
export declare const cartController: CartController;
