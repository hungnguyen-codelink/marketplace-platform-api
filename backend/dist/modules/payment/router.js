"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mockPaymentRouter = void 0;
const express_1 = require("express");
const asyncHandler_1 = require("../../utils/asyncHandler");
const crypto_1 = require("crypto");
exports.mockPaymentRouter = (0, express_1.Router)();
// POST /api/mock-payment — always returns { "status": "success", "transaction_id": "<uuid>" }
exports.mockPaymentRouter.post('/', (0, asyncHandler_1.asyncHandler)((_req, res) => {
    const transactionId = (0, crypto_1.randomUUID)();
    res.status(200).json({
        status: 'success',
        transaction_id: transactionId,
    });
}));
