/**
 * Comprehensive Operations Management Routes
 * 
 * Full-featured REST API for KMRL operations management including:
 * - Crew scheduling and management
 * - Route planning and optimization
 * - Shift assignment and tracking
 * - Operational performance monitoring
 * - Real-time operational analytics
 * - Alert management and notifications
 */

import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { Server } from 'socket.io';
import {
  operationsEngine,
  createSampleOperationsData,
  OPERATIONS_CONFIG,
  OperationsResult,
  CrewMember,
  ShiftAssignment,
  OperationalAlert
} from '../utils/operationsEngine';

const router = Router();
const prisma = new PrismaClient();

// WebSocket instance (will be set by the server)
let io: Server;

export const setSocketIO = (socketIO: Server) => {
  io = socketIO;
};

// Emit operations updates to connected clients
const emitOperationsUpdate = (data: any, event: string = 'operations:updated') => {
  if (io) {
    io.to('operations').emit(event, {
      ...data,
      timestamp: new Date().toISOString()
    });
  }
};

// Store last operations results for quick access
let lastOperationsResult: OperationsResult | null = null;

/**
 * POST /api/operations/manage - Execute operations management
 */
router.post('/manage', async (req, res) => {
  try {
    console.log('🚄 Starting comprehensive operations management...');
    const { date, parameters } = req.body;
    
    // Emit start event
    emitOperationsUpdate({ status: 'starting' }, 'operations:started');
    
    const startTime = Date.now();
    const operationDate = date ? new Date(date) : undefined;
    
    // Run the operations management
    const result = await operationsEngine.manageOperations(operationDate);
    
    // Store result for future reference
    lastOperationsResult = result;
    
    const totalTime = Date.now() - startTime;
    
    console.log(`✅ Operations management complete in ${result.processingTime}ms`);
    console.log(`📊 Summary: ${result.summary.totalShifts} shifts, ${result.summary.activeRoutes} routes, ${result.summary.crewUtilization.toFixed(1)}% crew utilization`);
    console.log(`🎯 Performance: ${result.summary.performance.toFixed(1)}%, ${result.summary.openAlerts} open alerts`);
    
    // Emit completion event
    emitOperationsUpdate({ 
      result: {
        id: result.id,
        summary: result.summary,
        recommendations: result.recommendations.slice(0, 3), // First 3 recommendations
        alertCount: result.alerts.filter(a => a.severity === 'HIGH' || a.severity === 'CRITICAL').length
      }
    }, 'operations:completed');
    
    res.json({
      success: true,
      message: `Operations management completed successfully in ${result.processingTime}ms`,
      data: result
    });
  } catch (error) {
    console.error('❌ Operations management failed:', error);
    
    // Emit error event
    emitOperationsUpdate({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, 'operations:error');
    
    res.status(500).json({
      success: false,
      message: 'Operations management failed',
      error: { code: 'OPERATIONS_ERROR', message: String(error) }
    });
  }
});

/**
 * GET /api/operations/crew - Get crew management data
 */
router.get('/crew', async (req, res) => {
  try {
    const { 
      page = '1', 
      limit = '10', 
      role, 
      availability, 
      shift,
      sortBy = 'performanceScore',
      sortOrder = 'desc'
    } = req.query;

    // Since we don't have crew in database, get from operations engine
    const crewPerformance = await operationsEngine.trackCrewPerformance();
    
    // Simulate crew data with pagination
    const pageNum = Math.max(1, parseInt(page as string));
    const pageSize = Math.min(50, Math.max(1, parseInt(limit as string)));
    
    // Mock crew data for demonstration
    const allCrew = [
      {
        id: 'CREW-001',
        name: 'Rajesh Kumar',
        role: 'DRIVER',
        shiftPreference: 'MORNING',
        experience: 8,
        certifications: ['Advanced Driving', 'Safety Protocol', 'Emergency Response'],
        availability: true,
        performanceScore: 94.5,
        location: 'MUTTOM',
        currentShift: {
          id: 'SHIFT-001',
          status: 'ACTIVE',
          startTime: new Date(),
          endTime: new Date(Date.now() + 8 * 60 * 60 * 1000)
        }
      },
      {
        id: 'CREW-002',
        name: 'Priya Nair',
        role: 'CONDUCTOR',
        shiftPreference: 'AFTERNOON',
        experience: 5,
        certifications: ['Customer Service', 'Emergency Response', 'Revenue Collection'],
        availability: true,
        performanceScore: 92.1,
        location: 'MUTTOM',
        currentShift: null
      },
      {
        id: 'CREW-003',
        name: 'Suresh Babu',
        role: 'MAINTENANCE_TECH',
        shiftPreference: 'NIGHT',
        experience: 12,
        certifications: ['Electrical Systems', 'Mechanical Repair', 'Diagnostics'],
        availability: true,
        performanceScore: 96.8,
        location: 'MUTTOM',
        currentShift: null
      }
    ];

    // Apply filters
    let filteredCrew = allCrew;
    if (role) filteredCrew = filteredCrew.filter(c => c.role === String(role).toUpperCase());
    if (availability !== undefined) filteredCrew = filteredCrew.filter(c => c.availability === (String(availability) === 'true'));
    if (shift) filteredCrew = filteredCrew.filter(c => c.shiftPreference === String(shift).toUpperCase());

    // Apply sorting
    if (sortBy === 'performanceScore') {
      filteredCrew.sort((a, b) => sortOrder === 'desc' ? b.performanceScore - a.performanceScore : a.performanceScore - b.performanceScore);
    } else if (sortBy === 'experience') {
      filteredCrew.sort((a, b) => sortOrder === 'desc' ? b.experience - a.experience : a.experience - b.experience);
    }

    // Apply pagination
    const skip = (pageNum - 1) * pageSize;
    const paginatedCrew = filteredCrew.slice(skip, skip + pageSize);
    
    return res.json({
      success: true,
      message: 'Crew data retrieved',
      data: {
        crew: paginatedCrew,
        performance: crewPerformance,
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(filteredCrew.length / pageSize) || 1,
          totalItems: filteredCrew.length,
          itemsPerPage: pageSize,
          hasNextPage: pageNum * pageSize < filteredCrew.length,
          hasPreviousPage: pageNum > 1
        }
      }
    });
  } catch (error) {
    console.error('Error fetching crew data:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch crew data',
      error: { code: 'CREW_FETCH_ERROR', message: String(error) }
    });
  }
});

