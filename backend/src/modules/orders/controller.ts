import { Request, Response } from 'express';
import { ordersService } from './service';

export class OrdersController {
  async checkout(req: Request, res: Response) {
    const order = await ordersService.checkout(req.user!.id, req.body);
    res.status(201).json(order);
  }

  async getOrder(req: Request, res: Response) {
    const order = await ordersService.getOrder(req.user!.id, req.params.id);
    res.status(200).json(order);
  }

  async getOrders(req: Request, res: Response) {
    const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;

    const orders = await ordersService.getOrders(req.user!.id, { page, limit });
    res.status(200).json(orders);
  }

  async getSellerOrders(req: Request, res: Response) {
    const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;
    const status = req.query.status as string | undefined;

    const orders = await ordersService.getSellerOrders(req.user!.id, { page, limit, status });
    res.status(200).json(orders);
  }

  async getSellerOrder(req: Request, res: Response) {
    const order = await ordersService.getSellerOrder(req.user!.id, req.params.id);
    res.status(200).json(order);
  }

  async updateSellerOrderStatus(req: Request, res: Response) {
    const order = await ordersService.updateSellerOrderStatus(
      req.user!.id,
      req.params.id,
      req.body.status
    );
    res.status(200).json(order);
  }
}

export const ordersController = new OrdersController();
