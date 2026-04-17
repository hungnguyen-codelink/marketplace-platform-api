"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApp = createApp;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const errorHandler_1 = require("./middleware/errorHandler");
const router_1 = require("./modules/auth/router");
const router_2 = require("./modules/shops/router");
const router_3 = require("./modules/products/router");
const asyncHandler_1 = require("./utils/asyncHandler");
function createApp() {
    const app = (0, express_1.default)();
    app.use((0, cors_1.default)());
    app.use(express_1.default.json());
    app.get('/health', (0, asyncHandler_1.asyncHandler)((_req, res) => {
        res.json({ status: 'ok' });
    }));
    app.use('/api/auth', router_1.authRouter);
    app.use('/api/shops', router_2.shopsRouter);
    app.use('/api/products', router_3.productsRouter);
    app.use(errorHandler_1.errorHandler);
    return app;
}
