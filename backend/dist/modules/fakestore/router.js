"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fakestoreRouter = void 0;
const express_1 = require("express");
const controller_1 = require("./controller");
const schemas_1 = require("./schemas");
const authenticate_1 = require("../../middleware/authenticate");
const requireRole_1 = require("../../middleware/requireRole");
const validate_1 = require("../../middleware/validate");
const asyncHandler_1 = require("../../utils/asyncHandler");
exports.fakestoreRouter = (0, express_1.Router)();
// GET /api/fakestore/products — fetch all products from FakeStore (seller only)
exports.fakestoreRouter.get('/products', authenticate_1.authenticate, (0, requireRole_1.requireRole)('seller'), (0, asyncHandler_1.asyncHandler)((req, res) => controller_1.fakestoreController.getProducts(req, res)));
// GET /api/fakestore/categories — fetch categories with cache chain (public)
exports.fakestoreRouter.get('/categories', (0, asyncHandler_1.asyncHandler)((req, res) => controller_1.fakestoreController.getCategories(req, res)));
// POST /api/fakestore/import — import selected products (seller only)
exports.fakestoreRouter.post('/import', authenticate_1.authenticate, (0, requireRole_1.requireRole)('seller'), (0, validate_1.validate)(schemas_1.importProductsSchema), (0, asyncHandler_1.asyncHandler)((req, res) => controller_1.fakestoreController.importProducts(req, res)));
