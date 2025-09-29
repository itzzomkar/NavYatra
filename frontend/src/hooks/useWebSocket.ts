import { useEffect, useCallback, useRef } from 'react';
import { useAuth } from './useAuth';
import webSocketService, { 
  TrainsetUpdate, 
  ScheduleUpdate, 
  OptimizationUpdate, 
  EmergencyAlert, 
  SystemNotification 
} from '../services/websocket';

export interface UseWebSocketOptions {
  autoConnect?: boolean;
  subscriptions?: Array<'trainsets' | 'schedules' | 'fitness' | 'jobcards' | 'optimization' | 'users'>;
  onTrainsetUpdate?: (data: TrainsetUpdate) => void;
  onScheduleUpdate?: (data: ScheduleUpdate) => void;
  onOptimizationUpdate?: (data: OptimizationUpdate) => void;
  onOptimizationStarted?: (data: any) => void;
  onOptimizationResult?: (data: any) => void;
  onEmergencyAlert?: (data: EmergencyAlert) => void;
  onSystemNotification?: (data: SystemNotification) => void;
  onFitnessUpdate?: (data: any) => void;
  onJobCardUpdate?: (data: any) => void;
  onConnectionEstablished?: () => void;
  onConnectionLost?: (reason: string) => void;
  onReconnected?: () => void;
  onError?: (error: any) => void;
}

export interface UseWebSocketReturn {
  isConnected: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  subscribeToTrainsets: () => void;
  subscribeToSchedules: () => void;
  subscribeToFitness: () => void;
  subscribeToJobCards: () => void;
  subscribeToOptimization: () => void;
  subscribeToUsers: () => void;
  requestOptimization: (parameters: any) => void;
  updateTrainsetStatus: (data: { trainsetId: string; status: string; location?: string; notes?: string }) => void;
  sendEmergencyAlert: (data: { message: string; trainsetId?: string }) => void;
  sendSystemNotification: (data: {
    type: 'INFO' | 'WARNING' | 'ERROR' | 'SUCCESS';
    title: string;
    message: string;
    targetRole?: string;
  }) => void;
  ping: () => void;
}

