import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { logger, securityLogger } from './logger';
import { cacheService } from '../services/cacheService';

// Password security utilities
class PasswordSecurity {
  private static readonly SALT_ROUNDS = 12;
  private static readonly MIN_PASSWORD_LENGTH = 8;
  private static readonly MAX_PASSWORD_LENGTH = 128;

  // Hash password with salt
  static async hashPassword(password: string): Promise<string> {
    if (!password || password.length < this.MIN_PASSWORD_LENGTH) {
      throw new Error(`Password must be at least ${this.MIN_PASSWORD_LENGTH} characters long`);
    }
    
    if (password.length > this.MAX_PASSWORD_LENGTH) {
      throw new Error(`Password must be no more than ${this.MAX_PASSWORD_LENGTH} characters long`);
    }

    return bcrypt.hash(password, this.SALT_ROUNDS);
  }

  // Verify password against hash
  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  // Generate secure random password
  static generateSecurePassword(length: number = 16): string {
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    
    return password;
  }

  // Check password strength
  static checkPasswordStrength(password: string): {
    score: number;
    feedback: string[];
    isStrong: boolean;
  } {
    const feedback: string[] = [];
    let score = 0;

    if (password.length >= 8) score += 1;
    else feedback.push('Password should be at least 8 characters long');

    if (password.length >= 12) score += 1;
    else if (password.length >= 8) feedback.push('Consider using 12+ characters for better security');

    if (/[a-z]/.test(password)) score += 1;
    else feedback.push('Include lowercase letters');

    if (/[A-Z]/.test(password)) score += 1;
    else feedback.push('Include uppercase letters');

    if (/\d/.test(password)) score += 1;
    else feedback.push('Include numbers');

    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) score += 1;
    else feedback.push('Include special characters');

    if (!/(.)\1{2,}/.test(password)) score += 1;
    else feedback.push('Avoid repeating characters');

    const isStrong = score >= 5;
    
    return { score, feedback, isStrong };
  }
}

// Token security utilities
class TokenSecurity {
  private static readonly DEFAULT_EXPIRES_IN = '24h';
  private static readonly REFRESH_TOKEN_EXPIRES_IN = '7d';

  // Generate JWT token
  static generateToken(
    payload: any, 
    expiresIn: string = this.DEFAULT_EXPIRES_IN,
    secret?: string
  ): string {
    const jwtSecret = secret || process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT_SECRET environment variable is required');
    }

    return jwt.sign(payload, jwtSecret, { 
      expiresIn: expiresIn as string,
      issuer: 'kmrl-system',
      audience: 'kmrl-users'
    } as jwt.SignOptions);
  }

  // Generate refresh token
  static generateRefreshToken(payload: any): string {
    return this.generateToken(payload, this.REFRESH_TOKEN_EXPIRES_IN);
  }

  // Verify JWT token
  static verifyToken(token: string, secret?: string): any {
    const jwtSecret = secret || process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT_SECRET environment variable is required');
    }

    return jwt.verify(token, jwtSecret, {
      issuer: 'kmrl-system',
      audience: 'kmrl-users'
    });
  }

  // Generate secure random token
  static generateSecureToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  // Generate API key
  static generateApiKey(): string {
    const timestamp = Date.now().toString(36);
    const random = crypto.randomBytes(16).toString('hex');
    return `kmrl_${timestamp}_${random}`;
  }
}

// Input sanitization utilities
class InputSanitizer {
  // Remove HTML tags
  static stripHtml(input: string): string {
    return input.replace(/<[^>]*>?/gm, '');
  }

  // Escape HTML entities
  static escapeHtml(input: string): string {
    const htmlEscapes: { [key: string]: string } = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#x27;',
      '/': '&#x2F;'
    };
    
    return input.replace(/[&<>"'\/]/g, (match) => htmlEscapes[match]);
  }

  // Sanitize string input
  static sanitizeString(input: string, maxLength: number = 1000): string {
    if (typeof input !== 'string') {
      throw new Error('Input must be a string');
    }

    // Trim whitespace
    let sanitized = input.trim();
    
    // Truncate if too long
    if (sanitized.length > maxLength) {
      sanitized = sanitized.substring(0, maxLength);
    }
    
    // Remove null bytes
    sanitized = sanitized.replace(/\0/g, '');
    
    // Escape HTML
    sanitized = this.escapeHtml(sanitized);
    
    return sanitized;
  }

  // Sanitize email
  static sanitizeEmail(email: string): string {
    const sanitized = this.sanitizeString(email, 254).toLowerCase();
    
    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(sanitized)) {
      throw new Error('Invalid email format');
    }
    
    return sanitized;
  }

