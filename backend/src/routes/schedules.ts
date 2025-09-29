import express from 'express';
import { prisma } from '../utils/database';
import { catchAsync } from '../middleware/errorHandler';
import { requirePermission } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = express.Router();

// Schedule interface
interface MockSchedule {
  _id: string;
  id: string;
  scheduleNumber: string;
  trainsetId: {
    _id: string;
    trainsetNumber: string;
    status: string;
  };
  trainsetNumber: string;
  route: {
    from: string;
    to: string;
    routeName: string;
  };
  routeDisplay: string;
  departureTime: string;
  arrivalTime: string;
  actualDepartureTime?: string;
  actualArrivalTime?: string;
  stations: Array<{
    name: string;
    scheduledArrival: string;
    scheduledDeparture: string;
    actualArrival?: string;
    actualDeparture?: string;
    platform?: string;
    stopDuration: number;
  }>;
  frequency: string;
  status: string;
  delay: number;
  delayReason?: string;
  expectedDuration: number;
  actualDuration?: number;
  passengerCount: number;
  peakOccupancy?: number;
  averageOccupancy?: number;
  crew: {
    driver?: {
      name: string;
      employeeId: string;
    };
    coDriver?: {
      name: string;
      employeeId: string;
    };
  };
  operationalDate: string;
  createdAt: string;
  updatedAt: string;
}

