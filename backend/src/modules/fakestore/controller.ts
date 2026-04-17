import { Request, Response } from 'express';
import { fakestoreService } from './service';
import { ImportProductsPayload } from './schemas';

export class FakestoreController {
  async getProducts(req: Request, res: Response) {
    const products = await fakestoreService.getProducts();
    res.status(200).json(products);
  }

  async getCategories(req: Request, res: Response) {
    const categories = await fakestoreService.getCategories();
    res.status(200).json(categories);
  }

  async importProducts(req: Request, res: Response) {
    const payload = req.body as ImportProductsPayload;
    const result = await fakestoreService.importProducts(req.user!.id, payload);
    res.status(200).json(result);
  }
}

export const fakestoreController = new FakestoreController();
