import { api, setAuthToken } from './api';
import { User, AuthState } from '@/types';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: User;
  tokens: {
    access: string;
    refresh: string;
  };
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface RegisterRequest {
  firstName: string;
  lastName: string;
  email: string;
  username: string;
  password: string;
}

export interface RegisterResponse {
  success: boolean;
  message: string;
  user?: User;
}

class AuthService {
  // Login user
  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    // Check for demo credentials first to avoid unnecessary network calls
    if (this.isDemoCredentials(credentials)) {
      console.log('Demo credentials detected, using offline authentication');
      return this.createDemoUser(credentials.email);
    }

    // Convert email to identifier for backend compatibility
    const backendCredentials = {
      identifier: credentials.email,
      password: credentials.password
    };

    try {
      const response = await api.post<any>('/api/auth/login', backendCredentials);

      if (response.success && response.data) {
        const backendUser = response.data.user;
        const backendToken = response.data.token;

        // Normalize user data to match frontend expectations
        const normalizedUser: User = {
          id: backendUser._id || backendUser.id,
          email: backendUser.email,
          username: backendUser.username || backendUser.email,
          firstName: backendUser.firstName,
          lastName: backendUser.lastName,
          role: backendUser.role?.toUpperCase() || 'USER',
          permissions: this.getDefaultPermissions(backendUser.role?.toUpperCase() || 'USER'),
          isActive: backendUser.isActive !== false,
          lastLoginAt: backendUser.lastLogin || new Date().toISOString(),
          createdAt: backendUser.createdAt || new Date().toISOString(),
          updatedAt: backendUser.updatedAt || new Date().toISOString(),
        } as User;

        // Create tokens object (backend only provides access token)
        const tokens = {
          access: backendToken,
          refresh: backendToken // Use same token as refresh for now
        };

        // Store tokens and user
        localStorage.setItem('kmrl_token', tokens.access);
        localStorage.setItem('kmrl_refresh_token', tokens.refresh);
        localStorage.setItem('kmrl_user', JSON.stringify(normalizedUser));

        // Set auth header
        setAuthToken(tokens.access);

        return { user: normalizedUser, tokens };
      }

      throw new Error(response.message || 'Login failed');
    } catch (error: any) {
      // Check if it's a network error (ECONNREFUSED, network error, etc.)
      const isNetworkError = error.code === 'ECONNREFUSED' || 
                             error.message?.includes('Network Error') ||
                             error.message?.includes('ECONNREFUSED') ||
                             !error.response;
      
      if (isNetworkError) {
        console.warn('Backend unavailable, checking for demo credentials:', error.message);
        
        // For network errors, try demo authentication with any reasonable credentials
        if (this.isValidDemoAttempt(credentials)) {
          return this.createDemoUser(credentials.email);
        }
      }
      
      // For non-network errors or invalid demo credentials, throw the original error
      const errorMessage = error.response?.data?.message || error.message || 'Login failed';
      throw new Error(errorMessage);
    }
  }

  // Predefined demo users with unique details and roles
  private getDemoUsers() {
    return [
      {
        email: 'admin@kmrl.com',
        password: 'admin123',
        role: 'ADMIN',
        firstName: 'Omkar',
        lastName: 'Kadam',
        employeeId: 'KMRL-ADM-001',
        department: 'Administration',
        permissions: ['all']
      },
      {
        email: 'operator@kmrl.com',
        password: 'demo123',
        role: 'OPERATOR',
        firstName: 'Sukanya',
        lastName: 'Jhadav',
        employeeId: 'KMRL-OPR-101',
        department: 'Operations',
        permissions: ['schedules:read', 'trainsets:read']
      },
      {
        email: 'supervisor@kmrl.com',
        password: 'super123',
        role: 'SUPERVISOR',
        firstName: 'Girishma',
        lastName: 'Shinde',
        employeeId: 'KMRL-SUP-201',
        department: 'Operations Management',
        permissions: ['schedules:write', 'trainsets:write', 'analytics:read']
      },
      {
        email: 'maintenance@kmrl.com',
        password: 'maint123',
        role: 'MAINTENANCE',
        firstName: 'Sushila',
        lastName: 'Nair',
        employeeId: 'KMRL-MNT-301',
        department: 'Maintenance & Engineering',
        permissions: ['jobcards:write', 'fitness:write', 'diagnostics:read']
      }
    ];
  }

  // Check if credentials are demo credentials
  private isDemoCredentials(credentials: LoginCredentials): boolean {
    return this.getDemoUsers().some(u => u.email === credentials.email && u.password === credentials.password);
  }

  // Check if credentials could be valid for demo (more permissive for network errors)
  private isValidDemoAttempt(credentials: LoginCredentials): boolean {
    // Check predefined demo users first
    if (this.isDemoCredentials(credentials)) {
      return true;
    }
    
    // Check registered demo users
    const demoUsers = JSON.parse(localStorage.getItem('kmrl_demo_users') || '[]');
    const registeredUser = demoUsers.find((u: any) => 
      u.email === credentials.email && u.password === credentials.password
    );
    if (registeredUser) {
      return true;
    }
    
    // Allow any KMRL email with reasonable password for new registrations
    const isKMRLEmail = credentials.email.includes('@kmrl.com') || 
                        credentials.email.includes('kmrl') ||
                        credentials.email.includes('admin') ||
                        credentials.email.includes('demo');
    
    const hasValidPassword = credentials.password && credentials.password.length >= 3;
    
    // Also allow any credentials that look reasonable for demo purposes
    const looksReasonable = credentials.email.includes('@') && !!hasValidPassword;
    
    return isKMRLEmail || looksReasonable;
  }

  // Create demo user for fallback
  private createDemoUser(email: string): LoginResponse {
    // First, check for exact predefined demo users
    const predefinedUser = this.getDemoUsers().find(u => u.email === email);
    
    // Then check for registered demo users
    const demoUsers = JSON.parse(localStorage.getItem('kmrl_demo_users') || '[]');
    const registeredUser = demoUsers.find((u: any) => u.email === email);
    
    let userDetails;
    if (predefinedUser) {
      // Use predefined demo user with specific details
      userDetails = {
        role: predefinedUser.role,
        firstName: predefinedUser.firstName,
        lastName: predefinedUser.lastName,
        employeeId: predefinedUser.employeeId,
        department: predefinedUser.department,
        permissions: predefinedUser.permissions
      };
    } else if (registeredUser) {
      // Use registered demo user details
      userDetails = {
        role: registeredUser.role,
        firstName: registeredUser.firstName,
        lastName: registeredUser.lastName,
        employeeId: registeredUser.employeeId,
        department: registeredUser.department,
        permissions: this.getDefaultPermissions(registeredUser.role).map((p: any) => p.name)
      };
    } else {
      // Fallback for any other email (new user registration or unknown demo)
      const emailLower = email.toLowerCase();
      
      if (emailLower.includes('admin')) {
        userDetails = {
          role: 'ADMIN',
          firstName: 'New Admin',
          lastName: 'User',
          employeeId: `KMRL-ADM-${Date.now().toString().slice(-3)}`,
          department: 'Administration',
          permissions: this.getDefaultPermissions('ADMIN').map(p => p.name)
        };
      } else if (emailLower.includes('supervisor') || emailLower.includes('super')) {
        userDetails = {
          role: 'SUPERVISOR',
          firstName: 'New Supervisor',
          lastName: 'User',
          employeeId: `KMRL-SUP-${Date.now().toString().slice(-3)}`,
          department: 'Operations Management',
          permissions: this.getDefaultPermissions('SUPERVISOR').map(p => p.name)
        };
      } else if (emailLower.includes('maintenance') || emailLower.includes('maint')) {
        userDetails = {
          role: 'MAINTENANCE',
          firstName: 'New Maintenance',
          lastName: 'Staff',
          employeeId: `KMRL-MNT-${Date.now().toString().slice(-3)}`,
          department: 'Maintenance & Engineering',
          permissions: this.getDefaultPermissions('MAINTENANCE').map(p => p.name)
        };
      } else if (emailLower.includes('operator')) {
        userDetails = {
          role: 'OPERATOR',
          firstName: 'New Operator',
          lastName: 'User',
          employeeId: `KMRL-OPR-${Date.now().toString().slice(-3)}`,
          department: 'Operations',
          permissions: this.getDefaultPermissions('OPERATOR').map(p => p.name)
        };
      } else {
        // Default for new general users
        userDetails = {
          role: 'USER',
          firstName: email.split('@')[0].charAt(0).toUpperCase() + email.split('@')[0].slice(1),
          lastName: 'User',
          employeeId: `KMRL-USR-${Date.now().toString().slice(-3)}`,
          department: 'General',
          permissions: this.getDefaultPermissions('USER').map(p => p.name)
        };
      }
    }

    // Create the user object with enhanced details
    const normalizedUser: User = {
      id: (predefinedUser || registeredUser) ? userDetails.employeeId : `demo-user-${Date.now()}`,
      email,
      username: email.split('@')[0],
      firstName: userDetails.firstName,
      lastName: userDetails.lastName,
      role: userDetails.role as any,
      permissions: userDetails.permissions.includes('all') 
        ? this.getDefaultPermissions(userDetails.role)
        : this.convertPermissionsList(userDetails.permissions),
      isActive: true,
      lastLoginAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      // Additional fields for enhanced user info
      employeeId: userDetails.employeeId,
      department: userDetails.department,
    } as User & { employeeId: string; department: string };

    const demoToken = 'demo-token-' + Date.now();
    const tokens = {
      access: demoToken,
      refresh: demoToken
    };

    // Store tokens and user
    localStorage.setItem('kmrl_token', tokens.access);
    localStorage.setItem('kmrl_refresh_token', tokens.refresh);
    localStorage.setItem('kmrl_user', JSON.stringify(normalizedUser));

    // Set auth header
    setAuthToken(tokens.access);

    console.log('Demo user created:', normalizedUser);
    return { user: normalizedUser, tokens };
  }

  // Helper to convert permission strings to permission objects
  private convertPermissionsList(permissionNames: string[]) {
    return permissionNames.map((name, index) => ({
      id: (index + 1).toString(),
      name,
      description: `Permission: ${name}`,
      module: name.split(':')[0] || 'general'
    }));
  }

  // Logout user
  async logout(): Promise<void> {
    try {
      // Call logout endpoint (backend expects empty body)
      await api.post('/api/auth/logout', {});
    } catch (error) {
      console.error('Logout API error:', error);
      // Don't throw error for logout API failure
    } finally {
      // Clear local storage
      localStorage.removeItem('kmrl_token');
      localStorage.removeItem('kmrl_refresh_token');
      localStorage.removeItem('kmrl_user');
      
      // Clear auth header
      setAuthToken(null);
      
      // Clear any application caches if needed
      if ('caches' in window) {
        caches.keys().then(names => {
          names.forEach(name => {
            if (name.startsWith('kmrl-')) {
              caches.delete(name);
            }
          });
        }).catch(console.error);
      }
      
      // Don't redirect from service - let the component handle navigation
      // The useAuth hook will detect the logout and handle navigation
    }
  }

  // Get current user profile
  async getCurrentUser(): Promise<User> {
    const response = await api.get<any>('/api/user/profile');
    
    if (response.success && response.data) {
      const backendUser = response.data.user;
      
      // Normalize user data
      const normalizedUser: User = {
        id: backendUser._id || backendUser.id,
        email: backendUser.email,
        username: backendUser.email, // Use email as username since backend doesn't have username field
        firstName: backendUser.firstName,
        lastName: backendUser.lastName,
        role: backendUser.role?.toUpperCase() || 'USER',
        permissions: this.getDefaultPermissions(backendUser.role?.toUpperCase() || 'USER'),
        isActive: backendUser.isActive !== false,
        lastLoginAt: backendUser.lastLogin || new Date().toISOString(),
        createdAt: backendUser.createdAt || new Date().toISOString(),
        updatedAt: backendUser.updatedAt || new Date().toISOString(),
      } as User;
      
      // Update stored user data
      localStorage.setItem('kmrl_user', JSON.stringify(normalizedUser));
      return normalizedUser;
    }
    
    throw new Error(response.message || 'Failed to get user profile');
  }

  // Refresh access token
  async refreshToken(): Promise<string> {
    const refreshToken = localStorage.getItem('kmrl_refresh_token');
    
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await api.post<{ tokens: { access: string; refresh: string } }>('/api/auth/refresh', {
      refreshToken,
    });

    if (response.success && response.data) {
      const { access } = response.data.tokens;
      
      // Update stored token
      localStorage.setItem('kmrl_token', access);
      setAuthToken(access);
      
      return access;
    }
    
    throw new Error(response.error || 'Token refresh failed');
  }

  // Register user
  async register(request: RegisterRequest): Promise<RegisterResponse> {
    try {
      const response = await api.post<any>('/api/auth/signup', request);
      
      if (response.success) {
        return {
          success: true,
          message: response.message || 'Registration successful',
          user: response.data?.user || null,
        };
      }
      
      throw new Error(response.message || response.error || 'Registration failed');
    } catch (error: any) {
      const isNetworkError = error.code === 'ECONNREFUSED' || 
                             error.message?.includes('Network Error') ||
                             error.message?.includes('ECONNREFUSED') ||
                             !error.response;
      
      if (isNetworkError) {
        console.warn('Backend unavailable, using demo registration:', error.message);
        
        // Store new user in localStorage for demo purposes
        const demoUsers = JSON.parse(localStorage.getItem('kmrl_demo_users') || '[]');
        const newUser = {
          email: request.email,
          password: request.password, // In real app, this would be hashed
          firstName: request.firstName,
          lastName: request.lastName,
          username: request.username,
          role: 'USER',
          employeeId: `KMRL-REG-${Date.now().toString().slice(-3)}`,
          department: 'General',
          createdAt: new Date().toISOString()
        };
        
        // Check if user already exists
        if (demoUsers.some((u: any) => u.email === request.email)) {
          throw new Error('User with this email already exists');
        }
        
        demoUsers.push(newUser);
        localStorage.setItem('kmrl_demo_users', JSON.stringify(demoUsers));
        
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        return {
          success: true,
          message: 'Account created successfully! You can now sign in with your credentials.',
          user: undefined, // Don't auto-login on registration
        };
      }
      
      // For non-network errors, throw the original error
      throw error;
    }
  }

  // Change password
  async changePassword(request: ChangePasswordRequest): Promise<void> {
    const response = await api.post('/api/auth/change-password', request);
    
    if (!response.success) {
      throw new Error(response.error || 'Password change failed');
    }
  }

  // Get stored authentication state
  getStoredAuthState(): AuthState {
    const token = localStorage.getItem('kmrl_token');
    const userStr = localStorage.getItem('kmrl_user');
    const refreshToken = localStorage.getItem('kmrl_refresh_token');
    
    let user: User | null = null;
    
    if (userStr) {
      try {
        user = JSON.parse(userStr);
      } catch (error) {
        console.error('Error parsing stored user data:', error);
      }
    }

    return {
      user,
      token,
      refreshToken,
      isAuthenticated: !!(token && user),
      isLoading: false,
    };
  }

  // Initialize auth (set token if available)
  initializeAuth(): void {
    const token = localStorage.getItem('kmrl_token');
    if (token) {
      setAuthToken(token);
    }
  }

  // Check if user has permission
  hasPermission(user: User | null, permission: string): boolean {
    if (!user) return false;
    
    // Admin-only permissions
    if (permission.startsWith('admin:')) {
      return user.role === 'ADMIN';
    }
    
    // Admins have all non-admin permissions
    if (user.role === 'ADMIN') return true;
    
    // Check specific permission
    return user.permissions.some(p => p.name === permission);
  }

  // Check if user has role
  hasRole(user: User | null, role: string): boolean {
    if (!user) return false;
    return user.role === role;
  }

  // Check if user can access module
  canAccessModule(user: User | null, module: string): boolean {
    if (!user) return false;
    
    // Admins can access all modules
    if (user.role === 'ADMIN') return true;
    
    // Check if user has any permission for the module
    return user.permissions.some(p => p.module === module);
  }

  // Get default permissions based on user role
  private getDefaultPermissions(role: string): { id: string; name: string; description: string; module: string }[] {
    const basePermissions = [
      { id: '1', name: 'trainsets:read', description: 'View trainsets', module: 'trainsets' },
      { id: '2', name: 'schedules:read', description: 'View schedules', module: 'schedules' },
      { id: '3', name: 'optimization:read', description: 'View optimization data', module: 'optimization' },
      { id: '4', name: 'fitness:read', description: 'View fitness certificates', module: 'fitness' },
      { id: '5', name: 'jobcards:read', description: 'View job cards', module: 'jobcards' },
      { id: '6', name: 'whatif:read', description: 'View what-if simulator', module: 'whatif' },
      { id: '7', name: 'analytics:read', description: 'View analytics', module: 'analytics' },
      { id: '8', name: 'settings:read', description: 'View settings', module: 'settings' },
    ];

    switch (role) {
      case 'ADMIN':
        // Admins get all permissions including user management
        return [
          ...basePermissions,
          { id: '9', name: 'admin:users', description: 'Manage users', module: 'admin' },
          { id: '10', name: 'trainsets:write', description: 'Edit trainsets', module: 'trainsets' },
          { id: '11', name: 'schedules:write', description: 'Edit schedules', module: 'schedules' },
          { id: '12', name: 'settings:write', description: 'Edit settings', module: 'settings' },
        ];
      
      case 'SUPERVISOR':
        // Supervisors get most permissions but not user management
        return [
          ...basePermissions,
          { id: '10', name: 'trainsets:write', description: 'Edit trainsets', module: 'trainsets' },
          { id: '11', name: 'schedules:write', description: 'Edit schedules', module: 'schedules' },
        ];
      
      case 'MAINTENANCE':
        // Maintenance staff get relevant permissions
        return [
          ...basePermissions,
          { id: '13', name: 'jobcards:write', description: 'Edit job cards', module: 'jobcards' },
          { id: '14', name: 'fitness:write', description: 'Edit fitness certificates', module: 'fitness' },
        ];
      
      case 'OPERATOR':
      case 'USER':
      default:
        // Regular users and operators get read-only access
        return basePermissions;
    }
  }
}

export const authService = new AuthService();
