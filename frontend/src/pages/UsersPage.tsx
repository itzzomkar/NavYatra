import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  UserGroupIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  ShieldCheckIcon,
  PhoneIcon,
  EnvelopeIcon,
  CalendarIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  DocumentArrowDownIcon,
  ExclamationTriangleIcon,
  AcademicCapIcon,
  BoltIcon,
  ChartPieIcon
} from '@heroicons/react/24/outline';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { useAuth } from '@/hooks/useAuth';
import { useWebSocket } from '@/hooks/useWebSocket';
import Card from '@/components/ui/Card';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import userService, { 
  User, 
  UserRole, 
  Department, 
  UserStatus, 
  UserFilters,
  CreateUserRequest,
  UpdateUserRequest,
  UserAnalytics
} from '@/services/userService';

const UsersPage: React.FC = () => {
  const { user: currentUser, hasPermission } = useAuth();
  const queryClient = useQueryClient();
  
  // State management
  const [filters, setFilters] = useState<UserFilters>({ status: 'all', role: 'all', department: 'all' });
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAnalyticsModal, setShowAnalyticsModal] = useState(false);
  const [userToEdit, setUserToEdit] = useState<User | null>(null);
  const [page, setPage] = useState(1);

  // React Query integration for users data
  const { data: usersData, isLoading, refetch } = useQuery({
    queryKey: ['users', filters, page],
    queryFn: () => userService.getUsers(filters, page, 50),
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // Refresh every minute for real-time updates
    refetchOnWindowFocus: true,
  });

  // Get user analytics
  const { data: userAnalytics, isLoading: analyticsLoading } = useQuery({
    queryKey: ['user-analytics', selectedUser?.id],
    queryFn: () => selectedUser ? userService.getUserAnalytics(selectedUser.id) : null,
    enabled: !!selectedUser && showAnalyticsModal,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Mutations for user operations
  const createUserMutation = useMutation({
    mutationFn: (userData: CreateUserRequest) => userService.createUser(userData),
    onSuccess: (newUser) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success(`User ${newUser.firstName} ${newUser.lastName} created successfully!`);
      setShowCreateModal(false);
    },
    onError: (error: Error) => {
      toast.error(`Failed to create user: ${error.message}`);
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: UpdateUserRequest }) => 
      userService.updateUser(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('User updated successfully!');
      setShowEditModal(false);
      setUserToEdit(null);
    },
    onError: (error: Error) => {
      toast.error(`Failed to update user: ${error.message}`);
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: (userId: string) => userService.deleteUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('User deleted successfully!');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete user: ${error.message}`);
    },
  });

  const approveUserMutation = useMutation({
    mutationFn: (userId: string) => userService.approveUser(userId, `${currentUser?.firstName} ${currentUser?.lastName}`),
    onSuccess: (approvedUser) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success(`User ${approvedUser.firstName} ${approvedUser.lastName} approved successfully!`);
    },
    onError: (error: Error) => {
      toast.error(`Failed to approve user: ${error.message}`);
    },
  });

  const rejectUserMutation = useMutation({
    mutationFn: (userId: string) => userService.rejectUser(userId, 'Rejected by administrator'),
    onSuccess: (rejectedUser) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success(`User ${rejectedUser.firstName} ${rejectedUser.lastName} rejected.`);
    },
    onError: (error: Error) => {
      toast.error(`Failed to reject user: ${error.message}`);
    },
  });

  // WebSocket integration for real-time updates
  useWebSocket({
    subscriptions: ['users'],
    onSystemNotification: (notification) => {
      if (notification.message.includes('user') || notification.message.includes('User')) {
        console.log('🔄 User-related notification:', notification.message);
        toast(notification.message, {
          duration: 3000,
          position: 'top-right'
        });
        // Trigger data refresh
        refetch();
      }
    },
    onConnectionEstablished: () => {
      console.log('✅ WebSocket connected for Users page');
    }
  });

  // Extract data with fallback
  const users = usersData?.users || [];
  const userStats = usersData?.stats;
  const pendingUsers = users.filter(user => user.status === 'PENDING_APPROVAL');

  // Handle filter changes
  const handleFilterChange = (key: keyof UserFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1); // Reset to first page when filtering
  };


  // Export users
  const handleExport = async (format: 'csv' | 'xlsx' | 'pdf' = 'csv') => {
    try {
      const blob = await userService.exportUsers(format, filters);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `kmrl-users-${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Users data exported successfully!');
    } catch (error) {
      toast.error('Failed to export users data');
    }
  };

  // Users are already filtered by the service based on filters
  const filteredUsers = users;

  const getStatusColor = (status: User['status']) => {
    switch (status) {
      case 'ACTIVE':
        return 'text-green-700 bg-green-50 border border-green-200';
      case 'INACTIVE':
        return 'text-gray-700 bg-gray-50 border border-gray-200';
      case 'SUSPENDED':
        return 'text-red-700 bg-red-50 border border-red-200';
      default:
        return 'text-gray-700 bg-gray-50 border border-gray-200';
    }
  };

  const getRoleColor = (role: string) => {
    const colors: Record<string, string> = {
      'ADMIN': 'text-purple-700 bg-purple-50 border border-purple-200',
      'OPERATOR': 'text-blue-700 bg-blue-50 border border-blue-200',
      'MAINTENANCE': 'text-orange-700 bg-orange-50 border border-orange-200',
      'INSPECTOR': 'text-green-700 bg-green-50 border border-green-200',
      'TECHNICIAN': 'text-indigo-700 bg-indigo-50 border border-indigo-200',
      'ANALYST': 'text-cyan-700 bg-cyan-50 border border-cyan-200',
      'SUPERVISOR': 'text-yellow-700 bg-yellow-50 border border-yellow-200',
      'SECURITY': 'text-red-700 bg-red-50 border border-red-200'
    };
    return colors[role] || 'text-gray-700 bg-gray-50 border border-gray-200';
  };

  const formatLastLogin = (lastLogin?: string) => {
    if (!lastLogin) return 'Never';
    
    const now = new Date();
    const loginDate = new Date(lastLogin);
    const diffMs = now.getTime() - loginDate.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    
    if (diffMinutes < 60) {
      return `${diffMinutes}m ago`;
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else {
      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays}d ago`;
    }
  };

  if (isLoading && !usersData) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex items-center space-x-3">
            <h1 className="text-3xl font-bold text-gray-900">KMRL Users</h1>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 border border-purple-200">
              <ShieldCheckIcon className="h-3 w-3 mr-1" />
              Admin Only
            </span>
          </div>
          <p className="text-gray-600 mt-2">
            Manage Kochi Metro staff and user accounts • Only accessible to administrators
          </p>
          {currentUser && (
            <div className="mt-3 flex items-center text-sm text-gray-500">
              <span>Logged in as: </span>
              <span className="ml-1 font-medium text-purple-700">
                {currentUser.firstName} {currentUser.lastName}
              </span>
              <span className="ml-2 px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs">
                {currentUser.role}
              </span>
            </div>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="flex items-center space-x-4"
        >
          {hasPermission('users:write') && (
            <div className="flex items-center space-x-3">
              {/* Pending Approvals Badge */}
              {pendingUsers.length > 0 && (
                <div className="flex items-center px-3 py-2 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <ExclamationTriangleIcon className="h-4 w-4 text-yellow-600 mr-2" />
                  <span className="text-sm font-medium text-yellow-800">
                    {pendingUsers.length} Pending Approval{pendingUsers.length !== 1 ? 's' : ''}
                  </span>
                </div>
              )}
              
              <button
                onClick={() => handleExport('csv')}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-all duration-200"
              >
                <DocumentArrowDownIcon className="h-4 w-4 mr-2" />
                Export Users
              </button>
              
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200"
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                Add New User
              </button>
            </div>
          )}
          
          <div className="text-right text-sm text-gray-500">
            <p>User Management Portal</p>
            <p className="text-xs">Administrator Access Required</p>
          </div>
        </motion.div>
      </div>

      {/* Statistics Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
      >
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <UserGroupIcon className="h-10 w-10 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-blue-600">Total Users</p>
              <p className="text-2xl font-bold text-blue-900">{userStats?.total || 0}</p>
            </div>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <CheckCircleIcon className="h-10 w-10 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-green-600">Active Users</p>
              <p className="text-2xl font-bold text-green-900">{userStats?.active || 0}</p>
            </div>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="h-10 w-10 bg-purple-600 rounded-full flex items-center justify-center">
                <span className="h-3 w-3 bg-white rounded-full animate-pulse"></span>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-purple-600">Online Now</p>
              <p className="text-2xl font-bold text-purple-900">{userStats?.online || 0}</p>
            </div>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-indigo-50 to-indigo-100">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <ShieldCheckIcon className="h-10 w-10 text-indigo-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-indigo-600">Departments</p>
              <p className="text-2xl font-bold text-indigo-900">{userStats?.byDepartment ? Object.keys(userStats.byDepartment).length : 0}</p>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Filters and Search */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="flex flex-col sm:flex-row gap-4"
      >
        <div className="flex-1">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search users..."
              className="form-input pl-10"
              value={filters.search || ''}
              onChange={(e) => handleFilterChange('search', e.target.value)}
            />
          </div>
        </div>
        
        <div className="flex gap-4">
          <select
            className="form-input min-w-[120px]"
            value={filters.status || 'all'}
            onChange={(e) => handleFilterChange('status', e.target.value === 'all' ? undefined : e.target.value as UserStatus)}
          >
            <option value="all">All Status</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
            <option value="SUSPENDED">Suspended</option>
            <option value="PENDING_APPROVAL">Pending Approval</option>
            <option value="ON_LEAVE">On Leave</option>
          </select>
          
          <select
            className="form-input min-w-[120px]"
            value={filters.role || 'all'}
            onChange={(e) => handleFilterChange('role', e.target.value === 'all' ? undefined : e.target.value as UserRole)}
          >
            <option value="all">All Roles</option>
            <option value="ADMIN">Admin</option>
            <option value="OPERATOR">Operator</option>
            <option value="MAINTENANCE">Maintenance</option>
            <option value="INSPECTOR">Inspector</option>
            <option value="TECHNICIAN">Technician</option>
            <option value="ANALYST">Analyst</option>
            <option value="SUPERVISOR">Supervisor</option>
            <option value="SECURITY">Security</option>
          </select>
          
          <select
            className="form-input min-w-[140px]"
            value={filters.department || 'all'}
            onChange={(e) => handleFilterChange('department', e.target.value === 'all' ? undefined : e.target.value as Department)}
          >
            <option value="all">All Departments</option>
            <option value="Operations">Operations</option>
            <option value="Train Operations">Train Operations</option>
            <option value="Technical Services">Technical Services</option>
            <option value="Quality Assurance">Quality Assurance</option>
            <option value="Maintenance">Maintenance</option>
            <option value="Data Analytics">Data Analytics</option>
            <option value="Security">Security</option>
            <option value="Administration">Administration</option>
            <option value="Human Resources">Human Resources</option>
            <option value="Safety">Safety</option>
            <option value="Engineering">Engineering</option>
          </select>
        </div>
      </motion.div>

      {/* Approval Process Info */}
      {pendingUsers.length > 0 && hasPermission('users:write') && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.25 }}
          className="bg-blue-50 border border-blue-200 rounded-lg p-4"
        >
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <CheckCircleIcon className="h-5 w-5 text-blue-600 mt-0.5" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">
                User Approval Required
              </h3>
              <div className="mt-2 text-sm text-blue-700">
                <p>
                  You have {pendingUsers.length} user{pendingUsers.length !== 1 ? 's' : ''} awaiting approval. 
                  Click the <CheckCircleIcon className="inline h-4 w-4 mx-1" /> button to approve or 
                  <XCircleIcon className="inline h-4 w-4 mx-1" /> to reject.
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Users Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
      >
        {filteredUsers.map((user: User, index: number) => (
          <motion.div
            key={user.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
          >
            <Card className="hover:shadow-lg transition-shadow duration-200">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <div className="h-12 w-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                      <span className="text-white font-bold text-lg">
                        {user.firstName[0]}{user.lastName[0]}
                      </span>
                    </div>
                    {user.isOnline && (
                      <div className="absolute -bottom-1 -right-1 h-4 w-4 bg-green-500 border-2 border-white rounded-full"></div>
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {user.firstName} {user.lastName}
                    </h3>
                    <p className="text-sm text-gray-500">{user.designation}</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => {
                      setSelectedUser(user);
                      setShowUserModal(true);
                    }}
                    className="p-1 text-gray-400 hover:text-gray-500"
                  >
                    <EyeIcon className="h-4 w-4" />
                  </button>
                  {hasPermission('users:write') && (
                    <>
                      {/* Show approval buttons for pending users */}
                      {user.status === 'PENDING_APPROVAL' && (
                        <>
                          <button 
                            onClick={() => {
                              if (window.confirm(`Approve ${user.firstName} ${user.lastName} for system access?`)) {
                                approveUserMutation.mutate(user.id);
                              }
                            }}
                            className="p-1 text-gray-400 hover:text-green-500 transition-colors duration-200"
                            title="Approve User"
                          >
                            <CheckCircleIcon className="h-4 w-4" />
                          </button>
                          <button 
                            onClick={() => {
                              if (window.confirm(`Reject ${user.firstName} ${user.lastName}'s access request?`)) {
                                rejectUserMutation.mutate(user.id);
                              }
                            }}
                            className="p-1 text-gray-400 hover:text-red-500 transition-colors duration-200"
                            title="Reject User"
                          >
                            <XCircleIcon className="h-4 w-4" />
                          </button>
                        </>
                      )}
                      
                      {/* Regular edit/delete buttons for other users */}
                      <button 
                        onClick={() => {
                          setUserToEdit(user);
                          setShowEditModal(true);
                        }}
                        className="p-1 text-gray-400 hover:text-blue-500 transition-colors duration-200"
                        title="Edit User"
                      >
                        <PencilIcon className="h-4 w-4" />
                      </button>
                      
                      {user.status !== 'PENDING_APPROVAL' && (
                        <button 
                          onClick={() => {
                            if (window.confirm(`Are you sure you want to delete ${user.firstName} ${user.lastName}? This action cannot be undone.`)) {
                              deleteUserMutation.mutate(user.id);
                            }
                          }}
                          className="p-1 text-gray-400 hover:text-red-500 transition-colors duration-200"
                          title="Delete User"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
              
              <div className="mt-4 space-y-2">
                <div className="flex items-center text-sm text-gray-600">
                  <EnvelopeIcon className="h-4 w-4 mr-2" />
                  {user.email}
                </div>
                {user.phone && (
                  <div className="flex items-center text-sm text-gray-600">
                    <PhoneIcon className="h-4 w-4 mr-2" />
                    {user.phone}
                  </div>
                )}
                <div className="flex items-center text-sm text-gray-600">
                  <CalendarIcon className="h-4 w-4 mr-2" />
                  {user.department} • {user.depot}
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <ClockIcon className="h-4 w-4 mr-2" />
                  Last login: {formatLastLogin(user.lastLogin)}
                </div>
              </div>
              
              <div className="mt-4 flex items-center justify-between">
                <div className="flex space-x-2">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(user.status)}`}>
                    {user.status}
                  </span>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleColor(user.role)}`}>
                    {user.role}
                  </span>
                </div>
                <span className="text-xs text-gray-500">
                  #{user.employeeId}
                </span>
              </div>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      {filteredUsers.length === 0 && (
        <div className="text-center py-12">
          <UserGroupIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No users found</h3>
          <p className="mt-1 text-sm text-gray-500">
            Try adjusting your search or filter criteria.
          </p>
        </div>
      )}

      {/* User Details Modal */}
      {showUserModal && selectedUser && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowUserModal(false)}></div>

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <div className="h-16 w-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                      <span className="text-white font-bold text-2xl">
                        {selectedUser.firstName[0]}{selectedUser.lastName[0]}
                      </span>
                    </div>
                  </div>
                  <div className="ml-4 flex-1">
                    <h3 className="text-lg font-medium text-gray-900">
                      {selectedUser.firstName} {selectedUser.lastName}
                    </h3>
                    <p className="text-sm text-gray-500">{selectedUser.designation}</p>
                    <div className="mt-2 flex space-x-2">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(selectedUser.status)}`}>
                        {selectedUser.status}
                      </span>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleColor(selectedUser.role)}`}>
                        {selectedUser.role}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Contact Information</label>
                    <div className="mt-2 space-y-1">
                      <p className="text-sm text-gray-600">{selectedUser.email}</p>
                      {selectedUser.phone && <p className="text-sm text-gray-600">{selectedUser.phone}</p>}
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-700">Work Details</label>
                    <div className="mt-2 space-y-1">
                      <p className="text-sm text-gray-600">Department: {selectedUser.department}</p>
                      <p className="text-sm text-gray-600">Depot: {selectedUser.depot}</p>
                      <p className="text-sm text-gray-600">Shift: {selectedUser.shift}</p>
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-700">Employment</label>
                    <div className="mt-2 space-y-1">
                      <p className="text-sm text-gray-600">Employee ID: {selectedUser.employeeId}</p>
                      <p className="text-sm text-gray-600">Supervisor: {selectedUser.supervisor}</p>
                      <p className="text-sm text-gray-600">Joined: {new Date(selectedUser.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-700">Last Activity</label>
                    <div className="mt-2 space-y-1">
                      <p className="text-sm text-gray-600">Last Login: {formatLastLogin(selectedUser.lastLogin)}</p>
                      <p className="text-sm text-gray-600">Status: {selectedUser.isOnline ? 'Online' : 'Offline'}</p>
                    </div>
                  </div>
                </div>

                <div className="mt-6">
                  <label className="text-sm font-medium text-gray-700">Certifications</label>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {selectedUser.certifications.map((cert, index) => (
                      <span key={index} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-800">
                        {cert}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="mt-6">
                  <label className="text-sm font-medium text-gray-700">Permissions</label>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {selectedUser.permissions.map((permission, index) => (
                      <span key={index} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                        {permission}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowUserModal(false)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create User Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 overflow-y-auto"
            style={{ zIndex: 9999 }}
          >
            <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.75 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-gray-900"
                onClick={() => setShowCreateModal(false)}
              />

              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full mx-4"
                style={{ zIndex: 10000 }}
                onClick={(e) => e.stopPropagation()}
              >
                <CreateUserForm 
                  onSubmit={(userData) => {
                    createUserMutation.mutate(userData);
                  }}
                  onCancel={() => setShowCreateModal(false)}
                  isLoading={createUserMutation.isPending}
                />
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit User Modal */}
      <AnimatePresence>
        {showEditModal && userToEdit && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 overflow-y-auto"
            style={{ zIndex: 9999 }}
          >
            <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.75 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-gray-900"
                onClick={() => setShowEditModal(false)}
              />

              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full mx-4"
                style={{ zIndex: 10000 }}
                onClick={(e) => e.stopPropagation()}
              >
                <EditUserForm 
                  user={userToEdit}
                  onSubmit={(updates) => {
                    updateUserMutation.mutate({ id: userToEdit.id, updates });
                  }}
                  onCancel={() => {
                    setShowEditModal(false);
                    setUserToEdit(null);
                  }}
                  isLoading={updateUserMutation.isPending}
                />
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Analytics Modal */}
      <AnimatePresence>
        {showAnalyticsModal && selectedUser && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 overflow-y-auto"
            style={{ zIndex: 9999 }}
          >
            <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.75 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-gray-900"
                onClick={() => setShowAnalyticsModal(false)}
              />

              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-6xl sm:w-full mx-4"
                style={{ zIndex: 10000 }}
                onClick={(e) => e.stopPropagation()}
              >
                <UserAnalyticsModal 
                  user={selectedUser}
                  analytics={userAnalytics || null}
                  isLoading={analyticsLoading}
                  onClose={() => {
                    setShowAnalyticsModal(false);
                    setSelectedUser(null);
                  }}
                />
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Create User Form Component
const CreateUserForm: React.FC<{
  onSubmit: (userData: CreateUserRequest) => void;
  onCancel: () => void;
  isLoading: boolean;
}> = ({ onSubmit, onCancel, isLoading }) => {
  const [formData, setFormData] = useState<CreateUserRequest>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    role: 'OPERATOR',
    department: 'Operations',
    designation: '',
    supervisor: '',
    depot: 'Aluva',
    shift: 'MORNING',
    permissions: [],
    certifications: []
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Get default permissions for the role
    const defaultPermissions = userService.getRolePermissions(formData.role);
    
    onSubmit({
      ...formData,
      permissions: defaultPermissions
    });
  };

  const handleInputChange = (field: keyof CreateUserRequest, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white">
      <div className="px-4 py-5 sm:p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-medium text-gray-900">Create New User</h3>
          <button
            type="button"
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600"
          >
            <XCircleIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h4 className="text-md font-medium text-gray-900">Basic Information</h4>
            
            <div>
              <label className="form-label">First Name *</label>
              <input
                type="text"
                required
                disabled={isLoading}
                value={formData.firstName}
                onChange={(e) => handleInputChange('firstName', e.target.value)}
                className="form-input"
                placeholder="Enter first name"
                style={{ color: '#111827', backgroundColor: '#ffffff' }}
              />
            </div>

            <div>
              <label className="form-label">Last Name *</label>
              <input
                type="text"
                required
                disabled={isLoading}
                value={formData.lastName}
                onChange={(e) => handleInputChange('lastName', e.target.value)}
                className="form-input"
                placeholder="Enter last name"
                style={{ color: '#111827', backgroundColor: '#ffffff' }}
              />
            </div>

            <div>
              <label className="form-label">Email *</label>
              <input
                type="email"
                required
                disabled={isLoading}
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                className="form-input"
                placeholder="user@kmrl.co.in"
                style={{ color: '#111827', backgroundColor: '#ffffff' }}
              />
            </div>

            <div>
              <label className="form-label">Phone</label>
              <input
                type="tel"
                disabled={isLoading}
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                className="form-input"
                placeholder="+91-9876543210"
                style={{ color: '#111827', backgroundColor: '#ffffff' }}
              />
            </div>
          </div>

          {/* Work Information */}
          <div className="space-y-4">
            <h4 className="text-md font-medium text-gray-900">Work Information</h4>
            
            <div>
              <label className="form-label">Role *</label>
              <select
                required
                value={formData.role}
                onChange={(e) => handleInputChange('role', e.target.value as UserRole)}
                className="form-input"
              >
                <option value="OPERATOR">Operator</option>
                <option value="MAINTENANCE">Maintenance</option>
                <option value="INSPECTOR">Inspector</option>
                <option value="TECHNICIAN">Technician</option>
                <option value="ANALYST">Analyst</option>
                <option value="SUPERVISOR">Supervisor</option>
                <option value="SECURITY">Security</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>

            <div>
              <label className="form-label">Department *</label>
              <select
                required
                value={formData.department}
                onChange={(e) => handleInputChange('department', e.target.value as Department)}
                className="form-input"
              >
                <option value="Operations">Operations</option>
                <option value="Train Operations">Train Operations</option>
                <option value="Technical Services">Technical Services</option>
                <option value="Maintenance">Maintenance</option>
                <option value="Quality Assurance">Quality Assurance</option>
                <option value="Security">Security</option>
                <option value="Data Analytics">Data Analytics</option>
              </select>
            </div>

            <div>
              <label className="form-label">Designation *</label>
              <input
                type="text"
                required
                disabled={isLoading}
                value={formData.designation}
                onChange={(e) => handleInputChange('designation', e.target.value)}
                className="form-input"
                placeholder="Senior Operator"
                style={{ color: '#111827', backgroundColor: '#ffffff' }}
              />
            </div>

            <div>
              <label className="form-label">Supervisor</label>
              <input
                type="text"
                disabled={isLoading}
                value={formData.supervisor}
                onChange={(e) => handleInputChange('supervisor', e.target.value)}
                className="form-input"
                placeholder="Manager name"
                style={{ color: '#111827', backgroundColor: '#ffffff' }}
              />
            </div>

            <div>
              <label className="form-label">Depot *</label>
              <select
                required
                value={formData.depot}
                onChange={(e) => handleInputChange('depot', e.target.value)}
                className="form-input"
              >
                <option value="Aluva">Aluva</option>
                <option value="Muttom">Muttom</option>
                <option value="Palarivattom">Palarivattom</option>
                <option value="MG Road">MG Road</option>
                <option value="Ernakulam South">Ernakulam South</option>
              </select>
            </div>

            <div>
              <label className="form-label">Shift *</label>
              <select
                required
                value={formData.shift}
                onChange={(e) => handleInputChange('shift', e.target.value)}
                className="form-input"
              >
                <option value="MORNING">Morning</option>
                <option value="AFTERNOON">Afternoon</option>
                <option value="EVENING">Evening</option>
                <option value="NIGHT">Night</option>
                <option value="ROTATIONAL">Rotational</option>
              </select>
            </div>
          </div>
        </div>

        <div className="mt-6">
          <label className="form-label">Initial Certifications (Optional)</label>
          <input
            type="text"
            value={formData.certifications?.join(', ')}
            onChange={(e) => handleInputChange('certifications', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
            className="form-input"
            placeholder="Metro Operations, Safety Training (comma separated)"
          />
          <p className="text-xs text-gray-500 mt-1">Enter certifications separated by commas</p>
        </div>
      </div>

      <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
        <button
          type="submit"
          disabled={isLoading}
          className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
        >
          {isLoading ? 'Creating...' : 'Create User'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
        >
          Cancel
        </button>
      </div>
    </form>
  );
};

// Edit User Form Component
const EditUserForm: React.FC<{
  user: User;
  onSubmit: (updates: UpdateUserRequest) => void;
  onCancel: () => void;
  isLoading: boolean;
}> = ({ user, onSubmit, onCancel, isLoading }) => {
  const [formData, setFormData] = useState<UpdateUserRequest>({
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    phone: user.phone,
    role: user.role,
    department: user.department,
    designation: user.designation,
    supervisor: user.supervisor,
    depot: user.depot,
    shift: user.shift,
    status: user.status
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleInputChange = (field: keyof UpdateUserRequest, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white">
      <div className="px-4 py-5 sm:p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-medium text-gray-900">Edit User</h3>
            <p className="text-sm text-gray-500">Editing: {user.firstName} {user.lastName}</p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600"
          >
            <XCircleIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h4 className="text-md font-medium text-gray-900">Basic Information</h4>
            
            <div>
              <label className="form-label">First Name</label>
              <input
                type="text"
                value={formData.firstName}
                onChange={(e) => handleInputChange('firstName', e.target.value)}
                className="form-input"
              />
            </div>

            <div>
              <label className="form-label">Last Name</label>
              <input
                type="text"
                value={formData.lastName}
                onChange={(e) => handleInputChange('lastName', e.target.value)}
                className="form-input"
              />
            </div>

            <div>
              <label className="form-label">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                className="form-input"
              />
            </div>

            <div>
              <label className="form-label">Phone</label>
              <input
                type="tel"
                value={formData.phone || ''}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                className="form-input"
              />
            </div>

            <div>
              <label className="form-label">Status</label>
              <select
                value={formData.status}
                onChange={(e) => handleInputChange('status', e.target.value as UserStatus)}
                className="form-input"
              >
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
                <option value="SUSPENDED">Suspended</option>
                <option value="PENDING_APPROVAL">Pending Approval</option>
                <option value="ON_LEAVE">On Leave</option>
              </select>
            </div>
          </div>

          {/* Work Information */}
          <div className="space-y-4">
            <h4 className="text-md font-medium text-gray-900">Work Information</h4>
            
            <div>
              <label className="form-label">Role</label>
              <select
                value={formData.role}
                onChange={(e) => handleInputChange('role', e.target.value as UserRole)}
                className="form-input"
              >
                <option value="OPERATOR">Operator</option>
                <option value="MAINTENANCE">Maintenance</option>
                <option value="INSPECTOR">Inspector</option>
                <option value="TECHNICIAN">Technician</option>
                <option value="ANALYST">Analyst</option>
                <option value="SUPERVISOR">Supervisor</option>
                <option value="SECURITY">Security</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>

            <div>
              <label className="form-label">Department</label>
              <select
                value={formData.department}
                onChange={(e) => handleInputChange('department', e.target.value as Department)}
                className="form-input"
              >
                <option value="Operations">Operations</option>
                <option value="Train Operations">Train Operations</option>
                <option value="Technical Services">Technical Services</option>
                <option value="Maintenance">Maintenance</option>
                <option value="Quality Assurance">Quality Assurance</option>
                <option value="Security">Security</option>
                <option value="Data Analytics">Data Analytics</option>
              </select>
            </div>

            <div>
              <label className="form-label">Designation</label>
              <input
                type="text"
                value={formData.designation}
                onChange={(e) => handleInputChange('designation', e.target.value)}
                className="form-input"
              />
            </div>

            <div>
              <label className="form-label">Supervisor</label>
              <input
                type="text"
                value={formData.supervisor || ''}
                onChange={(e) => handleInputChange('supervisor', e.target.value)}
                className="form-input"
              />
            </div>

            <div>
              <label className="form-label">Depot</label>
              <select
                value={formData.depot}
                onChange={(e) => handleInputChange('depot', e.target.value)}
                className="form-input"
              >
                <option value="Aluva">Aluva</option>
                <option value="Muttom">Muttom</option>
                <option value="Palarivattom">Palarivattom</option>
                <option value="MG Road">MG Road</option>
                <option value="Ernakulam South">Ernakulam South</option>
              </select>
            </div>

            <div>
              <label className="form-label">Shift</label>
              <select
                value={formData.shift}
                onChange={(e) => handleInputChange('shift', e.target.value)}
                className="form-input"
              >
                <option value="MORNING">Morning</option>
                <option value="AFTERNOON">Afternoon</option>
                <option value="EVENING">Evening</option>
                <option value="NIGHT">Night</option>
                <option value="ROTATIONAL">Rotational</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
        <button
          type="submit"
          disabled={isLoading}
          className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
        >
          {isLoading ? 'Updating...' : 'Update User'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
        >
          Cancel
        </button>
      </div>
    </form>
  );
};

// User Analytics Modal Component
const UserAnalyticsModal: React.FC<{
  user: User;
  analytics: UserAnalytics | null;
  isLoading: boolean;
  onClose: () => void;
}> = ({ user, analytics, isLoading, onClose }) => {
  return (
    <div className="bg-white">
      <div className="px-4 py-5 sm:p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-medium text-gray-900">User Analytics</h3>
            <p className="text-sm text-gray-500">Performance insights for {user.firstName} {user.lastName}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <XCircleIcon className="h-6 w-6" />
          </button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <LoadingSpinner size="lg" />
            <span className="ml-4 text-gray-600">Loading analytics...</span>
          </div>
        ) : analytics ? (
          <div className="space-y-6">
            {/* Activity Score */}
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-lg font-semibold text-gray-900">Activity Score</h4>
                  <p className="text-3xl font-bold text-blue-600">{analytics.activityScore}/100</p>
                </div>
                <ChartPieIcon className="h-12 w-12 text-blue-500" />
              </div>
            </div>

            {/* AI Insights */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white border rounded-lg p-4">
                <div className="flex items-center mb-3">
                  <BoltIcon className="h-5 w-5 text-yellow-500 mr-2" />
                  <h4 className="font-medium text-gray-900">AI Recommendations</h4>
                </div>
                <ul className="space-y-2 text-sm text-gray-600">
                  {analytics.aiInsights.recommendedActions.map((action, idx) => (
                    <li key={idx} className="flex items-start">
                      <span className="inline-block w-2 h-2 bg-yellow-400 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                      {action}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-white border rounded-lg p-4">
                <div className="flex items-center mb-3">
                  <AcademicCapIcon className="h-5 w-5 text-green-500 mr-2" />
                  <h4 className="font-medium text-gray-900">Training Recommendations</h4>
                </div>
                <ul className="space-y-2 text-sm text-gray-600">
                  {analytics.aiInsights.trainingRecommendations.map((training, idx) => (
                    <li key={idx} className="flex items-start">
                      <span className="inline-block w-2 h-2 bg-green-400 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                      {training}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Risk Assessment */}
            <div className="bg-white border rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-medium text-gray-900">Risk Assessment</h4>
                <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                  analytics.aiInsights.riskLevel === 'LOW' ? 'bg-green-100 text-green-800' :
                  analytics.aiInsights.riskLevel === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {analytics.aiInsights.riskLevel} RISK
                </span>
              </div>
              <div className="flex items-center">
                <div className="flex-1 bg-gray-200 rounded-full h-2 mr-4">
                  <div 
                    className={`h-2 rounded-full ${
                      analytics.aiInsights.riskLevel === 'LOW' ? 'bg-green-500' :
                      analytics.aiInsights.riskLevel === 'MEDIUM' ? 'bg-yellow-500' :
                      'bg-red-500'
                    }`}
                    style={{ 
                      width: analytics.aiInsights.riskLevel === 'LOW' ? '25%' : 
                             analytics.aiInsights.riskLevel === 'MEDIUM' ? '60%' : '85%' 
                    }}
                  ></div>
                </div>
                <span className="text-sm text-gray-600">
                  Performance Prediction: {analytics.aiInsights.performancePrediction}%
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No analytics available</h3>
            <p className="mt-1 text-sm text-gray-500">
              Analytics data is not available for this user.
            </p>
          </div>
        )}
      </div>

      <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
        <button
          onClick={onClose}
          className="w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:w-auto sm:text-sm"
        >
          Close
        </button>
      </div>
    </div>
  );
};

export default UsersPage;
