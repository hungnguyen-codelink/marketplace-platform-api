import { Request, Response } from 'express';
export declare class ShopsController {
    createShop(req: Request, res: Response): Promise<void>;
    getMyShop(req: Request, res: Response): Promise<void>;
    updateMyShop(req: Request, res: Response): Promise<void>;
    getShopById(req: Request, res: Response): Promise<void>;
}
export declare const shopsController: ShopsController;
