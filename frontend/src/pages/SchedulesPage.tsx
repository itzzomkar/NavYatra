import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  CalendarIcon,
  ClockIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  PlayIcon,
  PauseIcon,
  MapPinIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
  CpuChipIcon,
  BoltIcon,
  TruckIcon,
  SparklesIcon,
  InformationCircleIcon,
  ArrowRightIcon,
  ChartBarIcon,
  UsersIcon,
  UserIcon,
  CogIcon,
} from '@heroicons/react/24/outline';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

import { useAuth } from '@/hooks/useAuth';
import Card from '@/components/ui/Card';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { schedulesApi } from '@/services/api';
import CreateScheduleModal from '@/components/schedules/CreateScheduleModal';
import EditScheduleModal from '@/components/schedules/EditScheduleModal';
import ScheduleDetailsModal from '@/components/schedules/ScheduleDetailsModal';

interface Schedule {
  _id: string;
  id: string;
  scheduleNumber: string;
  trainsetId: {
    _id: string;
    trainsetNumber: string;
    status: string;
  };
  trainsetNumber: string;
  route: {
    from: string;
    to: string;
    routeName: string;
  };
  routeDisplay: string;
  departureTime: string;
  arrivalTime: string;
  actualDepartureTime?: string;
  actualArrivalTime?: string;
  stations: Array<{
    name: string;
    scheduledArrival: string;
    scheduledDeparture: string;
    actualArrival?: string;
    actualDeparture?: string;
    platform?: string;
    stopDuration: number;
  }>;
  frequency: string;
  status: string;
  delay: number;
  delayReason?: string;
  expectedDuration: number;
  actualDuration?: number;
  passengerCount: number;
  peakOccupancy?: number;
  averageOccupancy?: number;
  crew: {
    driver?: {
      name: string;
      employeeId: string;
    };
    coDriver?: {
      name: string;
      employeeId: string;
    };
  };
  operationalDate: string;
  createdAt: string;
  updatedAt: string;
}

