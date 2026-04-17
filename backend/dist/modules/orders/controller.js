"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ordersController = exports.OrdersController = void 0;
const service_1 = require("./service");
class OrdersController {
    async checkout(req, res) {
        const order = await service_1.ordersService.checkout(req.user.id, req.body);
        res.status(201).json(order);
    }
    async getOrder(req, res) {
        const order = await service_1.ordersService.getOrder(req.user.id, req.params.id);
        res.status(200).json(order);
    }
    async getOrders(req, res) {
        const page = req.query.page ? parseInt(req.query.page, 10) : 1;
        const limit = req.query.limit ? parseInt(req.query.limit, 10) : 10;
        const orders = await service_1.ordersService.getOrders(req.user.id, { page, limit });
        res.status(200).json(orders);
    }
    async getSellerOrders(req, res) {
        const page = req.query.page ? parseInt(req.query.page, 10) : 1;
        const limit = req.query.limit ? parseInt(req.query.limit, 10) : 10;
        const status = req.query.status;
        const orders = await service_1.ordersService.getSellerOrders(req.user.id, { page, limit, status });
        res.status(200).json(orders);
    }
    async getSellerOrder(req, res) {
        const order = await service_1.ordersService.getSellerOrder(req.user.id, req.params.id);
        res.status(200).json(order);
    }
    async updateSellerOrderStatus(req, res) {
        const order = await service_1.ordersService.updateSellerOrderStatus(req.user.id, req.params.id, req.body.status);
        res.status(200).json(order);
    }
}
exports.OrdersController = OrdersController;
exports.ordersController = new OrdersController();
