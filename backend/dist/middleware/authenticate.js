"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticate = authenticate;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const crypto_1 = require("crypto");
const env_1 = require("../config/env");
const client_1 = require("../db/client");
const errors_1 = require("../errors");
async function authenticate(req, res, next) {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            throw new errors_1.AuthError('Unauthorized');
        }
        const parts = authHeader.split(' ');
        if (parts.length !== 2 || parts[0] !== 'Bearer') {
            throw new errors_1.AuthError('Unauthorized');
        }
        const token = parts[1];
        let decoded;
        try {
            decoded = jsonwebtoken_1.default.verify(token, env_1.env.JWT_SECRET);
        }
        catch (error) {
            throw new errors_1.AuthError('Unauthorized');
        }
        // Check if session exists and hasn't expired
        const tokenHash = (0, crypto_1.createHash)('sha256').update(token).digest('hex');
        const sessionResult = await client_1.db.query('SELECT expires_at FROM sessions WHERE token_hash = $1', [tokenHash]);
        if (sessionResult.rows.length === 0) {
            throw new errors_1.AuthError('Unauthorized');
        }
        const { expires_at } = sessionResult.rows[0];
        if (new Date(expires_at) <= new Date()) {
            throw new errors_1.AuthError('Unauthorized');
        }
        req.user = {
            id: decoded.id,
            email: decoded.email,
            role: decoded.role,
        };
        // Attach raw token to request for use in logout
        req.rawToken = token;
        next();
    }
    catch (error) {
        if (error instanceof errors_1.AuthError) {
            return next(error);
        }
        next(error);
    }
}
