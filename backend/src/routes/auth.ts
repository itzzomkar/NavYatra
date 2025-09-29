import express, { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../utils/database';
import { catchAsync } from '../middleware/errorHandler';
import { authLogger, securityLogger } from '../utils/logger';
import redisService from '../utils/redis';
import { blacklistToken } from '../middleware/auth';

interface UserPermission {
  permission: {
    name: string;
    description?: string;
    module?: string;
  };
}

const router = express.Router();

// Registration endpoint
router.post('/register', catchAsync(async (req: Request, res: Response) => {
  const { firstName, lastName, email, username, password } = req.body;

  // Validate required fields
  if (!firstName || !lastName || !email || !password) {
    return res.status(400).json({
      error: 'First name, last name, email, and password are required',
      code: 'MISSING_FIELDS'
    });
  }

  // Validate password length
  if (password.length < 8) {
    return res.status(400).json({
      error: 'Password must be at least 8 characters long',
      code: 'PASSWORD_TOO_SHORT'
    });
  }

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: {
      email: email.toLowerCase()
    }
  });

  if (existingUser) {
    return res.status(409).json({
      error: 'User with this email already exists',
      code: 'USER_EXISTS'
    });
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 12);

  // Create user
  const newUser = await prisma.user.create({
    data: {
      firstName,
      lastName,
      email: email.toLowerCase(),
      password: hashedPassword,
      role: 'OPERATOR', // Default role
      isActive: true
    }
  });

  authLogger.info('New user registered', { 
    userId: newUser.id, 
    email: newUser.email,
    ip: req.ip 
  });

  res.status(201).json({
    success: true,
    message: 'User registered successfully',
    data: {
      user: {
        id: newUser.id,
        email: newUser.email,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        role: newUser.role
      }
    }
  });
}));

// Login endpoint
router.post('/login', catchAsync(async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    authLogger.warn('Login attempt without email or password', { email });
    return res.status(400).json({
      error: 'Email and password are required',
      code: 'MISSING_CREDENTIALS'
    });
  }

  // Find user
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() }
  });

  if (!user) {
    securityLogger.logLogin('unknown', req.ip || 'unknown', req.get('User-Agent') || '', false);
    return res.status(401).json({
      error: 'Invalid credentials',
      code: 'INVALID_CREDENTIALS'
    });
  }

  // Check if user is active
  if (!user.isActive) {
    securityLogger.logLogin(user.id, req.ip || 'unknown', req.get('User-Agent') || '', false);
    return res.status(401).json({
      error: 'Account is deactivated',
      code: 'ACCOUNT_INACTIVE'
    });
  }

  // Verify password
  const isValidPassword = await bcrypt.compare(password, user.password);
  if (!isValidPassword) {
    securityLogger.logLogin(user.id, req.ip || 'unknown', req.get('User-Agent') || '', false);
    return res.status(401).json({
      error: 'Invalid credentials',
      code: 'INVALID_CREDENTIALS'
    });
  }

  // Generate tokens
  const jwtSecret = process.env.JWT_SECRET;
  const refreshSecret = process.env.REFRESH_TOKEN_SECRET;
  
  if (!jwtSecret || !refreshSecret) {
    authLogger.error('JWT secrets not configured');
    return res.status(500).json({
      error: 'Server configuration error',
      code: 'JWT_SECRET_MISSING'
    });
  }

  const tokenPayload = {
    userId: user.id,
    email: user.email,
    role: user.role
  };

  const accessToken = jwt.sign(tokenPayload, jwtSecret, {
    expiresIn: process.env.JWT_EXPIRES_IN || '24h'
  } as jwt.SignOptions);

  const refreshToken = jwt.sign(tokenPayload, refreshSecret, {
    expiresIn: '7d'
  });

  // Update last login
  await prisma.user.update({
    where: { id: user.id },
    data: { lastLogin: new Date() }
  });

  // Store refresh token in Redis
  await redisService.set(`refresh_token:${user.id}`, refreshToken, 7 * 24 * 60 * 60); // 7 days

  // Log successful login
  securityLogger.logLogin(user.id, req.ip || 'unknown', req.get('User-Agent') || '', true);

  res.json({
    success: true,
    data: {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        permissions: [] // Empty permissions for simplified schema
      },
      tokens: {
        access: accessToken,
        refresh: refreshToken
      }
    }
  });
}));