  // Sanitize phone number
  static sanitizePhoneNumber(phone: string): string {
    // Remove all non-digit characters except +
    const sanitized = phone.replace(/[^\d+]/g, '');
    
    if (sanitized.length < 10 || sanitized.length > 15) {
      throw new Error('Invalid phone number length');
    }
    
    return sanitized;
  }

  // Sanitize filename
  static sanitizeFilename(filename: string): string {
    // Remove path traversal attempts and dangerous characters
    return filename
      .replace(/[<>:"/\\|?*\x00-\x1f]/g, '')
      .replace(/^\.+/, '')
      .trim();
  }
}

// Rate limiting configurations
export const rateLimitConfigs = {
  // General API rate limiting
  general: rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // limit each IP to 1000 requests per windowMs
    message: {
      error: 'Too many requests from this IP, please try again later.',
      code: 'RATE_LIMIT_EXCEEDED'
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      securityLogger.logSuspiciousActivity('Rate limit exceeded', {
        ip: req.ip,
        path: req.path,
        method: req.method,
        userAgent: req.get('User-Agent')
      });
      
      res.status(429).json({
        error: 'Too many requests from this IP, please try again later.',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: Math.ceil(15 * 60) // seconds
      });
    }
  }),

  // Strict rate limiting for authentication endpoints
  auth: rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // limit each IP to 10 auth requests per windowMs
    message: {
      error: 'Too many authentication attempts, please try again later.',
      code: 'AUTH_RATE_LIMIT_EXCEEDED'
    },
    skipSuccessfulRequests: true,
    handler: (req, res) => {
      securityLogger.logSuspiciousActivity('Auth rate limit exceeded', {
        ip: req.ip,
        path: req.path,
        method: req.method,
        userAgent: req.get('User-Agent')
      });
      
      res.status(429).json({
        error: 'Too many authentication attempts, please try again later.',
        code: 'AUTH_RATE_LIMIT_EXCEEDED',
        retryAfter: Math.ceil(15 * 60)
      });
    }
  }),

  // Rate limiting for password reset attempts
  passwordReset: rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // limit each IP to 3 password reset attempts per hour
    message: {
      error: 'Too many password reset attempts, please try again later.',
      code: 'PASSWORD_RESET_RATE_LIMIT_EXCEEDED'
    }
  }),

  // Rate limiting for optimization requests
  optimization: rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 5, // limit each IP to 5 optimization requests per minute
    message: {
      error: 'Too many optimization requests, please try again later.',
      code: 'OPTIMIZATION_RATE_LIMIT_EXCEEDED'
    }
  })
};

// Security headers middleware
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      fontSrc: ["'self'"],
      connectSrc: ["'self'"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      childSrc: ["'none'"]
    }
  },
  crossOriginEmbedderPolicy: { policy: "require-corp" },
  crossOriginOpenerPolicy: { policy: "same-origin" },
  crossOriginResourcePolicy: { policy: "same-site" },
  dnsPrefetchControl: { allow: false },
  frameguard: { action: 'deny' },
  hidePoweredBy: true,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  ieNoOpen: true,
  noSniff: true,
  originAgentCluster: true,
  permittedCrossDomainPolicies: false,
  referrerPolicy: { policy: "no-referrer" },
  xssFilter: true
});

// Account lockout middleware
class AccountLockout {
  private static readonly MAX_ATTEMPTS = 5;
  private static readonly LOCKOUT_DURATION = 30 * 60; // 30 minutes in seconds

  static async checkAccountLockout(req: Request, res: Response, next: NextFunction) {
    const { email } = req.body;
    
    if (!email) {
      return next();
    }

    try {
      const lockoutKey = `lockout:${email}`;
      const attemptsKey = `attempts:${email}`;
      
      // Check if account is locked
      const isLocked = await cacheService.exists(lockoutKey);
      if (isLocked) {
        securityLogger.logSuspiciousActivity('Login attempted on locked account', {
          email,
          ip: req.ip,
          userAgent: req.get('User-Agent')
        });
        
        return res.status(423).json({
          error: 'Account is temporarily locked due to multiple failed login attempts',
          code: 'ACCOUNT_LOCKED'
        });
      }

      next();
    } catch (error) {
      logger.error('Account lockout check failed', error);
      next(); // Don't block request on cache failure
    }
  }

  static async recordFailedAttempt(email: string, ip: string) {
    try {
      const attemptsKey = `attempts:${email}`;
      const attempts = await cacheService.increment(attemptsKey, 1, { ttl: this.LOCKOUT_DURATION });
      
      if (attempts >= this.MAX_ATTEMPTS) {
        // Lock the account
        const lockoutKey = `lockout:${email}`;
        await cacheService.set(lockoutKey, 'locked', { ttl: this.LOCKOUT_DURATION });
        
        securityLogger.logSuspiciousActivity('Account locked due to failed attempts', {
          email,
          ip,
          attempts,
          lockoutDuration: this.LOCKOUT_DURATION
        });
      }

      return attempts;
    } catch (error) {
      logger.error('Failed to record login attempt', error);
      return 0;
    }
  }

