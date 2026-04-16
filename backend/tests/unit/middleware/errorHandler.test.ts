import { Request, Response, NextFunction } from 'express';
import { errorHandler } from '../../../src/middleware/errorHandler';
import {
  AppError,
  NotFoundError,
  UnprocessableError,
} from '../../../src/errors';

describe('errorHandler', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {};
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();
  });

  it('handles AppError with correct statusCode and message', () => {
    const error = new AppError('Bad request', 400);

    errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith({ message: 'Bad request' });
  });

  it('handles NotFoundError', () => {
    const error = new NotFoundError('User not found');

    errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(404);
    expect(mockRes.json).toHaveBeenCalledWith({ message: 'User not found' });
  });

  it('handles UnprocessableError with state info', () => {
    const error = new UnprocessableError('pending', ['confirmed', 'cancelled']);

    errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(422);
    expect(mockRes.json).toHaveBeenCalledWith({
      message: 'Invalid state transition',
      currentState: 'pending',
      validNextStates: ['confirmed', 'cancelled'],
    });
  });

  it('handles unknown Error with 500 status', () => {
    const error = new Error('Unexpected error');
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

    errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(500);
    expect(mockRes.json).toHaveBeenCalledWith({
      message: 'Internal server error',
    });
    expect(consoleErrorSpy).toHaveBeenCalledWith('[unhandled]', error);

    consoleErrorSpy.mockRestore();
  });
});
