export declare class AppError extends Error {
    message: string;
    statusCode: number;
    constructor(message: string, statusCode: number);
}
export declare class ValidationError extends AppError {
    constructor(msg: string);
}
export declare class AuthError extends AppError {
    constructor(msg?: string);
}
export declare class PaymentError extends AppError {
    constructor(msg: string);
}
export declare class ForbiddenError extends AppError {
    constructor(msg?: string);
}
export declare class NotFoundError extends AppError {
    constructor(msg: string);
}
export declare class ConflictError extends AppError {
    constructor(msg: string);
}
export declare class UnprocessableError extends AppError {
    currentState: string;
    validNextStates: string[];
    constructor(currentState: string, validNextStates: string[]);
}
