"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.productsController = exports.ProductsController = void 0;
const service_1 = require("./service");
class ProductsController {
    async createProduct(req, res) {
        const product = await service_1.productsService.createProduct(req.user.id, req.body);
        res.status(201).json(product);
    }
    async getProducts(req, res) {
        const search = req.query.search;
        const category = req.query.category;
        const page = req.query.page ? parseInt(req.query.page, 10) : 1;
        const limit = req.query.limit ? parseInt(req.query.limit, 10) : 10;
        const products = await service_1.productsService.getProducts({
            search,
            category,
            page,
            limit,
        });
        res.status(200).json(products);
    }
    async getProductById(req, res) {
        const product = await service_1.productsService.getProductById(req.params.id);
        res.status(200).json(product);
    }
    async updateProduct(req, res) {
        const product = await service_1.productsService.updateProduct(req.user.id, req.params.id, req.body);
        res.status(200).json(product);
    }
    async deleteProduct(req, res) {
        await service_1.productsService.deleteProduct(req.user.id, req.params.id);
        res.status(204).send();
    }
}
exports.ProductsController = ProductsController;
exports.productsController = new ProductsController();
