"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authService = exports.AuthService = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const crypto_1 = require("crypto");
const client_1 = require("../../db/client");
const env_1 = require("../../config/env");
const errors_1 = require("../../errors");
class AuthService {
    async register(payload) {
        const { email, password, full_name, role } = payload;
        // Hash password
        const passwordHash = await bcryptjs_1.default.hash(password, 10);
        // Insert user
        let userId;
        try {
            const result = await client_1.db.query('INSERT INTO users (email, password_hash, full_name, role) VALUES ($1, $2, $3, $4) RETURNING id, email, full_name, role', [email, passwordHash, full_name, role]);
            const user = result.rows[0];
            userId = user.id;
            // Generate JWT token
            const token = jsonwebtoken_1.default.sign({ id: userId, email, role }, env_1.env.JWT_SECRET, { expiresIn: env_1.env.SESSION_TTL_SECONDS });
            // Create session
            const tokenHash = (0, crypto_1.createHash)('sha256').update(token).digest('hex');
            const expiresAt = new Date(Date.now() + env_1.env.SESSION_TTL_SECONDS * 1000);
            await client_1.db.query('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES ($1, $2, $3)', [tokenHash, userId, expiresAt]);
            return {
                user: {
                    id: userId,
                    email,
                    full_name,
                    role,
                },
                token,
            };
        }
        catch (error) {
            // Handle unique constraint violation
            if (error.code === '23505' && error.constraint === 'users_email_key') {
                throw new errors_1.ConflictError('Email already exists');
            }
            throw error;
        }
    }
    async login(payload) {
        const { email, password } = payload;
        // Find user by email
        const userResult = await client_1.db.query('SELECT id, email, password_hash, full_name, role FROM users WHERE email = $1', [email]);
        if (userResult.rows.length === 0) {
            throw new errors_1.AuthError('Invalid credentials');
        }
        const user = userResult.rows[0];
        // Verify password
        const isValidPassword = await bcryptjs_1.default.compare(password, user.password_hash);
        if (!isValidPassword) {
            throw new errors_1.AuthError('Invalid credentials');
        }
        // Generate JWT token
        const token = jsonwebtoken_1.default.sign({ id: user.id, email: user.email, role: user.role }, env_1.env.JWT_SECRET, { expiresIn: env_1.env.SESSION_TTL_SECONDS });
        // Create session
        const tokenHash = (0, crypto_1.createHash)('sha256').update(token).digest('hex');
        const expiresAt = new Date(Date.now() + env_1.env.SESSION_TTL_SECONDS * 1000);
        await client_1.db.query('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES ($1, $2, $3)', [tokenHash, user.id, expiresAt]);
        return {
            user: {
                id: user.id,
                email: user.email,
                full_name: user.full_name,
                role: user.role,
            },
            token,
        };
    }
    async logout(tokenHash) {
        await client_1.db.query('DELETE FROM sessions WHERE token_hash = $1', [tokenHash]);
    }
}
exports.AuthService = AuthService;
exports.authService = new AuthService();
