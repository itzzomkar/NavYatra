const { Server } = require('socket.io');

class WebSocketService {
  constructor() {
    this.io = null;
    this.clients = new Map();
  }

  initialize(server) {
    this.io = new Server(server, {
      cors: {
        origin: ["http://localhost:3000", "http://localhost:3001"],
        credentials: true
      }
    });

    this.setupEventHandlers();
    console.log('🔌 WebSocket service initialized');
  }

  setupEventHandlers() {
    this.io.on('connection', (socket) => {
      console.log(`✅ Client connected: ${socket.id}`);
      this.clients.set(socket.id, socket);

      // Handle authentication
      socket.on('authenticate', (token) => {
        // TODO: Verify JWT token
        socket.authenticated = true;
        socket.emit('authenticated');
      });

      // Handle subscriptions
      socket.on('subscribe:trainsets', () => {
        socket.join('trainsets');
        console.log(`📊 Client ${socket.id} subscribed to trainsets`);
      });

      socket.on('subscribe:schedules', () => {
        socket.join('schedules');
        console.log(`📅 Client ${socket.id} subscribed to schedules`);
      });

      socket.on('subscribe:optimization', () => {
        socket.join('optimization');
        console.log(`🤖 Client ${socket.id} subscribed to optimization`);
      });

      // Handle optimization requests
      socket.on('request:optimization', (data) => {
        console.log('🚀 Optimization requested:', data);
        // Emit to optimization room
        this.io.to('optimization').emit('optimization:started', {
          id: Date.now().toString(),
          timestamp: new Date().toISOString(),
          parameters: data
        });
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        console.log(`❌ Client disconnected: ${socket.id}`);
        this.clients.delete(socket.id);
      });

      // Health check
      socket.on('ping', () => {
        socket.emit('pong', { timestamp: new Date().toISOString() });
      });
    });
  }

  // Emit trainset updates
  emitTrainsetUpdate(trainset, updatedBy) {
    if (this.io) {
      this.io.to('trainsets').emit('trainset:updated', {
        trainset,
        updatedBy,
        timestamp: new Date().toISOString()
      });
    }
  }

  // Emit schedule updates
  emitScheduleUpdate(schedule, updatedBy) {
    if (this.io) {
      this.io.to('schedules').emit('schedule:updated', {
        schedule,
        updatedBy,
        timestamp: new Date().toISOString()
      });
    }
  }

  // Emit optimization progress updates
  emitOptimizationProgress(optimizationId, progress, status, message, details = {}) {
    if (this.io) {
      this.io.to('optimization').emit('optimization:progress', {
        optimizationId,
        progress,
        status,
        message,
        details,
        timestamp: new Date().toISOString()
      });
      
      console.log(`📊 Optimization progress: ${optimizationId} - ${progress}% - ${message}`);
    }
  }

  // Emit optimization started
  emitOptimizationStarted(optimizationId, parameters, trainsetCount) {
    if (this.io) {
      this.io.to('optimization').emit('optimization:started', {
        optimizationId,
        parameters,
        trainsetCount,
        status: 'RUNNING',
        message: 'Optimization process initiated...',
        timestamp: new Date().toISOString()
      });
      
      console.log(`🚀 Optimization started: ${optimizationId} with ${trainsetCount} trainsets`);
    }
  }

  // Emit optimization completion
  emitOptimizationComplete(optimizationId, results, metrics) {
    if (this.io) {
      this.io.to('optimization').emit('optimization:completed', {
        optimizationId,
        results,
        metrics,
        status: 'COMPLETED',
        message: 'Optimization completed successfully!',
        timestamp: new Date().toISOString()
      });
      
      console.log(`✅ Optimization completed: ${optimizationId} - Score: ${results.fitnessScore}`);
    }
  }

  // Emit optimization failure
  emitOptimizationFailed(optimizationId, error, details = {}) {
    if (this.io) {
      this.io.to('optimization').emit('optimization:failed', {
        optimizationId,
        error: error.message || error,
        details,
        status: 'FAILED',
        message: 'Optimization process failed. Please try again.',
        timestamp: new Date().toISOString()
      });
      
      console.log(`❌ Optimization failed: ${optimizationId} - ${error.message || error}`);
    }
  }

