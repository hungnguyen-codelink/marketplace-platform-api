import { Request, Response } from 'express';
import { productsService } from './service';

export class ProductsController {
  async createProduct(req: Request, res: Response) {
    const product = await productsService.createProduct(req.user!.id, req.body);
    res.status(201).json(product);
  }

  async getProducts(req: Request, res: Response) {
    const search = req.query.search as string | undefined;
    const category = req.query.category as string | undefined;
    const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;

    const products = await productsService.getProducts({
      search,
      category,
      page,
      limit,
    });

    res.status(200).json(products);
  }

  async getProductById(req: Request, res: Response) {
    const product = await productsService.getProductById(req.params.id);
    res.status(200).json(product);
  }

  async updateProduct(req: Request, res: Response) {
    const product = await productsService.updateProduct(req.user!.id, req.params.id, req.body);
    res.status(200).json(product);
  }

  async deleteProduct(req: Request, res: Response) {
    await productsService.deleteProduct(req.user!.id, req.params.id);
    res.status(204).send();
  }

  async getMyProducts(req: Request, res: Response) {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const result = await productsService.getMyProducts(req.user!.id, { page, limit });
    res.json(result);
  }
}

export const productsController = new ProductsController();