/**
 * GET /api/operations/crew/:id - Get specific crew member details
 */
router.get('/crew/:id', async (req, res) => {
  try {
    // Mock crew member data
    const crewMember = {
      id: req.params.id,
      name: 'Rajesh Kumar',
      role: 'DRIVER',
      shiftPreference: 'MORNING',
      experience: 8,
      certifications: ['Advanced Driving', 'Safety Protocol', 'Emergency Response'],
      availability: true,
      performanceScore: 94.5,
      location: 'MUTTOM',
      recentShifts: [
        {
          id: 'SHIFT-001',
          date: new Date(),
          shiftType: 'MORNING',
          status: 'COMPLETED',
          trainsetId: 'TS-001',
          performance: 95.2
        },
        {
          id: 'SHIFT-002',
          date: new Date(Date.now() - 24 * 60 * 60 * 1000),
          shiftType: 'MORNING',
          status: 'COMPLETED',
          trainsetId: 'TS-002',
          performance: 93.8
        }
      ],
      metrics: {
        punctualityRate: 96.5,
        safetyScore: 98.1,
        customerRating: 4.7,
        hoursWorked: 156,
        overtimeHours: 8
      }
    };

    if (!crewMember) {
      return res.status(404).json({
        success: false,
        message: 'Crew member not found'
      });
    }

    return res.json({
      success: true,
      message: 'Crew member details retrieved',
      data: crewMember
    });
  } catch (error) {
    console.error('Error fetching crew member details:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch crew member details',
      error: { code: 'CREW_DETAIL_ERROR', message: String(error) }
    });
  }
});

/**
 * POST /api/operations/crew/:id/availability - Update crew availability
 */
