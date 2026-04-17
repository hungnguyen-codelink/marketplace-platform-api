"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApp = createApp;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const errorHandler_1 = require("./middleware/errorHandler");
const rateLimiter_1 = require("./middleware/rateLimiter");
const router_1 = require("./modules/auth/router");
const router_2 = require("./modules/shops/router");
const router_3 = require("./modules/products/router");
const router_4 = require("./modules/fakestore/router");
const router_5 = require("./modules/cart/router");
const router_6 = require("./modules/orders/router");
const router_7 = require("./modules/payment/router");
const router_8 = require("./modules/reviews/router");
const asyncHandler_1 = require("./utils/asyncHandler");
function createApp() {
    const app = (0, express_1.default)();
    app.set('trust proxy', 1);
    app.use((0, cors_1.default)());
    app.use(express_1.default.json());
    // Only apply rate limiter outside test environment
    if (process.env.NODE_ENV !== 'test') {
        app.use(rateLimiter_1.rateLimiter);
    }
    app.get('/health', (0, asyncHandler_1.asyncHandler)((_req, res) => {
        res.json({ status: 'ok' });
    }));
    app.use('/api/auth', router_1.authRouter);
    app.use('/api/shops', router_2.shopsRouter);
    app.use('/api/products', router_3.productsRouter);
    app.use('/api/fakestore', router_4.fakestoreRouter);
    app.use('/api/cart', router_5.cartRouter);
    app.use('/api/orders', router_6.ordersRouter);
    app.use('/api/seller/orders', router_6.sellerOrdersRouter);
    app.use('/api/mock-payment', router_7.mockPaymentRouter);
    app.use('/api/reviews', router_8.reviewsRouter);
    app.use(errorHandler_1.errorHandler);
    return app;
}
