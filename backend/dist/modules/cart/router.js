"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cartRouter = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const controller_1 = require("./controller");
const validate_1 = require("../../middleware/validate");
const authenticate_1 = require("../../middleware/authenticate");
const asyncHandler_1 = require("../../utils/asyncHandler");
// Validation schemas
const addItemSchema = zod_1.z.object({
    product_id: zod_1.z.string().uuid('product_id must be a valid UUID'),
    quantity: zod_1.z.number().int().gt(0, 'quantity must be greater than 0'),
});
const updateItemSchema = zod_1.z.object({
    quantity: zod_1.z.number().int().gte(0, 'quantity must be >= 0'),
});
exports.cartRouter = (0, express_1.Router)();
// GET /api/cart — get current user's cart with product details and total
exports.cartRouter.get('/', authenticate_1.authenticate, (0, asyncHandler_1.asyncHandler)((req, res) => controller_1.cartController.getCart(req, res)));
// POST /api/cart/items — add item { product_id, quantity }
exports.cartRouter.post('/items', authenticate_1.authenticate, (0, validate_1.validate)(addItemSchema), (0, asyncHandler_1.asyncHandler)((req, res) => controller_1.cartController.addItem(req, res)));
// PUT /api/cart/items/:productId — update quantity { quantity } (quantity=0 removes item)
exports.cartRouter.put('/items/:productId', authenticate_1.authenticate, (0, validate_1.validate)(updateItemSchema), (0, asyncHandler_1.asyncHandler)((req, res) => controller_1.cartController.updateItem(req, res)));
// DELETE /api/cart/items/:productId — remove item
exports.cartRouter.delete('/items/:productId', authenticate_1.authenticate, (0, asyncHandler_1.asyncHandler)((req, res) => controller_1.cartController.removeItem(req, res)));
// DELETE /api/cart — clear entire cart
exports.cartRouter.delete('/', authenticate_1.authenticate, (0, asyncHandler_1.asyncHandler)((req, res) => controller_1.cartController.clearCart(req, res)));
