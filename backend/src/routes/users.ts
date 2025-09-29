import express from 'express';
import { prisma } from '../utils/database';
import { catchAsync } from '../middleware/errorHandler';
import { requirePermission } from '../middleware/auth';
import { body, validationResult } from 'express-validator';
import bcrypt from 'bcryptjs';
import { securityLogger } from '../utils/logger';

const router = express.Router();

// Get all users
router.get('/', requirePermission('user:read'), catchAsync(async (req, res) => {
  const {
    page = 1,
    limit = 25,
    role,
    isActive,
    search
  } = req.query;

  const skip = (Number(page) - 1) * Number(limit);
  const where: any = {};

  if (role) where.role = role;
  if (isActive !== undefined) where.isActive = isActive === 'true';
  if (search) {
    where.OR = [
      { firstName: { contains: search as string, mode: 'insensitive' } },
      { lastName: { contains: search as string, mode: 'insensitive' } },
      { email: { contains: search as string, mode: 'insensitive' } }
    ];
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take: Number(limit),
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        lastLogin: true,
        createdAt: true,
        updatedAt: true,
      // Note: permissions are related through UserPermission model
      },
      orderBy: { createdAt: 'desc' }
    }),
    prisma.user.count({ where })
  ]);

  res.json({
    success: true,
    data: {
      users,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    }
  });
}));

// Get user by ID
router.get('/:id', requirePermission('user:read'), catchAsync(async (req, res) => {
  const { id } = req.params;

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      isActive: true,
      lastLogin: true,
      createdAt: true,
      updatedAt: true,
      auditLogs: {
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          action: true,
          resource: true,
          createdAt: true,
          ipAddress: true
        }
      }
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
      user
    }
  });
}));

// Create new user
router.post('/',
  requirePermission('user:write'),
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    body('firstName').notEmpty().withMessage('First name is required'),
    body('lastName').notEmpty().withMessage('Last name is required'),
    body('role').isIn(['ADMIN', 'SUPERVISOR', 'OPERATOR', 'MAINTENANCE', 'VIEWER'])
      .withMessage('Valid role is required')
  ],
  catchAsync(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const {
      email,
      password,
      firstName,
      lastName,
      role,
      permissionIds = []
    } = req.body;

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });

    if (existingUser) {
      return res.status(400).json({
        error: 'Email already exists',
        code: 'EMAIL_EXISTS'
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user with permissions
    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        password: hashedPassword,
        firstName,
        lastName,
        role
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        createdAt: true
      }
    });

    // Log user creation
    securityLogger.logUserAction(req.user!.id, 'CREATE_USER', {
      targetUserId: user.id,
      targetUserEmail: user.email,
      role: user.role,
      ip: req.ip
    });

    res.status(201).json({
      success: true,
      data: {
        user
      }
    });
  })
);

// Update user
router.put('/:id',
  requirePermission('user:write'),
  [
    body('email').optional().isEmail().withMessage('Valid email is required'),
    body('firstName').optional().notEmpty().withMessage('First name cannot be empty'),
    body('lastName').optional().notEmpty().withMessage('Last name cannot be empty'),
    body('role').optional().isIn(['ADMIN', 'SUPERVISOR', 'OPERATOR', 'MAINTENANCE', 'VIEWER'])
      .withMessage('Valid role is required')
  ],
  catchAsync(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { id } = req.params;
    const { email, firstName, lastName, role, isActive, permissionIds } = req.body;

    // Get existing user
    const existingUser = await prisma.user.findUnique({ where: { id } });
    if (!existingUser) {
      return res.status(404).json({
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    // Check email uniqueness if email is being updated
    if (email && email.toLowerCase() !== existingUser.email) {
      const emailExists = await prisma.user.findUnique({
        where: { email: email.toLowerCase() }
      });
      if (emailExists) {
        return res.status(400).json({
          error: 'Email already exists',
          code: 'EMAIL_EXISTS'
        });
      }
    }

    const updateData: any = {};
    if (email) updateData.email = email.toLowerCase();
    if (firstName) updateData.firstName = firstName;
    if (lastName) updateData.lastName = lastName;
    if (role) updateData.role = role;
    if (isActive !== undefined) updateData.isActive = isActive;

    // Update user and permissions in transaction
    const user = await prisma.$transaction(async (tx) => {
      // Update basic user data
      const updatedUser = await tx.user.update({
        where: { id },
        data: updateData
      });

      // Update permissions if provided
      if (permissionIds) {
        // Remove existing permissions
        await tx.userPermission.deleteMany({
          where: { userId: id }
        });

        // Add new permissions
        await tx.userPermission.createMany({
          data: permissionIds.map((permissionId: string) => ({
            userId: id,
            permissionId
          }))
        });
      }

      // Return user with permissions
      return await tx.user.findUnique({
        where: { id },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          isActive: true,
          lastLogin: true,
          createdAt: true,
          updatedAt: true,
          permissions: {
            include: {
              permission: {
                select: {
                  name: true,
                  description: true,
                  module: true
                }
              }
            }
          }
        }
      });
    });

    // Log user update
    securityLogger.logUserAction(req.user!.id, 'UPDATE_USER', {
      targetUserId: id,
      changes: updateData,
      ip: req.ip
    });

    res.json({
      success: true,
      data: {
        user: {
          ...user,
          permissions: user!.permissions.map(p => ({
            name: p.permission.name,
            description: p.permission.description,
            module: p.permission.module
          }))
        }
      }
    });
  })
);

// Reset user password
router.post('/:id/reset-password',
  requirePermission('user:write'),
  [
    body('newPassword').isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
  ],
  catchAsync(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { id } = req.params;
    const { newPassword } = req.body;

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    await prisma.user.update({
      where: { id },
      data: { password: hashedPassword }
    });

    // Log password reset
    securityLogger.logUserAction(req.user!.id, 'RESET_PASSWORD', {
      targetUserId: id,
      targetUserEmail: user.email,
      ip: req.ip
    });

    res.json({
      success: true,
      message: 'Password reset successfully'
    });
  })
);

