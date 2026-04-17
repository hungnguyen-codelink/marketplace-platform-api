import { Request, Response } from 'express';
export declare class FakestoreController {
    getProducts(req: Request, res: Response): Promise<void>;
    getCategories(req: Request, res: Response): Promise<void>;
    importProducts(req: Request, res: Response): Promise<void>;
}
export declare const fakestoreController: FakestoreController;
