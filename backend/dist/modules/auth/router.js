"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRouter = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const controller_1 = require("./controller");
const validate_1 = require("../../middleware/validate");
const authenticate_1 = require("../../middleware/authenticate");
// Async handler wrapper
const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};
// Validation schemas
const registerSchema = zod_1.z.object({
    email: zod_1.z.string().email('Invalid email format'),
    password: zod_1.z.string().min(8, 'Password must be at least 8 characters'),
    full_name: zod_1.z.string().min(1, 'Full name is required'),
    role: zod_1.z.enum(['buyer', 'seller'], {
        errorMap: () => ({ message: 'Role must be either "buyer" or "seller"' }),
    }),
});
const loginSchema = zod_1.z.object({
    email: zod_1.z.string().email('Invalid email format'),
    password: zod_1.z.string().min(1, 'Password is required'),
});
exports.authRouter = (0, express_1.Router)();
exports.authRouter.post('/register', (0, validate_1.validate)(registerSchema), asyncHandler((req, res) => controller_1.authController.register(req, res)));
exports.authRouter.post('/login', (0, validate_1.validate)(loginSchema), asyncHandler((req, res) => controller_1.authController.login(req, res)));
exports.authRouter.post('/logout', authenticate_1.authenticate, asyncHandler((req, res) => controller_1.authController.logout(req, res)));
