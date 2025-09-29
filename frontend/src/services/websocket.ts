import { io, Socket } from 'socket.io-client';
import { toast } from 'react-hot-toast';

export interface WebSocketMessage {
  type: string;
  data: any;
  timestamp: string;
}

export interface TrainsetUpdate {
  trainset: any;
  updatedBy: any;
  notes?: string;
  timestamp: string;
}

export interface ScheduleUpdate {
  schedule: any;
  updatedBy: any;
  timestamp: string;
}

export interface OptimizationUpdate {
  scheduleId?: string;
  optimizationResult: any;
  createdBy?: any;
  requestedBy?: any;
  parameters?: any;
  timestamp: string;
}

export interface EmergencyAlert {
  id: string;
  type: 'EMERGENCY';
  message: string;
  trainsetId?: string;
  priority: 'CRITICAL';
  issuedBy: any;
  timestamp: string;
}

export interface SystemNotification {
  id: string;
  type: 'INFO' | 'WARNING' | 'ERROR' | 'SUCCESS';
  title: string;
  message: string;
  targetRole?: string;
  issuedBy: any;
  timestamp: string;
}

class WebSocketService {
  private socket: Socket | null = null;
  private baseURL: string;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectDelay: number = 1000;
  private isConnecting: boolean = false;
  
  // Event handlers
  private eventHandlers: Map<string, Set<Function>> = new Map();
  
  constructor() {
    this.baseURL = process.env.REACT_APP_WS_URL || 'http://localhost:5000';
  }

  // Connect to WebSocket server
  connect(token?: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.socket?.connected) {
        resolve();
        return;
      }

      if (this.isConnecting) {
        return;
      }

      this.isConnecting = true;
      
      const authToken = token || localStorage.getItem('kmrl_token');
      
if (!authToken) {
        this.isConnecting = false;
        console.log('No auth token, skipping WebSocket connection');
        resolve();
        return;
      }

      this.socket = io(this.baseURL, {
        auth: {
          token: authToken
        },
        transports: ['websocket'],
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: this.reconnectDelay,
        timeout: 5000 // 5 second timeout
      });

      // Connection successful
      this.socket.on('connect', () => {
        console.log('✅ WebSocket connected');
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        
        // Show connection notification only in development if enabled
        if (process.env.NODE_ENV === 'development' && process.env.REACT_APP_SHOW_WS_NOTIFICATIONS === 'true') {
          toast.success('Real-time connection established', {
            duration: 2000,
            position: 'bottom-right'
          });
        }
        
        this.emit('connection_established');
        resolve();
      });

// Connection error
      this.socket.on('connect_error', (error) => {
        console.warn('⚠️ WebSocket connection failed:', error.message);
        this.isConnecting = false;
        this.socket = null;
        
        // Only show error in production or if explicitly enabled
        if (process.env.NODE_ENV === 'production' || process.env.REACT_APP_SHOW_WS_ERRORS === 'true') {
          toast.error('Real-time features unavailable', {
            duration: 3000,
            position: 'bottom-right'
          });
        }
        resolve();
      });

      // Disconnection
      this.socket.on('disconnect', (reason) => {
        console.log('🔌 WebSocket disconnected:', reason);
        
        if (reason === 'io server disconnect') {
          // Server disconnected, show warning
          toast.error('Connection lost. Please refresh the page.', {
            duration: 5000,
            position: 'bottom-right'
          });
        }
        
        this.emit('disconnected', { reason });
      });

      // Reconnection attempts
      this.socket.on('reconnect_attempt', (attemptNumber) => {
        console.log(`🔄 WebSocket reconnection attempt ${attemptNumber}/${this.maxReconnectAttempts}`);
        this.reconnectAttempts = attemptNumber;
        
        if (attemptNumber === 1) {
          toast.loading('Reconnecting...', {
            id: 'reconnecting',
            position: 'bottom-right'
          });
        }
      });

      // Reconnection successful
      this.socket.on('reconnect', () => {
        console.log('✅ WebSocket reconnected');
        this.reconnectAttempts = 0;
        
        toast.success('Connection restored', {
          id: 'reconnecting',
          duration: 2000,
          position: 'bottom-right'
        });
        
        this.emit('reconnected');
      });

