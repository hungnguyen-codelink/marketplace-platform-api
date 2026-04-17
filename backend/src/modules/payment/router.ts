import { Router } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { randomUUID } from 'crypto';

export const mockPaymentRouter = Router();

// POST /api/mock-payment — always returns { "status": "success", "transaction_id": "<uuid>" }
mockPaymentRouter.post(
  '/',
  asyncHandler((_req, res) => {
    const transactionId = randomUUID();
    res.status(200).json({
      status: 'success',
      transaction_id: transactionId,
    });
  })
);
