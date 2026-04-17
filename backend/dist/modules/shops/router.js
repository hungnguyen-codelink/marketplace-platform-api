"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.shopsRouter = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const controller_1 = require("./controller");
const validate_1 = require("../../middleware/validate");
const authenticate_1 = require("../../middleware/authenticate");
const requireRole_1 = require("../../middleware/requireRole");
const asyncHandler_1 = require("../../utils/asyncHandler");
// Validation schemas
const createShopSchema = zod_1.z.object({
    name: zod_1.z.string().refine((val) => val.trim().length > 0, {
        message: 'Name is required',
    }).transform((val) => val.trim()),
    description: zod_1.z
        .string()
        .refine((val) => val.trim().length > 0, {
        message: 'Description must not be empty if provided',
    })
        .transform((val) => val.trim())
        .optional(),
    banner_url: zod_1.z
        .string()
        .refine((val) => val.trim().length > 0, {
        message: 'Banner URL must not be empty if provided',
    })
        .transform((val) => val.trim())
        .optional(),
    contact_email: zod_1.z
        .string()
        .refine((val) => val.trim().length > 0, {
        message: 'Contact email must not be empty if provided',
    })
        .transform((val) => val.trim())
        .optional(),
});
const updateShopSchema = zod_1.z.object({
    name: zod_1.z
        .string()
        .refine((val) => val.trim().length > 0, {
        message: 'Name must not be empty',
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
    banner_url: zod_1.z
        .string()
        .refine((val) => val.trim().length > 0, {
        message: 'Banner URL must not be empty if provided',
    })
        .transform((val) => val.trim())
        .optional(),
    contact_email: zod_1.z
        .string()
        .refine((val) => val.trim().length > 0, {
        message: 'Contact email must not be empty if provided',
    })
        .transform((val) => val.trim())
        .optional(),
});
exports.shopsRouter = (0, express_1.Router)();
// POST /api/shops — create shop (seller only)
exports.shopsRouter.post('/', authenticate_1.authenticate, (0, requireRole_1.requireRole)('seller'), (0, validate_1.validate)(createShopSchema), (0, asyncHandler_1.asyncHandler)((req, res) => controller_1.shopsController.createShop(req, res)));
// GET /api/shops/my — get current seller's shop (seller only)
exports.shopsRouter.get('/my', authenticate_1.authenticate, (0, requireRole_1.requireRole)('seller'), (0, asyncHandler_1.asyncHandler)((req, res) => controller_1.shopsController.getMyShop(req, res)));
// PUT /api/shops/my — update current seller's shop (seller only)
exports.shopsRouter.put('/my', authenticate_1.authenticate, (0, requireRole_1.requireRole)('seller'), (0, validate_1.validate)(updateShopSchema), (0, asyncHandler_1.asyncHandler)((req, res) => controller_1.shopsController.updateMyShop(req, res)));
// GET /api/shops/:id — get shop by ID (public)
exports.shopsRouter.get('/:id', (0, asyncHandler_1.asyncHandler)((req, res) => controller_1.shopsController.getShopById(req, res)));