router.post('/crew/:id/availability', async (req, res) => {
  try {
    const { available, reason } = req.body;
    
    // Simulate availability update
    const updated = {
      id: req.params.id,
      availability: Boolean(available),
      lastUpdated: new Date(),
      reason: reason || null
    };
    
    // Emit crew update event
    emitOperationsUpdate({ 
      crewId: req.params.id,
      availability: updated.availability,
      reason: updated.reason
    }, 'operations:crew_updated');
    
    return res.json({
      success: true,
      message: 'Crew availability updated',
      data: updated
    });
  } catch (error) {
    console.error('Error updating crew availability:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update crew availability',
      error: { code: 'AVAILABILITY_UPDATE_ERROR', message: String(error) }
    });
  }
});

/**
 * GET /api/operations/shifts - Get shift schedules
 */
router.get('/shifts', async (req, res) => {
  try {
    const { 
      date, 
      shiftType, 
      crewId,
      status = 'SCHEDULED,ACTIVE',
      page = '1',
      limit = '20'
    } = req.query;

    const pageNum = Math.max(1, parseInt(page as string));
    const pageSize = Math.min(100, Math.max(1, parseInt(limit as string)));

    // Mock shift data
    const allShifts = [
      {
        id: 'SHIFT-001',
        crewMemberId: 'CREW-001',
        crewName: 'Rajesh Kumar',
        date: new Date(),
        shiftType: 'MORNING',
        startTime: new Date('2024-01-01T06:00:00Z'),
        endTime: new Date('2024-01-01T14:00:00Z'),
        trainsetId: 'TS-001',
        trainsetNumber: 'KMRL-001',
        routeId: 'ROUTE-01',
        routeName: 'Aluva - Petta',
        status: 'ACTIVE',
        notes: 'Regular morning shift'
      },
      {
        id: 'SHIFT-002',
        crewMemberId: 'CREW-002',
        crewName: 'Priya Nair',
        date: new Date(),
        shiftType: 'AFTERNOON',
        startTime: new Date('2024-01-01T14:00:00Z'),
        endTime: new Date('2024-01-01T22:00:00Z'),
        trainsetId: 'TS-002',
        trainsetNumber: 'KMRL-002',
        routeId: 'ROUTE-02',
        routeName: 'Muttom - Tripunithura',
        status: 'SCHEDULED',
        notes: 'Afternoon shift assignment'
      }
    ];

    // Apply filters
    let filteredShifts = allShifts;
    if (date) {
      const filterDate = new Date(String(date));
      filteredShifts = filteredShifts.filter(s => s.date.toDateString() === filterDate.toDateString());
    }
    if (shiftType) filteredShifts = filteredShifts.filter(s => s.shiftType === String(shiftType).toUpperCase());
    if (crewId) filteredShifts = filteredShifts.filter(s => s.crewMemberId === String(crewId));

    const statusArray = String(status).split(',');
    filteredShifts = filteredShifts.filter(s => statusArray.includes(s.status));

    // Apply pagination
    const skip = (pageNum - 1) * pageSize;
    const paginatedShifts = filteredShifts.slice(skip, skip + pageSize);

    return res.json({
      success: true,
      message: 'Shift schedules retrieved',
      data: {
        shifts: paginatedShifts,
        summary: {
          total: filteredShifts.length,
          active: filteredShifts.filter(s => s.status === 'ACTIVE').length,
          scheduled: filteredShifts.filter(s => s.status === 'SCHEDULED').length,
          completed: filteredShifts.filter(s => s.status === 'COMPLETED').length
        },
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(filteredShifts.length / pageSize) || 1,
          totalItems: filteredShifts.length,
          itemsPerPage: pageSize,
          hasNextPage: pageNum * pageSize < filteredShifts.length,
          hasPreviousPage: pageNum > 1
        }
      }
    });
  } catch (error) {
    console.error('Error fetching shifts:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch shifts',
      error: { code: 'SHIFTS_FETCH_ERROR', message: String(error) }
    });
  }
});

/**
 * POST /api/operations/shifts - Create new shift assignment
 */
