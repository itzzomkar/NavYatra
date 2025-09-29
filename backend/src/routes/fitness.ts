import express from 'express';
import { prisma } from '../utils/database';
import { catchAsync } from '../middleware/errorHandler';
import { requirePermission } from '../middleware/auth';
import { body, validationResult } from 'express-validator';
import { io } from '../server';
import { emitFitnessUpdate } from '../services/socketService';

const router = express.Router();

// Get all fitness certificates
router.get('/', requirePermission('fitness:read'), catchAsync(async (req, res) => {
  const {
    page = 1,
    limit = 25,
    status,
    trainsetId,
    search,
    expiringIn
  } = req.query;

  const skip = (Number(page) - 1) * Number(limit);
  const where: any = {};

  if (status) where.status = status;
  if (trainsetId) where.trainsetId = trainsetId;
  if (search) {
    where.OR = [
      { certificateNumber: { contains: search as string, mode: 'insensitive' } },
      { issuingAuthority: { contains: search as string, mode: 'insensitive' } },
      { trainset: { trainsetNumber: { contains: search as string, mode: 'insensitive' } } }
    ];
  }
  
  if (expiringIn) {
    const daysAhead = Number(expiringIn);
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysAhead);
    
    where.expiryDate = {
      lte: futureDate,
      gte: new Date()
    };
    where.status = 'VALID';
  }

  const [certificates, total] = await Promise.all([
    prisma.fitnessCertificate.findMany({
      where,
      skip,
      take: Number(limit),
      include: {
        trainset: {
          select: {
            id: true,
            trainsetNumber: true,
            manufacturer: true,
            model: true,
            status: true
          }
        }
      },
      orderBy: { expiryDate: 'asc' }
    }),
    prisma.fitnessCertificate.count({ where })
  ]);

  res.json({
    success: true,
    data: {
      certificates,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    }
  });
}));

// Get fitness certificate by ID
router.get('/:id', requirePermission('fitness:read'), catchAsync(async (req, res) => {
  const { id } = req.params;

  const certificate = await prisma.fitnessCertificate.findUnique({
    where: { id },
    include: {
      trainset: {
        include: {
          maintenanceRecords: {
            orderBy: { performedAt: 'desc' },
            take: 5
          },
          jobCards: {
            where: { status: { in: ['PENDING', 'IN_PROGRESS'] } }
          }
        }
      }
    }
  });

  if (!certificate) {
    return res.status(404).json({
      error: 'Fitness certificate not found',
      code: 'CERTIFICATE_NOT_FOUND'
    });
  }

  res.json({
    success: true,
    data: { certificate }
  });
}));

// Create new fitness certificate
router.post('/', 
  requirePermission('fitness:write'),
  [
    body('trainsetId').notEmpty().withMessage('Trainset ID is required'),
    body('certificateNumber').notEmpty().withMessage('Certificate number is required'),
    body('issueDate').isISO8601().withMessage('Valid issue date is required'),
    body('expiryDate').isISO8601().withMessage('Valid expiry date is required'),
    body('issuingAuthority').notEmpty().withMessage('Issuing authority is required'),
    body('status').isIn(['VALID', 'EXPIRED', 'PENDING', 'INVALID', 'UNDER_REVIEW'])
      .withMessage('Valid status is required')
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
      trainsetId,
      certificateNumber,
      issueDate,
      expiryDate,
      status,
      issuingAuthority,
      remarks,
      documents,
      iotData
    } = req.body;

    // Check if certificate number already exists
    const existingCertificate = await prisma.fitnessCertificate.findUnique({
      where: { certificateNumber }
    });

    if (existingCertificate) {
      return res.status(400).json({
        error: 'Certificate number already exists',
        code: 'DUPLICATE_CERTIFICATE'
      });
    }

    // Verify trainset exists
    const trainset = await prisma.trainset.findUnique({
      where: { id: trainsetId }
    });

    if (!trainset) {
      return res.status(400).json({
        error: 'Trainset not found',
        code: 'TRAINSET_NOT_FOUND'
      });
    }

    const certificate = await prisma.fitnessCertificate.create({
      data: {
        trainsetId,
        certificateNumber,
        issueDate: new Date(issueDate),
        expiryDate: new Date(expiryDate),
        status,
        issuingAuthority,
        remarks,
        documents: documents || [],
        iotData,
        lastChecked: new Date()
      },
      include: {
        trainset: {
          select: {
            trainsetNumber: true,
            manufacturer: true,
            model: true
          }
        }
      }
    });

    // Emit real-time update
    if (io) {
      emitFitnessUpdate(io, certificate, req.user);
    }

    res.status(201).json({
      success: true,
      data: { certificate }
    });
  })
);

