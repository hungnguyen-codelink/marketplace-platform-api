"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.redisDel = exports.redisSet = exports.redisGet = void 0;
const client_1 = require("./client");
const redisGet = async (key) => {
    try {
        return await client_1.redis.get(key);
    }
    catch {
        return null;
    }
};
exports.redisGet = redisGet;
const redisSet = async (key, value, ttlSeconds) => {
    try {
        if (ttlSeconds) {
            await client_1.redis.set(key, value, 'EX', ttlSeconds);
        }
        else {
            await client_1.redis.set(key, value);
        }
    }
    catch {
        /* fail silently */
    }
};
exports.redisSet = redisSet;
const redisDel = async (key) => {
    try {
        await client_1.redis.del(key);
    }
    catch {
        /* fail silently */
    }
};
exports.redisDel = redisDel;