router.post('/shifts', async (req, res) => {
  try {
    const { crewMemberId, date, shiftType, trainsetId, routeId, notes } = req.body;
    
    if (!crewMemberId || !date || !shiftType) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: crewMemberId, date, shiftType'
      });
    }

    const shiftConfig = OPERATIONS_CONFIG.shifts[shiftType.toLowerCase() as keyof typeof OPERATIONS_CONFIG.shifts];
    if (!shiftConfig) {
      return res.status(400).json({
        success: false,
        message: 'Invalid shift type'
      });
    }

    const shiftDate = new Date(date);
    const [startHour, startMinute] = shiftConfig.start.split(':').map(Number);
    const startTime = new Date(shiftDate);
    startTime.setHours(startHour, startMinute, 0, 0);
    
    const endTime = new Date(startTime);
    endTime.setHours(endTime.getHours() + shiftConfig.duration);

    const newShift = {
      id: `SHIFT-${Date.now()}`,
      crewMemberId,
      date: shiftDate,
      shiftType: shiftType.toUpperCase(),
      startTime,
      endTime,
      trainsetId: trainsetId || null,
      routeId: routeId || null,
      status: 'SCHEDULED',
      notes: notes || null,
      createdAt: new Date()
    };

    // Emit shift creation event
    emitOperationsUpdate({ 
      shift: newShift,
      action: 'created'
    }, 'operations:shift_created');

    return res.status(201).json({
      success: true,
      message: 'Shift assignment created',
      data: newShift
    });
  } catch (error) {
    console.error('Error creating shift:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create shift assignment',
      error: { code: 'SHIFT_CREATE_ERROR', message: String(error) }
    });
  }
});

/**
 * PUT /api/operations/shifts/:id/status - Update shift status
 */
router.put('/shifts/:id/status', async (req, res) => {
  try {
    const { status, notes } = req.body;
    
    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Status is required'
      });
    }

    const validStatuses = ['SCHEDULED', 'ACTIVE', 'COMPLETED', 'CANCELLED'];
    if (!validStatuses.includes(status.toUpperCase())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be one of: ' + validStatuses.join(', ')
      });
    }

    const updatedShift = {
      id: req.params.id,
      status: status.toUpperCase(),
      notes: notes || null,
      updatedAt: new Date()
    };

    // Emit shift status update event
    emitOperationsUpdate({ 
      shiftId: req.params.id,
      status: updatedShift.status,
      notes: updatedShift.notes
    }, 'operations:shift_status_updated');

    return res.json({
      success: true,
      message: 'Shift status updated',
      data: updatedShift
    });
  } catch (error) {
    console.error('Error updating shift status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update shift status',
      error: { code: 'SHIFT_STATUS_UPDATE_ERROR', message: String(error) }
    });
  }
});

/**
 * GET /api/operations/routes - Get operational routes
 */
router.get('/routes', async (req, res) => {
  try {
    const { status, includeMetrics = 'true' } = req.query;

    // Mock route data
    let routes = [
      {
        id: 'ROUTE-01',
        name: 'Aluva - Petta',
        stations: ['Aluva', 'Pulinchodu', 'Companypady', 'Ambattukavu', 'Muttom', 'Kalamassery', 'Petta'],
        distance: 25.6,
        estimatedDuration: 45,
        trainsetIds: ['TS-001', 'TS-003', 'TS-005'],
        frequency: 12,
        status: 'ACTIVE',
        performanceMetrics: {
          punctualityRate: 96.8,
          averageDelay: 1.2,
          passengerLoad: 78.5,
          energyConsumption: 2.1,
          incidents: 0
        }
      },
      {
        id: 'ROUTE-02',
        name: 'Muttom - Tripunithura',
        stations: ['Muttom', 'Kalamassery', 'Edapally', 'Changampuzha Park', 'Palarivattom', 'JLN Stadium', 'Tripunithura'],
        distance: 18.2,
        estimatedDuration: 32,
        trainsetIds: ['TS-002', 'TS-004'],
        frequency: 10,
        status: 'ACTIVE',
        performanceMetrics: {
          punctualityRate: 94.2,
          averageDelay: 2.1,
          passengerLoad: 65.3,
          energyConsumption: 2.3,
          incidents: 1
        }
      }
    ];

    // Apply filters
    if (status) {
      routes = routes.filter(r => r.status === String(status).toUpperCase());
    }

    // Include/exclude metrics
    if (String(includeMetrics) === 'false') {
      routes = routes.map(({ performanceMetrics, ...route }) => route) as any;
    }

    return res.json({
      success: true,
      message: 'Operational routes retrieved',
      data: {
        routes,
        summary: {
          total: routes.length,
          active: routes.filter(r => r.status === 'ACTIVE').length,
          suspended: routes.filter(r => r.status === 'SUSPENDED').length,
          maintenance: routes.filter(r => r.status === 'MAINTENANCE').length
        }
      }
    });
  } catch (error) {
    console.error('Error fetching routes:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch operational routes',
      error: { code: 'ROUTES_FETCH_ERROR', message: String(error) }
    });
  }
});

