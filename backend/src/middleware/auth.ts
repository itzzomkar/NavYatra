import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { authLogger, securityLogger } from '../utils/logger';
import redisService from '../utils/redis';

interface UserPermission {
  permission: {
    name: string;
  };
}

const prisma = new PrismaClient();

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: string;
        permissions?: string[];
      };
    }
  }
}

export interface JwtPayload {
  userId: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

// Main authentication middleware
export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      authLogger.warn('No authorization header provided');
      res.status(401).json({ 
        error: 'Access denied. No token provided.',
        code: 'NO_TOKEN'
      });
      return;
    }

    const token = authHeader.startsWith('Bearer ') 
      ? authHeader.substring(7) 
      : authHeader;

    if (!token) {
      authLogger.warn('Invalid authorization format');
      res.status(401).json({ 
        error: 'Access denied. Invalid token format.',
        code: 'INVALID_TOKEN_FORMAT'
      });
      return;
    }

    // Check if token is blacklisted
    const isBlacklisted = await redisService.exists(`blacklist:${token}`);
    if (isBlacklisted) {
      authLogger.warn('Blacklisted token used', { token: token.substring(0, 20) + '...' });
      res.status(401).json({ 
        error: 'Access denied. Token is no longer valid.',
        code: 'BLACKLISTED_TOKEN'
      });
      return;
    }

    // Verify JWT token
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      authLogger.error('JWT_SECRET not configured');
      res.status(500).json({ 
        error: 'Server configuration error.',
        code: 'JWT_SECRET_MISSING'
      });
      return;
    }

    const decoded = jwt.verify(token, jwtSecret) as JwtPayload;
    
    // Check if user still exists and is active
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true
      }
    });

    if (!user) {
      authLogger.warn('Token valid but user not found', { userId: decoded.userId });
      res.status(401).json({ 
        error: 'Access denied. User not found.',
        code: 'USER_NOT_FOUND'
      });
      return;
    }

    if (!user.isActive) {
      authLogger.warn('Token valid but user is inactive', { userId: decoded.userId });
      res.status(401).json({ 
        error: 'Access denied. Account is deactivated.',
        code: 'ACCOUNT_INACTIVE'
      });
      return;
    }

    // Attach user information to request
    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      permissions: [] // Empty permissions for simplified schema
    };

    // Log successful authentication
    authLogger.info('User authenticated successfully', { 
      userId: user.id,
      email: user.email,
      role: user.role 
    });

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      authLogger.warn('Invalid JWT token', { error: error.message });
      res.status(401).json({ 
        error: 'Access denied. Invalid token.',
        code: 'INVALID_TOKEN'
      });
      return;
    }

    if (error instanceof jwt.TokenExpiredError) {
      authLogger.warn('Expired JWT token', { error: error.message });
      res.status(401).json({ 
        error: 'Access denied. Token expired.',
        code: 'TOKEN_EXPIRED'
      });
      return;
    }

    authLogger.error('Authentication error', error);
    res.status(500).json({ 
      error: 'Internal server error during authentication.',
      code: 'AUTH_INTERNAL_ERROR'
    });
  }
};

// Role-based authorization middleware
export const requireRole = (...allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ 
        error: 'Authentication required.',
        code: 'AUTH_REQUIRED'
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      securityLogger.logPermissionDenied(
        req.user.id,
        req.path,
        req.method,
        req.ip || 'unknown'
      );
      
      res.status(403).json({ 
        error: 'Insufficient permissions.',
        code: 'INSUFFICIENT_PERMISSIONS',
        required: allowedRoles,
        current: req.user.role
      });
      return;
    }

    next();
  };
};

// Permission-based authorization middleware
export const requirePermission = (...requiredPermissions: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ 
        error: 'Authentication required.',
        code: 'AUTH_REQUIRED'
      });
      return;
    }

    const userPermissions = req.user.permissions || [];
    const hasPermission = requiredPermissions.some(permission => 
      userPermissions.includes(permission)
    );

    if (!hasPermission) {
      securityLogger.logPermissionDenied(
        req.user.id,
        req.path,
        req.method,
        req.ip || 'unknown'
      );
      
      res.status(403).json({ 
        error: 'Insufficient permissions.',
        code: 'MISSING_PERMISSIONS',
        required: requiredPermissions,
        current: userPermissions
      });
      return;
    }

    next();
  };
};

// Optional authentication middleware (doesn't fail if no token)
export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    return next();
  }

  try {
    const token = authHeader.startsWith('Bearer ') 
      ? authHeader.substring(7) 
      : authHeader;

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      return next();
    }

    const decoded = jwt.verify(token, jwtSecret) as JwtPayload;
    
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true
      }
    });

    if (user && user.isActive) {
      req.user = {
        id: user.id,
        email: user.email,
        role: user.role,
        permissions: [] // Empty permissions for simplified schema
      };
    }
  } catch (error) {
    // Silently ignore authentication errors for optional auth
    authLogger.debug('Optional auth failed', error);
  }

  next();
};

// Rate limiting by user
export const rateLimitByUser = (maxRequests: number, windowMs: number) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      return next();
    }

    const key = `rate_limit:user:${req.user.id}`;
    const current = await redisService.get(key);
    
    if (current === null) {
      await redisService.set(key, '1', windowMs / 1000);
      return next();
    }

    const count = parseInt(current, 10);
    if (count >= maxRequests) {
      securityLogger.logSuspiciousActivity(
        'Rate limit exceeded',
        { userId: req.user.id, requests: count, limit: maxRequests }
      );
      
      res.status(429).json({
        error: 'Too many requests. Please try again later.',
        code: 'RATE_LIMIT_EXCEEDED',
        limit: maxRequests,
        window: windowMs
      });
      return;
    }

    await redisService.set(key, (count + 1).toString(), windowMs / 1000);
    next();
  };
};

// Token blacklisting utility
export const blacklistToken = async (token: string): Promise<void> => {
  try {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) return;

    const decoded = jwt.decode(token) as JwtPayload;
    if (decoded && decoded.exp) {
      const ttl = decoded.exp - Math.floor(Date.now() / 1000);
      if (ttl > 0) {
        await redisService.set(`blacklist:${token}`, '1', ttl);
        authLogger.info('Token blacklisted successfully');
      }
    }
  } catch (error) {
    authLogger.error('Failed to blacklist token', error);
  }
};

export default authMiddleware;
