"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authController = exports.AuthController = void 0;
const crypto_1 = require("crypto");
const service_1 = require("./service");
class AuthController {
    async register(req, res) {
        const result = await service_1.authService.register(req.body);
        res.status(201).json(result);
    }
    async login(req, res) {
        const result = await service_1.authService.login(req.body);
        res.status(200).json(result);
    }
    async logout(req, res) {
        // Use rawToken attached by authenticate middleware instead of re-parsing header
        const token = req.rawToken || '';
        const tokenHash = (0, crypto_1.createHash)('sha256').update(token).digest('hex');
        await service_1.authService.logout(tokenHash);
        res.status(204).send();
    }
}
exports.AuthController = AuthController;
exports.authController = new AuthController();
