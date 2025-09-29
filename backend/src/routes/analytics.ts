import express from 'express';
import { prisma } from '../utils/database';
import { catchAsync } from '../middleware/errorHandler';
import { requirePermission } from '../middleware/auth';

const router = express.Router();

// Get comprehensive dashboard metrics
router.get('/dashboard', requirePermission('analytics:read'), catchAsync(async (req, res) => {
  const today = new Date();
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const startOfWeek = new Date(today.setDate(today.getDate() - today.getDay()));

  const [
    // Trainset metrics
    totalTrainsets,
    trainsetStatusCounts,
    trainsetAvailabilityRate,
    
    // Fitness metrics
    totalFitnessCertificates,
    validFitnessCertificates,
    expiredFitnessCertificates,
    expiringInWeek,
    
    // Job card metrics
    totalJobCards,
    activeJobCards,
    completedThisMonth,
    overdueJobCards,
    averageCompletionTime,
    
    // Schedule metrics
    totalSchedules,
    optimizationResults,
    averageOptimizationScore,
    
    // Maintenance metrics
    maintenanceThisMonth,
    preventiveMaintenance,
    emergencyMaintenance
  ] = await Promise.all([
    // Trainset queries
    prisma.trainset.count(),
    prisma.trainset.groupBy({
      by: ['status'],
      _count: true
    }),
    prisma.trainset.count({ where: { status: 'AVAILABLE' } }),
    
    // Fitness queries
    prisma.fitnessCertificate.count(),
    prisma.fitnessCertificate.count({ where: { status: 'VALID' } }),
    prisma.fitnessCertificate.count({ where: { status: 'EXPIRED' } }),
    prisma.fitnessCertificate.count({
      where: {
        status: 'VALID',
        expiryDate: {
          lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          gte: new Date()
        }
      }
    }),
    
    // Job card queries
    prisma.jobCard.count(),
    prisma.jobCard.count({ where: { status: { in: ['PENDING', 'IN_PROGRESS'] } } }),
    prisma.jobCard.count({
      where: {
        status: 'COMPLETED',
        completedDate: { gte: startOfMonth }
      }
    }),
    prisma.jobCard.count({
      where: {
        scheduledDate: { lte: new Date() },
        status: { in: ['PENDING', 'IN_PROGRESS'] }
      }
    }),
    prisma.jobCard.aggregate({
      where: {
        status: 'COMPLETED',
        actualHours: { not: null }
      },
      _avg: { actualHours: true }
    }),
    
    // Schedule queries
    prisma.schedule.count(),
    prisma.optimizationResult.count(),
    prisma.optimizationResult.aggregate({ _avg: { score: true } }),
    
    // Maintenance queries
    prisma.maintenanceRecord.count({
      where: { performedAt: { gte: startOfMonth } }
    }),
    prisma.maintenanceRecord.count({
      where: {
        type: 'PREVENTIVE',
        performedAt: { gte: startOfMonth }
      }
    }),
    prisma.maintenanceRecord.count({
      where: {
        type: 'EMERGENCY',
        performedAt: { gte: startOfMonth }
      }
    })
  ]);

  res.json({
    success: true,
    data: {
      trainsets: {
        total: totalTrainsets,
        statusBreakdown: trainsetStatusCounts,
        availabilityRate: totalTrainsets > 0 ? (trainsetAvailabilityRate / totalTrainsets * 100).toFixed(1) : '0'
      },
      fitness: {
        total: totalFitnessCertificates,
        valid: validFitnessCertificates,
        expired: expiredFitnessCertificates,
        expiringThisWeek: expiringInWeek,
        complianceRate: totalFitnessCertificates > 0 ? (validFitnessCertificates / totalFitnessCertificates * 100).toFixed(1) : '0'
      },
      jobCards: {
        total: totalJobCards,
        active: activeJobCards,
        completedThisMonth,
        overdue: overdueJobCards,
        averageCompletionTime: averageCompletionTime._avg.actualHours || 0
      },
      schedules: {
        total: totalSchedules,
        optimizationRuns: optimizationResults,
        averageOptimizationScore: averageOptimizationScore._avg.score || 0
      },
      maintenance: {
        thisMonth: maintenanceThisMonth,
        preventive: preventiveMaintenance,
        emergency: emergencyMaintenance,
        preventiveRatio: maintenanceThisMonth > 0 ? (preventiveMaintenance / maintenanceThisMonth * 100).toFixed(1) : '0'
      },
      timestamp: new Date()
    }
  });
}));

