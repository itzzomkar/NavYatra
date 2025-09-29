import { useState, useEffect, useCallback } from 'react';
import { authService, LoginCredentials, ChangePasswordRequest } from '@/services/auth';
import { User, AuthState } from '@/types';
import toast from 'react-hot-toast';

interface UseAuthReturn {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  changePassword: (request: ChangePasswordRequest) => Promise<void>;
  hasPermission: (permission: string) => boolean;
  hasRole: (role: string) => boolean;
  canAccessModule: (module: string) => boolean;
}

export const useAuth = (): UseAuthReturn => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    token: null,
    refreshToken: null,
    isAuthenticated: false,
    isLoading: true,
  });

  // Initialize auth state from storage
  useEffect(() => {
    const storedAuthState = authService.getStoredAuthState();
    setAuthState({ ...storedAuthState, isLoading: false });
  }, []);

  // Login function
  const login = useCallback(async (credentials: LoginCredentials) => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true }));
      
      const response = await authService.login(credentials);
      
      setAuthState({
        user: response.user,
        token: response.tokens.access,
        refreshToken: response.tokens.refresh,
        isAuthenticated: true,
        isLoading: false,
      });
      
      toast.success('Login successful', {
        duration: 2000,
        id: 'login-success',
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Login failed';
      toast.error(errorMessage);
      
      setAuthState(prev => ({ ...prev, isLoading: false }));
      throw error;
    }
  }, []);

  // Logout function
  const logout = useCallback(async () => {
    try {
      // Immediately clear state first
      setAuthState({
        user: null,
        token: null,
        refreshToken: null,
        isAuthenticated: false,
        isLoading: false,
      });
      
      // Then call logout service (non-blocking)
      authService.logout().catch(console.error);
      
    } catch (error) {
      console.error('Logout error:', error);
      
      // Always clear state regardless of errors
      setAuthState({
        user: null,
        token: null,
        refreshToken: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  }, []);

  // Refresh user data
  const refreshUser = useCallback(async () => {
    try {
      if (!authState.isAuthenticated) return;
      
      const user = await authService.getCurrentUser();
      
      setAuthState(prev => ({
        ...prev,
        user,
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to refresh user data';
      toast.error(errorMessage);
      
      // If refresh fails, user might need to login again
      await logout();
    }
  }, [authState.isAuthenticated, logout]);

  // Change password
  const changePassword = useCallback(async (request: ChangePasswordRequest) => {
    try {
      await authService.changePassword(request);
      toast.success('Password changed successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Password change failed';
      toast.error(errorMessage);
      throw error;
    }
  }, []);

  // Permission check
  const hasPermission = useCallback((permission: string): boolean => {
    return authService.hasPermission(authState.user, permission);
  }, [authState.user]);

  // Role check
  const hasRole = useCallback((role: string): boolean => {
    return authService.hasRole(authState.user, role);
  }, [authState.user]);

  // Module access check
  const canAccessModule = useCallback((module: string): boolean => {
    return authService.canAccessModule(authState.user, module);
  }, [authState.user]);

  return {
    user: authState.user,
    isAuthenticated: authState.isAuthenticated,
    isLoading: authState.isLoading,
    login,
    logout,
    refreshUser,
    changePassword,
    hasPermission,
    hasRole,
    canAccessModule,
  };
};
