import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import webSocketService from '@/services/websocket';

interface WebSocketContextType {
  isConnected: boolean;
  connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'failed';
  connect: () => void;
  disconnect: () => void;
  enableRealTime: boolean;
}

const WebSocketContext = createContext<WebSocketContextType>({
  isConnected: false,
  connectionStatus: 'disconnected',
  connect: () => {},
  disconnect: () => {},
  enableRealTime: false,
});

export const useWebSocketContext = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    // Fallback if provider is not found
    return {
      isConnected: false,
      connectionStatus: 'failed' as const,
      connect: () => {},
      disconnect: () => {},
      enableRealTime: false,
    };
  }
  return context;
};

interface SafeWebSocketProviderProps {
  children: React.ReactNode;
  enableRealTime?: boolean;
  onConnectionChange?: (connected: boolean) => void;
}

export const SafeWebSocketProvider: React.FC<SafeWebSocketProviderProps> = ({
  children,
  enableRealTime = true,
  onConnectionChange,
}) => {
  const { user } = useAuth();
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'failed'>('disconnected');
  const [isConnected, setIsConnected] = useState(false);

  const connect = async () => {
    if (!enableRealTime || !user || connectionStatus === 'connecting' || connectionStatus === 'connected') {
      return;
    }

    setConnectionStatus('connecting');

    try {
      const token = localStorage.getItem('kmrl_token');
      if (token) {
        await webSocketService.connect(token);
        setIsConnected(true);
        setConnectionStatus('connected');
        onConnectionChange?.(true);
        console.log('✅ WebSocket connected successfully');
      } else {
        throw new Error('No auth token available');
      }
    } catch (error) {
      console.warn('⚠️ WebSocket connection failed, continuing without real-time features:', error);
      setIsConnected(false);
      setConnectionStatus('failed');
      onConnectionChange?.(false);
    }
  };

  const disconnect = () => {
    try {
      webSocketService.disconnect();
      setIsConnected(false);
      setConnectionStatus('disconnected');
      onConnectionChange?.(false);
      console.log('🔌 WebSocket disconnected');
    } catch (error) {
      console.warn('Error during WebSocket disconnect:', error);
      // Force state update anyway
      setIsConnected(false);
      setConnectionStatus('disconnected');
    }
  };

  // Auto-connect when user is authenticated and real-time is enabled
  useEffect(() => {
    if (enableRealTime && user && connectionStatus === 'disconnected') {
      const timer = setTimeout(connect, 1000); // Delay to allow auth to settle
      return () => clearTimeout(timer);
    } else if (!user && isConnected) {
      disconnect();
    }
  }, [user, enableRealTime, connectionStatus]);

  // Setup connection event listeners
  useEffect(() => {
    const handleConnectionEstablished = () => {
      setIsConnected(true);
      setConnectionStatus('connected');
      onConnectionChange?.(true);
    };

    const handleDisconnected = () => {
      setIsConnected(false);
      setConnectionStatus('disconnected');
      onConnectionChange?.(false);
    };

    const handleReconnected = () => {
      setIsConnected(true);
      setConnectionStatus('connected');
      onConnectionChange?.(true);
    };

    const handleError = () => {
      setIsConnected(false);
      setConnectionStatus('failed');
      onConnectionChange?.(false);
    };

    // Add listeners
    webSocketService.on('connection_established', handleConnectionEstablished);
    webSocketService.on('disconnected', handleDisconnected);
    webSocketService.on('reconnected', handleReconnected);
    webSocketService.on('error', handleError);

    return () => {
      // Clean up listeners
      webSocketService.off('connection_established', handleConnectionEstablished);
      webSocketService.off('disconnected', handleDisconnected);
      webSocketService.off('reconnected', handleReconnected);
      webSocketService.off('error', handleError);
    };
  }, [onConnectionChange]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isConnected) {
        disconnect();
      }
    };
  }, []);

  const contextValue: WebSocketContextType = {
    isConnected,
    connectionStatus,
    connect,
    disconnect,
    enableRealTime,
  };

  return (
    <WebSocketContext.Provider value={contextValue}>
      {children}
    </WebSocketContext.Provider>
  );
};

export default SafeWebSocketProvider;

// Helper hook for components that need real-time data but should work without it
export const useRealTimeData = <T,>(
  fetchFunction: () => Promise<T> | T,
  wsEventName?: string,
  fallbackData?: T
) => {
  const { isConnected } = useWebSocketContext();
  const [data, setData] = useState<T | undefined>(fallbackData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch initial data
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);
        const result = await fetchFunction();
        setData(result);
      } catch (err) {
        console.warn('Failed to fetch data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load data');
        if (fallbackData) {
          setData(fallbackData);
        }
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Setup WebSocket listener for updates
  useEffect(() => {
    if (isConnected && wsEventName) {
      const handleUpdate = (updatedData: T) => {
        setData(updatedData);
        setError(null);
      };

      webSocketService.on(wsEventName, handleUpdate);

      return () => {
        webSocketService.off(wsEventName, handleUpdate);
      };
    }
  }, [isConnected, wsEventName]);

  const refresh = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await fetchFunction();
      setData(result);
    } catch (err) {
      console.warn('Failed to refresh data:', err);
      setError(err instanceof Error ? err.message : 'Failed to refresh data');
    } finally {
      setLoading(false);
    }
  };

  return {
    data,
    loading,
    error,
    isRealTime: isConnected,
    refresh,
  };
};