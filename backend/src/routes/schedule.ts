import express from 'express';
import { prisma } from '../utils/database';
import { catchAsync } from '../middleware/errorHandler';
import { requirePermission } from '../middleware/auth';
import { aiService, OptimizationRequest } from '../services/aiService';
import { io } from '../server';
import { emitOptimizationResult } from '../services/socketService';
import { logger } from '../utils/logger';

const router = express.Router();

// Get all schedules
router.get('/', requirePermission('schedule:read'), catchAsync(async (req, res) => {
  const schedules = await prisma.schedule.findMany({
    include: {
      entries: {
        include: {
          trainset: true
        }
      },
      createdBy: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  res.json({ success: true, data: { schedules } });
}));

// Generate optimized schedule
router.post('/optimize', requirePermission('schedule:optimize'), catchAsync(async (req, res) => {
  const {
    constraints = {},
    parameters = {},
    preferences = {},
    optimizationWindow = 24
  } = req.body;

  logger.info('Schedule optimization requested', {
    userId: req.user?.id,
    constraints,
    parameters
  });

  try {
    // Get current trainsets data
    const trainsets = await prisma.trainset.findMany({
      include: {
        fitnessRecords: {
          where: { status: 'VALID' },
          orderBy: { expiryDate: 'desc' },
          take: 1
        },
        jobCards: {
          where: { status: { in: ['PENDING', 'IN_PROGRESS'] } },
          orderBy: { priority: 'desc' }
        },
        brandingRecords: {
          where: { status: 'ACTIVE' },
          orderBy: { priority: 'desc' }
        },
        maintenanceRecords: {
          orderBy: { performedAt: 'desc' },
          take: 5
        },
        mileageRecords: {
          orderBy: { date: 'desc' },
          take: 30
        }
      }
    });

    // Prepare optimization request
    const optimizationRequest: OptimizationRequest = {
      trainsetsData: trainsets,
      constraints: {
        fitnessRequired: constraints.fitnessRequired ?? true,
        priorityJobCards: constraints.priorityJobCards ?? true,
        mileageBalancing: constraints.mileageBalancing ?? true,
        brandingOptimization: constraints.brandingOptimization ?? true,
        cleaningSlots: constraints.cleaningSlots ?? true,
        stablingConstraints: constraints.stablingConstraints ?? true
      },
      parameters: {
        optimizationWindow: optimizationWindow,
        maxIterations: parameters.maxIterations ?? 1000,
        convergenceThreshold: parameters.convergenceThreshold ?? 0.001
      },
      preferences: {
        preferenceWeights: {
          fitness: preferences.fitnessWeight ?? 0.25,
          jobCards: preferences.jobCardsWeight ?? 0.20,
          mileage: preferences.mileageWeight ?? 0.20,
          branding: preferences.brandingWeight ?? 0.15,
          cleaning: preferences.cleaningWeight ?? 0.10,
          stabling: preferences.stablingWeight ?? 0.10
        },
        penalties: {
          fitnessViolation: preferences.fitnessViolationPenalty ?? 100,
          jobCardDelay: preferences.jobCardDelayPenalty ?? 50,
          mileageImbalance: preferences.mileageImbalancePenalty ?? 30,
          brandingLoss: preferences.brandingLossPenalty ?? 20
        }
      }
    };

    // Start optimization (async)
    const optimizationResult = await aiService.requestOptimization(optimizationRequest);

    // Create schedule record in database
    const schedule = await prisma.schedule.create({
      data: {
        name: `Optimized Schedule - ${new Date().toISOString().split('T')[0]}`,
        startDate: new Date(),
        endDate: new Date(Date.now() + optimizationWindow * 60 * 60 * 1000),
        shift: 'MORNING', // Default shift, could be determined from parameters
        status: 'DRAFT',
        optimizationScore: optimizationResult.optimizationScore,
        constraints: {
          aiServiceId: optimizationResult.id,
          algorithm: optimizationResult.metadata?.algorithm || 'genetic_algorithm',
          requestConstraints: optimizationRequest.constraints,
          parameters: optimizationRequest.parameters,
          preferences: optimizationRequest.preferences
        },
        metadata: {
          totalTrainsets: trainsets.length
        },
        createdById: req.user!.id
      }
    });

    // Create schedule entries for each trainset assignment
    if (optimizationResult.recommendations) {
      await Promise.all(
        optimizationResult.recommendations.map((assignment, index) => {
          // Get trainset fitness status
          const trainset = trainsets.find((t: any) => t.id === assignment.trainsetId);
          const fitnessStatus = trainset?.fitnessRecords?.[0]?.status || 'PENDING';
          const jobCardStatus = trainset?.jobCards?.[0]?.status || 'PENDING';
          
          return prisma.scheduleEntry.create({
            data: {
              scheduleId: schedule.id,
              trainsetId: assignment.trainsetId,
              startTime: (assignment as any).assignments?.estimatedDeparture ? new Date((assignment as any).assignments.estimatedDeparture) : new Date(),
              endTime: (assignment as any).assignments?.estimatedArrival ? new Date((assignment as any).assignments.estimatedArrival) : new Date(Date.now() + 60 * 60 * 1000),
              notes: JSON.stringify({
                position: index + 1,
                priority: (assignment as any).priority || 1,
                reasoning: assignment.reasons?.join(', ') || 'AI optimization',
                fitnessStatus: fitnessStatus,
                jobCardStatus: jobCardStatus,
                brandingPriority: (assignment as any).assignments?.brandingPriority || null,
                mileageBalance: (assignment as any).assignments?.mileageBalance || null,
                cleaningSlot: (assignment as any).assignments?.cleaningSlot || null,
                confidence: `${assignment.confidence || 0}%`
              })
            }
          });
        })
      );
    }

    // Emit real-time update
    if (io) {
      emitOptimizationResult(io, {
        scheduleId: schedule.id,
        optimizationResult,
        createdBy: req.user
      });
    }

    logger.info('Schedule optimization completed successfully', {
      scheduleId: schedule.id,
      score: optimizationResult.optimizationScore,
      executionTime: optimizationResult.executionTime,
      trainsetsCount: trainsets.length
    });

    res.status(201).json({ 
      success: true, 
      message: 'Schedule optimization completed successfully',
      data: {
        schedule,
        optimizationResult,
        recommendations: optimizationResult.recommendations
      }
    });

  } catch (error) {
    logger.error('Schedule optimization failed', error);
    res.status(500).json({
      success: false,
      message: 'Optimization failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}));

export default router;