/**
 * GET /api/operations/alerts - Get operational alerts
 */
router.get('/alerts', async (req, res) => {
  try {
    const { 
      type, 
      severity, 
      status = 'OPEN', 
      page = '1', 
      limit = '20',
      sortBy = 'timestamp',
      sortOrder = 'desc'
    } = req.query;

    const pageNum = Math.max(1, parseInt(page as string));
    const pageSize = Math.min(100, Math.max(1, parseInt(limit as string)));

    // Mock alerts data
    let alerts = [
      {
        id: 'ALERT-001',
        type: 'SERVICE',
        severity: 'HIGH',
        title: 'Trainset Unavailability',
        description: 'Multiple trainsets out of service due to maintenance',
        affectedAssets: ['KMRL-003', 'KMRL-007', 'KMRL-012'],
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
        status: 'OPEN',
        assignedTo: 'OPS-MANAGER-001',
        estimatedImpact: {
          serviceDisruption: 15,
          affectedPassengers: 5000,
          financialImpact: 250000
        }
      },
      {
        id: 'ALERT-002',
        type: 'CREW',
        severity: 'MEDIUM',
        title: 'Crew Shortage',
        description: 'Insufficient crew for afternoon shift coverage',
        affectedAssets: [],
        timestamp: new Date(Date.now() - 30 * 60 * 1000),
        status: 'ACKNOWLEDGED',
        assignedTo: 'HR-MANAGER-001',
        estimatedImpact: {
          serviceDisruption: 10,
          affectedPassengers: 2000,
          financialImpact: 100000
        }
      },
      {
        id: 'ALERT-003',
        type: 'PERFORMANCE',
        severity: 'LOW',
        title: 'Route Performance Degraded',
        description: 'Aluva-Petta route showing decreased punctuality',
        affectedAssets: ['ROUTE-01'],
        timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000),
        status: 'RESOLVED',
        assignedTo: 'OPS-SUPERVISOR-002',
        resolution: 'Adjusted schedule timing and crew assignments',
        estimatedImpact: {
          serviceDisruption: 5,
          affectedPassengers: 1000,
          financialImpact: 25000
        }
      }
    ];

    // Apply filters
    if (type) alerts = alerts.filter(a => a.type === String(type).toUpperCase());
    if (severity) alerts = alerts.filter(a => a.severity === String(severity).toUpperCase());
    
    const statusArray = String(status).split(',');
    alerts = alerts.filter(a => statusArray.includes(a.status));

    // Apply sorting
    alerts.sort((a, b) => {
      if (sortBy === 'timestamp') {
        return sortOrder === 'desc' 
          ? b.timestamp.getTime() - a.timestamp.getTime()
          : a.timestamp.getTime() - b.timestamp.getTime();
      }
      return 0;
    });

    // Apply pagination
    const skip = (pageNum - 1) * pageSize;
    const paginatedAlerts = alerts.slice(skip, skip + pageSize);

    return res.json({
      success: true,
      message: 'Operational alerts retrieved',
      data: {
        alerts: paginatedAlerts,
        summary: {
          total: alerts.length,
          critical: alerts.filter(a => a.severity === 'CRITICAL').length,
          high: alerts.filter(a => a.severity === 'HIGH').length,
          medium: alerts.filter(a => a.severity === 'MEDIUM').length,
          low: alerts.filter(a => a.severity === 'LOW').length,
          open: alerts.filter(a => a.status === 'OPEN').length,
          acknowledged: alerts.filter(a => a.status === 'ACKNOWLEDGED').length,
          resolved: alerts.filter(a => a.status === 'RESOLVED').length
        },
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(alerts.length / pageSize) || 1,
          totalItems: alerts.length,
          itemsPerPage: pageSize,
          hasNextPage: pageNum * pageSize < alerts.length,
          hasPreviousPage: pageNum > 1
        }
      }
    });
  } catch (error) {
    console.error('Error fetching alerts:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch operational alerts',
      error: { code: 'ALERTS_FETCH_ERROR', message: String(error) }
    });
  }
});