      // Setup event listeners
      this.setupEventListeners();
    });
  }

  // Disconnect from WebSocket server
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    
    // Clear all event handlers
    this.eventHandlers.clear();
    
    console.log('🔌 WebSocket disconnected manually');
  }

  // Check if connected
  isConnected(): boolean {
    return !!this.socket?.connected;
  }

  // Setup event listeners for backend events
  private setupEventListeners(): void {
    if (!this.socket) return;

    // Trainset updates
    this.socket.on('trainset:updated', (data: TrainsetUpdate) => {
      console.log('📊 Trainset updated:', data);
      this.emit('trainset:updated', data);
      
      // Show notification
      toast(`Trainset ${data.trainset.trainsetNumber} updated`, {
        duration: 3000,
        position: 'bottom-right'
      });
    });

    // Schedule updates
    this.socket.on('schedule:updated', (data: ScheduleUpdate) => {
      console.log('📅 Schedule updated:', data);
      this.emit('schedule:updated', data);
      
      // Show notification
      toast(`Schedule "${data.schedule.name}" updated`, {
        duration: 3000,
        position: 'bottom-right'
      });
    });

    // Fitness certificate updates
    this.socket.on('fitness:updated', (data: any) => {
      console.log('🏥 Fitness certificate updated:', data);
      this.emit('fitness:updated', data);
      
      // Show notification
      toast('Fitness certificate updated', {
        duration: 3000,
        position: 'bottom-right'
      });
    });

    // Job card updates
    this.socket.on('jobcard:updated', (data: any) => {
      console.log('🔧 Job card updated:', data);
      this.emit('jobcard:updated', data);
      
      // Show notification
      toast('Job card updated', {
        duration: 3000,
        position: 'bottom-right'
      });
    });

    // Optimization started
    this.socket.on('optimization:started', (data: any) => {
      console.log('🤖 Optimization started:', data);
      this.emit('optimization:started', data);
      
      // Show notification
      toast.loading('Schedule optimization in progress...', {
        id: 'optimization',
        duration: 30000,
        position: 'bottom-right'
      });
    });

    // Optimization completed
    this.socket.on('optimization:completed', (data: OptimizationUpdate) => {
      console.log('✅ Optimization completed:', data);
      this.emit('optimization:completed', data);
      
      // Show success notification
      const score = Math.round(data.optimizationResult.optimizationScore * 100);
      toast.success(`Optimization completed! Score: ${score}%`, {
        id: 'optimization',
        duration: 5000,
        position: 'bottom-right'
      });
    });

    // Optimization result
    this.socket.on('optimization:result', (data: any) => {
      console.log('📈 Optimization result:', data);
      this.emit('optimization:result', data);
    });

    // Emergency alerts
    this.socket.on('emergency:alert', (data: EmergencyAlert) => {
      console.log('🚨 Emergency alert:', data);
      this.emit('emergency:alert', data);
      
      // Show critical alert
      toast.error(
        `EMERGENCY: ${data.message}${data.trainsetId ? ` (${data.trainsetId})` : ''}`,
        {
          duration: 10000,
          position: 'top-center',
          style: {
            background: '#DC2626',
            color: 'white',
            fontSize: '16px',
            fontWeight: 'bold'
          }
        }
      );
    });

    // System notifications
    this.socket.on('notification', (data: SystemNotification) => {
      console.log('📢 System notification:', data);
      this.emit('notification', data);
      
      // Show notification based on type
      const options = {
        duration: 4000,
        position: 'top-right' as const
      };
      
      switch (data.type) {
        case 'SUCCESS':
          toast.success(`${data.title}: ${data.message}`, options);
          break;
        case 'WARNING':
          toast.error(`${data.title}: ${data.message}`, options);
          break;
        case 'ERROR':
          toast.error(`${data.title}: ${data.message}`, options);
          break;
        default:
          toast(`${data.title}: ${data.message}`, options);
      }
    });

    // General error handling
    this.socket.on('error', (error: any) => {
      console.error('❌ WebSocket error:', error);
      this.emit('error', error);
      
      if (error.message) {
        toast.error(error.message, {
          duration: 5000,
          position: 'bottom-right'
        });
      }
    });

    // Ping/pong for connection health
    this.socket.on('pong', (data: any) => {
      console.log('🏓 Pong received:', data);
    });
  }

  // Subscribe to specific event types
  subscribeToTrainsets(): void {
    if (this.socket?.connected) {
      this.socket.emit('subscribe:trainsets');
      console.log('🔔 Subscribed to trainset updates');
    }
  }

  subscribeToSchedules(): void {
    if (this.socket?.connected) {
      this.socket.emit('subscribe:schedules');
      console.log('🔔 Subscribed to schedule updates');
    }
  }

  subscribeToFitness(): void {
    if (this.socket?.connected) {
      this.socket.emit('subscribe:fitness');
      console.log('🔔 Subscribed to fitness updates');
    }
  }

  subscribeToJobCards(): void {
    if (this.socket?.connected) {
      this.socket.emit('subscribe:jobcards');
      console.log('🔔 Subscribed to job card updates');
    }
  }

  subscribeToOptimization(): void {
    if (this.socket?.connected) {
      this.socket.emit('subscribe:optimization');
      console.log('🔔 Subscribed to optimization updates');
    }
  }

  subscribeToUsers(): void {
    if (this.socket?.connected) {
      this.socket.emit('subscribe:users');
      console.log('🔔 Subscribed to user updates');
    }
  }

  // Send events to server
  requestOptimization(parameters: any): void {
    if (this.socket?.connected) {
      this.socket.emit('request:optimization', parameters);
      console.log('📨 Optimization request sent:', parameters);
    }
  }

  updateTrainsetStatus(data: { trainsetId: string; status: string; location?: string; notes?: string }): void {
    if (this.socket?.connected) {
      this.socket.emit('trainset:status:update', data);
      console.log('📨 Trainset status update sent:', data);
    }
  }

  sendEmergencyAlert(data: { message: string; trainsetId?: string }): void {
    if (this.socket?.connected) {
      this.socket.emit('emergency:alert', data);
      console.log('📨 Emergency alert sent:', data);
    }
  }

  sendSystemNotification(data: {
    type: 'INFO' | 'WARNING' | 'ERROR' | 'SUCCESS';
    title: string;
    message: string;
    targetRole?: string;
  }): void {
    if (this.socket?.connected) {
      this.socket.emit('system:notification', data);
      console.log('📨 System notification sent:', data);
    }
  }

  // Health check
  ping(): void {
    if (this.socket?.connected) {
      this.socket.emit('ping');
    }
  }


  // Event handler management
  on(event: string, handler: Function): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)?.add(handler);
  }

  off(event: string, handler: Function): void {
    this.eventHandlers.get(event)?.delete(handler);
  }

  private emit(event: string, data?: any): void {
    this.eventHandlers.get(event)?.forEach(handler => {
      try {
        handler(data);
      } catch (error) {
        console.error(`Error in event handler for ${event}:`, error);
      }
    });
  }
}

// Export singleton instance
export const webSocketService = new WebSocketService();
export default webSocketService;