// Update fitness certificate
router.put('/:id',
  requirePermission('fitness:write'),
  catchAsync(async (req, res) => {
    const { id } = req.params;
    const updateData = { ...req.body };

    // Convert date strings to Date objects
    if (updateData.issueDate) updateData.issueDate = new Date(updateData.issueDate);
    if (updateData.expiryDate) updateData.expiryDate = new Date(updateData.expiryDate);
    
    updateData.lastChecked = new Date();

    const certificate = await prisma.fitnessCertificate.update({
      where: { id },
      data: updateData,
      include: {
        trainset: {
          select: {
            trainsetNumber: true,
            manufacturer: true,
            model: true
          }
        }
      }
    });

    // Emit real-time update
    if (io) {
      emitFitnessUpdate(io, certificate, req.user);
    }

    res.json({
      success: true,
      data: { certificate }
    });
  })
);

// Delete fitness certificate
router.delete('/:id', requirePermission('fitness:delete'), catchAsync(async (req, res) => {
  const { id } = req.params;

  await prisma.fitnessCertificate.delete({
    where: { id }
  });

  res.json({
    success: true,
    message: 'Fitness certificate deleted successfully'
  });
}));

// Get fitness dashboard stats
router.get('/stats/dashboard', requirePermission('fitness:read'), catchAsync(async (req, res) => {
  const today = new Date();
  const in7Days = new Date(today);
  in7Days.setDate(today.getDate() + 7);
  const in30Days = new Date(today);
  in30Days.setDate(today.getDate() + 30);

  const [
    totalCertificates,
    validCertificates,
    expiredCertificates,
    expiringIn7Days,
    expiringIn30Days,
    pendingCertificates,
    statusCounts,
    recentCertificates
  ] = await Promise.all([
    prisma.fitnessCertificate.count(),
    prisma.fitnessCertificate.count({ where: { status: 'VALID' } }),
    prisma.fitnessCertificate.count({ where: { status: 'EXPIRED' } }),
    prisma.fitnessCertificate.count({
      where: {
        status: 'VALID',
        expiryDate: { lte: in7Days, gte: today }
      }
    }),
    prisma.fitnessCertificate.count({
      where: {
        status: 'VALID',
        expiryDate: { lte: in30Days, gte: today }
      }
    }),
    prisma.fitnessCertificate.count({ where: { status: 'PENDING' } }),
    prisma.fitnessCertificate.groupBy({
      by: ['status'],
      _count: true
    }),
    prisma.fitnessCertificate.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        trainset: {
          select: {
            trainsetNumber: true,
            manufacturer: true
          }
        }
      }
    })
  ]);

  res.json({
    success: true,
    data: {
      summary: {
        total: totalCertificates,
        valid: validCertificates,
        expired: expiredCertificates,
        pending: pendingCertificates,
        expiringIn7Days,
        expiringIn30Days
      },
      statusCounts,
      recentCertificates,
      timestamp: new Date()
    }
  });
}));

// Get certificates expiring soon
router.get('/expiring/soon', requirePermission('fitness:read'), catchAsync(async (req, res) => {
  const { days = 30 } = req.query;
  const daysAhead = Number(days);
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + daysAhead);

  const expiringCertificates = await prisma.fitnessCertificate.findMany({
    where: {
      status: 'VALID',
      expiryDate: {
        lte: futureDate,
        gte: new Date()
      }
    },
    include: {
      trainset: {
        select: {
          trainsetNumber: true,
          manufacturer: true,
          model: true,
          status: true
        }
      }
    },
    orderBy: { expiryDate: 'asc' }
  });

  res.json({
    success: true,
    data: {
      certificates: expiringCertificates,
      count: expiringCertificates.length,
      daysAhead
    }
  });
}));

// Bulk update certificates status
router.post('/bulk/status', 
  requirePermission('fitness:write'),
  [
    body('certificateIds').isArray().withMessage('Certificate IDs array is required'),
    body('status').isIn(['VALID', 'EXPIRED', 'PENDING', 'INVALID', 'UNDER_REVIEW'])
      .withMessage('Valid status is required')
  ],
  catchAsync(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { certificateIds, status, remarks } = req.body;

    const updatedCertificates = await prisma.$transaction(
      certificateIds.map((id: string) =>
        prisma.fitnessCertificate.update({
          where: { id },
          data: { 
            status, 
            remarks: remarks || undefined,
            lastChecked: new Date()
          },
          include: {
            trainset: {
              select: {
                trainsetNumber: true,
                manufacturer: true,
                model: true
              }
            }
          }
        })
      )
    );

    // Emit real-time updates
    if (io) {
      updatedCertificates.forEach(certificate => {
        emitFitnessUpdate(io, certificate, req.user);
      });
    }

    res.json({
      success: true,
      message: `${updatedCertificates.length} certificates updated successfully`,
      data: { updatedCertificates }
    });
  })
);

export default router;
