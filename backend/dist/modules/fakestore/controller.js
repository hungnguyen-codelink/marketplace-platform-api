"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fakestoreController = exports.FakestoreController = void 0;
const service_1 = require("./service");
class FakestoreController {
    async getProducts(req, res) {
        const products = await service_1.fakestoreService.getProducts();
        res.status(200).json(products);
    }
    async getCategories(req, res) {
        const categories = await service_1.fakestoreService.getCategories();
        res.status(200).json(categories);
    }
    async importProducts(req, res) {
        const payload = req.body;
        const result = await service_1.fakestoreService.importProducts(req.user.id, payload);
        res.status(200).json(result);
    }
}
exports.FakestoreController = FakestoreController;
exports.fakestoreController = new FakestoreController();
