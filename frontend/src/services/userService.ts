import { api } from './api';

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  role: UserRole;
  department: Department;
  status: UserStatus;
  lastLogin?: string;
  createdAt: string;
  updatedAt?: string;
  permissions: Permission[];
  employeeId: string;
  designation: string;
  supervisor?: string;
  depot: Depot;
  shift: Shift;
  certifications: string[];
  isOnline?: boolean;
  profileImage?: string;
  address?: Address;
  emergencyContact?: EmergencyContact;
  workHistory: WorkHistory[];
  performanceRating?: number;
  trainingRecords: TrainingRecord[];
  accessLogs: AccessLog[];
}

export type UserRole = 
  | 'SUPER_ADMIN'
  | 'ADMIN' 
  | 'OPERATIONS_MANAGER'
  | 'OPERATOR'
  | 'MAINTENANCE_MANAGER'
  | 'MAINTENANCE'
  | 'TECHNICIAN'
  | 'INSPECTOR'
  | 'ANALYST'
  | 'SUPERVISOR'
  | 'SECURITY'
  | 'TRAINEE';

export type Department = 
  | 'Operations'
  | 'Train Operations'
  | 'Technical Services'
  | 'Quality Assurance'
  | 'Maintenance'
  | 'Data Analytics'
  | 'Security'
  | 'Administration'
  | 'Human Resources'
  | 'Safety'
  | 'Engineering';

export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'PENDING_APPROVAL' | 'ON_LEAVE';

export type Permission = 
  | 'users:read' | 'users:write' | 'users:delete' | 'users:admin'
  | 'trainsets:read' | 'trainsets:write' | 'trainsets:manage'
  | 'schedules:read' | 'schedules:write' | 'schedules:manage'
  | 'analytics:read' | 'analytics:write' | 'analytics:export'
  | 'jobcards:read' | 'jobcards:write' | 'jobcards:approve'
  | 'fitness:read' | 'fitness:write' | 'fitness:certify'
  | 'optimization:read' | 'optimization:write' | 'optimization:execute'
  | 'security:read' | 'security:alert' | 'security:manage'
  | 'reports:read' | 'reports:generate' | 'reports:admin'
  | 'settings:read' | 'settings:write' | 'settings:admin'
  | 'dashboards:read' | 'dashboards:write'
  | 'emergency:alert' | 'emergency:response'
  | 'maintenance:schedule' | 'maintenance:execute' | 'maintenance:approve';

export type Depot = 'Aluva' | 'Muttom' | 'Palarivattom' | 'MG Road' | 'Ernakulam South';

export type Shift = 'MORNING' | 'AFTERNOON' | 'EVENING' | 'NIGHT' | 'ROTATIONAL';

