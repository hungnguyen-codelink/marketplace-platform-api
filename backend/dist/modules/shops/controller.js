"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.shopsController = exports.ShopsController = void 0;
const service_1 = require("./service");
class ShopsController {
    async createShop(req, res) {
        const shop = await service_1.shopsService.createShop(req.user.id, req.body);
        // Return shop without seller_id in the response (per spec)
        const { seller_id, ...shopWithoutSellerId } = shop;
        res.status(201).json(shopWithoutSellerId);
    }
    async getMyShop(req, res) {
        const shop = await service_1.shopsService.getShopBySellerId(req.user.id);
        res.status(200).json(shop);
    }
    async updateMyShop(req, res) {
        // Fetch the seller's shop first to get the shop ID
        const sellerShop = await service_1.shopsService.getShopBySellerId(req.user.id);
        const shop = await service_1.shopsService.updateShop(req.user.id, sellerShop.id, req.body);
        res.status(200).json(shop);
    }
    async getShopById(req, res) {
        const shop = await service_1.shopsService.getShopById(req.params.id);
        res.status(200).json(shop);
    }
}
exports.ShopsController = ShopsController;
exports.shopsController = new ShopsController();
