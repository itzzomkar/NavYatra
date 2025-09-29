import { Response } from 'express';
import { logger } from './logger';

// Standard API response interfaces
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: {
    timestamp: string;
    requestId?: string;
    version?: string;
  };
  pagination?: PaginationMeta;
}

export interface PaginationMeta {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface ListResponse<T> {
  items: T[];
  pagination: PaginationMeta;
}

// Success response types
export interface SuccessOptions {
  message?: string;
  meta?: any;
  pagination?: PaginationMeta;
}

export interface ErrorOptions {
  code?: string;
  details?: any;
  statusCode?: number;
}

class ApiResponseBuilder {
  private generateMeta(req?: any): { timestamp: string; requestId?: string; version: string } {
    return {
      timestamp: new Date().toISOString(),
      requestId: req?.headers['x-request-id'] || req?.id,
      version: process.env.API_VERSION || '1.0.0'
    };
  }

  // Success responses
  success<T>(
    res: Response, 
    data: T, 
    options: SuccessOptions = {}
  ): Response {
    const { message = 'Request successful', meta, pagination } = options;
    
    const response: ApiResponse<T> = {
      success: true,
      message,
      data,
      meta: this.generateMeta(res.req),
      ...(pagination && { pagination })
    };

    logger.info('API Success Response', {
      path: res.req?.path,
      method: res.req?.method,
      statusCode: 200,
      responseSize: JSON.stringify(response).length
    });

    return res.status(200).json(response);
  }

  // Created response (201)
  created<T>(
    res: Response, 
    data: T, 
    options: SuccessOptions = {}
  ): Response {
    const { message = 'Resource created successfully', meta } = options;
    
    const response: ApiResponse<T> = {
      success: true,
      message,
      data,
      meta: this.generateMeta(res.req)
    };

    logger.info('API Created Response', {
      path: res.req?.path,
      method: res.req?.method,
      statusCode: 201
    });

    return res.status(201).json(response);
  }

  // No content response (204)
  noContent(res: Response, message: string = 'No content'): Response {
    logger.info('API No Content Response', {
      path: res.req?.path,
      method: res.req?.method,
      statusCode: 204
    });

    return res.status(204).json({
      success: true,
      message,
      meta: this.generateMeta(res.req)
    });
  }

  // List response with pagination
  list<T>(
    res: Response, 
    items: T[], 
    totalItems: number, 
    currentPage: number = 1, 
    itemsPerPage: number = 10,
    options: SuccessOptions = {}
  ): Response {
    const { message = 'List retrieved successfully' } = options;
    
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const pagination: PaginationMeta = {
      currentPage,
      totalPages,
      totalItems,
      itemsPerPage,
      hasNextPage: currentPage < totalPages,
      hasPreviousPage: currentPage > 1
    };

    const response: ApiResponse<ListResponse<T>> = {
      success: true,
      message,
      data: { items, pagination },
      meta: this.generateMeta(res.req),
      pagination
    };

    logger.info('API List Response', {
      path: res.req?.path,
      method: res.req?.method,
      statusCode: 200,
      itemCount: items.length,
      totalItems,
      currentPage,
      totalPages
    });

    return res.status(200).json(response);
  }

  // Error responses
  error(
    res: Response, 
    message: string, 
    statusCode: number = 500, 
    options: ErrorOptions = {}
  ): Response {
    const { code = 'INTERNAL_ERROR', details } = options;
    
    const response: ApiResponse = {
      success: false,
      message,
      error: {
        code,
        message,
        ...(details && { details })
      },
      meta: this.generateMeta(res.req)
    };

    logger.error('API Error Response', {
      path: res.req?.path,
      method: res.req?.method,
      statusCode,
      error: message,
      code
    });

    return res.status(statusCode).json(response);
  }

  // Bad request (400)
  badRequest(
    res: Response, 
    message: string = 'Bad request', 
    options: ErrorOptions = {}
  ): Response {
    return this.error(res, message, 400, { 
      code: 'BAD_REQUEST', 
      ...options 
    });
  }

  // Unauthorized (401)
  unauthorized(
    res: Response, 
    message: string = 'Unauthorized access', 
    options: ErrorOptions = {}
  ): Response {
    return this.error(res, message, 401, { 
      code: 'UNAUTHORIZED', 
      ...options 
    });
  }

  // Forbidden (403)
  forbidden(
    res: Response, 
    message: string = 'Access forbidden', 
    options: ErrorOptions = {}
  ): Response {
    return this.error(res, message, 403, { 
      code: 'FORBIDDEN', 
      ...options 
    });
  }

  // Not found (404)
  notFound(
    res: Response, 
    message: string = 'Resource not found', 
    options: ErrorOptions = {}
  ): Response {
    return this.error(res, message, 404, { 
      code: 'NOT_FOUND', 
      ...options 
    });
  }

  // Conflict (409)
  conflict(
    res: Response, 
    message: string = 'Resource conflict', 
    options: ErrorOptions = {}
  ): Response {
    return this.error(res, message, 409, { 
      code: 'CONFLICT', 
      ...options 
    });
  }

  // Unprocessable Entity (422)
  unprocessableEntity(
    res: Response, 
    message: string = 'Validation failed', 
    options: ErrorOptions = {}
  ): Response {
    return this.error(res, message, 422, { 
      code: 'VALIDATION_ERROR', 
      ...options 
    });
  }

