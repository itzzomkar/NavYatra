import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { prisma } from '../utils/database';
import { socketLogger } from '../utils/logger';

interface AuthenticatedSocket extends Socket {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

export const setupSocketHandlers = (io: Server): void => {
  // Authentication middleware for Socket.io
  io.use(async (socket: AuthenticatedSocket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
      
      if (!token) {
        return next(new Error('Authentication error: No token provided'));
      }

      const jwtSecret = process.env.JWT_SECRET;
      if (!jwtSecret) {
        return next(new Error('Authentication error: JWT secret not configured'));
      }

      const decoded = jwt.verify(token, jwtSecret) as any;
      
      // Verify user exists and is active
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: { id: true, email: true, role: true, isActive: true }
      });

      if (!user || !user.isActive) {
        return next(new Error('Authentication error: User not found or inactive'));
      }

      socket.user = {
        id: user.id,
        email: user.email,
        role: user.role
      };

      socketLogger.info('User connected via WebSocket', { 
        userId: user.id, 
        role: user.role,
        socketId: socket.id 
      });

      next();
    } catch (error) {
      socketLogger.warn('Socket authentication failed', error);
      next(new Error('Authentication error: Invalid token'));
    }
  });

  // Connection handler
  io.on('connection', (socket: AuthenticatedSocket) => {
    if (!socket.user) return;

    const { id: userId, role } = socket.user;

    // Join user to role-based rooms
    socket.join(`role:${role}`);
    socket.join(`user:${userId}`);

    // Subscribe to trainset updates
    socket.on('subscribe:trainsets', () => {
      socket.join('trainsets:updates');
      socketLogger.info('User subscribed to trainset updates', { userId, socketId: socket.id });
    });

    // Subscribe to schedule updates
    socket.on('subscribe:schedules', () => {
      socket.join('schedules:updates');
      socketLogger.info('User subscribed to schedule updates', { userId, socketId: socket.id });
    });

    // Subscribe to fitness updates
    socket.on('subscribe:fitness', () => {
      socket.join('fitness:updates');
      socketLogger.info('User subscribed to fitness updates', { userId, socketId: socket.id });
    });

    // Subscribe to job card updates
    socket.on('subscribe:jobcards', () => {
      socket.join('jobcards:updates');
      socketLogger.info('User subscribed to job card updates', { userId, socketId: socket.id });
    });

    // Subscribe to optimization updates
    socket.on('subscribe:optimization', () => {
      if (role === 'ADMIN' || role === 'SUPERVISOR') {
        socket.join('optimization:updates');
        socketLogger.info('User subscribed to optimization updates', { userId, socketId: socket.id });
      } else {
        socket.emit('error', { message: 'Insufficient permissions for optimization updates' });
      }
    });

    // Handle optimization requests
    socket.on('request:optimization', async (data) => {
      if (role !== 'ADMIN' && role !== 'SUPERVISOR') {
        socket.emit('error', { message: 'Insufficient permissions to request optimization' });
        return;
      }

      try {
        socketLogger.info('Optimization requested via WebSocket', { 
          userId, 
          parameters: data,
          socketId: socket.id 
        });

        // Emit to optimization room that a request is being processed
        io.to('optimization:updates').emit('optimization:started', {
          requestedBy: socket.user,
          parameters: data,
          timestamp: new Date()
        });

        // In a real implementation, this would trigger the AI service
        // For now, simulate processing
        setTimeout(() => {
          const mockResult = {
            id: `opt_${Date.now()}`,
            score: Math.random() * 0.3 + 0.7,
            executionTime: Math.floor(Math.random() * 25000) + 5000,
            trainsetAssignments: [],
            timestamp: new Date(),
            requestedBy: socket.user
          };

          io.to('optimization:updates').emit('optimization:completed', mockResult);
          socket.emit('optimization:result', mockResult);
        }, 3000);

      } catch (error) {
        socketLogger.error('Error processing optimization request', error);
        socket.emit('error', { message: 'Failed to process optimization request' });
      }
    });

    // Handle trainset status updates
    socket.on('trainset:status:update', async (data) => {
      if (role !== 'ADMIN' && role !== 'SUPERVISOR' && role !== 'OPERATOR') {
        socket.emit('error', { message: 'Insufficient permissions to update trainset status' });
        return;
      }

      try {
        const { trainsetId, status, location, notes } = data;

        // Update trainset in database
        const updatedTrainset = await prisma.trainset.update({
          where: { id: trainsetId },
          data: { 
            status, 
            location: location || undefined,
            updatedAt: new Date()
          }
        });

        // Broadcast update to all subscribers
        io.to('trainsets:updates').emit('trainset:updated', {
          trainset: updatedTrainset,
          updatedBy: socket.user,
          notes,
          timestamp: new Date()
        });

        socketLogger.info('Trainset status updated via WebSocket', {
          userId,
          trainsetId,
          status,
          socketId: socket.id
        });

      } catch (error) {
        socketLogger.error('Error updating trainset status', error);
        socket.emit('error', { message: 'Failed to update trainset status' });
      }
    });

    // Handle emergency alerts
    socket.on('emergency:alert', (data) => {
      if (role !== 'ADMIN' && role !== 'SUPERVISOR') {
        socket.emit('error', { message: 'Insufficient permissions to send emergency alerts' });
        return;
      }

      const emergencyAlert = {
        id: `alert_${Date.now()}`,
        type: 'EMERGENCY',
        message: data.message,
        trainsetId: data.trainsetId,
        priority: 'CRITICAL',
        issuedBy: socket.user,
        timestamp: new Date()
      };

      // Broadcast to all connected users
      io.emit('emergency:alert', emergencyAlert);

      socketLogger.warn('Emergency alert issued', { 
        alert: emergencyAlert, 
        issuedBy: userId,
        socketId: socket.id 
      });
    });

    // Handle system notifications
    socket.on('system:notification', (data) => {
      if (role !== 'ADMIN') {
        socket.emit('error', { message: 'Insufficient permissions to send system notifications' });
        return;
      }

      const notification = {
        id: `notif_${Date.now()}`,
        type: data.type || 'INFO',
        title: data.title,
        message: data.message,
        targetRole: data.targetRole,
        issuedBy: socket.user,
        timestamp: new Date()
      };

      // Send to specific role or all users
      if (data.targetRole) {
        io.to(`role:${data.targetRole}`).emit('notification', notification);
      } else {
        io.emit('notification', notification);
      }

      socketLogger.info('System notification sent', { 
        notification, 
        issuedBy: userId,
        socketId: socket.id 
      });
    });

    // Handle live location updates
    socket.on('trainset:location:update', (data) => {
      if (role !== 'ADMIN' && role !== 'SUPERVISOR' && role !== 'OPERATOR') {
        socket.emit('error', { message: 'Insufficient permissions to update trainset location' });
        return;
      }

      const locationUpdate = {
        trainsetId: data.trainsetId,
        location: data.location,
        coordinates: data.coordinates,
        speed: data.speed,
        heading: data.heading,
        timestamp: new Date(),
        updatedBy: socket.user
      };

      // Broadcast to all subscribers
      io.to('trainsets:updates').emit('trainset:location', locationUpdate);
      
      socketLogger.info('Trainset location updated', {
        userId,
        locationUpdate,
        socketId: socket.id
      });
    });

    // Handle maintenance alerts
    socket.on('maintenance:alert', (data) => {
      if (role !== 'MAINTENANCE' && role !== 'SUPERVISOR' && role !== 'ADMIN') {
        socket.emit('error', { message: 'Insufficient permissions to send maintenance alerts' });
        return;
      }

      const maintenanceAlert = {
        id: `maint_${Date.now()}`,
        type: 'MAINTENANCE',
        priority: data.priority || 'MEDIUM',
        trainsetId: data.trainsetId,
        issue: data.issue,
        description: data.description,
        estimatedDowntime: data.estimatedDowntime,
        requiredParts: data.requiredParts || [],
        reportedBy: socket.user,
        timestamp: new Date()
      };

      // Send to maintenance and supervision teams
      io.to('role:MAINTENANCE').emit('maintenance:alert', maintenanceAlert);
      io.to('role:SUPERVISOR').emit('maintenance:alert', maintenanceAlert);
      io.to('role:ADMIN').emit('maintenance:alert', maintenanceAlert);

      socketLogger.warn('Maintenance alert issued', {
        alert: maintenanceAlert,
        issuedBy: userId,
        socketId: socket.id
      });
    });

    // Handle fitness certificate alerts
    socket.on('fitness:alert', (data) => {
      const fitnessAlert = {
        id: `fitness_${Date.now()}`,
        type: 'FITNESS',
        severity: data.severity || 'WARNING',
        trainsetId: data.trainsetId,
        certificateId: data.certificateId,
        issue: data.issue,
        expiryDate: data.expiryDate,
        daysUntilExpiry: data.daysUntilExpiry,
        reportedBy: socket.user,
        timestamp: new Date()
      };

      // Send to relevant teams based on severity
      if (data.severity === 'CRITICAL') {
        io.to('role:ADMIN').emit('fitness:alert', fitnessAlert);
        io.to('role:SUPERVISOR').emit('fitness:alert', fitnessAlert);
      } else {
        io.to('fitness:updates').emit('fitness:alert', fitnessAlert);
      }

      socketLogger.warn('Fitness certificate alert issued', {
        alert: fitnessAlert,
        issuedBy: userId,
        socketId: socket.id
      });
    });

    // Handle schedule change notifications
    socket.on('schedule:change', (data) => {
      if (role !== 'ADMIN' && role !== 'SUPERVISOR') {
        socket.emit('error', { message: 'Insufficient permissions to modify schedules' });
        return;
      }

      const scheduleChange = {
        id: `sched_${Date.now()}`,
        type: 'SCHEDULE_CHANGE',
        scheduleId: data.scheduleId,
        changeType: data.changeType, // 'UPDATE', 'CANCEL', 'DELAY'
        affectedTrainsets: data.affectedTrainsets || [],
        reason: data.reason,
        newSchedule: data.newSchedule,
        estimatedImpact: data.estimatedImpact,
        changedBy: socket.user,
        timestamp: new Date()
      };

      // Notify all relevant users
      io.to('schedules:updates').emit('schedule:changed', scheduleChange);
      io.to('role:OPERATOR').emit('schedule:changed', scheduleChange);

      socketLogger.info('Schedule change broadcast', {
        change: scheduleChange,
        changedBy: userId,
        socketId: socket.id
      });
    });

    // Handle passenger information broadcasts
    socket.on('passenger:announcement', (data) => {
      if (role !== 'ADMIN' && role !== 'SUPERVISOR' && role !== 'OPERATOR') {
        socket.emit('error', { message: 'Insufficient permissions to send passenger announcements' });
        return;
      }

      const announcement = {
        id: `announce_${Date.now()}`,
        type: 'PASSENGER_INFO',
        category: data.category, // 'DELAY', 'CANCELLATION', 'PLATFORM_CHANGE', 'GENERAL'
        message: data.message,
        affectedRoutes: data.affectedRoutes || [],
        affectedStations: data.affectedStations || [],
        duration: data.duration,
        priority: data.priority || 'NORMAL',
        broadcastBy: socket.user,
        timestamp: new Date()
      };

      // Broadcast to passenger information systems
      io.emit('passenger:announcement', announcement);

      socketLogger.info('Passenger announcement broadcast', {
        announcement,
        broadcastBy: userId,
        socketId: socket.id
      });
    });

    // Handle real-time analytics requests
    socket.on('analytics:subscribe', (data) => {
      if (role !== 'ADMIN' && role !== 'SUPERVISOR') {
        socket.emit('error', { message: 'Insufficient permissions to access real-time analytics' });
        return;
      }

      const { metrics = [], interval = 30000 } = data; // Default 30 seconds
      
      socket.join('analytics:updates');
      
      // Store user's analytics preferences
      (socket as any).analyticsConfig = {
        metrics,
        interval: Math.max(interval, 10000), // Minimum 10 seconds
        lastUpdate: Date.now()
      };

      socketLogger.info('User subscribed to real-time analytics', {
        userId,
        config: (socket as any).analyticsConfig,
        socketId: socket.id
      });
    });

    // Handle IoT sensor data
    socket.on('iot:sensor:data', (data) => {
      if (role !== 'MAINTENANCE' && role !== 'SUPERVISOR' && role !== 'ADMIN') {
        socket.emit('error', { message: 'Insufficient permissions to submit IoT sensor data' });
        return;
      }

      const sensorData = {
        trainsetId: data.trainsetId,
        sensorType: data.sensorType, // 'temperature', 'vibration', 'pressure', etc.
        value: data.value,
        unit: data.unit,
        threshold: data.threshold,
        status: data.status, // 'NORMAL', 'WARNING', 'CRITICAL'
        location: data.location,
        timestamp: new Date(),
        submittedBy: socket.user
      };

      // Broadcast to monitoring systems
      io.to('trainsets:updates').emit('iot:sensor:update', sensorData);
      
      // Send alerts for abnormal readings
      if (data.status === 'CRITICAL' || data.status === 'WARNING') {
        io.to('role:MAINTENANCE').emit('iot:sensor:alert', sensorData);
        io.to('role:SUPERVISOR').emit('iot:sensor:alert', sensorData);
      }

      socketLogger.info('IoT sensor data received', {
        userId,
        sensorData,
        socketId: socket.id
      });
    });

    // Handle ping/pong for connection health
    socket.on('ping', () => {
      socket.emit('pong', { timestamp: new Date(), userId });
    });

    // Disconnection handler
    socket.on('disconnect', (reason) => {
      socketLogger.info('User disconnected from WebSocket', { 
        userId, 
        reason,
        socketId: socket.id 
      });
    });

    // Error handler
    socket.on('error', (error) => {
      socketLogger.error('Socket error occurred', { 
        error, 
        userId,
        socketId: socket.id 
      });
    });
  });

  socketLogger.info('Socket.io handlers initialized successfully');
};

// Utility functions to emit events from other parts of the application
export const emitTrainsetUpdate = (io: Server, trainset: any, updatedBy?: any): void => {
  io.to('trainsets:updates').emit('trainset:updated', {
    trainset,
    updatedBy,
    timestamp: new Date()
  });
};

export const emitScheduleUpdate = (io: Server, schedule: any, updatedBy?: any): void => {
  io.to('schedules:updates').emit('schedule:updated', {
    schedule,
    updatedBy,
    timestamp: new Date()
  });
};

export const emitFitnessUpdate = (io: Server, certificate: any, updatedBy?: any): void => {
  io.to('fitness:updates').emit('fitness:updated', {
    certificate,
    updatedBy,
    timestamp: new Date()
  });
};

export const emitJobCardUpdate = (io: Server, jobCard: any, updatedBy?: any): void => {
  io.to('jobcards:updates').emit('jobcard:updated', {
    jobCard,
    updatedBy,
    timestamp: new Date()
  });
};

export const emitOptimizationResult = (io: Server, result: any): void => {
  io.to('optimization:updates').emit('optimization:completed', {
    ...result,
    timestamp: new Date()
  });
};