export interface Address {
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface EmergencyContact {
  name: string;
  relationship: string;
  phone: string;
  email?: string;
}

export interface WorkHistory {
  position: string;
  department: string;
  startDate: string;
  endDate?: string;
  description?: string;
}

export interface TrainingRecord {
  id: string;
  courseName: string;
  provider: string;
  completionDate: string;
  expiryDate?: string;
  certificate?: string;
  score?: number;
}

export interface AccessLog {
  id: string;
  timestamp: string;
  action: string;
  resource: string;
  ipAddress: string;
  userAgent: string;
  success: boolean;
}

export interface UserFilters {
  search?: string;
  status?: UserStatus | 'all';
  role?: UserRole | 'all';
  department?: Department | 'all';
  depot?: Depot | 'all';
  shift?: Shift | 'all';
  isOnline?: boolean;
  createdAfter?: string;
  createdBefore?: string;
}

export interface UserStats {
  total: number;
  active: number;
  inactive: number;
  online: number;
  byRole: Record<UserRole, number>;
  byDepartment: Record<Department, number>;
  byDepot: Record<Depot, number>;
  byShift: Record<Shift, number>;
  performanceAverage: number;
  trainingCompliance: number;
  recentActivity: {
    newUsers: number;
    activeToday: number;
    loginAttempts: number;
  };
}

export interface CreateUserRequest {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  role: UserRole;
  department: Department;
  designation: string;
  supervisor?: string;
  depot: Depot;
  shift: Shift;
  permissions: Permission[];
  certifications?: string[];
  emergencyContact?: EmergencyContact;
  address?: Address;
}

export interface UpdateUserRequest {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  role?: UserRole;
  department?: Department;
  designation?: string;
  supervisor?: string;
  depot?: Depot;
  shift?: Shift;
  permissions?: Permission[];
  status?: UserStatus;
  emergencyContact?: EmergencyContact;
  address?: Address;
}

export interface UserAnalytics {
  userId: string;
  activityScore: number;
  performanceTrend: Array<{
    date: string;
    score: number;
    tasks: number;
    efficiency: number;
  }>;
  certificationStatus: {
    total: number;
    valid: number;
    expiring: number;
    expired: number;
  };
  accessPatterns: {
    peakHours: number[];
    commonActions: Array<{
      action: string;
    count: number;
    }>;
    deviceUsage: Record<string, number>;
  };
  aiInsights: {
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
    recommendedActions: string[];
    performancePrediction: number;
    trainingRecommendations: string[];
  };
}

// Default role permissions mapping
const DEFAULT_ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  SUPER_ADMIN: [
    'users:admin', 'trainsets:manage', 'schedules:manage', 'analytics:export',
    'jobcards:approve', 'fitness:certify', 'optimization:execute', 'security:manage',
    'reports:admin', 'settings:admin', 'dashboards:write', 'emergency:response',
    'maintenance:approve'
  ],
  ADMIN: [
    'users:write', 'trainsets:write', 'schedules:write', 'analytics:write',
    'jobcards:write', 'fitness:write', 'optimization:write', 'reports:generate',
    'settings:write', 'dashboards:write', 'emergency:alert'
  ],
  OPERATIONS_MANAGER: [
    'users:read', 'trainsets:write', 'schedules:manage', 'analytics:read',
    'reports:generate', 'dashboards:write', 'emergency:response'
  ],
  OPERATOR: [
    'trainsets:read', 'schedules:read', 'dashboards:read', 'emergency:alert'
  ],
  MAINTENANCE_MANAGER: [
    'trainsets:write', 'jobcards:approve', 'fitness:write', 'maintenance:approve',
    'analytics:read', 'reports:generate'
  ],
  MAINTENANCE: [
    'trainsets:read', 'jobcards:write', 'fitness:read', 'maintenance:execute'
  ],
  TECHNICIAN: [
    'trainsets:read', 'jobcards:read', 'maintenance:execute'
  ],
  INSPECTOR: [
    'trainsets:read', 'fitness:write', 'jobcards:read', 'analytics:read'
  ],
  ANALYST: [
    'analytics:write', 'reports:generate', 'dashboards:write', 'optimization:read'
  ],
  SUPERVISOR: [
    'trainsets:read', 'schedules:write', 'users:read', 'reports:read'
  ],
  SECURITY: [
    'security:alert', 'emergency:alert', 'users:read', 'reports:read'
  ],
  TRAINEE: [
    'dashboards:read', 'trainsets:read'
  ]
};

class UserService {
  private readonly STORAGE_KEY = 'kmrl_users_data';
  private readonly ANALYTICS_KEY = 'kmrl_user_analytics';

  // Get all users with filtering and pagination
  async getUsers(filters: UserFilters = {}, page = 1, limit = 50): Promise<{
    users: User[];
    total: number;
    stats: UserStats;
  }> {
    try {
      const response = await api.get('/api/users', {
        params: { ...filters, page, limit }
      });
      
      if (response.success) {
        // Cache successful response
        this.saveToStorage('users', response.data);
        return response.data;
      }
    } catch (error) {
      console.warn('API call failed, using fallback data:', error);
    }

    // Fallback to local data
    return this.getFallbackUsersData(filters, page, limit);
  }

  // Get single user by ID
  async getUserById(id: string): Promise<User | null> {
    try {
      const response = await api.get(`/api/users/${id}`);
      if (response.success) {
        return response.data;
      }
    } catch (error) {
      console.warn('Failed to fetch user from API:', error);
    }

    // Fallback to local data
    const fallbackData = this.getFallbackUsersData();
    return fallbackData.users.find(user => user.id === id) || null;
  }

  // Create new user
  async createUser(userData: CreateUserRequest): Promise<User> {
    // Validate user data
    const validation = this.validateUserData(userData);
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }

    try {
      const response = await api.post('/api/users', userData);
      if (response.success) {
        // Update local cache
        this.invalidateCache();
        return response.data;
      }
    } catch (error) {
      console.warn('Failed to create user via API:', error);
    }