  static async clearFailedAttempts(email: string) {
    try {
      const attemptsKey = `attempts:${email}`;
      await cacheService.delete(attemptsKey);
    } catch (error) {
      logger.error('Failed to clear login attempts', error);
    }
  }
}

// IP whitelisting/blacklisting
class IPSecurity {
  private static whitelist: Set<string> = new Set();
  private static blacklist: Set<string> = new Set();

  static addToWhitelist(ip: string) {
    this.whitelist.add(ip);
    logger.info(`IP ${ip} added to whitelist`);
  }

  static addToBlacklist(ip: string, reason?: string) {
    this.blacklist.add(ip);
    securityLogger.logSuspiciousActivity('IP added to blacklist', { ip, reason });
  }

  static removeFromWhitelist(ip: string) {
    this.whitelist.delete(ip);
    logger.info(`IP ${ip} removed from whitelist`);
  }

  static removeFromBlacklist(ip: string) {
    this.blacklist.delete(ip);
    logger.info(`IP ${ip} removed from blacklist`);
  }

  static isWhitelisted(ip: string): boolean {
    return this.whitelist.has(ip);
  }

  static isBlacklisted(ip: string): boolean {
    return this.blacklist.has(ip);
  }

  static middleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
      
      if (this.isBlacklisted(clientIP)) {
        securityLogger.logSuspiciousActivity('Blocked request from blacklisted IP', {
          ip: clientIP,
          path: req.path,
          method: req.method
        });
        
        return res.status(403).json({
          error: 'Access denied',
          code: 'IP_BLOCKED'
        });
      }

      // If whitelist is not empty and IP is not whitelisted, block
      if (this.whitelist.size > 0 && !this.isWhitelisted(clientIP)) {
        securityLogger.logSuspiciousActivity('Blocked request from non-whitelisted IP', {
          ip: clientIP,
          path: req.path,
          method: req.method
        });
        
        return res.status(403).json({
          error: 'Access denied',
          code: 'IP_NOT_WHITELISTED'
        });
      }

      next();
    };
  }
}

// Request validation middleware
export const requestValidation = {
  // Validate request size
  validateRequestSize: (maxSize: number = 10 * 1024 * 1024) => { // 10MB default
    return (req: Request, res: Response, next: NextFunction) => {
      const contentLength = parseInt(req.headers['content-length'] || '0', 10);
      
      if (contentLength > maxSize) {
        securityLogger.logSuspiciousActivity('Large request detected', {
          ip: req.ip,
          contentLength,
          maxAllowed: maxSize,
          path: req.path
        });
        
        return res.status(413).json({
          error: 'Request too large',
          code: 'REQUEST_TOO_LARGE',
          maxSize
        });
      }
      
      next();
    };
  },

  // Validate content type
  validateContentType: (allowedTypes: string[] = ['application/json']) => {
    return (req: Request, res: Response, next: NextFunction) => {
      if (req.method === 'GET' || req.method === 'DELETE') {
        return next();
      }

      const contentType = req.headers['content-type'];
      
      if (!contentType || !allowedTypes.some(type => contentType.includes(type))) {
        return res.status(415).json({
          error: 'Unsupported content type',
          code: 'UNSUPPORTED_CONTENT_TYPE',
          allowed: allowedTypes
        });
      }
      
      next();
    };
  }
};

// CORS security configuration
export const corsOptions = {
  origin: function (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'];
    
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      securityLogger.logSuspiciousActivity('CORS violation', { origin });
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
  exposedHeaders: ['X-Request-ID'],
  maxAge: 86400 // 24 hours
};

// Security audit logging
export const securityAuditLogger = {
  logSecurityEvent: (event: string, details: any, req?: Request) => {
    securityLogger.logSuspiciousActivity(event, {
      ...details,
      ip: req?.ip,
      userAgent: req?.get('User-Agent'),
      path: req?.path,
      method: req?.method,
      timestamp: new Date().toISOString()
    });
  },

  logDataAccess: (resource: string, action: string, userId?: string, req?: Request) => {
    logger.info('Data access', {
      type: 'data_access',
      resource,
      action,
      userId,
      ip: req?.ip,
      path: req?.path,
      method: req?.method,
      timestamp: new Date().toISOString()
    });
  }
};

export {
  PasswordSecurity,
  TokenSecurity,
  InputSanitizer,
  AccountLockout,
  IPSecurity
};