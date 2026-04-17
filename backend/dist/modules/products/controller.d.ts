import { Request, Response } from 'express';
export declare class ProductsController {
    createProduct(req: Request, res: Response): Promise<void>;
    getProducts(req: Request, res: Response): Promise<void>;
    getProductById(req: Request, res: Response): Promise<void>;
    updateProduct(req: Request, res: Response): Promise<void>;
    deleteProduct(req: Request, res: Response): Promise<void>;
}
export declare const productsController: ProductsController;