// Deactivate user
router.patch('/:id/deactivate', requirePermission('user:write'), catchAsync(async (req, res) => {
  const { id } = req.params;

  const user = await prisma.user.update({
    where: { id },
    data: { isActive: false },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      isActive: true
    }
  });

  // Log user deactivation
  securityLogger.logUserAction(req.user!.id, 'DEACTIVATE_USER', {
    targetUserId: id,
    targetUserEmail: user.email,
    ip: req.ip
  });

  res.json({
    success: true,
    message: 'User deactivated successfully',
    data: { user }
  });
}));

// Activate user
router.patch('/:id/activate', requirePermission('user:write'), catchAsync(async (req, res) => {
  const { id } = req.params;

  const user = await prisma.user.update({
    where: { id },
    data: { isActive: true },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      isActive: true
    }
  });

  // Log user activation
  securityLogger.logUserAction(req.user!.id, 'ACTIVATE_USER', {
    targetUserId: id,
    targetUserEmail: user.email,
    ip: req.ip
  });

  res.json({
    success: true,
    message: 'User activated successfully',
    data: { user }
  });
}));

// Delete user
router.delete('/:id', requirePermission('user:delete'), catchAsync(async (req, res) => {
  const { id } = req.params;

  // Get user info before deletion
  const user = await prisma.user.findUnique({
    where: { id },
    select: { email: true, firstName: true, lastName: true }
  });

  if (!user) {
    return res.status(404).json({
      error: 'User not found',
      code: 'USER_NOT_FOUND'
    });
  }

  await prisma.user.delete({ where: { id } });

  // Log user deletion
  securityLogger.logUserAction(req.user!.id, 'DELETE_USER', {
    targetUserId: id,
    targetUserEmail: user.email,
    ip: req.ip
  });

  res.json({
    success: true,
    message: 'User deleted successfully'
  });
}));

// Get all permissions
router.get('/permissions/list', requirePermission('user:read'), catchAsync(async (req, res) => {
  const permissions = await prisma.permission.findMany({
    select: {
      id: true,
      name: true,
      description: true,
      module: true
    },
    orderBy: { module: 'asc' }
  });

  // Group permissions by module
  const groupedPermissions = permissions.reduce((acc: any, permission) => {
    if (!acc[permission.module]) {
      acc[permission.module] = [];
    }
    acc[permission.module].push(permission);
    return acc;
  }, {});

  res.json({
    success: true,
    data: {
      permissions,
      groupedPermissions
    }
  });
}));

// Get user statistics
router.get('/stats/overview', requirePermission('user:read'), catchAsync(async (req, res) => {
  const [
    totalUsers,
    activeUsers,
    usersByRole,
    recentLogins,
    newUsersThisMonth
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { isActive: true } }),
    prisma.user.groupBy({
      by: ['role'],
      _count: true
    }),
    prisma.user.findMany({
      where: {
        lastLogin: { not: null },
        isActive: true
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        lastLogin: true
      },
      orderBy: { lastLogin: 'desc' },
      take: 10
    }),
    prisma.user.count({
      where: {
        createdAt: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
        }
      }
    })
  ]);

  res.json({
    success: true,
    data: {
      summary: {
        total: totalUsers,
        active: activeUsers,
        inactive: totalUsers - activeUsers,
        newThisMonth: newUsersThisMonth
      },
      roleDistribution: usersByRole,
      recentLogins,
      timestamp: new Date()
    }
  });
}));

// Bulk operations
router.post('/bulk/deactivate',
  requirePermission('user:write'),
  [
    body('userIds').isArray().withMessage('User IDs array is required')
  ],
  catchAsync(async (req, res) => {
    const { userIds } = req.body;

    const updatedUsers = await prisma.user.updateMany({
      where: { id: { in: userIds } },
      data: { isActive: false }
    });

    // Log bulk deactivation
    securityLogger.logUserAction(req.user!.id, 'BULK_DEACTIVATE_USERS', {
      affectedUserIds: userIds,
      count: updatedUsers.count,
      ip: req.ip
    });

    res.json({
      success: true,
      message: `${updatedUsers.count} users deactivated successfully`
    });
  })
);

export default router;