  // Too Many Requests (429)
  tooManyRequests(
    res: Response, 
    message: string = 'Rate limit exceeded', 
    options: ErrorOptions = {}
  ): Response {
    return this.error(res, message, 429, { 
      code: 'RATE_LIMIT_EXCEEDED', 
      ...options 
    });
  }

  // Internal Server Error (500)
  internalError(
    res: Response, 
    message: string = 'Internal server error', 
    options: ErrorOptions = {}
  ): Response {
    return this.error(res, message, 500, { 
      code: 'INTERNAL_ERROR', 
      ...options 
    });
  }

  // Bad Gateway (502)
  badGateway(
    res: Response, 
    message: string = 'Bad gateway', 
    options: ErrorOptions = {}
  ): Response {
    return this.error(res, message, 502, { 
      code: 'BAD_GATEWAY', 
      ...options 
    });
  }

  // Service Unavailable (503)
  serviceUnavailable(
    res: Response, 
    message: string = 'Service temporarily unavailable', 
    options: ErrorOptions = {}
  ): Response {
    return this.error(res, message, 503, { 
      code: 'SERVICE_UNAVAILABLE', 
      ...options 
    });
  }
}

// Create singleton instance
export const apiResponse = new ApiResponseBuilder();

// Convenience functions for common responses
export const sendSuccess = <T>(res: Response, data: T, message?: string) => {
  return apiResponse.success(res, data, { message });
};

export const sendCreated = <T>(res: Response, data: T, message?: string) => {
  return apiResponse.created(res, data, { message });
};

export const sendList = <T>(
  res: Response, 
  items: T[], 
  totalItems: number, 
  page: number, 
  limit: number, 
  message?: string
) => {
  return apiResponse.list(res, items, totalItems, page, limit, { message });
};

export const sendError = (res: Response, message: string, statusCode?: number, code?: string) => {
  return apiResponse.error(res, message, statusCode, { code });
};

export const sendBadRequest = (res: Response, message?: string, details?: any) => {
  return apiResponse.badRequest(res, message, { details });
};

export const sendUnauthorized = (res: Response, message?: string) => {
  return apiResponse.unauthorized(res, message);
};

export const sendForbidden = (res: Response, message?: string) => {
  return apiResponse.forbidden(res, message);
};

export const sendNotFound = (res: Response, message?: string) => {
  return apiResponse.notFound(res, message);
};

export const sendConflict = (res: Response, message?: string, details?: any) => {
  return apiResponse.conflict(res, message, { details });
};

export const sendValidationError = (res: Response, message?: string, details?: any) => {
  return apiResponse.unprocessableEntity(res, message, { details });
};

export const sendInternalError = (res: Response, message?: string) => {
  return apiResponse.internalError(res, message);
};

// Pagination helper functions
export const calculatePagination = (
  totalItems: number,
  currentPage: number = 1,
  itemsPerPage: number = 10
): PaginationMeta => {
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  
  return {
    currentPage,
    totalPages,
    totalItems,
    itemsPerPage,
    hasNextPage: currentPage < totalPages,
    hasPreviousPage: currentPage > 1
  };
};

export const getPaginationFromQuery = (query: any): { page: number; limit: number; offset: number } => {
  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 10));
  const offset = (page - 1) * limit;
  
  return { page, limit, offset };
};

// Response transformation utilities
export const transformResponse = <T, R>(data: T, transformer: (item: T) => R): R => {
  return transformer(data);
};

export const transformListResponse = <T, R>(
  items: T[], 
  transformer: (item: T) => R
): R[] => {
  return items.map(transformer);
};

// Custom response builders for specific domains
export class TrainsetResponseBuilder extends ApiResponseBuilder {
  trainsetCreated(res: Response, trainset: any) {
    return this.created(res, trainset, {
      message: `Train set ${trainset.id} created successfully`
    });
  }

  trainsetUpdated(res: Response, trainset: any) {
    return this.success(res, trainset, {
      message: `Train set ${trainset.id} updated successfully`
    });
  }

  trainsetNotFound(res: Response, trainsetId: string) {
    return this.notFound(res, `Train set ${trainsetId} not found`);
  }

  trainsetList(res: Response, trainsets: any[], totalCount: number, page: number, limit: number) {
    return this.list(res, trainsets, totalCount, page, limit, {
      message: `Retrieved ${trainsets.length} train sets`
    });
  }
}

export class OptimizationResponseBuilder extends ApiResponseBuilder {
  optimizationCompleted(res: Response, result: any) {
    return this.success(res, result, {
      message: 'Optimization completed successfully'
    });
  }

  optimizationFailed(res: Response, error: string) {
    return this.badRequest(res, 'Optimization failed', { details: error });
  }

  optimizationInProgress(res: Response, jobId: string) {
    return this.success(res, { jobId }, {
      message: 'Optimization started, check status with job ID'
    });
  }
}

export class ScheduleResponseBuilder extends ApiResponseBuilder {
  scheduleGenerated(res: Response, schedule: any) {
    return this.success(res, schedule, {
      message: 'Schedule generated successfully'
    });
  }

  scheduleConflict(res: Response, conflicts: any[]) {
    return this.conflict(res, 'Schedule conflicts detected', { 
      details: { conflicts, count: conflicts.length }
    });
  }

  scheduleNotFound(res: Response, date: string) {
    return this.notFound(res, `No schedule found for date ${date}`);
  }
}

// Export specialized response builders
export const trainsetResponse = new TrainsetResponseBuilder();
export const optimizationResponse = new OptimizationResponseBuilder();
export const scheduleResponse = new ScheduleResponseBuilder();

export default apiResponse;