"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UnprocessableError = exports.ConflictError = exports.NotFoundError = exports.ForbiddenError = exports.PaymentError = exports.AuthError = exports.ValidationError = exports.AppError = void 0;
class AppError extends Error {
    constructor(message, statusCode) {
        super(message);
        this.message = message;
        this.statusCode = statusCode;
    }
}
exports.AppError = AppError;
class ValidationError extends AppError {
    constructor(msg) {
        super(msg, 400);
    }
}
exports.ValidationError = ValidationError;
class AuthError extends AppError {
    constructor(msg = 'Unauthorized') {
        super(msg, 401);
    }
}
exports.AuthError = AuthError;
class PaymentError extends AppError {
    constructor(msg) {
        super(msg, 402);
    }
}
exports.PaymentError = PaymentError;
class ForbiddenError extends AppError {
    constructor(msg = 'Forbidden') {
        super(msg, 403);
    }
}
exports.ForbiddenError = ForbiddenError;
class NotFoundError extends AppError {
    constructor(msg) {
        super(msg, 404);
    }
}
exports.NotFoundError = NotFoundError;
class ConflictError extends AppError {
    constructor(msg) {
        super(msg, 409);
    }
}
exports.ConflictError = ConflictError;
class UnprocessableError extends AppError {
    constructor(currentState, validNextStates) {
        super('Invalid state transition', 422);
        this.currentState = currentState;
        this.validNextStates = validNextStates;
    }
}
exports.UnprocessableError = UnprocessableError;