  // Emit algorithm iteration updates
  emitAlgorithmIteration(optimizationId, algorithm, iteration, bestFitness, avgFitness, convergence) {
    if (this.io) {
      this.io.to('optimization').emit('optimization:iteration', {
        optimizationId,
        algorithm,
        iteration,
        bestFitness,
        avgFitness,
        convergence,
        timestamp: new Date().toISOString()
      });
    }
  }

  // Emit schedule generation updates
  emitScheduleGeneration(optimizationId, schedulesGenerated, totalExpected, currentRoute) {
    if (this.io) {
      this.io.to('optimization').emit('optimization:schedule_generation', {
        optimizationId,
        schedulesGenerated,
        totalExpected,
        currentRoute,
        progress: Math.round((schedulesGenerated / totalExpected) * 100),
        message: `Generating schedules... ${schedulesGenerated}/${totalExpected} completed`,
        timestamp: new Date().toISOString()
      });
    }
  }

  // Emit constraint validation updates
  emitConstraintValidation(optimizationId, validatedSchedules, totalSchedules, conflicts) {
    if (this.io) {
      this.io.to('optimization').emit('optimization:validation', {
        optimizationId,
        validatedSchedules,
        totalSchedules,
        conflicts,
        progress: Math.round((validatedSchedules / totalSchedules) * 100),
        message: `Validating constraints... ${validatedSchedules}/${totalSchedules} validated`,
        timestamp: new Date().toISOString()
      });
    }
  }

  // Emit real-time metrics updates
  emitMetricsUpdate(optimizationId, metrics) {
    if (this.io) {
      this.io.to('optimization').emit('optimization:metrics', {
        optimizationId,
        metrics: {
          fitnessScore: metrics.fitnessScore,
          energyConsumption: metrics.energyConsumption,
          operationalCost: metrics.operationalCost,
          passengerSatisfaction: metrics.passengerSatisfaction,
          resourceUtilization: metrics.resourceUtilization
        },
        timestamp: new Date().toISOString()
      });
    }
  }

  // Send system notification
  sendSystemNotification(notification) {
    if (this.io) {
      this.io.emit('notification', {
        ...notification,
        timestamp: new Date().toISOString()
      });
    }
  }

  // Broadcast to all clients
  broadcast(event, data) {
    if (this.io) {
      this.io.emit(event, {
        ...data,
        timestamp: new Date().toISOString()
      });
    }
  }

  // Send to specific room
  toRoom(room, event, data) {
    if (this.io) {
      this.io.to(room).emit(event, {
        ...data,
        timestamp: new Date().toISOString()
      });
    }
  }

  // Broadcast to all connected clients
  broadcastToAll(event, data) {
    if (this.io) {
      this.io.emit(event, {
        ...data,
        timestamp: new Date().toISOString()
      });
    }
  }

  // Emit real-time train status updates
  emitTrainStatusUpdate(trainsetId, status, location, details = {}) {
    if (this.io) {
      this.io.to('trainsets').emit('train:status_update', {
        trainsetId,
        status,
        location,
        details,
        timestamp: new Date().toISOString()
      });
    }
  }

  // Emit maintenance alerts
  emitMaintenanceAlert(trainsetId, alertType, message, priority = 'medium') {
    if (this.io) {
      this.io.emit('maintenance:alert', {
        trainsetId,
        alertType,
        message,
        priority,
        timestamp: new Date().toISOString()
      });
      
      console.log(`🚨 Maintenance alert: ${trainsetId} - ${message}`);
    }
  }

  // Emit system notifications
  emitSystemNotification(type, title, message, recipients = []) {
    if (this.io) {
      const notification = {
        id: `notif_${Date.now()}`,
        type,
        title,
        message,
        recipients,
        timestamp: new Date().toISOString()
      };
      
      this.io.emit('system:notification', notification);
    }
  }

  // Emit dashboard refresh
  emitDashboardRefresh(data) {
    if (this.io) {
      this.io.emit('dashboard:refresh', {
        ...data,
        timestamp: new Date().toISOString()
      });
    }
  }

  // Get connection statistics
  getStats() {
    return {
      connectedClients: this.clients.size,
      rooms: this.io ? this.io.sockets.adapter.rooms : {},
      uptime: process.uptime()
    };
  }
}

// Export singleton instance
module.exports = new WebSocketService();
