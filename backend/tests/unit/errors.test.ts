import {
  AppError,
  ValidationError,
  AuthError,
  PaymentError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  UnprocessableError,
} from '../../src/errors';

describe('AppError', () => {
  it('stores message and statusCode', () => {
    const error = new AppError('Test error', 400);
    expect(error.message).toBe('Test error');
    expect(error.statusCode).toBe(400);
  });

  it('is instanceof Error', () => {
    const error = new AppError('Test', 400);
    expect(error instanceof Error).toBe(true);
  });
});

describe('ValidationError', () => {
  it('has statusCode 400', () => {
    const error = new ValidationError('Invalid input');
    expect(error.statusCode).toBe(400);
    expect(error.message).toBe('Invalid input');
  });

  it('is instanceof AppError', () => {
    const error = new ValidationError('Invalid');
    expect(error instanceof AppError).toBe(true);
  });
});

describe('AuthError', () => {
  it('has default message "Unauthorized"', () => {
    const error = new AuthError();
    expect(error.message).toBe('Unauthorized');
    expect(error.statusCode).toBe(401);
  });

  it('allows custom message', () => {
    const error = new AuthError('Invalid token');
    expect(error.message).toBe('Invalid token');
    expect(error.statusCode).toBe(401);
  });

  it('is instanceof AppError', () => {
    const error = new AuthError();
    expect(error instanceof AppError).toBe(true);
  });
});

describe('PaymentError', () => {
  it('has statusCode 402', () => {
    const error = new PaymentError('Payment failed');
    expect(error.statusCode).toBe(402);
    expect(error.message).toBe('Payment failed');
  });

  it('is instanceof AppError', () => {
    const error = new PaymentError('Failed');
    expect(error instanceof AppError).toBe(true);
  });
});

describe('ForbiddenError', () => {
  it('has default message "Forbidden"', () => {
    const error = new ForbiddenError();
    expect(error.message).toBe('Forbidden');
    expect(error.statusCode).toBe(403);
  });

  it('is instanceof AppError', () => {
    const error = new ForbiddenError();
    expect(error instanceof AppError).toBe(true);
  });
});

describe('NotFoundError', () => {
  it('has statusCode 404', () => {
    const error = new NotFoundError('User not found');
    expect(error.statusCode).toBe(404);
    expect(error.message).toBe('User not found');
  });

  it('is instanceof AppError', () => {
    const error = new NotFoundError('Not found');
    expect(error instanceof AppError).toBe(true);
  });
});

describe('ConflictError', () => {
  it('has statusCode 409', () => {
    const error = new ConflictError('Email already exists');
    expect(error.statusCode).toBe(409);
    expect(error.message).toBe('Email already exists');
  });

  it('is instanceof AppError', () => {
    const error = new ConflictError('Conflict');
    expect(error instanceof AppError).toBe(true);
  });
});

describe('UnprocessableError', () => {
  it('has statusCode 422 and stores state info', () => {
    const error = new UnprocessableError('pending', ['confirmed', 'cancelled']);
    expect(error.statusCode).toBe(422);
    expect(error.message).toBe('Invalid state transition');
    expect(error.currentState).toBe('pending');
    expect(error.validNextStates).toEqual(['confirmed', 'cancelled']);
  });

  it('is instanceof AppError', () => {
    const error = new UnprocessableError('pending', ['confirmed']);
    expect(error instanceof AppError).toBe(true);
  });
});
