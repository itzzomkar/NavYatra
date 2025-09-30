import { useState, useEffect, useCallback } from 'react';
import { authService, LoginCredentials, ChangePasswordRequest } from '../services/auth';
import { User, AuthState, UserRole } from '../types';
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
  const isDemoMode = process.env.REACT_APP_DEMO_MODE === 'true';
  
  // Demo user for public access
  const demoUser: User = {
    id: 'demo-user',
    email: 'demo@kmrl.com',
    firstName: 'Demo',
    lastName: 'User',
    role: UserRole.ADMIN,
    permissions: [
      { name: 'optimization:create', description: 'Create optimization requests', module: 'optimization' },
      { name: 'optimization:read', description: 'View optimization results', module: 'optimization' },
      { name: 'optimization:write', description: 'Modify optimization settings', module: 'optimization' },
      { name: 'optimization:delete', description: 'Delete optimization requests', module: 'optimization' },
      { name: 'fitness:read', description: 'View fitness certificates', module: 'fitness' },
      { name: 'fitness:write', description: 'Manage fitness certificates', module: 'fitness' },
      { name: 'trainsets:read', description: 'View trainset information', module: 'trainsets' },
      { name: 'trainsets:write', description: 'Manage trainset information', module: 'trainsets' },
      { name: 'schedules:read', description: 'View schedules', module: 'schedules' },
      { name: 'schedules:write', description: 'Manage schedules', module: 'schedules' },
      { name: 'jobcards:read', description: 'View job cards', module: 'jobcards' },
      { name: 'jobcards:write', description: 'Manage job cards', module: 'jobcards' },
      { name: 'analytics:read', description: 'View analytics data', module: 'analytics' },
      { name: 'users:read', description: 'View user information', module: 'users' },
      { name: 'users:write', description: 'Manage users', module: 'users' }
    ],
    isActive: true,
    createdAt: new Date().toISOString(),
    lastLogin: new Date().toISOString()
  };
  
  const [authState, setAuthState] = useState<AuthState>({
    user: isDemoMode ? demoUser : null,
    token: isDemoMode ? 'demo-token' : null,
    refreshToken: isDemoMode ? 'demo-refresh' : null,
    isAuthenticated: isDemoMode,
    isLoading: !isDemoMode, // Don't show loading in demo mode
  });

  // Initialize auth state from storage
  useEffect(() => {
    if (isDemoMode) {
      // In demo mode, keep demo user and skip storage check
      setAuthState({
        user: demoUser,
        token: 'demo-token',
        refreshToken: 'demo-refresh',
        isAuthenticated: true,
        isLoading: false,
      });
    } else {
      const storedAuthState = authService.getStoredAuthState();
      setAuthState({ ...storedAuthState, isLoading: false });
    }
  }, [isDemoMode]);

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
    if (isDemoMode) return true; // Demo user has all permissions
    return authService.hasPermission(authState.user, permission);
  }, [authState.user, isDemoMode]);

  // Role check
  const hasRole = useCallback((role: string): boolean => {
    if (isDemoMode) return true; // Demo user has all roles
    return authService.hasRole(authState.user, role);
  }, [authState.user, isDemoMode]);

  // Module access check
  const canAccessModule = useCallback((module: string): boolean => {
    if (isDemoMode) return true; // Demo user can access all modules
    return authService.canAccessModule(authState.user, module);
  }, [authState.user, isDemoMode]);

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
