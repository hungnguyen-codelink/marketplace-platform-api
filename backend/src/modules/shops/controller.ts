import { Request, Response } from 'express';
import { shopsService } from './service';

export class ShopsController {
  async createShop(req: Request, res: Response) {
    const shop = await shopsService.createShop(req.user!.id, req.body);
    // Return shop without seller_id in the response (per spec)
    const { seller_id, ...shopWithoutSellerId } = shop;
    res.status(201).json(shopWithoutSellerId);
  }

  async getMyShop(req: Request, res: Response) {
    const shop = await shopsService.getShopBySellerId(req.user!.id);
    res.status(200).json(shop);
  }

  async updateMyShop(req: Request, res: Response) {
    const shop = await shopsService.updateShop(req.user!.id, req.body.shopId, req.body);
    res.status(200).json(shop);
  }

  async getShopById(req: Request, res: Response) {
    const shop = await shopsService.getShopById(req.params.id);
    res.status(200).json(shop);
  }
}

export const shopsController = new ShopsController();