/**
 * PUT /api/operations/alerts/:id/status - Update alert status
 */
router.put('/alerts/:id/status', async (req, res) => {
  try {
    const { status, assignedTo, resolution, notes } = req.body;
    
    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Status is required'
      });
    }

    const validStatuses = ['OPEN', 'ACKNOWLEDGED', 'RESOLVED'];
    if (!validStatuses.includes(status.toUpperCase())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be one of: ' + validStatuses.join(', ')
      });
    }

    const updatedAlert = {
      id: req.params.id,
      status: status.toUpperCase(),
      assignedTo: assignedTo || null,
      resolution: resolution || null,
      notes: notes || null,
      updatedAt: new Date()
    };

    // Emit alert status update event
    emitOperationsUpdate({ 
      alertId: req.params.id,
      status: updatedAlert.status,
      assignedTo: updatedAlert.assignedTo,
      resolution: updatedAlert.resolution
    }, 'operations:alert_updated');

    return res.json({
      success: true,
      message: 'Alert status updated',
      data: updatedAlert
    });
  } catch (error) {
    console.error('Error updating alert status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update alert status',
      error: { code: 'ALERT_UPDATE_ERROR', message: String(error) }
    });
  }
});

/**
 * GET /api/operations/analytics/dashboard - Get operations analytics dashboard
 */
router.get('/analytics/dashboard', async (req, res) => {
  try {
    console.log('📊 Generating operations analytics dashboard...');
    
    const crewPerformance = await operationsEngine.trackCrewPerformance();
    const serviceOptimization = await operationsEngine.optimizeServiceDelivery();
    
    const analytics = {
      summary: {
        totalCrew: crewPerformance.activeCrew,
        activeShifts: 8, // Mock data
        operationalRoutes: 2,
        serviceAvailability: 94.2,
        avgPerformanceScore: crewPerformance.avgPerformanceScore
      },
      performance: {
        punctualityRate: 95.5,
        serviceReliability: 97.8,
        customerSatisfaction: 4.3,
        energyEfficiency: 87.2,
        crewUtilization: 82.4,
        onTimePerformance: 96.1
      },
      operations: {
        dailyTrips: 456,
        passengersMoved: 78500,
        kmCovered: 12450,
        fuelSaved: 2400, // liters
        costSavings: serviceOptimization.energySavings
      },
      alerts: {
        active: 3,
        critical: 0,
        high: 1,
        medium: 2,
        resolvedToday: 5
      },
      shiftCoverage: crewPerformance.shiftCoverage,
      routeEfficiency: serviceOptimization.routeEfficiency,
      trends: {
        punctualityTrend: 'IMPROVING',
        crewUtilizationTrend: 'STABLE',
        energyEfficiencyTrend: 'IMPROVING',
        passengerSatisfactionTrend: 'STABLE'
      }
    };

    return res.json({
      success: true,
      message: 'Operations analytics dashboard retrieved',
      data: analytics
    });
  } catch (error) {
    console.error('Error generating operations analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate operations analytics',
      error: { code: 'ANALYTICS_ERROR', message: String(error) }
    });
  }
});

/**
 * GET /api/operations/metrics/realtime - Get real-time operations metrics
 */
