import express from 'express';
import { prisma } from '../utils/database';
import { catchAsync } from '../middleware/errorHandler';
import { requirePermission } from '../middleware/auth';
import { body, validationResult } from 'express-validator';
import { io } from '../server';
import { emitJobCardUpdate } from '../services/socketService';
import axios from 'axios';

const router = express.Router();

// Get all job cards
router.get('/', requirePermission('jobcard:read'), catchAsync(async (req, res) => {
  const {
    page = 1,
    limit = 25,
    status,
    priority,
    trainsetId,
    search,
    workType,
    assignedTo,
    overdue
  } = req.query;

  const skip = (Number(page) - 1) * Number(limit);
  const where: any = {};

  if (status) where.status = status;
  if (priority) where.priority = priority;
  if (trainsetId) where.trainsetId = trainsetId;
  if (workType) where.workType = { contains: workType as string, mode: 'insensitive' };
  if (assignedTo) where.assignedTo = { contains: assignedTo as string, mode: 'insensitive' };
  if (search) {
    where.OR = [
      { jobCardNumber: { contains: search as string, mode: 'insensitive' } },
      { description: { contains: search as string, mode: 'insensitive' } },
      { workType: { contains: search as string, mode: 'insensitive' } },
      { trainset: { trainsetNumber: { contains: search as string, mode: 'insensitive' } } }
    ];
  }

  if (overdue === 'true') {
    where.scheduledDate = { lte: new Date() };
    where.status = { in: ['PENDING', 'IN_PROGRESS'] };
  }

  const [jobCards, total] = await Promise.all([
    prisma.jobCard.findMany({
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
      orderBy: [
        { priority: 'desc' },
        { scheduledDate: 'asc' }
      ]
    }),
    prisma.jobCard.count({ where })
  ]);

  res.json({
    success: true,
    data: {
      jobCards,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    }
  });
}));

// Get job card by ID
router.get('/:id', requirePermission('jobcard:read'), catchAsync(async (req, res) => {
  const { id } = req.params;

  const jobCard = await prisma.jobCard.findUnique({
    where: { id },
    include: {
      trainset: {
        include: {
          fitnessRecords: {
            where: { status: 'VALID' },
            orderBy: { expiryDate: 'desc' },
            take: 1
          },
          maintenanceRecords: {
            orderBy: { performedAt: 'desc' },
            take: 5
          }
        }
      }
    }
  });

  if (!jobCard) {
    return res.status(404).json({
      error: 'Job card not found',
      code: 'JOBCARD_NOT_FOUND'
    });
  }

  res.json({
    success: true,
    data: { jobCard }
  });
}));