// Mock schedules data (until we have proper database schema)
const generateMockSchedules = (): MockSchedule[] => {
  const statuses = ['SCHEDULED', 'ACTIVE', 'COMPLETED', 'DELAYED', 'EARLY', 'CANCELLED', 'SUSPENDED'];
  const routes = [
    { from: 'Aluva', to: 'Petta', routeName: 'Blue Line' },
    { from: 'Petta', to: 'Aluva', routeName: 'Blue Line' },
    { from: 'Aluva', to: 'Thripunithura', routeName: 'Green Line' },
    { from: 'Thripunithura', to: 'Aluva', routeName: 'Green Line' },
  ];
  
  const schedules: MockSchedule[] = [];
  
  for (let i = 1; i <= 20; i++) {
    const route = routes[Math.floor(Math.random() * routes.length)];
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    const departureTime = new Date();
    departureTime.setHours(6 + Math.floor(Math.random() * 18)); // 6 AM to 11 PM
    departureTime.setMinutes(Math.floor(Math.random() * 60));
    
    const arrivalTime = new Date(departureTime);
    arrivalTime.setMinutes(arrivalTime.getMinutes() + 45 + Math.floor(Math.random() * 30)); // 45-75 min journey
    
    const delay = Math.floor(Math.random() * 21) - 5; // -5 to +15 minutes
    
    const actualDepartureTime = status === 'COMPLETED' || status === 'ACTIVE' || status === 'DELAYED' || status === 'EARLY' 
      ? new Date(departureTime.getTime() + delay * 60000) : undefined;
    
    const actualArrivalTime = status === 'COMPLETED' || status === 'EARLY' 
      ? new Date(arrivalTime.getTime() + delay * 60000) : undefined;

    const schedule: MockSchedule = {
      _id: `schedule-${i}`,
      id: `schedule-${i}`,
      scheduleNumber: `SCH-${String(i).padStart(3, '0')}`,
      trainsetId: {
        _id: `trainset-${i}`,
        trainsetNumber: `TS-${String(i).padStart(3, '0')}`,
        status: 'ACTIVE'
      },
      trainsetNumber: `TS-${String(i).padStart(3, '0')}`,
      route,
      routeDisplay: `${route.from} - ${route.to}`,
      departureTime: departureTime.toISOString(),
      arrivalTime: arrivalTime.toISOString(),
      actualDepartureTime: actualDepartureTime?.toISOString(),
      actualArrivalTime: actualArrivalTime?.toISOString(),
      stations: [
        {
          name: route.from,
          scheduledArrival: departureTime.toISOString(),
          scheduledDeparture: departureTime.toISOString(),
          actualArrival: actualDepartureTime?.toISOString(),
          actualDeparture: actualDepartureTime?.toISOString(),
          platform: '1',
          stopDuration: 2
        },
        {
          name: 'Intermediate Station',
          scheduledArrival: new Date(departureTime.getTime() + 20 * 60000).toISOString(),
          scheduledDeparture: new Date(departureTime.getTime() + 22 * 60000).toISOString(),
          actualArrival: status === 'COMPLETED' || status === 'ACTIVE' || status === 'DELAYED' || status === 'EARLY' 
            ? new Date(departureTime.getTime() + (20 + delay) * 60000).toISOString() : undefined,
          actualDeparture: status === 'COMPLETED' || status === 'ACTIVE' || status === 'DELAYED' || status === 'EARLY' 
            ? new Date(departureTime.getTime() + (22 + delay) * 60000).toISOString() : undefined,
          platform: '2',
          stopDuration: 2
        },
        {
          name: route.to,
          scheduledArrival: arrivalTime.toISOString(),
          scheduledDeparture: arrivalTime.toISOString(),
          actualArrival: actualArrivalTime?.toISOString(),
          actualDeparture: actualArrivalTime?.toISOString(),
          platform: '1',
          stopDuration: 2
        }
      ],
      frequency: 'Daily',
      status,
      delay: delay, // Allow negative values for early arrivals
      delayReason: delay > 0 ? 'Traffic congestion' : undefined,
      expectedDuration: 45 + Math.floor(Math.random() * 30),
      actualDuration: status === 'COMPLETED' ? 45 + Math.floor(Math.random() * 30) + delay : undefined,
      // Removed passenger counts as they're not available during scheduling
      passengerCount: 0, // Not available during scheduling phase
      peakOccupancy: undefined, // Historical data only
      averageOccupancy: undefined, // Historical data only
      crew: {
        driver: {
          name: `Driver ${i}`,
          employeeId: `EMP${String(i).padStart(4, '0')}`
        },
        coDriver: Math.random() > 0.5 ? {
          name: `Co-Driver ${i}`,
          employeeId: `EMP${String(i + 1000).padStart(4, '0')}`
        } : undefined
      },
      operationalDate: new Date().toISOString(),
      createdAt: new Date(Date.now() - Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date().toISOString()
    };

    schedules.push(schedule);
  }
  
  return schedules;
};

// Get all schedules
router.get('/', requirePermission('schedules:read'), catchAsync(async (req, res) => {
  const { status, date } = req.query;
  
  logger.info('Fetching schedules', { 
    userId: req.user?.id, 
    filters: { status, date } 
  });

  try {
    let schedules = generateMockSchedules();
    
    // Apply filters
    if (status && status !== 'all') {
      schedules = schedules.filter(schedule => 
        schedule.status.toLowerCase() === (status as string).toLowerCase()
      );
    }
    
    if (date && date !== 'all') {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      schedules = schedules.filter(schedule => {
        const scheduleDate = new Date(schedule.operationalDate);
        const scheduleDateOnly = new Date(scheduleDate.getFullYear(), scheduleDate.getMonth(), scheduleDate.getDate());
        
        switch (date) {
          case 'today':
            return scheduleDateOnly.getTime() === today.getTime();
          case 'tomorrow':
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);
            return scheduleDateOnly.getTime() === tomorrow.getTime();
          case 'week':
            const weekFromNow = new Date(today);
            weekFromNow.setDate(weekFromNow.getDate() + 7);
            return scheduleDateOnly >= today && scheduleDateOnly <= weekFromNow;
          case 'month':
            const monthFromNow = new Date(today);
            monthFromNow.setMonth(monthFromNow.getMonth() + 1);
            return scheduleDateOnly >= today && scheduleDateOnly <= monthFromNow;
          default:
            return true;
        }
      });
    }

    logger.info('Schedules fetched successfully', {
      count: schedules.length,
      filteredBy: { status, date }
    });

    res.json({ 
      success: true, 
      data: schedules,
      meta: {
        total: schedules.length,
        filteredBy: { status, date }
      }
    });
  } catch (error) {
    logger.error('Failed to fetch schedules', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch schedules',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}));

// Get schedule by ID
router.get('/:id', requirePermission('schedules:read'), catchAsync(async (req, res) => {
  const { id } = req.params;
  
  logger.info('Fetching schedule by ID', { userId: req.user?.id, scheduleId: id });
  
  try {
    const schedules = generateMockSchedules();
    const schedule = schedules.find(s => s._id === id || s.id === id);
    
    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: 'Schedule not found',
        error: `Schedule with ID ${id} does not exist`
      });
    }

    logger.info('Schedule fetched successfully', { scheduleId: id });
    
    res.json({ 
      success: true, 
      data: schedule 
    });
  } catch (error) {
    logger.error('Failed to fetch schedule', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch schedule',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}));

// Update schedule status
router.patch('/:id/status', requirePermission('schedules:update'), catchAsync(async (req, res) => {
  const { id } = req.params;
  const { status, reason } = req.body;
  
  logger.info('Updating schedule status', { 
    userId: req.user?.id, 
    scheduleId: id, 
    newStatus: status, 
    reason 
  });
  
  try {
    // In a real implementation, this would update the database
    const schedules = generateMockSchedules();
    const schedule = schedules.find(s => s._id === id || s.id === id);
    
    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: 'Schedule not found',
        error: `Schedule with ID ${id} does not exist`
      });
    }

    // Update the schedule (mock)
    const updatedSchedule = {
      ...schedule,
      status,
      delayReason: status === 'CANCELLED' ? reason : schedule.delayReason,
      updatedAt: new Date().toISOString()
    };

    logger.info('Schedule status updated successfully', { 
      scheduleId: id, 
      oldStatus: schedule.status, 
      newStatus: status 
    });
    
    res.json({ 
      success: true, 
      message: `Schedule ${status.toLowerCase()} successfully`,
      data: updatedSchedule 
    });
  } catch (error) {
    logger.error('Failed to update schedule status', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update schedule status',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}));

// Create new schedule
router.post('/', requirePermission('schedules:create'), catchAsync(async (req, res) => {
  const scheduleData = req.body;
  
  logger.info('Creating new schedule', { userId: req.user?.id, data: scheduleData });
  
  try {
    // In a real implementation, this would create in the database
    const newSchedule = {
      _id: `schedule-${Date.now()}`,
      id: `schedule-${Date.now()}`,
      ...scheduleData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    logger.info('Schedule created successfully', { scheduleId: newSchedule._id });
    
    res.status(201).json({ 
      success: true, 
      message: 'Schedule created successfully',
      data: newSchedule 
    });
  } catch (error) {
    logger.error('Failed to create schedule', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create schedule',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}));

// Delete schedule
router.delete('/:id', requirePermission('schedules:delete'), catchAsync(async (req, res) => {
  const { id } = req.params;
  
  logger.info('Deleting schedule', { userId: req.user?.id, scheduleId: id });
  
  try {
    // In a real implementation, this would delete from the database
    const schedules = generateMockSchedules();
    const schedule = schedules.find(s => s._id === id || s.id === id);
    
    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: 'Schedule not found',
        error: `Schedule with ID ${id} does not exist`
      });
    }

    // Check if schedule can be deleted (not if it's currently active)
    if (schedule.status === 'ACTIVE') {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete active schedule',
        error: 'Active schedules cannot be deleted. Please cancel the schedule first.'
      });
    }

    logger.info('Schedule deleted successfully', { scheduleId: id, scheduleNumber: schedule.scheduleNumber });
    
    res.json({ 
      success: true, 
      message: `Schedule ${schedule.scheduleNumber} deleted successfully`
    });
  } catch (error) {
    logger.error('Failed to delete schedule', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete schedule',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}));

// Get schedules statistics
router.get('/stats/dashboard', requirePermission('schedules:read'), catchAsync(async (req, res) => {
  logger.info('Fetching schedule statistics', { userId: req.user?.id });
  
  try {
    const schedules = generateMockSchedules();
    
    const stats = {
      total: schedules.length,
      scheduled: schedules.filter(s => s.status === 'SCHEDULED').length,
      active: schedules.filter(s => s.status === 'ACTIVE').length,
      completed: schedules.filter(s => s.status === 'COMPLETED').length,
      delayed: schedules.filter(s => s.status === 'DELAYED').length,
      early: schedules.filter(s => s.status === 'EARLY').length,
      cancelled: schedules.filter(s => s.status === 'CANCELLED').length,
      suspended: schedules.filter(s => s.status === 'SUSPENDED').length,
      averageOccupancy: Math.round(
        schedules.reduce((sum, s) => sum + (s.averageOccupancy || 0), 0) / schedules.length
      ),
      onTimePerformance: Math.round(
        (schedules.filter(s => s.status === 'COMPLETED' || s.status === 'EARLY').length / 
         schedules.filter(s => s.status === 'COMPLETED' || s.status === 'DELAYED' || s.status === 'EARLY').length) * 100
      )
    };

    logger.info('Schedule statistics fetched successfully', stats);
    
    res.json({ 
      success: true, 
      data: stats 
    });
  } catch (error) {
    logger.error('Failed to fetch schedule statistics', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch schedule statistics',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}));

export default router;