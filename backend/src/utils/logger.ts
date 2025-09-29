import winston from 'winston';
import path from 'path';

const logLevel = process.env.LOG_LEVEL || 'info';
const logFile = process.env.LOG_FILE || 'logs/app.log';

// Custom log format
const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.prettyPrint()
);

// Console format for development
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({
    format: 'HH:mm:ss'
  }),
  winston.format.printf(({ timestamp, level, message, service, ...meta }) => {
    let log = `${timestamp} [${level}]`;
    if (service) log += ` [${service}]`;
    log += `: ${message}`;
    
    // Add metadata if present
    const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
    if (metaStr) log += `\n${metaStr}`;
    
    return log;
  })
);

// Create logs directory if it doesn't exist
const fs = require('fs');
const logDir = path.dirname(logFile);
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// Create logger instance
const logger = winston.createLogger({
  level: logLevel,
  format: logFormat,
  defaultMeta: {
    service: 'kmrl-backend'
  },
  transports: [
    // File transport for all logs
    new winston.transports.File({
      filename: logFile,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      )
    }),
    
    // Error-only file
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      )
    }),
  ],
});

// Console transport for development
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: consoleFormat,
    level: process.env.NODE_ENV === 'development' ? 'debug' : 'info'
  }));
}

// Custom logging methods for different contexts
export const createContextLogger = (context: string) => {
  return {
    info: (message: string, meta?: any) => logger.info(message, { context, ...meta }),
    error: (message: string, meta?: any) => logger.error(message, { context, ...meta }),
    warn: (message: string, meta?: any) => logger.warn(message, { context, ...meta }),
    debug: (message: string, meta?: any) => logger.debug(message, { context, ...meta }),
    verbose: (message: string, meta?: any) => logger.verbose(message, { context, ...meta }),
  };
};

// API request logger
export const apiLogger = (req: any) => ({
  info: (message: string, meta?: any) => logger.info(message, {
    context: 'API',
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    ...meta
  }),
  error: (message: string, meta?: any) => logger.error(message, {
    context: 'API',
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    ...meta
  }),
  warn: (message: string, meta?: any) => logger.warn(message, {
    context: 'API',
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    ...meta
  })
});

// Database logger
export const dbLogger = createContextLogger('DATABASE');

// Authentication logger
export const authLogger = createContextLogger('AUTH');

// Socket logger
export const socketLogger = createContextLogger('SOCKET');

// Optimization logger
export const optimizationLogger = createContextLogger('OPTIMIZATION');

// External API logger
export const externalApiLogger = createContextLogger('EXTERNAL_API');

// Performance logger
export const performanceLogger = {
  logOperation: (operation: string, duration: number, meta?: any) => {
    logger.info(`Operation completed: ${operation}`, {
      context: 'PERFORMANCE',
      duration: `${duration}ms`,
      ...meta
    });
  },
  
  logSlowQuery: (query: string, duration: number, meta?: any) => {
    logger.warn(`Slow database query detected: ${query}`, {
      context: 'PERFORMANCE',
      duration: `${duration}ms`,
      type: 'slow_query',
      ...meta
    });
  },
  
  logError: (operation: string, error: Error, duration?: number, meta?: any) => {
    logger.error(`Operation failed: ${operation}`, {
      context: 'PERFORMANCE',
      error: error.message,
      stack: error.stack,
      duration: duration ? `${duration}ms` : undefined,
      ...meta
    });
  },
  
  logApiCall: (method: string, url: string, duration: number, statusCode: number, meta?: any) => {
    logger.info(`API call completed: ${method} ${url}`, {
      context: 'PERFORMANCE',
      method,
      url,
      duration: `${duration}ms`,
      statusCode,
      type: 'api_call',
      ...meta
    });
  },
  
  logCacheOperation: (operation: string, key: string, duration: number, hit?: boolean, meta?: any) => {
    logger.info(`Cache operation: ${operation}`, {
      context: 'PERFORMANCE',
      operation,
      key,
      duration: `${duration}ms`,
      hit,
      type: 'cache_operation',
      ...meta
    });
  }
};

// Security logger for audit trails
export const securityLogger = {
  logLogin: (userId: string, ip: string, userAgent: string, success: boolean) => {
    logger.info(`Login attempt ${success ? 'successful' : 'failed'}`, {
      context: 'SECURITY',
      userId,
      ip,
      userAgent,
      success,
      type: 'login_attempt'
    });
  },
  
  logPermissionDenied: (userId: string, resource: string, action: string, ip: string) => {
    logger.warn(`Permission denied`, {
      context: 'SECURITY',
      userId,
      resource,
      action,
      ip,
      type: 'permission_denied'
    });
  },
  
  logSuspiciousActivity: (description: string, meta: any) => {
    logger.warn(`Suspicious activity detected: ${description}`, {
      context: 'SECURITY',
      type: 'suspicious_activity',
      ...meta
    });
  },
  
  logUserAction: (userId: string, action: string, meta?: any) => {
    logger.info(`User action: ${action}`, {
      context: 'SECURITY',
      userId,
      action,
      type: 'user_action',
      ...meta
    });
  }
};

// Stream for Morgan HTTP logging
export const morganStream = {
  write: (message: string) => {
    logger.info(message.trim(), { context: 'HTTP' });
  }
};

export { logger };
export default logger;