// Refresh token endpoint
router.post('/refresh', catchAsync(async (req: Request, res: Response) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(400).json({
      error: 'Refresh token is required',
      code: 'MISSING_REFRESH_TOKEN'
    });
  }

  const refreshSecret = process.env.REFRESH_TOKEN_SECRET;
  if (!refreshSecret) {
    return res.status(500).json({
      error: 'Server configuration error',
      code: 'REFRESH_SECRET_MISSING'
    });
  }

  try {
    const decoded = jwt.verify(refreshToken, refreshSecret) as any;
    
    // Check if refresh token exists in Redis
    const storedToken = await redisService.get(`refresh_token:${decoded.userId}`);
    if (!storedToken || storedToken !== refreshToken) {
      return res.status(401).json({
        error: 'Invalid refresh token',
        code: 'INVALID_REFRESH_TOKEN'
      });
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId }
    });

    if (!user || !user.isActive) {
      return res.status(401).json({
        error: 'User not found or inactive',
        code: 'USER_NOT_FOUND'
      });
    }

    // Generate new access token
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      return res.status(500).json({
        error: 'Server configuration error',
        code: 'JWT_SECRET_MISSING'
      });
    }

    const tokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role
    };

    const accessToken = jwt.sign(tokenPayload, jwtSecret, {
      expiresIn: process.env.JWT_EXPIRES_IN || '24h'
    } as jwt.SignOptions);

    res.json({
      success: true,
      data: {
        tokens: {
          access: accessToken,
          refresh: refreshToken // Return same refresh token
        }
      }
    });

  } catch (error) {
    authLogger.warn('Invalid refresh token', { error: (error as Error).message });
    res.status(401).json({
      error: 'Invalid refresh token',
      code: 'INVALID_REFRESH_TOKEN'
    });
  }
}));

// Logout endpoint
router.post('/logout', catchAsync(async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  const refreshToken = req.body.refreshToken;

  // Blacklist access token if provided
  if (authHeader) {
    const token = authHeader.startsWith('Bearer ') 
      ? authHeader.substring(7) 
      : authHeader;
    
    await blacklistToken(token);
  }

  // Remove refresh token from Redis if provided
  if (refreshToken) {
    try {
      const refreshSecret = process.env.REFRESH_TOKEN_SECRET;
      if (refreshSecret) {
        const decoded = jwt.verify(refreshToken, refreshSecret) as any;
        await redisService.del(`refresh_token:${decoded.userId}`);
        authLogger.info('Refresh token removed on logout', { userId: decoded.userId });
      }
    } catch (error) {
      authLogger.warn('Error removing refresh token on logout', error);
    }
  }

  res.json({
    success: true,
    message: 'Logged out successfully'
  });
}));

// Get current user profile
router.get('/me', catchAsync(async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    return res.status(401).json({
      error: 'Authorization header required',
      code: 'MISSING_AUTHORIZATION'
    });
  }

  const token = authHeader.startsWith('Bearer ') 
    ? authHeader.substring(7) 
    : authHeader;

  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    return res.status(500).json({
      error: 'Server configuration error',
      code: 'JWT_SECRET_MISSING'
    });
  }

  try {
    const decoded = jwt.verify(token, jwtSecret) as any;
    
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        lastLogin: true,
        createdAt: true
      }
    });

    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    res.json({
      success: true,
      data: {
        user: {
          ...user,
          permissions: [] // Empty permissions for simplified schema
        }
      }
    });

  } catch (error) {
    authLogger.warn('Invalid token in /me endpoint', { error: (error as Error).message });
    res.status(401).json({
      error: 'Invalid token',
      code: 'INVALID_TOKEN'
    });
  }
}));

// Change password endpoint
router.post('/change-password', catchAsync(async (req: Request, res: Response) => {
  const { currentPassword, newPassword } = req.body;
  const authHeader = req.headers.authorization;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({
      error: 'Current password and new password are required',
      code: 'MISSING_PASSWORDS'
    });
  }

  if (!authHeader) {
    return res.status(401).json({
      error: 'Authorization header required',
      code: 'MISSING_AUTHORIZATION'
    });
  }

  const token = authHeader.startsWith('Bearer ') 
    ? authHeader.substring(7) 
    : authHeader;

  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    return res.status(500).json({
      error: 'Server configuration error',
      code: 'JWT_SECRET_MISSING'
    });
  }

  try {
    const decoded = jwt.verify(token, jwtSecret) as any;
    
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId }
    });

    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, user.password);
    if (!isValidPassword) {
      securityLogger.logSuspiciousActivity('Invalid current password in change password', {
        userId: user.id,
        ip: req.ip
      });
      return res.status(400).json({
        error: 'Current password is incorrect',
        code: 'INVALID_CURRENT_PASSWORD'
      });
    }

    // Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 12);

    // Update password
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedNewPassword }
    });

    authLogger.info('Password changed successfully', { userId: user.id });

    res.json({
      success: true,
      message: 'Password changed successfully'
    });

  } catch (error) {
    authLogger.warn('Invalid token in change password', { error: (error as Error).message });
    res.status(401).json({
      error: 'Invalid token',
      code: 'INVALID_TOKEN'
    });
  }
}));

export default router;
