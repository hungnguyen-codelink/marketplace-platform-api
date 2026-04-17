"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cartController = exports.CartController = void 0;
const service_1 = require("./service");
class CartController {
    async getCart(req, res) {
        const cart = await service_1.cartService.getCart(req.user.id);
        res.status(200).json(cart);
    }
    async addItem(req, res) {
        const cart = await service_1.cartService.addItem(req.user.id, req.body.product_id, req.body.quantity);
        res.status(200).json(cart);
    }
    async updateItem(req, res) {
        const cart = await service_1.cartService.updateItem(req.user.id, req.params.productId, req.body.quantity);
        res.status(200).json(cart);
    }
    async removeItem(req, res) {
        const cart = await service_1.cartService.removeItem(req.user.id, req.params.productId);
        res.status(200).json(cart);
    }
    async clearCart(req, res) {
        const cart = await service_1.cartService.clearCart(req.user.id);
        res.status(200).json(cart);
    }
}
exports.CartController = CartController;
exports.cartController = new CartController();
