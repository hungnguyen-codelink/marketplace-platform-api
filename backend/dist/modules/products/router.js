"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.productsRouter = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const controller_1 = require("./controller");
const validate_1 = require("../../middleware/validate");
const authenticate_1 = require("../../middleware/authenticate");
const requireRole_1 = require("../../middleware/requireRole");
const asyncHandler_1 = require("../../utils/asyncHandler");
// Validation schemas
const createProductSchema = zod_1.z.object({
    title: zod_1.z.string().refine((val) => val.trim().length > 0, {
        message: 'Title is required',
    }).transform((val) => val.trim()),
    description: zod_1.z
        .string()
        .refine((val) => val.trim().length > 0, {
        message: 'Description must not be empty if provided',
    })
        .transform((val) => val.trim())
        .optional(),
    price: zod_1.z
        .number()
        .gt(0, { message: 'Price must be greater than 0' })
        .refine((val) => /^\d+(\.\d{1,2})?$/.test(val.toString()), {
        message: 'Price must have at most 2 decimal places',
    }),
    image_url: zod_1.z
        .string()
        .refine((val) => val.trim().length > 0, {
        message: 'Image URL must not be empty if provided',
    })
        .transform((val) => val.trim())
        .optional(),
    category: zod_1.z
        .string()
        .refine((val) => val.trim().length > 0, {
        message: 'Category must not be empty if provided',
    })
        .transform((val) => val.trim())
        .optional(),
    stock: zod_1.z
        .number()
        .int({ message: 'Stock must be an integer' })
        .gte(0, { message: 'Stock must be >= 0' })
        .lte(999999, { message: 'Stock must be <= 999999' }),
});
const updateProductSchema = zod_1.z.object({
    title: zod_1.z
        .string()
        .refine((val) => val.trim().length > 0, {
        message: 'Title must not be empty',
    })
        .transform((val) => val.trim())
        .optional(),
    description: zod_1.z
        .string()
        .refine((val) => val.trim().length > 0, {
        message: 'Description must not be empty if provided',
    })
        .transform((val) => val.trim())
        .optional(),
    price: zod_1.z
        .number()
        .gt(0, { message: 'Price must be greater than 0' })
        .refine((val) => /^\d+(\.\d{1,2})?$/.test(val.toString()), {
        message: 'Price must have at most 2 decimal places',
    })
        .optional(),
    image_url: zod_1.z
        .string()
        .refine((val) => val.trim().length > 0, {
        message: 'Image URL must not be empty if provided',
    })
        .transform((val) => val.trim())
        .optional(),
    category: zod_1.z
        .string()
        .refine((val) => val.trim().length > 0, {
        message: 'Category must not be empty if provided',
    })
        .transform((val) => val.trim())
        .optional(),
    stock: zod_1.z
        .number()
        .int({ message: 'Stock must be an integer' })
        .gte(0, { message: 'Stock must be >= 0' })
        .lte(999999, { message: 'Stock must be <= 999999' })
        .optional(),
});
exports.productsRouter = (0, express_1.Router)();
// POST /api/products — create product (seller only)
exports.productsRouter.post('/', authenticate_1.authenticate, (0, requireRole_1.requireRole)('seller'), (0, validate_1.validate)(createProductSchema), (0, asyncHandler_1.asyncHandler)((req, res) => controller_1.productsController.createProduct(req, res)));
// GET /api/products — get products with search and category filters (public, paginated)
exports.productsRouter.get('/', (0, asyncHandler_1.asyncHandler)((req, res) => controller_1.productsController.getProducts(req, res)));
// GET /api/products/my — get current seller's products (seller only)
exports.productsRouter.get('/my', authenticate_1.authenticate, (0, requireRole_1.requireRole)('seller'), (0, asyncHandler_1.asyncHandler)((req, res) => controller_1.productsController.getMyProducts(req, res)));
// GET /api/products/:id — get product by ID (public)
exports.productsRouter.get('/:id', (0, asyncHandler_1.asyncHandler)((req, res) => controller_1.productsController.getProductById(req, res)));
// PUT /api/products/:id — update product (seller only)
exports.productsRouter.put('/:id', authenticate_1.authenticate, (0, requireRole_1.requireRole)('seller'), (0, validate_1.validate)(updateProductSchema), (0, asyncHandler_1.asyncHandler)((req, res) => controller_1.productsController.updateProduct(req, res)));
// DELETE /api/products/:id — delete product (seller only), returns 204 No Content
exports.productsRouter.delete('/:id', authenticate_1.authenticate, (0, requireRole_1.requireRole)('seller'), (0, asyncHandler_1.asyncHandler)((req, res) => controller_1.productsController.deleteProduct(req, res)));
