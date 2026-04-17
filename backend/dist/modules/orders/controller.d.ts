import { Request, Response } from 'express';
export declare class OrdersController {
    checkout(req: Request, res: Response): Promise<void>;
    getOrder(req: Request, res: Response): Promise<void>;
    getOrders(req: Request, res: Response): Promise<void>;
    getSellerOrders(req: Request, res: Response): Promise<void>;
    getSellerOrder(req: Request, res: Response): Promise<void>;
    updateSellerOrderStatus(req: Request, res: Response): Promise<void>;
}
export declare const ordersController: OrdersController;