// Get performance metrics
router.get('/performance', requirePermission('analytics:read'), catchAsync(async (req, res) => {
  const { period = '30' } = req.query; // days
  const daysBack = Number(period);
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - daysBack);

  const [
    totalTrainsets,
    availableTrainsets,
    inMaintenanceTrainsets,
    optimizationResults,
    schedulePerformance,
    maintenanceEfficiency,
    utilizationRate
  ] = await Promise.all([
    prisma.trainset.count(),
    prisma.trainset.count({ where: { status: 'AVAILABLE' } }),
    prisma.trainset.count({ where: { status: 'MAINTENANCE' } }),
    prisma.optimizationResult.findMany({
      where: { createdAt: { gte: startDate } },
      orderBy: { createdAt: 'desc' },
      take: 10
    }),
    prisma.schedule.findMany({
      where: { createdAt: { gte: startDate } },
      select: {
        optimizationScore: true,
        createdAt: true,
        metadata: true
      }
    }),
    prisma.jobCard.aggregate({
      where: {
        completedDate: { gte: startDate },
        status: 'COMPLETED'
      },
      _avg: { actualHours: true },
      _count: true
    }),
    prisma.mileageRecord.aggregate({
      where: { date: { gte: startDate } },
      _sum: { distance: true }
    })
  ]);

  res.json({ 
    success: true, 
    data: { 
      summary: {
        totalTrainsets,
        availableTrainsets,
        inMaintenanceTrainsets,
        availabilityRate: totalTrainsets > 0 ? (availableTrainsets / totalTrainsets * 100).toFixed(1) : '0'
      },
      optimization: {
        results: optimizationResults,
        averageScore: optimizationResults.length > 0 ? 
          (optimizationResults.reduce((sum, r) => sum + r.score, 0) / optimizationResults.length).toFixed(2) : '0'
      },
      schedules: schedulePerformance,
      maintenance: {
        efficiency: maintenanceEfficiency,
        averageHours: maintenanceEfficiency._avg.actualHours || 0,
        completedJobs: maintenanceEfficiency._count
      },
      utilization: {
        totalDistance: utilizationRate._sum.distance || 0,
        averagePerTrainset: totalTrainsets > 0 ? (utilizationRate._sum.distance || 0) / totalTrainsets : 0
      },
      period: daysBack,
      timestamp: new Date()
    } 
  });
}));

// Get optimization analytics
router.get('/optimization', requirePermission('analytics:read'), catchAsync(async (req, res) => {
  const { limit = 20 } = req.query;
  
  const [
    recentOptimizations,
    optimizationTrends,
    algorithmPerformance,
    implementationRate
  ] = await Promise.all([
    prisma.optimizationResult.findMany({
      take: Number(limit),
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        algorithm: true,
        score: true,
        executionTime: true,
        isImplemented: true,
        createdAt: true
      }
    }),
    prisma.optimizationResult.groupBy({
      by: ['algorithm', 'createdAt'],
      _avg: { score: true },
      _count: true,
      orderBy: { createdAt: 'desc' },
      take: 30
    }),
    prisma.optimizationResult.groupBy({
      by: ['algorithm'],
      _avg: { score: true, executionTime: true },
      _count: true
    }),
    prisma.optimizationResult.aggregate({
      where: { isImplemented: true },
      _count: true
    })
  ]);

  const totalOptimizations = await prisma.optimizationResult.count();

  res.json({
    success: true,
    data: {
      recent: recentOptimizations,
      trends: optimizationTrends,
      algorithms: algorithmPerformance,
      implementation: {
        implemented: implementationRate._count,
        total: totalOptimizations,
        rate: totalOptimizations > 0 ? (implementationRate._count / totalOptimizations * 100).toFixed(1) : '0'
      }
    }
  });
}));