// Create new job card
router.post('/', 
  requirePermission('jobcard:write'),
  [
    body('trainsetId').notEmpty().withMessage('Trainset ID is required'),
    body('jobCardNumber').notEmpty().withMessage('Job card number is required'),
    body('priority').isIn(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL', 'EMERGENCY'])
      .withMessage('Valid priority is required'),
    body('workType').notEmpty().withMessage('Work type is required'),
    body('description').notEmpty().withMessage('Description is required')
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
      jobCardNumber,
      maximoId,
      priority,
      status = 'PENDING',
      workType,
      description,
      estimatedHours,
      assignedTo,
      scheduledDate,
      notes,
      externalData
    } = req.body;

    // Check if job card number already exists
    const existingJobCard = await prisma.jobCard.findUnique({
      where: { jobCardNumber }
    });

    if (existingJobCard) {
      return res.status(400).json({
        error: 'Job card number already exists',
        code: 'DUPLICATE_JOBCARD'
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

    const jobCard = await prisma.jobCard.create({
      data: {
        trainsetId,
        jobCardNumber,
        maximoId,
        priority,
        status,
        workType,
        description,
        estimatedHours: estimatedHours ? Number(estimatedHours) : undefined,
        assignedTo,
        scheduledDate: scheduledDate ? new Date(scheduledDate) : undefined,
        notes,
        externalData
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
      emitJobCardUpdate(io, jobCard, req.user);
    }

    res.status(201).json({
      success: true,
      data: { jobCard }
    });
  })
);

// Update job card
router.put('/:id',
  requirePermission('jobcard:write'),
  catchAsync(async (req, res) => {
    const { id } = req.params;
    const updateData = { ...req.body };

    // Convert date strings to Date objects
    if (updateData.scheduledDate) updateData.scheduledDate = new Date(updateData.scheduledDate);
    if (updateData.completedDate) updateData.completedDate = new Date(updateData.completedDate);
    
    // Convert numeric fields
    if (updateData.estimatedHours) updateData.estimatedHours = Number(updateData.estimatedHours);
    if (updateData.actualHours) updateData.actualHours = Number(updateData.actualHours);

    const jobCard = await prisma.jobCard.update({
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
      emitJobCardUpdate(io, jobCard, req.user);
    }

    res.json({
      success: true,
      data: { jobCard }
    });
  })
);

// Complete job card
router.patch('/:id/complete',
  requirePermission('jobcard:write'),
  [
    body('actualHours').isNumeric().withMessage('Actual hours must be a number')
  ],
  catchAsync(async (req, res) => {
    const { id } = req.params;
    const { actualHours, notes, completionNotes } = req.body;

    const jobCard = await prisma.jobCard.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        actualHours: Number(actualHours),
        completedDate: new Date(),
        notes: completionNotes || notes
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
      emitJobCardUpdate(io, jobCard, req.user);
    }

    res.json({
      success: true,
      message: 'Job card completed successfully',
      data: { jobCard }
    });
  })
);

// Delete job card
router.delete('/:id', requirePermission('jobcard:delete'), catchAsync(async (req, res) => {
  const { id } = req.params;

  await prisma.jobCard.delete({
    where: { id }
  });

  res.json({
    success: true,
    message: 'Job card deleted successfully'
  });
}));

// Get job cards dashboard stats
router.get('/stats/dashboard', requirePermission('jobcard:read'), catchAsync(async (req, res) => {
  const today = new Date();

  const [
    totalJobCards,
    pendingJobCards,
    inProgressJobCards,
    completedJobCards,
    overdueJobCards,
    criticalJobCards,
    statusCounts,
    priorityCounts,
    recentJobCards,
    upcomingJobCards
  ] = await Promise.all([
    prisma.jobCard.count(),
    prisma.jobCard.count({ where: { status: 'PENDING' } }),
    prisma.jobCard.count({ where: { status: 'IN_PROGRESS' } }),
    prisma.jobCard.count({ where: { status: 'COMPLETED' } }),
    prisma.jobCard.count({
      where: {
        scheduledDate: { lte: today },
        status: { in: ['PENDING', 'IN_PROGRESS'] }
      }
    }),
    prisma.jobCard.count({
      where: {
        priority: { in: ['CRITICAL', 'EMERGENCY'] },
        status: { in: ['PENDING', 'IN_PROGRESS'] }
      }
    }),
    prisma.jobCard.groupBy({
      by: ['status'],
      _count: true
    }),
    prisma.jobCard.groupBy({
      by: ['priority'],
      _count: true
    }),
    prisma.jobCard.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        trainset: {
          select: {
            trainsetNumber: true,
            manufacturer: true
          }
        }
      }
    }),
    prisma.jobCard.findMany({
      where: {
        scheduledDate: { gte: today },
        status: { in: ['PENDING', 'IN_PROGRESS'] }
      },
      take: 10,
      orderBy: { scheduledDate: 'asc' },
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
        total: totalJobCards,
        pending: pendingJobCards,
        inProgress: inProgressJobCards,
        completed: completedJobCards,
        overdue: overdueJobCards,
        critical: criticalJobCards
      },
      statusCounts,
      priorityCounts,
      recentJobCards,
      upcomingJobCards,
      timestamp: new Date()
    }
  });
}));

// Get overdue job cards
router.get('/overdue/list', requirePermission('jobcard:read'), catchAsync(async (req, res) => {
  const today = new Date();

  const overdueJobCards = await prisma.jobCard.findMany({
    where: {
      scheduledDate: { lte: today },
      status: { in: ['PENDING', 'IN_PROGRESS'] }
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
    orderBy: { scheduledDate: 'asc' }
  });

  res.json({
    success: true,
    data: {
      jobCards: overdueJobCards,
      count: overdueJobCards.length
    }
  });
}));

// Bulk update job cards status
router.post('/bulk/status', 
  requirePermission('jobcard:write'),
  [
    body('jobCardIds').isArray().withMessage('Job card IDs array is required'),
    body('status').isIn(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'ON_HOLD'])
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

    const { jobCardIds, status, notes } = req.body;

    const updateData: any = { status };
    if (notes) updateData.notes = notes;
    if (status === 'COMPLETED') {
      updateData.completedDate = new Date();
    }

    const updatedJobCards = await prisma.$transaction(
      jobCardIds.map((id: string) =>
        prisma.jobCard.update({
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
        })
      )
    );

    // Emit real-time updates
    if (io) {
      updatedJobCards.forEach(jobCard => {
        emitJobCardUpdate(io, jobCard, req.user);
      });
    }

    res.json({
      success: true,
      message: `${updatedJobCards.length} job cards updated successfully`,
      data: { updatedJobCards }
    });
  })
);

