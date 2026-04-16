export class AppError extends Error {
  constructor(public message: string, public statusCode: number) {
    super(message);
  }
}

export class ValidationError extends AppError {
  constructor(msg: string) {
    super(msg, 400);
  }
}

export class AuthError extends AppError {
  constructor(msg = 'Unauthorized') {
    super(msg, 401);
  }
}

export class PaymentError extends AppError {
  constructor(msg: string) {
    super(msg, 402);
  }
}

export class ForbiddenError extends AppError {
  constructor(msg = 'Forbidden') {
    super(msg, 403);
  }
}

export class NotFoundError extends AppError {
  constructor(msg: string) {
    super(msg, 404);
  }
}

export class ConflictError extends AppError {
  constructor(msg: string) {
    super(msg, 409);
  }
}

export class UnprocessableError extends AppError {
  constructor(public currentState: string, public validNextStates: string[]) {
    super('Invalid state transition', 422);
  }
}