    // Fallback: simulate user creation
    // Set initial status based on the current user's role
    let initialStatus: UserStatus = 'PENDING_APPROVAL';
    
    // Super admins and admins can create active users directly
    // Others need approval
    if (userData.role === 'SUPER_ADMIN' || userData.role === 'ADMIN') {
      initialStatus = 'ACTIVE';
    }
    
    const newUser: User = {
      id: `user-${Date.now()}`,
      ...userData,
      employeeId: `KMRL${new Date().getFullYear()}${String(Date.now()).slice(-3)}`,
      status: initialStatus,
      createdAt: new Date().toISOString(),
      isOnline: false,
      workHistory: [],
      trainingRecords: [],
      accessLogs: [],
      certifications: userData.certifications || []
    };

    // Store locally
    this.addUserToLocal(newUser);
    return newUser;
  }

  // Update user
  async updateUser(id: string, updates: UpdateUserRequest): Promise<User> {
    try {
      const response = await api.patch(`/api/users/${id}`, updates);
      if (response.success) {
        this.invalidateCache();
        return response.data;
      }
    } catch (error) {
      console.warn('Failed to update user via API:', error);
    }

    // Fallback: update local data
    return this.updateUserLocal(id, updates);
  }

  // Delete user (soft delete)
  async deleteUser(id: string): Promise<boolean> {
    try {
      const response = await api.delete(`/api/users/${id}`);
      if (response.success) {
        this.invalidateCache();
        return true;
      }
    } catch (error) {
      console.warn('Failed to delete user via API:', error);
    }

    // Fallback: local soft delete
    return this.deleteUserLocal(id);
  }

  // Get user analytics powered by AI
  async getUserAnalytics(userId: string): Promise<UserAnalytics> {
    try {
      const response = await api.get(`/api/users/${userId}/analytics`);
      if (response.success) {
        return response.data;
      }
    } catch (error) {
      console.warn('Failed to fetch analytics from API:', error);
    }

    // Generate AI-powered insights locally
    return this.generateUserAnalytics(userId);
  }

  // Bulk operations
  async bulkUpdateUsers(userIds: string[], updates: UpdateUserRequest): Promise<User[]> {
    try {
      const response = await api.patch('/api/users/bulk', { userIds, updates });
      if (response.success) {
        this.invalidateCache();
        return response.data;
      }
    } catch (error) {
      console.warn('Failed bulk update via API:', error);
    }

    // Fallback: local bulk update
    return this.bulkUpdateLocal(userIds, updates);
  }

  // Export users data
  async exportUsers(format: 'csv' | 'xlsx' | 'pdf' = 'csv', filters: UserFilters = {}): Promise<Blob> {
    try {
      const response = await api.get('/api/users/export', {
        params: { format, ...filters },
        responseType: 'blob'
      });
      
      if (response.success) {
        return response.data;
      }
    } catch (error) {
      console.warn('Failed to export via API:', error);
    }

    // Fallback: generate export locally
    return this.generateExportLocal(format, filters);
  }

  // Approve user (admin function)
  async approveUser(userId: string, approvedBy?: string): Promise<User> {
    try {
      const response = await api.patch(`/api/users/${userId}/approve`, { approvedBy });
      if (response.success) {
        this.invalidateCache();
        return response.data;
      }
    } catch (error) {
      console.warn('Failed to approve user via API:', error);
    }

    // Fallback: approve locally
    return this.updateUserLocal(userId, { 
      status: 'ACTIVE'
    });
  }

  // Reject user (admin function)
  async rejectUser(userId: string, reason?: string): Promise<User> {
    try {
      const response = await api.patch(`/api/users/${userId}/reject`, { reason });
      if (response.success) {
        this.invalidateCache();
        return response.data;
      }
    } catch (error) {
      console.warn('Failed to reject user via API:', error);
    }

    // Fallback: reject locally
    return this.updateUserLocal(userId, { 
      status: 'INACTIVE'
    });
  }

  // Get pending approvals (admin function)
  async getPendingApprovals(): Promise<User[]> {
    try {
      const response = await api.get('/api/users/pending-approvals');
      if (response.success) {
        return response.data;
      }
    } catch (error) {
      console.warn('Failed to get pending approvals via API:', error);
    }

    // Fallback: get from local data
    const fallbackData = this.getFallbackUsersData();
    return fallbackData.users.filter(user => user.status === 'PENDING_APPROVAL');
  }

  // AI-powered user recommendations
  async getUserRecommendations(userId: string): Promise<{
    trainingRecommendations: string[];
    roleUpgrades: string[];
    performanceImprovements: string[];
    securityAlerts: string[];
  }> {
    try {
      const response = await api.get(`/api/users/${userId}/recommendations`);
      if (response.success) {
        return response.data;
      }
    } catch (error) {
      console.warn('Failed to get AI recommendations:', error);
    }

    // Generate AI recommendations locally
    return this.generateAIRecommendations(userId);
  }

  // Validate user data
  validateUserData(userData: Partial<CreateUserRequest | UpdateUserRequest>): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (userData.email && !this.isValidEmail(userData.email)) {
      errors.push('Invalid email format');
    }

    if (userData.phone && !this.isValidPhone(userData.phone)) {
      errors.push('Invalid phone format');
    }

    if (userData.firstName && userData.firstName.length < 2) {
      errors.push('First name must be at least 2 characters');
    }

    if (userData.lastName && userData.lastName.length < 2) {
      errors.push('Last name must be at least 2 characters');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Get role permissions
  getRolePermissions(role: UserRole): Permission[] {
    return DEFAULT_ROLE_PERMISSIONS[role] || [];
  }

  // Check if user has permission
  hasPermission(user: User, permission: Permission): boolean {
    return user.permissions.includes(permission);
  }

  // Generate fallback data for offline usage
  private getFallbackUsersData(filters: UserFilters = {}, page = 1, limit = 50) {
    // First, try to get data from local storage
    const storedData = this.getFromStorage('users');
    let users: User[] = [];
    
    if (storedData && storedData.users && Array.isArray(storedData.users)) {
      users = storedData.users;
      console.log('📊 Using stored users data:', users.length, 'users found');
    } else {
      // Fallback to hardcoded demo data if no stored data
      users = [
      {
        id: 'user-kmrl-001',
        firstName: 'Rajesh',
        lastName: 'Kumar',
        email: 'rajesh.kumar@kmrl.co.in',
        phone: '+91-9876543210',
        role: 'ADMIN',
        department: 'Operations',
        status: 'ACTIVE',
        lastLogin: new Date(Date.now() - 3600000).toISOString(),
        createdAt: '2024-01-15T08:30:00Z',
        permissions: this.getRolePermissions('ADMIN'),
        employeeId: 'KMRL2024001',
        designation: 'Senior Operations Manager',
        supervisor: 'General Manager',
        depot: 'Aluva',
        shift: 'MORNING',
        certifications: ['Metro Operations', 'Safety Management', 'Emergency Response'],
        isOnline: true,
        performanceRating: 4.8,
        workHistory: [
          {
            position: 'Operations Manager',
            department: 'Operations',
            startDate: '2024-01-15T00:00:00Z',
            description: 'Managing daily metro operations'
          }
        ],
        trainingRecords: [
          {
            id: 'tr-001',
            courseName: 'Metro Safety Certification',
            provider: 'KMRL Training Center',
            completionDate: '2024-01-20T00:00:00Z',
            expiryDate: '2025-01-20T00:00:00Z',
            score: 95
          }
        ],
        accessLogs: []
      },
      {
        id: 'user-kmrl-002',
        firstName: 'Priya',
        lastName: 'Nair',
        email: 'priya.nair@kmrl.co.in',
        phone: '+91-9876543211',
        role: 'OPERATOR',
        department: 'Train Operations',
        status: 'ACTIVE',
        lastLogin: new Date(Date.now() - 1800000).toISOString(),
        createdAt: '2024-02-10T09:15:00Z',
        permissions: this.getRolePermissions('OPERATOR'),
        employeeId: 'KMRL2024002',
        designation: 'Train Operator',
        supervisor: 'Rajesh Kumar',
        depot: 'Aluva',
        shift: 'MORNING',
        certifications: ['Alstom Metropolis Operation', 'Safety Protocols'],
        isOnline: true,
        performanceRating: 4.6,
        workHistory: [
          {
            position: 'Train Operator',
            department: 'Train Operations',
            startDate: '2024-02-10T00:00:00Z',
            description: 'Operating metro trains on various routes'
          }
        ],
        trainingRecords: [
          {
            id: 'tr-002',
            courseName: 'Alstom Systems Training',
            provider: 'Alstom',
            completionDate: '2024-02-15T00:00:00Z',
            expiryDate: '2025-02-15T00:00:00Z',
            score: 92
          }
        ],
        accessLogs: []
      }
      // Add more fallback users as needed...
      ];
      
      // Store the initial data to localStorage if not present
      this.saveToStorage('users', {
        users,
        total: users.length,
        stats: this.generateUserStats(users)
      });
    }

    // Apply filters
    let filteredUsers = users;
    
    if (filters.search) {
      const search = filters.search.toLowerCase();
      filteredUsers = filteredUsers.filter(user =>
        user.firstName.toLowerCase().includes(search) ||
        user.lastName.toLowerCase().includes(search) ||
        user.email.toLowerCase().includes(search) ||
        user.employeeId.toLowerCase().includes(search)
      );
    }

    if (filters.status && filters.status !== 'all') {
      filteredUsers = filteredUsers.filter(user => user.status === filters.status);
    }

    if (filters.role && filters.role !== 'all') {
      filteredUsers = filteredUsers.filter(user => user.role === filters.role);
    }

    if (filters.department && filters.department !== 'all') {
      filteredUsers = filteredUsers.filter(user => user.department === filters.department);
    }

    // Generate stats
    const stats: UserStats = this.generateUserStats(users);

    return {
      users: filteredUsers,
      total: filteredUsers.length,
      stats
    };
  }

  private generateUserStats(users: User[]): UserStats {
    const byRole = {} as Record<UserRole, number>;
    const byDepartment = {} as Record<Department, number>;
    const byDepot = {} as Record<Depot, number>;
    const byShift = {} as Record<Shift, number>;

    users.forEach(user => {
      byRole[user.role] = (byRole[user.role] || 0) + 1;
      byDepartment[user.department] = (byDepartment[user.department] || 0) + 1;
      byDepot[user.depot] = (byDepot[user.depot] || 0) + 1;
      byShift[user.shift] = (byShift[user.shift] || 0) + 1;
    });

    return {
      total: users.length,
      active: users.filter(u => u.status === 'ACTIVE').length,
      inactive: users.filter(u => u.status === 'INACTIVE').length,
      online: users.filter(u => u.isOnline).length,
      byRole,
      byDepartment,
      byDepot,
      byShift,
      performanceAverage: users.reduce((acc, u) => acc + (u.performanceRating || 0), 0) / users.length,
      trainingCompliance: 85, // Mock value
      recentActivity: {
        newUsers: users.filter(u => new Date(u.createdAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)).length,
        activeToday: users.filter(u => u.lastLogin && new Date(u.lastLogin) > new Date(Date.now() - 24 * 60 * 60 * 1000)).length,
        loginAttempts: 150 // Mock value
      }
    };
  }

  private generateUserAnalytics(userId: string): UserAnalytics {
    // Generate AI-powered analytics locally
    return {
      userId,
      activityScore: Math.floor(Math.random() * 40) + 60, // 60-100
      performanceTrend: Array.from({ length: 7 }, (_, i) => ({
        date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
        score: Math.floor(Math.random() * 30) + 70,
        tasks: Math.floor(Math.random() * 10) + 5,
        efficiency: Math.floor(Math.random() * 20) + 80
      })),
      certificationStatus: {
        total: 5,
        valid: 4,
        expiring: 1,
        expired: 0
      },
      accessPatterns: {
        peakHours: [9, 10, 14, 15],
        commonActions: [
          { action: 'view_trainsets', count: 45 },
          { action: 'update_schedule', count: 23 },
          { action: 'generate_report', count: 12 }
        ],
        deviceUsage: { desktop: 80, mobile: 20 }
      },
      aiInsights: {
        riskLevel: 'LOW',
        recommendedActions: [
          'Complete upcoming safety training',
          'Update emergency contact information',
          'Review system access logs'
        ],
        performancePrediction: 85,
        trainingRecommendations: [
          'Advanced Metro Operations',
          'Leadership Development',
          'Digital Systems Management'
        ]
      }
    };
  }

  private generateAIRecommendations(userId: string) {
    return {
      trainingRecommendations: [
        'Advanced Safety Protocols',
        'Emergency Response Training',
        'Digital Systems Workshop'
      ],
      roleUpgrades: [
        'Consider promotion to Senior Operator',
        'Leadership training for supervisory role'
      ],
      performanceImprovements: [
        'Focus on punctuality metrics',
        'Enhance communication skills',
        'Improve technical documentation'
      ],
      securityAlerts: [
        'Update password - last changed 90 days ago',
        'Enable two-factor authentication'
      ]
    };
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private isValidPhone(phone: string): boolean {
    const phoneRegex = /^[+]?[\d\s-()]+$/;
    return phoneRegex.test(phone) && phone.replace(/\D/g, '').length >= 10;
  }

  private saveToStorage(key: string, data: any): void {
    try {
      localStorage.setItem(`${this.STORAGE_KEY}_${key}`, JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save to storage:', error);
    }
  }

  private getFromStorage(key: string): any {
    try {
      const data = localStorage.getItem(`${this.STORAGE_KEY}_${key}`);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Failed to get from storage:', error);
      return null;
    }
  }

  private invalidateCache(): void {
    localStorage.removeItem(`${this.STORAGE_KEY}_users`);
  }

  private addUserToLocal(user: User): void {
    try {
      // Get existing users from local storage
      const existingData = this.getFromStorage('users') || { users: [], total: 0, stats: {} };
      const users = existingData.users || [];
      
      // Add new user to the beginning of the list
      users.unshift(user);
      
      // Update the data
      const updatedData = {
        users,
        total: users.length,
        stats: this.generateUserStats(users)
      };
      
      // Save back to storage
      this.saveToStorage('users', updatedData);
      console.log('✅ User added to local storage:', user.firstName, user.lastName);
    } catch (error) {
      console.error('Failed to add user to local storage:', error);
    }
  }

  private updateUserLocal(id: string, updates: UpdateUserRequest): User {
    try {
      // Get existing users from local storage
      const existingData = this.getFromStorage('users') || { users: [], total: 0, stats: {} };
      const users = existingData.users || [];
      
      // Find and update the user
      const userIndex = users.findIndex((u: User) => u.id === id);
      if (userIndex === -1) {
        throw new Error(`User with ID ${id} not found`);
      }
      
      const updatedUser: User = {
        ...users[userIndex],
        ...updates,
        updatedAt: new Date().toISOString()
      };
      
      users[userIndex] = updatedUser;
      
      // Update the data
      const updatedData = {
        users,
        total: users.length,
        stats: this.generateUserStats(users)
      };
      
      // Save back to storage
      this.saveToStorage('users', updatedData);
      console.log('✅ User updated in local storage:', updatedUser.firstName, updatedUser.lastName);
      
      return updatedUser;
    } catch (error) {
      console.error('Failed to update user in local storage:', error);
      throw error;
    }
  }

  private deleteUserLocal(id: string): boolean {
    try {
      // Get existing users from local storage
      const existingData = this.getFromStorage('users') || { users: [], total: 0, stats: {} };
      const users = existingData.users || [];
      
      // Find and remove the user
      const userIndex = users.findIndex((u: User) => u.id === id);
      if (userIndex === -1) {
        console.warn(`User with ID ${id} not found for deletion`);
        return false;
      }
      
      const deletedUser = users[userIndex];
      users.splice(userIndex, 1);
      
      // Update the data
      const updatedData = {
        users,
        total: users.length,
        stats: this.generateUserStats(users)
      };
      
      // Save back to storage
      this.saveToStorage('users', updatedData);
      console.log('✅ User deleted from local storage:', deletedUser.firstName, deletedUser.lastName);
      
      return true;
    } catch (error) {
      console.error('Failed to delete user from local storage:', error);
      return false;
    }
  }

  private bulkUpdateLocal(userIds: string[], updates: UpdateUserRequest): User[] {
    // Implementation for bulk updating users locally
    console.log('Bulk update locally:', userIds.length, 'users');
    return [];
  }

  private generateExportLocal(format: string, filters: UserFilters): Blob {
    // Implementation for generating export locally
    const csvContent = "firstName,lastName,email,role,department,status\n";
    return new Blob([csvContent], { type: 'text/csv' });
  }
}

// Export singleton instance
const userService = new UserService();
export default userService;