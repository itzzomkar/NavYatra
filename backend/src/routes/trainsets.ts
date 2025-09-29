import express from 'express';
import { prisma } from '../utils/database';
import { catchAsync } from '../middleware/errorHandler';
import { requirePermission } from '../middleware/auth';

const router = express.Router();

// Get all trainsets
router.get('/', requirePermission('trainset:read'), catchAsync(async (req, res) => {
  const {
    page = 1,
    limit = 25,
    status,
    depot,
    search
  } = req.query;

  const skip = (Number(page) - 1) * Number(limit);
  
  const where: any = {};
  
  if (status) where.status = status;
  if (depot) where.depot = depot;
  if (search) {
    where.OR = [
      { trainsetNumber: { contains: search as string, mode: 'insensitive' } },
      { manufacturer: { contains: search as string, mode: 'insensitive' } },
      { model: { contains: search as string, mode: 'insensitive' } }
    ];
  }

  const [trainsets, total] = await Promise.all([
    prisma.trainset.findMany({
      where,
      skip,
      take: Number(limit),
      include: {
        fitnessRecords: {
          where: { status: 'VALID' },
          orderBy: { expiryDate: 'desc' },
          take: 1
        },
        jobCards: {
          where: { status: { in: ['PENDING', 'IN_PROGRESS'] } },
          take: 5
        }
      },
      orderBy: { trainsetNumber: 'asc' }
    }),
    prisma.trainset.count({ where })
  ]);

  res.json({
    success: true,
    data: {
      trainsets,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    }
  });
}));

// Get trainset by ID
router.get('/:id', requirePermission('trainset:read'), catchAsync(async (req, res) => {
  const { id } = req.params;

  const trainset = await prisma.trainset.findUnique({
    where: { id },
    include: {
      fitnessRecords: {
        orderBy: { createdAt: 'desc' }
      },
      jobCards: {
        orderBy: { createdAt: 'desc' }
      }
    }
  });

  if (!trainset) {
    return res.status(404).json({
      error: 'Trainset not found',
      code: 'TRAINSET_NOT_FOUND'
    });
  }

  res.json({
    success: true,
    data: { trainset }
  });
}));

// Create new trainset
router.post('/', requirePermission('trainset:write'), catchAsync(async (req, res) => {
  const {
    trainsetNumber,
    manufacturer,
    model,
    yearOfManufacture,
    capacity,
    maxSpeed,
    depot
  } = req.body;

  const trainset = await prisma.trainset.create({
    data: {
      trainsetNumber,
      manufacturer,
      model,
      yearOfManufacture,
      capacity,
      maxSpeed,
      depot,
      currentMileage: 0,
      totalMileage: 0,
      status: 'AVAILABLE'
    }
  });

  res.status(201).json({
    success: true,
    data: { trainset }
  });
}));

// Update trainset
router.put('/:id', requirePermission('trainset:write'), catchAsync(async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;

  const trainset = await prisma.trainset.update({
    where: { id },
    data: updateData
  });

  res.json({
    success: true,
    data: { trainset }
  });
}));

// Get trainset dashboard stats
router.get('/stats/dashboard', requirePermission('trainset:read'), catchAsync(async (req, res) => {
  const [statusCounts, totalTrainsets, maintenanceDue] = await Promise.all([
    prisma.trainset.groupBy({
      by: ['status'],
      _count: true
    }),
    prisma.trainset.count(),
    0 // maintenanceRecords not available in simplified schema
  ]);

  res.json({
    success: true,
    data: {
      totalTrainsets,
      statusCounts,
      maintenanceDue,
      timestamp: new Date()
    }
  });
}));

export default router;