// Get maintenance analytics
router.get('/maintenance', requirePermission('analytics:read'), catchAsync(async (req, res) => {
  const { period = '90' } = req.query;
  const daysBack = Number(period);
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - daysBack);

  const [
    maintenanceByType,
    maintenanceByTrainset,
    maintenanceCosts,
    maintenanceTrends,
    upcomingMaintenance,
    mtbfData
  ] = await Promise.all([
    prisma.maintenanceRecord.groupBy({
      by: ['type'],
      _count: true,
      _sum: { cost: true },
      where: { performedAt: { gte: startDate } }
    }),
    prisma.maintenanceRecord.groupBy({
      by: ['trainsetId'],
      _count: true,
      _sum: { cost: true },
      where: { performedAt: { gte: startDate } },
      orderBy: { _count: { trainsetId: 'desc' } },
      take: 10
    }),
    prisma.maintenanceRecord.aggregate({
      where: { performedAt: { gte: startDate } },
      _sum: { cost: true },
      _avg: { cost: true },
      _count: true
    }),
    prisma.$queryRaw`
      SELECT DATE_TRUNC('week', "performedAt") as week,
             COUNT(*) as count,
             SUM(cost) as total_cost
      FROM "maintenance_records"
      WHERE "performedAt" >= ${startDate}
      GROUP BY DATE_TRUNC('week', "performedAt")
      ORDER BY week DESC
      LIMIT 12
    `,
    prisma.maintenanceRecord.findMany({
      where: {
        nextDueDate: {
          gte: new Date(),
          lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // Next 30 days
        }
      },
      include: {
        trainset: {
          select: {
            trainsetNumber: true,
            manufacturer: true,
            model: true
          }
        }
      },
      orderBy: { nextDueDate: 'asc' },
      take: 10
    }),
    prisma.$queryRaw`
      SELECT t."trainsetNumber",
             COUNT(mr.id) as maintenance_count,
             AVG(EXTRACT(EPOCH FROM (mr."performedAt" - LAG(mr."performedAt") OVER (PARTITION BY t.id ORDER BY mr."performedAt")))) / 86400 as avg_days_between
      FROM trainsets t
      JOIN "maintenance_records" mr ON t.id = mr."trainsetId"
      WHERE mr."performedAt" >= ${startDate}
      GROUP BY t.id, t."trainsetNumber"
      HAVING COUNT(mr.id) > 1
      ORDER BY avg_days_between DESC
    `
  ]);

  res.json({
    success: true,
    data: {
      summary: {
        totalMaintenance: maintenanceCosts._count,
        totalCost: maintenanceCosts._sum.cost || 0,
        averageCost: maintenanceCosts._avg.cost || 0
      },
      byType: maintenanceByType,
      byTrainset: maintenanceByTrainset,
      trends: maintenanceTrends,
      upcoming: upcomingMaintenance,
      reliability: mtbfData,
      period: daysBack
    }
  });
}));

// Get utilization analytics
router.get('/utilization', requirePermission('analytics:read'), catchAsync(async (req, res) => {
  const { period = '30' } = req.query;
  const daysBack = Number(period);
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - daysBack);

  const [
    mileageByTrainset,
    dailyMileage,
    utilizationTrends,
    brandingExposure
  ] = await Promise.all([
    prisma.mileageRecord.groupBy({
      by: ['trainsetId'],
      _sum: { distance: true },
      _count: true,
      where: { date: { gte: startDate } },
      orderBy: { _sum: { distance: 'desc' } },
      take: 10
    }),
    prisma.$queryRaw`
      SELECT DATE_TRUNC('day', date) as day,
             SUM(distance) as total_distance,
             COUNT(DISTINCT "trainsetId") as active_trainsets
      FROM "mileage_records"
      WHERE date >= ${startDate}
      GROUP BY DATE_TRUNC('day', date)
      ORDER BY day DESC
    `,
    prisma.trainset.findMany({
      select: {
        id: true,
        trainsetNumber: true,
        status: true,
        mileageRecords: {
          where: { date: { gte: startDate } },
          select: { distance: true, date: true }
        }
      }
    }),
    prisma.brandingRecord.groupBy({
      by: ['trainsetId'],
      _sum: { actualExposure: true },
      _avg: { actualExposure: true },
      where: {
        startDate: { lte: new Date() },
        endDate: { gte: startDate },
        status: 'ACTIVE'
      }
    })
  ]);

  res.json({
    success: true,
    data: {
      mileage: {
        byTrainset: mileageByTrainset,
        daily: dailyMileage,
        totalDistance: mileageByTrainset.reduce((sum, record) => sum + (record._sum.distance || 0), 0)
      },
      utilization: utilizationTrends,
      branding: brandingExposure,
      period: daysBack
    }
  });
}));