// Sync with Maximo
router.post('/sync/maximo', requirePermission('jobcard:write'), catchAsync(async (req, res) => {
  try {
    // In a real implementation, this would connect to IBM Maximo
    const maximoUrl = process.env.MAXIMO_API_URL;
    const maximoToken = process.env.MAXIMO_API_TOKEN;

    if (!maximoUrl || !maximoToken) {
      return res.status(500).json({
        error: 'Maximo configuration not found',
        code: 'MAXIMO_CONFIG_MISSING'
      });
    }

    // Simulate Maximo sync
    const mockMaximoData = [
      {
        wonum: 'WO001',
        assetnum: 'TR001',
        worktype: 'MAINT',
        description: 'Brake system inspection',
        priority: 'HIGH',
        status: 'PENDING',
        schedstart: new Date(),
        estdur: 4
      }
    ];

    let syncedCount = 0;
    const syncErrors: string[] = [];

    for (const maximoJob of mockMaximoData) {
      try {
        // Find corresponding trainset
        const trainset = await prisma.trainset.findFirst({
          where: { trainsetNumber: maximoJob.assetnum }
        });

        if (trainset) {
          // Find existing job card by maximoId
          const existingJobCard = await prisma.jobCard.findFirst({
            where: { maximoId: maximoJob.wonum }
          });

          if (existingJobCard) {
            await prisma.jobCard.update({
              where: { id: existingJobCard.id },
              data: {
                status: maximoJob.status as any,
                priority: maximoJob.priority as any,
                description: maximoJob.description,
                estimatedHours: maximoJob.estdur,
                scheduledDate: maximoJob.schedstart,
                externalData: maximoJob
              }
            });
          } else {
            await prisma.jobCard.create({
              data: {
                trainsetId: trainset.id,
                jobCardNumber: `JC-${maximoJob.wonum}`,
                maximoId: maximoJob.wonum,
                priority: maximoJob.priority as any,
                status: maximoJob.status as any,
                workType: maximoJob.worktype,
                description: maximoJob.description,
                estimatedHours: maximoJob.estdur,
                scheduledDate: maximoJob.schedstart,
                externalData: maximoJob
              }
            });
          }
          syncedCount++;
        } else {
          syncErrors.push(`Trainset not found for asset: ${maximoJob.assetnum}`);
        }
      } catch (error) {
        syncErrors.push(`Error syncing job ${maximoJob.wonum}: ${(error as Error).message}`);
      }
    }

    res.json({ 
      success: true, 
      message: 'Maximo sync completed',
      data: { 
        syncedCount, 
        errors: syncErrors,
        timestamp: new Date() 
      }
    });
  } catch (error) {
    res.status(500).json({
      error: 'Maximo sync failed',
      message: (error as Error).message
    });
  }
}));

export default router;