router.get('/metrics/realtime', async (req, res) => {
  try {
    const crewPerformance = await operationsEngine.trackCrewPerformance();
    
    // Generate real-time metrics
    const metrics = {
      systemHealth: {
        operationsEngine: 'HEALTHY',
        crewManagement: 'HEALTHY',
        routePlanning: 'HEALTHY',
        alertSystem: 'HEALTHY',
        lastUpdate: new Date().toISOString()
      },
      liveOperations: {
        trainsInService: 18,
        activeCrewMembers: crewPerformance.activeCrew,
        currentPassengers: 12500,
        avgSpeed: 42.3, // km/h
        systemLoad: 78.5, // percentage
        energyConsumption: 2.15 // kWh/km
      },
      performance: {
        punctualityLive: 96.2,
        serviceReliabilityLive: 98.1,
        crewEfficiencyLive: 89.7,
        passengerSatisfactionLive: 4.4,
        energyEfficiencyLive: 88.3
      },
      alerts: {
        activeAlerts: 2,
        criticalAlerts: 0,
        newAlertsToday: 7,
        resolvedAlertsToday: 5,
        avgResponseTime: 8.5 // minutes
      },
      capacity: {
        crewUtilization: (crewPerformance.activeCrew / 15) * 100, // Assuming 15 total crew
        trainsetUtilization: 75.0,
        routeCapacityUsed: 68.4,
        peakHourLoad: 85.2
      },
      timestamp: new Date().toISOString()
    };

    return res.json({
      success: true,
      message: 'Real-time operations metrics retrieved',
      data: metrics
    });
  } catch (error) {
    console.error('Error getting real-time metrics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get real-time operations metrics',
      error: { code: 'METRICS_ERROR', message: String(error) }
    });
  }
});

/**
 * GET /api/operations/config - Get operations configuration
 */
router.get('/config', async (req, res) => {
  try {
    const config = {
      shifts: OPERATIONS_CONFIG.shifts,
      routes: OPERATIONS_CONFIG.routes,
      performance: OPERATIONS_CONFIG.performance,
      constraints: OPERATIONS_CONFIG.constraints,
      alerts: OPERATIONS_CONFIG.alerts,
      systemInfo: {
        version: '1.0.0',
        type: 'Comprehensive Operations Management System',
        features: [
          'Crew scheduling and management',
          'Route planning and optimization',
          'Real-time performance monitoring',
          'Alert management system',
          'Shift assignment tracking',
          'Service delivery optimization',
          'Performance analytics dashboard',
          'Real-time operational metrics'
        ]
      }
    };
    
    return res.json({
      success: true,
      message: 'Operations configuration retrieved',
      data: config
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get operations configuration',
      error: { code: 'CONFIG_ERROR', message: String(error) }
    });
  }
});

/**
 * GET /api/operations/latest - Get latest operations result
 */
router.get('/latest', async (req, res) => {
  try {
    if (lastOperationsResult) {
      return res.json({
        success: true,
        message: 'Latest operations result retrieved',
        data: lastOperationsResult
      });
    }

    // Generate fresh operations management if none exists
    console.log('🔄 No previous operations results found, generating fresh data...');
    const result = await operationsEngine.manageOperations();
    lastOperationsResult = result;
    
    return res.json({
      success: true,
      message: 'Fresh operations data generated',
      data: result
    });
  } catch (error) {
    console.error('Error getting latest operations:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get latest operations result',
      error: { code: 'LATEST_OPERATIONS_ERROR', message: String(error) }
    });
  }
});

/**
 * POST /api/operations/sample/create - Create sample operations data
 */
router.post('/sample/create', async (req, res) => {
  try {
    console.log('🎲 Creating sample operations data...');
    
    const result = await createSampleOperationsData();
    
    if (result.success) {
      return res.json({
        success: true,
        message: 'Sample operations data created',
        data: result.data
      });
    } else {
      return res.status(500).json({
        success: false,
        message: 'Failed to create sample operations data',
        error: result.error
      });
    }
  } catch (error) {
    console.error('Error creating sample operations data:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create sample operations data',
      error: { code: 'SAMPLE_CREATE_ERROR', message: String(error) }
    });
  }
});

export default router;