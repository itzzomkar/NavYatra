import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { logger, performanceLogger } from '../utils/logger';

// Custom error classes
export class AppError extends Error {
  statusCode: number;
  status: string;
  isOperational: boolean;
  code?: string;

  constructor(message: string, statusCode: number, code?: string) {
    super(message);
    this.statusCode = statusCode;
    this.status = statusCode >= 400 && statusCode < 500 ? 'fail' : 'error';
    this.isOperational = true;
    this.code = code || undefined;

    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, code = 'VALIDATION_ERROR') {
    super(message, 400, code);
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string, code = 'AUTHENTICATION_ERROR') {
    super(message, 401, code);
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string, code = 'AUTHORIZATION_ERROR') {
    super(message, 403, code);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string, code = 'NOT_FOUND') {
    super(message, 404, code);
  }
}

export class ConflictError extends AppError {
  constructor(message: string, code = 'CONFLICT') {
    super(message, 409, code);
  }
}

export class RateLimitError extends AppError {
  constructor(message: string, code = 'RATE_LIMIT_EXCEEDED') {
    super(message, 429, code);
  }
}

export class ExternalServiceError extends AppError {
  constructor(message: string, statusCode = 502, code = 'EXTERNAL_SERVICE_ERROR') {
    super(message, statusCode, code);
  }
}

// Error response interface
interface ErrorResponse {
  status: string;
  error: {
    message: string;
    code?: string;
    details?: any;
    stack?: string;
  };
  timestamp: string;
  path: string;
  method: string;
  requestId?: string;
}

// Handle Prisma errors
const handlePrismaError = (error: any): AppError => {
  if (error.code && typeof error.code === 'string') {
    switch (error.code) {
      case 'P2002':
        // Unique constraint violation
        const field = error.meta?.target as string[] | undefined;
        const fieldName = field ? field[0] : 'field';
        return new ConflictError(
          `A record with this ${fieldName} already exists`,
          'UNIQUE_CONSTRAINT_VIOLATION'
        );
      
      case 'P2025':
        // Record not found
        return new NotFoundError(
          'The requested record could not be found',
          'RECORD_NOT_FOUND'
        );
      
      case 'P2003':
        // Foreign key constraint violation
        return new ValidationError(
          'This operation violates a data relationship constraint',
          'FOREIGN_KEY_CONSTRAINT'
        );
      
      case 'P2021':
        // Table does not exist
        return new AppError(
          'Database table does not exist',
          500,
          'TABLE_NOT_EXISTS'
        );
      
      case 'P2022':
        // Column does not exist
        return new AppError(
          'Database column does not exist',
          500,
          'COLUMN_NOT_EXISTS'
        );
      
      default:
        logger.error('Unhandled Prisma error', { code: error.code, meta: error.meta });
        return new AppError(
          'A database error occurred',
          500,
          'DATABASE_ERROR'
        );
    }
  }

  if (error.name === 'PrismaClientValidationError') {
    return new ValidationError(
      'Invalid data provided to database',
      'DATABASE_VALIDATION_ERROR'
    );
  }

  if (error.name === 'PrismaClientInitializationError') {
    logger.error('Database connection failed', error);
    return new AppError(
      'Database connection failed',
      500,
      'DATABASE_CONNECTION_ERROR'
    );
  }

  // Generic Prisma error
  return new AppError(
    'A database error occurred',
    500,
    'DATABASE_ERROR'
  );
};

// Handle JWT errors
const handleJWTError = (): AppError => {
  return new AuthenticationError('Invalid token, please login again');
};

const handleJWTExpiredError = (): AppError => {
  return new AuthenticationError('Your token has expired, please login again');
};

// Handle validation errors from express-validator or joi
const handleValidationError = (error: any): AppError => {
  if (error.details && Array.isArray(error.details)) {
    // Joi validation error
    const messages = error.details.map((detail: any) => detail.message);
    return new ValidationError(
      `Validation error: ${messages.join(', ')}`,
      'JOI_VALIDATION_ERROR'
    );
  }

  if (error.errors && Array.isArray(error.errors)) {
    // Express-validator error
    const messages = error.errors.map((err: any) => `${err.param}: ${err.msg}`);
    return new ValidationError(
      `Validation error: ${messages.join(', ')}`,
      'EXPRESS_VALIDATION_ERROR'
    );
  }

  return new ValidationError(error.message || 'Validation failed');
};

