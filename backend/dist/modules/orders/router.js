"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sellerOrdersRouter = exports.ordersRouter = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const controller_1 = require("./controller");
const validate_1 = require("../../middleware/validate");
const authenticate_1 = require("../../middleware/authenticate");
const requireRole_1 = require("../../middleware/requireRole");
const asyncHandler_1 = require("../../utils/asyncHandler");
// Validation schemas
const shippingAddressSchema = zod_1.z.object({
    street: zod_1.z.string().min(1, 'street is required'),
    city: zod_1.z.string().min(1, 'city is required'),
    state: zod_1.z.string().min(1, 'state is required'),
    zip: zod_1.z.string().min(1, 'zip is required'),
    country: zod_1.z.string().min(1, 'country is required'),
});
const checkoutSchema = zod_1.z.object({
    shipping_address: shippingAddressSchema,
});
const updateOrderStatusSchema = zod_1.z.object({
    status: zod_1.z.enum(['confirmed', 'shipped', 'delivered', 'completed'], {
        errorMap: () => ({ message: 'status must be one of: confirmed, shipped, delivered, completed' }),
    }),
});
const getSellerOrdersQuerySchema = zod_1.z.object({
    status: zod_1.z.enum(['pending', 'confirmed', 'shipped', 'delivered', 'completed'], {
        errorMap: () => ({ message: 'status must be one of: pending, confirmed, shipped, delivered, completed' }),
    }).optional(),
    page: zod_1.z.string().regex(/^\d+$/, 'page must be a valid integer').optional(),
    limit: zod_1.z.string().regex(/^\d+$/, 'limit must be a valid integer').optional(),
}).strict();
// Middleware to validate query parameters for seller orders
const validateSellerOrdersQuery = (req, res, next) => {
    try {
        const validated = getSellerOrdersQuerySchema.parse(req.query);
        req.query = validated;
        next();
    }
    catch (error) {
        if (error instanceof zod_1.ZodError) {
            const fieldErrors = {};
            error.errors.forEach((err) => {
                const field = err.path[0];
                if (!fieldErrors[field]) {
                    fieldErrors[field] = [];
                }
                fieldErrors[field].push(err.message);
            });
            return res.status(400).json({
                message: 'Validation failed',
                errors: fieldErrors,
            });
        }
        next(error);
    }
};
exports.ordersRouter = (0, express_1.Router)();
// POST /api/orders/checkout — submit checkout
exports.ordersRouter.post('/checkout', authenticate_1.authenticate, (0, validate_1.validate)(checkoutSchema), (0, asyncHandler_1.asyncHandler)((req, res) => controller_1.ordersController.checkout(req, res)));
// GET /api/orders — list buyer's orders (paginated, most recent first)
exports.ordersRouter.get('/', authenticate_1.authenticate, (0, asyncHandler_1.asyncHandler)((req, res) => controller_1.ordersController.getOrders(req, res)));
// GET /api/orders/:id — get order with items
exports.ordersRouter.get('/:id', authenticate_1.authenticate, (0, asyncHandler_1.asyncHandler)((req, res) => controller_1.ordersController.getOrder(req, res)));
exports.sellerOrdersRouter = (0, express_1.Router)();
// GET /api/seller/orders — list orders containing seller's products (paginated, optional ?status= filter)
exports.sellerOrdersRouter.get('/', authenticate_1.authenticate, (0, requireRole_1.requireRole)('seller'), validateSellerOrdersQuery, (0, asyncHandler_1.asyncHandler)((req, res) => controller_1.ordersController.getSellerOrders(req, res)));
// GET /api/seller/orders/:id — get order detail
exports.sellerOrdersRouter.get('/:id', authenticate_1.authenticate, (0, requireRole_1.requireRole)('seller'), (0, asyncHandler_1.asyncHandler)((req, res) => controller_1.ordersController.getSellerOrder(req, res)));
// PATCH /api/seller/orders/:id/status — advance order status
exports.sellerOrdersRouter.patch('/:id/status', authenticate_1.authenticate, (0, requireRole_1.requireRole)('seller'), (0, validate_1.validate)(updateOrderStatusSchema), (0, asyncHandler_1.asyncHandler)((req, res) => controller_1.ordersController.updateSellerOrderStatus(req, res)));