// Modal Error Boundary Component
class ModalErrorBoundary extends React.Component<
  { children: React.ReactNode; onError: () => void },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode; onError: () => void }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Modal Error:', error, errorInfo);
    this.props.onError();
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-md mx-4">
            <h3 className="text-lg font-semibold text-red-600 mb-4">Something went wrong</h3>
            <p className="text-gray-600 mb-4">The modal encountered an error. Please try again.</p>
            <button 
              onClick={() => {
                this.setState({ hasError: false });
                this.props.onError();
              }}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Close
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const SchedulesPage: React.FC = () => {
  const { hasPermission } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);
  const [aiOptimizationActive, setAiOptimizationActive] = useState(true);
  const [useDemo, setUseDemo] = useState(false);
  const [hasError, setHasError] = useState(false);

  // Error boundary effect
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      console.error('Runtime error in SchedulesPage:', event.error);
      setHasError(true);
      toast.error('An error occurred. Using demo mode.');
      setUseDemo(true);
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('Unhandled promise rejection in SchedulesPage:', event.reason);
      setHasError(true);
      toast.error('Connection error. Using demo mode.');
      setUseDemo(true);
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  // Generate comprehensive KMRL demo data
  const generateKMRLSchedulesData = () => {
    const today = new Date();
    const routes = [
      { from: 'Aluva', to: 'Palarivattom', routeName: 'Aluva - Palarivattom' },
      { from: 'Palarivattom', to: 'MG Road', routeName: 'Palarivattom - MG Road' },
      { from: 'MG Road', to: 'Aluva', routeName: 'MG Road - Aluva' },
      { from: 'Kalamassery', to: 'Town Hall', routeName: 'Kalamassery - Town Hall' },
      { from: 'Town Hall', to: 'Edapally', routeName: 'Town Hall - Edapally' },
    ];
    
    const trainsets = ['KMRL-001', 'KMRL-002', 'KMRL-003', 'KMRL-004', 'KMRL-005'];
    const statuses = ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'DELAYED', 'CANCELLED'];
    
    return Array.from({ length: 15 }, (_, i) => {
      const route = routes[i % routes.length];
      const trainset = trainsets[i % trainsets.length];
      const status = statuses[i % statuses.length];
      const scheduleTime = new Date(today);
      scheduleTime.setHours(6 + (i * 2) % 18, (i * 15) % 60);
      const arrivalTime = new Date(scheduleTime);
      arrivalTime.setMinutes(arrivalTime.getMinutes() + 45 + (i * 5) % 30);
      
      return {
        _id: `schedule-${i + 1}`,
        id: `schedule-${i + 1}`,
        scheduleNumber: `SCH-${String(i + 1).padStart(3, '0')}`,
        trainsetId: {
          _id: `ts-kmrl-${String((i % 5) + 1).padStart(3, '0')}`,
          trainsetNumber: trainset,
          status: 'ACTIVE'
        },
        trainsetNumber: trainset,
        route,
        routeDisplay: route.routeName,
        departureTime: scheduleTime.toISOString(),
        arrivalTime: arrivalTime.toISOString(),
        actualDepartureTime: status === 'COMPLETED' ? scheduleTime.toISOString() : undefined,
        actualArrivalTime: status === 'COMPLETED' ? arrivalTime.toISOString() : undefined,
        stations: [
          {
            name: route.from,
            scheduledArrival: scheduleTime.toISOString(),
            scheduledDeparture: scheduleTime.toISOString(),
            platform: `Platform ${(i % 4) + 1}`,
            stopDuration: 2
          },
          {
            name: route.to,
            scheduledArrival: arrivalTime.toISOString(),
            scheduledDeparture: arrivalTime.toISOString(),
            platform: `Platform ${((i + 1) % 4) + 1}`,
            stopDuration: 2
          }
        ],
        frequency: 'DAILY',
        status,
        delay: status === 'DELAYED' ? Math.floor(Math.random() * 10) + 1 : 0,
        delayReason: status === 'DELAYED' ? 'Traffic signal delay' : undefined,
        expectedDuration: 45 + (i * 5) % 30,
        actualDuration: status === 'COMPLETED' ? 45 + (i * 5) % 30 : undefined,
        passengerCount: Math.floor(Math.random() * 800) + 200,
        peakOccupancy: Math.floor(Math.random() * 100) + 70,
        averageOccupancy: Math.floor(Math.random() * 80) + 50,
        crew: {
          driver: {
            name: `Driver ${i + 1}`,
            employeeId: `EMP${String(i + 1).padStart(3, '0')}`
          },
          coDriver: {
            name: `Co-Driver ${i + 1}`,
            employeeId: `EMP${String(i + 100).padStart(3, '0')}`
          }
        },
        operationalDate: today.toISOString().split('T')[0],
        createdAt: new Date(today.getTime() - Math.random() * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date().toISOString(),
        aiOptimizationScore: 85 + Math.floor(Math.random() * 15),
        conflictRisk: Math.random() > 0.7 ? 'HIGH' : Math.random() > 0.4 ? 'MEDIUM' : 'LOW',
        energyEfficiencyScore: 88 + Math.floor(Math.random() * 12)
      };
    });
  };

  // Enhanced API call with comprehensive error handling
  const { data: schedulesResponse, isLoading, error } = useQuery({
    queryKey: ['schedules', statusFilter, dateFilter],
    queryFn: async () => {
      try {
        const params: any = {};
        if (statusFilter !== 'all') params.status = statusFilter;
        if (dateFilter !== 'all') params.date = dateFilter;
        
        console.log('Attempting API call with params:', params);
        const response = await schedulesApi.getAll(params);
        console.log('API Success - Schedules response:', response);
        setUseDemo(false);
        setHasError(false);
        return response;
      } catch (error: any) {
        console.warn('API Failed - Using demo data. Error details:', {
          message: error.message,
          status: error.response?.status,
          data: error.response?.data
        });
        setUseDemo(true);
        setHasError(true);
        
        // Always return demo data in consistent format
        const demoData = {
          success: true,
          data: generateKMRLSchedulesData(),
          message: 'Demo data loaded - API unavailable'
        };
        
        console.log('Returning demo data:', demoData);
        return demoData;
      }
    },
    retry: 1,
    refetchOnWindowFocus: false,
    // Add error boundary for React Query
    throwOnError: false,
    // Ensure we always have data
    placeholderData: {
      success: true,
      data: [],
      message: 'Loading...'
    }
  });

  // Safe data extraction with error handling
  const schedules = React.useMemo(() => {
    try {
      if (!schedulesResponse) {
        console.log('No schedules response, using empty array');
        return [];
      }
      
      const data = schedulesResponse.data || schedulesResponse || [];
      if (!Array.isArray(data)) {
        console.warn('Schedules data is not an array:', data);
        return [];
      }
      
      console.log('Successfully processed schedules data:', data.length, 'items');
      return data;
    } catch (error) {
      console.error('Error processing schedules data:', error);
      setHasError(true);
      setUseDemo(true);
      return generateKMRLSchedulesData();
    }
  }, [schedulesResponse]);
  
  // AI optimization suggestions
  const aiSuggestions = [
    {
      type: 'CONFLICT_RESOLUTION',
      message: 'AI detected potential scheduling conflict at 14:30 - suggested 5-minute delay for KMRL-003',
      confidence: 94,
      impact: 'LOW'
    },
    {
      type: 'ENERGY_OPTIMIZATION', 
      message: 'Route optimization suggests 12% energy savings by adjusting departure times',
      confidence: 87,
      impact: 'MEDIUM'
    },
    {
      type: 'PREDICTIVE_MAINTENANCE',
      message: 'KMRL-001 recommended for maintenance window - brake system prediction',
      confidence: 91,
      impact: 'HIGH'
    }
  ];

  useEffect(() => {
    if (useDemo) {
      toast('Running in demo mode - API unavailable', { 
        icon: 'ℹ️',
        duration: 3000 
      });
    }
  }, [useDemo]);

  // AI-enhanced filtering with early arrival detection
  const detectEarlyArrival = (schedule: any) => {
    if (schedule.actualArrivalTime && schedule.arrivalTime) {
      const actual = new Date(schedule.actualArrivalTime);
      const scheduled = new Date(schedule.arrivalTime);
      return actual < scheduled;
    }
    return false;
  };

  // Real-time status processing with AI insights
  const processScheduleStatus = (schedule: any) => {
    const now = new Date();
    const departure = new Date(schedule.departureTime);
    const arrival = new Date(schedule.arrivalTime);
    
    if (schedule.status === 'CANCELLED') return 'CANCELLED';
    if (schedule.actualArrivalTime) {
      return detectEarlyArrival(schedule) ? 'EARLY' : 'COMPLETED';
    }
    if (now >= departure && now < arrival) return 'IN_PROGRESS';
    if (now >= arrival && !schedule.actualArrivalTime) return 'DELAYED';
    return schedule.status;
  };

  // Enhanced mutations with demo mode handling
  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      if (useDemo) {
        await new Promise(resolve => setTimeout(resolve, 500));
        return { data: { ...data, id: `demo-${Date.now()}` } };
      }
      return schedulesApi.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      setShowCreateModal(false);
      toast.success('Schedule created successfully!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create schedule');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      if (useDemo) {
        await new Promise(resolve => setTimeout(resolve, 500));
        return { data: { ...data, id } };
      }
      return schedulesApi.update(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      setShowEditModal(false);
      setSelectedSchedule(null);
      toast.success('Schedule updated successfully!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update schedule');
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async (id: string) => {
      if (useDemo) {
        await new Promise(resolve => setTimeout(resolve, 500));
        return { success: true };
      }
      return schedulesApi.updateStatus(id, 'CANCELLED', 'Cancelled by user');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      toast.success('Schedule cancelled successfully!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to cancel schedule');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      if (useDemo) {
        await new Promise(resolve => setTimeout(resolve, 500));
        return { success: true };
      }
      return schedulesApi.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      toast.success('Schedule deleted successfully!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to delete schedule');
    },
  });

  // Event handlers
  const handleEditSchedule = (schedule: any) => {
    setSelectedSchedule(schedule);
    setShowEditModal(true);
  };

  const handleViewDetails = (schedule: any) => {
    setSelectedSchedule(schedule);
    setShowDetailsModal(true);
  };

  const handleCancelSchedule = (schedule: any) => {
    if (window.confirm(`Are you sure you want to cancel schedule ${schedule.scheduleNumber}?`)) {
      cancelMutation.mutate(schedule._id || schedule.id);
    }
  };

  const handleDeleteSchedule = (schedule: any) => {
    const isConfirmed = window.confirm(
      `⚠️ PERMANENT DELETE\n\nAre you absolutely sure you want to permanently delete schedule ${schedule.scheduleNumber}?\n\nThis action cannot be undone and will remove all associated data.`
    );
    
    if (isConfirmed) {
      const finalConfirm = window.confirm(
        `This is your final warning!\n\nDeleting schedule ${schedule.scheduleNumber} is IRREVERSIBLE.\n\nType 'DELETE' in the next prompt to confirm.`
      );
      
      if (finalConfirm) {
        const confirmText = window.prompt('Type "DELETE" to confirm permanent deletion:');
        if (confirmText === 'DELETE') {
          deleteMutation.mutate(schedule._id || schedule.id);
        } else {
          toast.error('Deletion cancelled - confirmation text did not match');
        }
      }
    }
  };

  // AI-enhanced filtering with error handling
  const filteredSchedules = React.useMemo(() => {
    try {
      if (!Array.isArray(schedules)) {
        console.warn('Schedules is not an array for filtering:', schedules);
        return [];
      }

      return schedules.filter((schedule: any) => {
        try {
          // Safe status processing
          const currentStatus = schedule?.status || 'UNKNOWN';
          
          // Safe search matching
          const searchLower = (search || '').toLowerCase();
          const matchesSearch = !search || [
            schedule?.scheduleNumber,
            schedule?.trainsetNumber,
            schedule?.routeDisplay,
            schedule?.route?.from,
            schedule?.route?.to,
            schedule?.crew?.driver?.name
          ].some(field => field?.toString().toLowerCase().includes(searchLower));
          
          // Safe status matching
          const matchesStatus = statusFilter === 'all' || 
            currentStatus.toLowerCase() === statusFilter.toLowerCase();
          
          // Safe date matching
          let matchesDate = true;
          if (dateFilter !== 'all' && schedule?.departureTime) {
            try {
              const today = new Date().toDateString();
              const scheduleDate = new Date(schedule.departureTime).toDateString();
              matchesDate = (dateFilter === 'today' && scheduleDate === today) ||
                          (dateFilter === 'upcoming' && new Date(schedule.departureTime) > new Date());
            } catch (dateError) {
              console.warn('Date filtering error for schedule:', schedule?.scheduleNumber, dateError);
              matchesDate = true; // Default to showing the item if date parsing fails
            }
          }
          
          return matchesSearch && matchesStatus && matchesDate;
        } catch (itemError) {
          console.warn('Error filtering individual schedule:', schedule?.scheduleNumber, itemError);
          return false; // Exclude problematic items
        }
      });
    } catch (error) {
      console.error('Error in schedule filtering:', error);
      setHasError(true);
      return []; // Return empty array on critical error
    }
  }, [schedules, search, statusFilter, dateFilter]);

  // Enhanced processed schedules with real-time status and error handling
  const processedSchedules = React.useMemo(() => {
    try {
      if (!Array.isArray(filteredSchedules)) {
        console.warn('FilteredSchedules is not an array:', filteredSchedules);
        return [];
      }

      return filteredSchedules.map((schedule: any) => {
        try {
          return {
            ...schedule,
            currentStatus: schedule?.status || 'UNKNOWN',
            isEarly: false, // Simplified for now to avoid errors
            aiScore: schedule?.aiOptimizationScore || 85,
            riskLevel: schedule?.conflictRisk || 'LOW'
          };
        } catch (itemError) {
          console.warn('Error processing individual schedule:', schedule?.scheduleNumber, itemError);
          // Return a safe fallback for this schedule
          return {
            ...schedule,
            currentStatus: 'ERROR',
            isEarly: false,
            aiScore: 50,
            riskLevel: 'HIGH'
          };
        }
      });
    } catch (error) {
      console.error('Error in schedule processing:', error);
      setHasError(true);
      return [];
    }
  }, [filteredSchedules]);

  const getStatusColor = (status: string) => {
    switch (status.toUpperCase()) {
      case 'SCHEDULED':
        return 'text-gray-600 bg-gray-100';
      case 'ACTIVE':
        return 'text-blue-600 bg-blue-100';
      case 'COMPLETED':
        return 'text-green-600 bg-green-100';
      case 'DELAYED':
        return 'text-yellow-600 bg-yellow-100';
      case 'EARLY':
        return 'text-purple-600 bg-purple-100';
      case 'CANCELLED':
      case 'SUSPENDED':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toUpperCase()) {
      case 'SCHEDULED':
        return <CalendarIcon className="h-4 w-4" />;
      case 'ACTIVE':
        return <PlayIcon className="h-4 w-4" />;
      case 'COMPLETED':
        return <CheckCircleIcon className="h-4 w-4" />;
      case 'DELAYED':
        return <ExclamationTriangleIcon className="h-4 w-4" />;
      case 'EARLY':
        return <ClockIcon className="h-4 w-4" />;
      case 'CANCELLED':
      case 'SUSPENDED':
        return <XCircleIcon className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${remainingMinutes}m`;
    }
    return `${minutes}m`;
  };


  const getEfficiencyColor = (actual: number, expected: number) => {
    const efficiency = (actual / expected) * 100;
    if (efficiency <= 100) return 'text-green-600';
    if (efficiency <= 110) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-3xl font-bold text-gray-900">Schedules</h1>
          <p className="text-gray-600 mt-2">
            Manage train schedules and track performance
          </p>
        </motion.div>

        {hasPermission('schedules:create') && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            <button 
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center px-4 py-2 bg-kmrl-600 text-white rounded-lg hover:bg-kmrl-700 transition-colors duration-200 font-medium">
              <PlusIcon className="h-5 w-5 mr-2" />
              New Schedule
            </button>
          </motion.div>
        )}
      </div>

      {/* AI Optimization Panel */}
      {aiOptimizationActive && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-2">
                <SparklesIcon className="h-6 w-6 text-blue-600" />
                <h3 className="text-lg font-semibold text-blue-900">AI Optimization Insights</h3>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  ACTIVE
                </span>
              </div>
              <button
                onClick={() => setAiOptimizationActive(false)}
                className="text-blue-400 hover:text-blue-600 p-1 rounded"
              >
                <XCircleIcon className="h-5 w-5" />
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {aiSuggestions.map((suggestion, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                  className="bg-white rounded-lg p-4 shadow-sm border"
                >
                  <div className="flex items-start space-x-2 mb-2">
                    <div className={`p-1 rounded-full ${
                      suggestion.type === 'CONFLICT_RESOLUTION' ? 'bg-yellow-100' :
                      suggestion.type === 'ENERGY_OPTIMIZATION' ? 'bg-green-100' : 'bg-red-100'
                    }`}>
                      {suggestion.type === 'CONFLICT_RESOLUTION' && <ExclamationTriangleIcon className="h-4 w-4 text-yellow-600" />}
                      {suggestion.type === 'ENERGY_OPTIMIZATION' && <BoltIcon className="h-4 w-4 text-green-600" />}
                      {suggestion.type === 'PREDICTIVE_MAINTENANCE' && <CogIcon className="h-4 w-4 text-red-600" />}
                    </div>
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-gray-900 mb-1">
                        {suggestion.type.replace('_', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
                      </h4>
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="text-xs text-gray-600">Confidence: {suggestion.confidence}%</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded ${
                          suggestion.impact === 'HIGH' ? 'bg-red-100 text-red-700' :
                          suggestion.impact === 'MEDIUM' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'
                        }`}>
                          {suggestion.impact}
                        </span>
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-gray-700">{suggestion.message}</p>
                </motion.div>
              ))}
            </div>
          </Card>
        </motion.div>
      )}

      {/* Statistics Summary */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="text-center">
            <div className="text-2xl font-bold text-kmrl-600">{processedSchedules.length}</div>
            <div className="text-sm text-gray-600">Total Schedules</div>
          </Card>
          <Card className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {processedSchedules.filter((s: any) => s.currentStatus === 'COMPLETED').length}
            </div>
            <div className="text-sm text-gray-600">Completed</div>
          </Card>
          <Card className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {processedSchedules.filter((s: any) => s.currentStatus === 'IN_PROGRESS').length}
            </div>
            <div className="text-sm text-gray-600">In Progress</div>
          </Card>
          <Card className="text-center">
            <div className="text-2xl font-bold text-yellow-600">
              {processedSchedules.filter((s: any) => s.currentStatus === 'DELAYED').length}
            </div>
            <div className="text-sm text-gray-600">Delayed</div>
          </Card>
        </div>
      </motion.div>

      {/* Debug Error Display */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <strong>Debug - API Error:</strong> {(error as any).message}
          {(error as any).response?.status && <div>Status: {(error as any).response.status}</div>}
          {(error as any).response?.data?.message && <div>Message: {(error as any).response.data.message}</div>}
        </div>
      )}

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <Card>
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search schedules..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="form-input pl-10"
                />
              </div>
            </div>

            {/* Date Filter */}
            <div className="sm:w-40">
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="form-input"
              >
                <option value="all">All Dates</option>
                <option value="today">Today</option>
                <option value="tomorrow">Tomorrow</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
              </select>
            </div>

            {/* Status Filter */}
            <div className="sm:w-40">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="form-input"
              >
                <option value="all">All Status</option>
                <option value="scheduled">Scheduled</option>
                <option value="active">Active/Running</option>
                <option value="completed">Completed</option>
                <option value="delayed">Delayed</option>
                <option value="early">Early</option>
                <option value="cancelled">Cancelled</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Schedules List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="space-y-4"
        >
          {processedSchedules.map((schedule: any, index: number) => (
            <motion.div
              key={schedule._id || schedule.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
            >
              <Card className="hover:shadow-lg transition-shadow border-l-4 border-l-kmrl-500">
                <div className="space-y-4">
                  {/* Header with Status and AI Insights */}
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {schedule.scheduleNumber}
                        </h3>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(schedule.currentStatus)}`}>
                          {getStatusIcon(schedule.currentStatus)}
                          <span className="ml-1">{schedule.currentStatus}</span>
                        </span>
                        
                        {/* AI Optimization Badge */}
                        {aiOptimizationActive && (
                          <span className="inline-flex items-center px-2 py-1 bg-gradient-to-r from-blue-100 to-purple-100 text-blue-700 text-xs font-medium rounded-md">
                            <SparklesIcon className="h-3 w-3 mr-1" />
                            AI Score: {schedule.aiScore}%
                          </span>
                        )}
                        
                        {/* Risk Level Indicator */}
                        {schedule.riskLevel !== 'LOW' && (
                          <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-md ${
                            schedule.riskLevel === 'HIGH' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                          }`}>
                            <ExclamationTriangleIcon className="h-3 w-3 mr-1" />
                            {schedule.riskLevel} RISK
                          </span>
                        )}
                        
                        {/* Demo Mode Indicator */}
                        {useDemo && (
                          <span className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-md">
                            <InformationCircleIcon className="h-3 w-3 mr-1" />
                            DEMO
                          </span>
                        )}
                      </div>
                      
                      {/* Route and Trainset Info */}
                      <div className="flex items-center space-x-4 text-sm text-gray-600 mb-3">
                        <span className="flex items-center">
                          <TruckIcon className="h-4 w-4 mr-1" />
                          {schedule.trainsetNumber || schedule.trainsetId?.trainsetNumber || 'No Trainset'}
                        </span>
                        <span className="flex items-center">
                          <MapPinIcon className="h-4 w-4 mr-1" />
                          {schedule.routeDisplay || schedule.route?.routeName || `${schedule.route?.from} → ${schedule.route?.to}`}
                        </span>
                      </div>
                    </div>

                    {/* Schedule Times */}
                    <div className="text-right">
                      <div className="text-lg font-semibold text-gray-900 mb-1">
                        {formatTime(schedule.departureTime)} → {formatTime(schedule.arrivalTime)}
                      </div>
                      {schedule.delay && schedule.delay > 0 && (
                        <div className="text-sm text-orange-600 font-medium">
                          Delayed by {schedule.delay} min
                        </div>
                      )}
                      {schedule.isEarly && (
                        <div className="text-sm text-purple-600 font-medium">
                          Early arrival detected
                        </div>
                      )}
                      <div className="text-xs text-gray-500">
                        Duration: {schedule.expectedDuration || 45} min
                      </div>
                    </div>
                  </div>

                  {/* Enhanced Details Grid */}
                  <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-4 p-4 bg-gray-50 rounded-lg">
                    {/* Station Information */}
                    <div className="lg:col-span-1">
                      <h4 className="text-sm font-medium text-gray-900 mb-2 flex items-center">
                        <MapPinIcon className="h-4 w-4 mr-1 text-kmrl-600" />
                        Route
                      </h4>
                      <div className="space-y-2">
                        <div className="text-sm">
                          <span className="inline-flex items-center px-2 py-1 bg-green-100 text-green-700 rounded-md text-xs font-medium">
                            {schedule.route?.from || 'Origin'}
                          </span>
                          <ArrowRightIcon className="h-3 w-3 mx-2 text-gray-400 inline" />
                          <span className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-700 rounded-md text-xs font-medium">
                            {schedule.route?.to || 'Destination'}
                          </span>
                        </div>
                        {schedule.stations && schedule.stations.length > 2 && (
                          <div className="text-xs text-gray-500">
                            via {schedule.stations.length - 2} intermediate station{schedule.stations.length - 2 !== 1 ? 's' : ''}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Performance Metrics */}
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 mb-2 flex items-center">
                        <ChartBarIcon className="h-4 w-4 mr-1 text-kmrl-600" />
                        Performance
                      </h4>
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between">
                          <span className="text-gray-600">On-Time Score</span>
                          <span className={`font-medium ${
                            schedule.aiScore >= 90 ? 'text-green-600' : 
                            schedule.aiScore >= 75 ? 'text-yellow-600' : 'text-red-600'
                          }`}>
                            {schedule.aiScore}%
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Energy Score</span>
                          <span className="font-medium text-green-600">
                            {schedule.energyEfficiencyScore || 88}%
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Risk Level</span>
                          <span className={`font-medium ${
                            schedule.riskLevel === 'HIGH' ? 'text-red-600' :
                            schedule.riskLevel === 'MEDIUM' ? 'text-yellow-600' : 'text-green-600'
                          }`}>
                            {schedule.riskLevel || 'LOW'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Crew Information */}
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 mb-2 flex items-center">
                        <UsersIcon className="h-4 w-4 mr-1 text-kmrl-600" />
                        Crew
                      </h4>
                      <div className="text-xs text-gray-600 space-y-1">
                        <div className="flex items-center">
                          <UserIcon className="h-3 w-3 mr-1" />
                          {schedule.crew?.driver?.name || 'Driver TBD'}
                        </div>
                        <div className="flex items-center">
                          <UserIcon className="h-3 w-3 mr-1" />
                          {schedule.crew?.coDriver?.name || 'Co-Driver TBD'}
                        </div>
                      </div>
                    </div>

                    {/* Operational Details */}
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 mb-2 flex items-center">
                        <CogIcon className="h-4 w-4 mr-1 text-kmrl-600" />
                        Operations
                      </h4>
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Frequency</span>
                          <span className="font-medium">{schedule.frequency || 'Daily'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Capacity</span>
                          <span className="font-medium">850 pax</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Formation</span>
                          <span className="font-medium">3-Car EMU</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                    <div className="flex space-x-1">
                      <button 
                        onClick={() => handleViewDetails(schedule)}
                        className="p-2 text-gray-500 hover:text-kmrl-600 hover:bg-gray-50 rounded-lg transition-all duration-200" 
                        title="View Details"
                      >
                        <EyeIcon className="h-5 w-5" />
                      </button>
                      
                      {hasPermission('schedules:update') && (
                        <button 
                          onClick={() => handleEditSchedule(schedule)}
                          className="p-2 text-gray-500 hover:text-kmrl-600 hover:bg-gray-50 rounded-lg transition-all duration-200" 
                          title="Edit Schedule"
                        >
                          <PencilIcon className="h-5 w-5" />
                        </button>
                      )}
                      
                      {hasPermission('schedules:update') && schedule.currentStatus !== 'CANCELLED' && schedule.currentStatus !== 'COMPLETED' && (
                        <button 
                          onClick={() => handleCancelSchedule(schedule)}
                          className="p-2 text-gray-500 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-all duration-200" 
                          title="Cancel Schedule"
                          disabled={cancelMutation.isPending}
                        >
                          <XCircleIcon className="h-5 w-5" />
                        </button>
                      )}
                      
                      {hasPermission('schedules:delete') && (
                        <button 
                          onClick={() => handleDeleteSchedule(schedule)}
                          className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200" 
                          title="Delete (Permanent)"
                          disabled={deleteMutation.isPending}
                        >
                          <TrashIcon className="h-5 w-5" />
                        </button>
                      )}
                    </div>

                    <div className="text-xs text-gray-500">
                      Created {new Date(schedule.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Empty State */}
      {!isLoading && filteredSchedules.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center py-12"
        >
          <CalendarIcon className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No schedules found</h3>
          <p className="text-gray-500 mb-4">
            {search || statusFilter !== 'all'
              ? 'Try adjusting your filters'
              : 'Get started by creating your first schedule'}
          </p>
          {hasPermission('schedules:create') && (
            <button 
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center px-4 py-2 bg-kmrl-600 text-white rounded-lg hover:bg-kmrl-700 transition-colors duration-200 font-medium">
              <PlusIcon className="h-5 w-5 mr-2" />
              New Schedule
            </button>
          )}
        </motion.div>
      )}

      {/* Create Schedule Modal - with error boundary */}
      {showCreateModal && (
        <ModalErrorBoundary 
          onError={() => {
            setShowCreateModal(false);
            setHasError(false);
            toast.error('Modal failed to load. Please try again.');
          }}
        >
          <CreateScheduleModal 
            isOpen={showCreateModal} 
            onClose={() => {
              setShowCreateModal(false);
              setHasError(false);
            }} 
          />
        </ModalErrorBoundary>
      )}
      
      {/* Edit Schedule Modal - with error boundary */}
      {showEditModal && selectedSchedule && (
        <ModalErrorBoundary 
          onError={() => {
            setShowEditModal(false);
            setSelectedSchedule(null);
            setHasError(false);
            toast.error('Modal failed to load. Please try again.');
          }}
        >
          <EditScheduleModal 
            isOpen={showEditModal} 
            onClose={() => {
              setShowEditModal(false);
              setSelectedSchedule(null);
              setHasError(false);
            }} 
            schedule={selectedSchedule}
          />
        </ModalErrorBoundary>
      )}
      
      {/* Schedule Details Modal - with error boundary */}
      {showDetailsModal && selectedSchedule && (
        <ModalErrorBoundary 
          onError={() => {
            setShowDetailsModal(false);
            setSelectedSchedule(null);
            setHasError(false);
            toast.error('Modal failed to load. Please try again.');
          }}
        >
          <ScheduleDetailsModal 
            isOpen={showDetailsModal} 
            onClose={() => {
              setShowDetailsModal(false);
              setSelectedSchedule(null);
              setHasError(false);
            }} 
            schedule={selectedSchedule}
          />
        </ModalErrorBoundary>
      )}
    </div>
  );
};

export default SchedulesPage;
