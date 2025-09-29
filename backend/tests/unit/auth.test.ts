import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { authMiddleware, requireRole, requirePermission } from '../../src/middleware/auth';
import { prisma } from '../../src/utils/database';
import redisService from '../../src/utils/redis';

// Mock dependencies
jest.mock('../../src/utils/database');
jest.mock('../../src/utils/redis');
jest.mock('jsonwebtoken');

const mockPrisma = prisma as jest.Mocked<typeof prisma>;
const mockRedis = redisService as jest.Mocked<typeof redisService>;
const mockJwt = jwt as jest.Mocked<typeof jwt>;

describe('Authentication Middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: jest.MockedFunction<NextFunction>;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  beforeEach(() => {
    jsonMock = jest.fn();
    statusMock = jest.fn(() => ({ json: jsonMock }));
    
    mockReq = {
      headers: {},
      ip: '127.0.0.1',
      get: jest.fn().mockReturnValue('test-user-agent')
    };
    
    mockRes = {
      status: statusMock,
      json: jsonMock
    };
    
    mockNext = jest.fn();

    // Setup default mocks
    process.env.JWT_SECRET = 'test-secret';
    mockRedis.exists.mockResolvedValue(false);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('authMiddleware', () => {
    it('should authenticate user with valid token', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@kmrl.gov.in',
        role: 'ADMIN',
        isActive: true,
        permissions: [
          { permission: { name: 'trainset:read' } },
          { permission: { name: 'trainset:write' } }
        ]
      };

      mockReq.headers!.authorization = 'Bearer valid-token';
      mockJwt.verify.mockReturnValue({ userId: 'user-123', email: 'test@kmrl.gov.in', role: 'ADMIN' });
      mockPrisma.user.findUnique.mockResolvedValue(mockUser as any);

      await authMiddleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.user).toEqual({
        id: 'user-123',
        email: 'test@kmrl.gov.in',
        role: 'ADMIN',
        permissions: ['trainset:read', 'trainset:write']
      });
      expect(mockNext).toHaveBeenCalled();
    });

    it('should reject request without token', async () => {
      await authMiddleware(mockReq as Request, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Access denied. No token provided.',
        code: 'NO_TOKEN'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject blacklisted token', async () => {
      mockReq.headers!.authorization = 'Bearer blacklisted-token';
      mockRedis.exists.mockResolvedValue(true);

      await authMiddleware(mockReq as Request, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Access denied. Token is no longer valid.',
        code: 'BLACKLISTED_TOKEN'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject invalid JWT token', async () => {
      mockReq.headers!.authorization = 'Bearer invalid-token';
      mockJwt.verify.mockImplementation(() => {
        throw new jwt.JsonWebTokenError('Invalid token');
      });

      await authMiddleware(mockReq as Request, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Access denied. Invalid token.',
        code: 'INVALID_TOKEN'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject expired token', async () => {
      mockReq.headers!.authorization = 'Bearer expired-token';
      mockJwt.verify.mockImplementation(() => {
        throw new jwt.TokenExpiredError('Token expired', new Date());
      });

      await authMiddleware(mockReq as Request, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Access denied. Token expired.',
        code: 'TOKEN_EXPIRED'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject request for inactive user', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@kmrl.gov.in',
        role: 'ADMIN',
        isActive: false,
        permissions: []
      };

      mockReq.headers!.authorization = 'Bearer valid-token';
      mockJwt.verify.mockReturnValue({ userId: 'user-123', email: 'test@kmrl.gov.in', role: 'ADMIN' });
      mockPrisma.user.findUnique.mockResolvedValue(mockUser as any);

      await authMiddleware(mockReq as Request, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Access denied. Account is deactivated.',
        code: 'ACCOUNT_INACTIVE'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject request when user not found', async () => {
      mockReq.headers!.authorization = 'Bearer valid-token';
      mockJwt.verify.mockReturnValue({ userId: 'user-123', email: 'test@kmrl.gov.in', role: 'ADMIN' });
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await authMiddleware(mockReq as Request, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Access denied. User not found.',
        code: 'USER_NOT_FOUND'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle missing JWT secret', async () => {
      delete process.env.JWT_SECRET;
      mockReq.headers!.authorization = 'Bearer valid-token';

      await authMiddleware(mockReq as Request, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Server configuration error.',
        code: 'JWT_SECRET_MISSING'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('requireRole', () => {
    it('should allow user with required role', () => {
      mockReq.user = {
        id: 'user-123',
        email: 'test@kmrl.gov.in',
        role: 'ADMIN',
        permissions: []
      };

      const middleware = requireRole('ADMIN', 'SUPERVISOR');
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should reject user without required role', () => {
      mockReq.user = {
        id: 'user-123',
        email: 'test@kmrl.gov.in',
        role: 'OPERATOR',
        permissions: []
      };

      const middleware = requireRole('ADMIN', 'SUPERVISOR');
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Insufficient permissions.',
        code: 'INSUFFICIENT_PERMISSIONS',
        required: ['ADMIN', 'SUPERVISOR'],
        current: 'OPERATOR'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject unauthenticated user', () => {
      const middleware = requireRole('ADMIN');
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Authentication required.',
        code: 'AUTH_REQUIRED'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('requirePermission', () => {
    it('should allow user with required permission', () => {
      mockReq.user = {
        id: 'user-123',
        email: 'test@kmrl.gov.in',
        role: 'ADMIN',
        permissions: ['trainset:read', 'trainset:write']
      };

      const middleware = requirePermission('trainset:read');
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should allow user with any of the required permissions', () => {
      mockReq.user = {
        id: 'user-123',
        email: 'test@kmrl.gov.in',
        role: 'ADMIN',
        permissions: ['trainset:write']
      };

      const middleware = requirePermission('trainset:read', 'trainset:write');
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should reject user without required permission', () => {
      mockReq.user = {
        id: 'user-123',
        email: 'test@kmrl.gov.in',
        role: 'OPERATOR',
        permissions: ['jobcard:read']
      };

      const middleware = requirePermission('trainset:write', 'trainset:delete');
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Insufficient permissions.',
        code: 'MISSING_PERMISSIONS',
        required: ['trainset:write', 'trainset:delete'],
        current: ['jobcard:read']
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject unauthenticated user', () => {
      const middleware = requirePermission('trainset:read');
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Authentication required.',
        code: 'AUTH_REQUIRED'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });
});

describe('Token Blacklisting', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = 'test-secret';
  });

  it('should blacklist valid token until expiration', async () => {
    const mockToken = 'valid.jwt.token';
    const mockDecoded = {
      userId: 'user-123',
      exp: Math.floor(Date.now() / 1000) + 3600 // 1 hour from now
    };

    mockJwt.decode.mockReturnValue(mockDecoded);
    mockRedis.set.mockResolvedValue('OK');

    const { blacklistToken } = require('../../src/middleware/auth');
    await blacklistToken(mockToken);

    expect(mockJwt.decode).toHaveBeenCalledWith(mockToken);
    expect(mockRedis.set).toHaveBeenCalledWith(
      `blacklist:${mockToken}`,
      '1',
      expect.any(Number)
    );
  });

  it('should not blacklist expired token', async () => {
    const mockToken = 'expired.jwt.token';
    const mockDecoded = {
      userId: 'user-123',
      exp: Math.floor(Date.now() / 1000) - 3600 // 1 hour ago
    };

    mockJwt.decode.mockReturnValue(mockDecoded);

    const { blacklistToken } = require('../../src/middleware/auth');
    await blacklistToken(mockToken);

    expect(mockRedis.set).not.toHaveBeenCalled();
  });

  it('should handle blacklisting errors gracefully', async () => {
    const mockToken = 'valid.jwt.token';
    
    mockJwt.decode.mockImplementation(() => {
      throw new Error('Invalid token');
    });

    const { blacklistToken } = require('../../src/middleware/auth');
    
    // Should not throw
    await expect(blacklistToken(mockToken)).resolves.toBeUndefined();
  });
});