// Send error response in development
const sendErrorDev = (err: AppError, req: Request, res: Response): void => {
  const errorResponse: ErrorResponse = {
    status: err.status,
    error: {
      message: err.message,
      code: err.code || undefined,
      stack: err.stack || undefined,
      details: err
    },
    timestamp: new Date().toISOString(),
    path: req.path,
    method: req.method,
    requestId: req.headers['x-request-id'] as string
  };

  res.status(err.statusCode).json(errorResponse);
};

// Send error response in production
const sendErrorProd = (err: AppError, req: Request, res: Response): void => {
  // Operational, trusted error: send message to client
  if (err.isOperational) {
    const errorResponse: ErrorResponse = {
      status: err.status,
      error: {
        message: err.message,
        code: err.code || undefined
      },
      timestamp: new Date().toISOString(),
      path: req.path,
      method: req.method,
      requestId: req.headers['x-request-id'] as string
    };

    res.status(err.statusCode).json(errorResponse);
  } else {
    // Programming or other unknown error: don't leak error details
    logger.error('Unexpected error', err);
    
    const errorResponse: ErrorResponse = {
      status: 'error',
      error: {
        message: 'Something went wrong!',
        code: 'INTERNAL_SERVER_ERROR'
      },
      timestamp: new Date().toISOString(),
      path: req.path,
      method: req.method,
      requestId: req.headers['x-request-id'] as string
    };

    res.status(500).json(errorResponse);
  }
};

// Main error handler middleware
export const errorHandler = (
  error: any,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const startTime = Date.now();
  
  // Set default values
  let err = { ...error };
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  // Log error details
  logger.error('Error occurred', {
    message: err.message,
    statusCode: err.statusCode,
    stack: err.stack,
    path: req.path,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    user: req.user?.id
  });

  // Handle specific error types
  if (err.name === 'JsonWebTokenError') err = handleJWTError();
  if (err.name === 'TokenExpiredError') err = handleJWTExpiredError();
  if (err.name === 'ValidationError') err = handleValidationError(err);
  
  // Handle Prisma errors
  if (err.name === 'PrismaClientKnownRequestError' ||
      err.name === 'PrismaClientValidationError' ||
      err.name === 'PrismaClientInitializationError' ||
      err.code) {
    err = handlePrismaError(err);
  }

  // Handle MongoDB duplicate key error (if using MongoDB with Prisma)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    err = new ConflictError(
      `A record with this ${field} already exists`,
      'DUPLICATE_KEY_ERROR'
    );
  }

  // Handle cast errors (invalid ObjectId, etc.)
  if (err.name === 'CastError') {
    err = new ValidationError(
      `Invalid ${err.path}: ${err.value}`,
      'CAST_ERROR'
    );
  }

  // Handle multer errors (file upload)
  if (err.code === 'LIMIT_FILE_SIZE') {
    err = new ValidationError(
      'File too large. Please upload a smaller file',
      'FILE_TOO_LARGE'
    );
  }

  // Convert non-AppError to AppError
  if (!(err instanceof AppError)) {
    err = new AppError(
      err.message || 'Something went wrong',
      err.statusCode || 500,
      err.code
    );
  }

  // Log performance metrics
  const duration = Date.now() - startTime;
  performanceLogger.logError('Error handling', err, duration, {
    statusCode: err.statusCode,
    path: req.path,
    method: req.method
  });

  // Send appropriate error response
  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err as AppError, req, res);
  } else {
    sendErrorProd(err as AppError, req, res);
  }
};

// Async error handler wrapper
export const catchAsync = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// 404 error handler for undefined routes
export const notFoundHandler = (req: Request, res: Response, next: NextFunction): void => {
  const err = new NotFoundError(`Can't find ${req.originalUrl} on this server!`);
  next(err);
};

// Unhandled rejection handler
export const handleUnhandledRejection = (): void => {
  process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
    logger.error('Unhandled Promise Rejection', {
      reason: reason?.message || reason,
      stack: reason?.stack,
      promise
    });
    
    // Close server gracefully
    process.exit(1);
  });
};

// Uncaught exception handler
export const handleUncaughtException = (): void => {
  process.on('uncaughtException', (error: Error) => {
    logger.error('Uncaught Exception', {
      message: error.message,
      stack: error.stack
    });
    
    // Close application immediately
    process.exit(1);
  });
};

export default errorHandler;