export const useWebSocket = (options: UseWebSocketOptions = {}): UseWebSocketReturn => {
  const {
    autoConnect = true,
    subscriptions = [],
    onTrainsetUpdate,
    onScheduleUpdate,
    onOptimizationUpdate,
    onOptimizationStarted,
    onOptimizationResult,
    onEmergencyAlert,
    onSystemNotification,
    onFitnessUpdate,
    onJobCardUpdate,
    onConnectionEstablished,
    onConnectionLost,
    onReconnected,
    onError
  } = options;

  const { user } = useAuth();
  const token = localStorage.getItem('kmrl_token');
  const handlersRef = useRef<Map<string, Function>>(new Map());

  // Connect to WebSocket
  const connect = useCallback(async () => {
    if (!token) {
      console.warn('Cannot connect to WebSocket: No authentication token');
      return;
    }

    try {
      await webSocketService.connect(token);
      
      // Auto-subscribe to requested event types
      subscriptions.forEach(subscription => {
        try {
          switch (subscription) {
            case 'trainsets':
              webSocketService.subscribeToTrainsets();
              break;
            case 'schedules':
              webSocketService.subscribeToSchedules();
              break;
            case 'fitness':
              webSocketService.subscribeToFitness();
              break;
            case 'jobcards':
              webSocketService.subscribeToJobCards();
              break;
            case 'optimization':
              webSocketService.subscribeToOptimization();
              break;
            case 'users':
              webSocketService.subscribeToUsers();
              break;
          }
        } catch (subError) {
          console.warn(`Failed to subscribe to ${subscription}:`, subError);
        }
      });

    } catch (error) {
      console.warn('WebSocket connection failed, real-time features disabled:', error);
      // Don't throw - allow components to continue working without WebSocket
    }
  }, [token, subscriptions]);

  // Disconnect from WebSocket
  const disconnect = useCallback(() => {
    webSocketService.disconnect();
  }, []);

  // Setup event handlers
  useEffect(() => {
    const handlers = new Map<string, Function>();

    // Trainset updates
    if (onTrainsetUpdate) {
      const handler = (data: TrainsetUpdate) => onTrainsetUpdate(data);
      handlers.set('trainset:updated', handler);
      webSocketService.on('trainset:updated', handler);
    }

    // Schedule updates
    if (onScheduleUpdate) {
      const handler = (data: ScheduleUpdate) => onScheduleUpdate(data);
      handlers.set('schedule:updated', handler);
      webSocketService.on('schedule:updated', handler);
    }

    // Optimization updates
    if (onOptimizationUpdate) {
      const handler = (data: OptimizationUpdate) => onOptimizationUpdate(data);
      handlers.set('optimization:completed', handler);
      webSocketService.on('optimization:completed', handler);
    }

    // Optimization started
    if (onOptimizationStarted) {
      const handler = (data: any) => onOptimizationStarted(data);
      handlers.set('optimization:started', handler);
      webSocketService.on('optimization:started', handler);
    }

    // Optimization result
    if (onOptimizationResult) {
      const handler = (data: any) => onOptimizationResult(data);
      handlers.set('optimization:result', handler);
      webSocketService.on('optimization:result', handler);
    }

    // Emergency alerts
    if (onEmergencyAlert) {
      const handler = (data: EmergencyAlert) => onEmergencyAlert(data);
      handlers.set('emergency:alert', handler);
      webSocketService.on('emergency:alert', handler);
    }

    // System notifications
    if (onSystemNotification) {
      const handler = (data: SystemNotification) => onSystemNotification(data);
      handlers.set('notification', handler);
      webSocketService.on('notification', handler);
    }

    // Fitness updates
    if (onFitnessUpdate) {
      const handler = (data: any) => onFitnessUpdate(data);
      handlers.set('fitness:updated', handler);
      webSocketService.on('fitness:updated', handler);
    }

    // Job card updates
    if (onJobCardUpdate) {
      const handler = (data: any) => onJobCardUpdate(data);
      handlers.set('jobcard:updated', handler);
      webSocketService.on('jobcard:updated', handler);
    }

    // Connection events
    if (onConnectionEstablished) {
      const handler = () => onConnectionEstablished();
      handlers.set('connection_established', handler);
      webSocketService.on('connection_established', handler);
    }

    if (onConnectionLost) {
      const handler = (data: { reason: string }) => onConnectionLost(data.reason);
      handlers.set('disconnected', handler);
      webSocketService.on('disconnected', handler);
    }

    if (onReconnected) {
      const handler = () => onReconnected();
      handlers.set('reconnected', handler);
      webSocketService.on('reconnected', handler);
    }

    if (onError) {
      const handler = (error: any) => onError(error);
      handlers.set('error', handler);
      webSocketService.on('error', handler);
    }

    handlersRef.current = handlers;

    // Cleanup handlers on unmount
    return () => {
      handlers.forEach((handler, event) => {
        webSocketService.off(event, handler);
      });
      handlers.clear();
    };
  }, [
    onTrainsetUpdate,
    onScheduleUpdate,
    onOptimizationUpdate,
    onOptimizationStarted,
    onOptimizationResult,
    onEmergencyAlert,
    onSystemNotification,
    onFitnessUpdate,
    onJobCardUpdate,
    onConnectionEstablished,
    onConnectionLost,
    onReconnected,
    onError
  ]);

  // Auto-connect when authenticated
  useEffect(() => {
    if (autoConnect && user && token && !webSocketService.isConnected()) {
      connect();
    }

    // Disconnect when user logs out
    return () => {
      if (!user && webSocketService.isConnected()) {
        disconnect();
      }
    };
  }, [user, token, autoConnect, connect, disconnect]);

  // Subscription methods
  const subscribeToTrainsets = useCallback(() => {
    webSocketService.subscribeToTrainsets();
  }, []);

  const subscribeToSchedules = useCallback(() => {
    webSocketService.subscribeToSchedules();
  }, []);

  const subscribeToFitness = useCallback(() => {
    webSocketService.subscribeToFitness();
  }, []);

  const subscribeToJobCards = useCallback(() => {
    webSocketService.subscribeToJobCards();
  }, []);

  const subscribeToOptimization = useCallback(() => {
    webSocketService.subscribeToOptimization();
  }, []);

  const subscribeToUsers = useCallback(() => {
    webSocketService.subscribeToUsers();
  }, []);

  // Action methods
  const requestOptimization = useCallback((parameters: any) => {
    webSocketService.requestOptimization(parameters);
  }, []);

  const updateTrainsetStatus = useCallback((data: { 
    trainsetId: string; 
    status: string; 
    location?: string; 
    notes?: string;
  }) => {
    webSocketService.updateTrainsetStatus(data);
  }, []);

  const sendEmergencyAlert = useCallback((data: { 
    message: string; 
    trainsetId?: string;
  }) => {
    webSocketService.sendEmergencyAlert(data);
  }, []);

  const sendSystemNotification = useCallback((data: {
    type: 'INFO' | 'WARNING' | 'ERROR' | 'SUCCESS';
    title: string;
    message: string;
    targetRole?: string;
  }) => {
    webSocketService.sendSystemNotification(data);
  }, []);

  const ping = useCallback(() => {
    webSocketService.ping();
  }, []);

  return {
    isConnected: webSocketService.isConnected(),
    connect,
    disconnect,
    subscribeToTrainsets,
    subscribeToSchedules,
    subscribeToFitness,
    subscribeToJobCards,
    subscribeToOptimization,
    subscribeToUsers,
    requestOptimization,
    updateTrainsetStatus,
    sendEmergencyAlert,
    sendSystemNotification,
    ping
  };
};

export default useWebSocket;