// Get financial analytics
router.get('/financial', requirePermission('analytics:read'), catchAsync(async (req, res) => {
  const { period = '90' } = req.query;
  const daysBack = Number(period);
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - daysBack);

  const [
    maintenanceCosts,
    brandingRevenue,
    costTrends,
    revenueTrends,
    costByTrainset
  ] = await Promise.all([
    prisma.maintenanceRecord.aggregate({
      where: {
        performedAt: { gte: startDate },
        cost: { not: null }
      },
      _sum: { cost: true },
      _avg: { cost: true },
      _count: true
    }),
    prisma.brandingRecord.aggregate({
      where: {
        startDate: { gte: startDate },
        revenue: { not: null }
      },
      _sum: { revenue: true },
      _avg: { revenue: true },
      _count: true
    }),
    prisma.$queryRaw`
      SELECT DATE_TRUNC('week', "performedAt") as week,
             SUM(cost) as total_cost,
             COUNT(*) as maintenance_count
      FROM "maintenance_records"
      WHERE "performedAt" >= ${startDate} AND cost IS NOT NULL
      GROUP BY DATE_TRUNC('week', "performedAt")
      ORDER BY week DESC
    `,
    prisma.$queryRaw`
      SELECT DATE_TRUNC('week', "startDate") as week,
             SUM(revenue) as total_revenue,
             COUNT(*) as campaign_count
      FROM "branding_records"
      WHERE "startDate" >= ${startDate} AND revenue IS NOT NULL
      GROUP BY DATE_TRUNC('week', "startDate")
      ORDER BY week DESC
    `,
    prisma.maintenanceRecord.groupBy({
      by: ['trainsetId'],
      _sum: { cost: true },
      _avg: { cost: true },
      _count: true,
      where: {
        performedAt: { gte: startDate },
        cost: { not: null }
      },
      orderBy: { _sum: { cost: 'desc' } },
      take: 10
    })
  ]);

  const netProfit = (brandingRevenue._sum.revenue || 0) - (maintenanceCosts._sum.cost || 0);
  const profitMargin = brandingRevenue._sum.revenue ? 
    (netProfit / brandingRevenue._sum.revenue * 100).toFixed(1) : '0';

  res.json({
    success: true,
    data: {
      summary: {
        totalMaintenanceCost: maintenanceCosts._sum.cost || 0,
        totalBrandingRevenue: brandingRevenue._sum.revenue || 0,
        netProfit,
        profitMargin
      },
      maintenance: {
        totalCost: maintenanceCosts._sum.cost || 0,
        averageCost: maintenanceCosts._avg.cost || 0,
        recordCount: maintenanceCosts._count
      },
      branding: {
        totalRevenue: brandingRevenue._sum.revenue || 0,
        averageRevenue: brandingRevenue._avg.revenue || 0,
        campaignCount: brandingRevenue._count
      },
      trends: {
        costs: costTrends,
        revenue: revenueTrends
      },
      costByTrainset,
      period: daysBack
    }
  });
}));

// Generate custom report
router.post('/reports/custom', requirePermission('analytics:read'), catchAsync(async (req, res) => {
  const {
    startDate,
    endDate,
    metrics = [],
    filters = {},
    groupBy = 'day'
  } = req.body;

  if (!startDate || !endDate) {
    return res.status(400).json({
      error: 'Start date and end date are required',
      code: 'MISSING_DATE_RANGE'
    });
  }

  const start = new Date(startDate);
  const end = new Date(endDate);

  const reportData: any = {
    period: { start, end },
    filters,
    generatedAt: new Date()
  };

  // Build dynamic queries based on requested metrics
  if (metrics.includes('trainsets')) {
    reportData.trainsets = await prisma.trainset.groupBy({
      by: ['status'],
      _count: true,
      where: filters.trainset || {}
    });
  }

  if (metrics.includes('maintenance')) {
    reportData.maintenance = await prisma.maintenanceRecord.findMany({
      where: {
        performedAt: { gte: start, lte: end },
        ...filters.maintenance
      },
      include: {
        trainset: {
          select: {
            trainsetNumber: true,
            manufacturer: true
          }
        }
      }
    });
  }

  if (metrics.includes('jobCards')) {
    reportData.jobCards = await prisma.jobCard.findMany({
      where: {
        createdAt: { gte: start, lte: end },
        ...filters.jobCards
      },
      include: {
        trainset: {
          select: {
            trainsetNumber: true,
            manufacturer: true
          }
        }
      }
    });
  }

  if (metrics.includes('fitness')) {
    reportData.fitness = await prisma.fitnessCertificate.findMany({
      where: {
        createdAt: { gte: start, lte: end },
        ...filters.fitness
      },
      include: {
        trainset: {
          select: {
            trainsetNumber: true,
            manufacturer: true
          }
        }
      }
    });
  }

  res.json({
    success: true,
    data: reportData
  });
}));

export default router;
