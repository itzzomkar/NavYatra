import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  PlayIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  SparklesIcon,
  ClockIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ChartBarIcon,
  DocumentTextIcon,
  AdjustmentsHorizontalIcon,
  InformationCircleIcon,
  CalendarDaysIcon,
  UserGroupIcon,
  BoltIcon,
  ShieldCheckIcon,
  ArrowDownTrayIcon,
} from '@heroicons/react/24/outline';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

import { scheduleApi, metroCarsApi, analyticsApi } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { useWebSocket } from '../hooks/useWebSocket';
import Card from '../components/ui/Card';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import MetricCard from '../components/ui/MetricCard';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface OptimizationConstraints {
  minTurnaroundTime: number;
  maxDailyOperatingHours: number;
  minPlatformDwellTime: number;
  mandatoryMaintenanceWindow: boolean;
  maxMileageBeforeMaintenance: number;
  fitnessComplianceRequired: boolean;
  maxCrewDutyHours: number;
  minCrewRestPeriod: number;
  crewChangeTime: number;
  depotCapacity: number;
  platformCapacity: number;
  stablingPositions: number;
}

interface OptimizationObjectives {
  fitnessCompliance: number;
  maintenanceScheduling: number;
  mileageBalancing: number;
  energyEfficiency: number;
  passengerComfort: number;
  operationalCost: number;
}

interface OptimizationRun {
  id: string;
  name?: string;
  description?: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  trainsetIds: string[];
  fitnessScore?: number;
  createdAt: string;
  duration?: number;
  configuration: any;
  results?: any;
  errorMessage?: string;
}

const OptimizationPage: React.FC = () => {
  const { hasPermission } = useAuth();
  const queryClient = useQueryClient();
  
  // State management
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [selectedShift, setSelectedShift] = useState<'MORNING' | 'AFTERNOON' | 'EVENING'>('MORNING');
  const [selectedTrainsets, setSelectedTrainsets] = useState<string[]>([]);
  const [optimizationProgress, setOptimizationProgress] = useState<number>(0);
  const [optimizationStage, setOptimizationStage] = useState<string>('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedOptimization, setSelectedOptimization] = useState<OptimizationRun | null>(null);

  // Optimization configuration
  const [constraints, setConstraints] = useState<OptimizationConstraints>({
    minTurnaroundTime: 15,
    maxDailyOperatingHours: 18,
    minPlatformDwellTime: 30,
    mandatoryMaintenanceWindow: true,
    maxMileageBeforeMaintenance: 5000,
    fitnessComplianceRequired: true,
    maxCrewDutyHours: 8,
    minCrewRestPeriod: 8,
    crewChangeTime: 30,
    depotCapacity: 10,
    platformCapacity: 4,
    stablingPositions: 8,
  });

  const [objectives, setObjectives] = useState<OptimizationObjectives>({
    fitnessCompliance: 0.25,
    maintenanceScheduling: 0.20,
    mileageBalancing: 0.15,
    energyEfficiency: 0.15,
    passengerComfort: 0.15,
    operationalCost: 0.10,
  });

  // Fetch available trainsets
  const { data: trainsetsResp, isLoading: trainsetsLoading } = useQuery({
    queryKey: ['trainsets'],
    queryFn: metroCarsApi.getAll,
    retry: 3,
    retryDelay: 1000,
  });

  const trainsets = trainsetsResp?.data || [];

  // Filter available trainsets based on constraints
  const availableTrainsets = trainsets.filter((trainset: any) => {
    if (constraints.fitnessComplianceRequired && trainset.fitnessExpiry) {
      const fitnessDate = new Date(trainset.fitnessExpiry);
      const now = new Date();
      if (fitnessDate <= now) return false;
    }
    if (trainset.status !== 'AVAILABLE' && trainset.status !== 'IN_SERVICE') {
      return false;
    }
    return true;
  });

  // Fetch optimization history
  const { data: optimizationResp, isLoading: optimizationsLoading } = useQuery({
    queryKey: ['optimizations', statusFilter],
    queryFn: async () => {
      const params: any = {};
      if (statusFilter !== 'all') params.status = statusFilter;
      return analyticsApi.getOptimization();
    },
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  const optimizationRuns: OptimizationRun[] = (optimizationResp as any)?.data?.recent || [];

  // Filter optimization runs
  const filteredOptimizations = optimizationRuns
    .filter((opt: OptimizationRun) => {
      const matchesSearch = 
        opt.id.toLowerCase().includes(search.toLowerCase()) ||
        (opt.name && opt.name.toLowerCase().includes(search.toLowerCase())) ||
        (opt.description && opt.description.toLowerCase().includes(search.toLowerCase())) ||
        opt.trainsetIds.some(id => id.toLowerCase().includes(search.toLowerCase()));
      
      const matchesStatus = statusFilter === 'all' || 
        opt.status.toLowerCase() === statusFilter.toLowerCase();
      
      return matchesSearch && matchesStatus;
    });

  // WebSocket hook for real-time updates
  const { isConnected } = useWebSocket({
    autoConnect: true, // Re-enabled - WebSocket server is now available
    subscriptions: ['optimization'],
    onOptimizationStarted: (data) => {
      setOptimizationProgress(10);
      setOptimizationStage('Optimization started...');
    },
    onOptimizationUpdate: (data) => {
      // Handle optimization completion
      setOptimizationProgress(100);
      setOptimizationStage('Optimization completed');
      toast.success('Optimization completed successfully!');
      queryClient.invalidateQueries({ queryKey: ['optimizations'] });
    },
    onOptimizationResult: (data) => {
      // Handle optimization results
      queryClient.invalidateQueries({ queryKey: ['optimizations'] });
    },
    onError: (error) => {
      toast.error(`Optimization failed: ${error.message || 'Unknown error'}`);
      setOptimizationProgress(0);
      setOptimizationStage('');
    },
  });

  // Use real WebSocket connection status
  // const simulatedIsConnected = false; // No longer needed

  // Simulate progress for better UX
  const simulateProgress = () => {
    const stages = [
      { progress: 10, stage: 'Validating constraints...' },
      { progress: 25, stage: 'Loading trainset data...' },
      { progress: 40, stage: 'Initializing AI algorithm...' },
      { progress: 60, stage: 'Running genetic optimization...' },
      { progress: 80, stage: 'Validating solution...' },
      { progress: 95, stage: 'Generating schedule...' },
    ];

    stages.forEach((stage, index) => {
      setTimeout(() => {
        setOptimizationProgress(stage.progress);
        setOptimizationStage(stage.stage);
      }, index * 3000); // 3 seconds between each stage
    });
  };

  // Start optimization mutation
  const startOptimizationMutation = useMutation({
    mutationFn: async () => {
      const request = {
        date: selectedDate,
        shift: selectedShift,
        trainsetIds: selectedTrainsets,
        constraints,
        objectives,
        parameters: {
          algorithm: 'GENETIC_ALGORITHM',
          maxIterations: 1000,
          populationSize: 50,
          mutationRate: 0.1,
          crossoverRate: 0.8,
          eliteSize: 5,
          convergenceThreshold: 0.001,
        },
      };
      return scheduleApi.optimize(request);
    },
    onSuccess: (result) => {
      toast.success('Optimization started successfully');
      setOptimizationProgress(5);
      setOptimizationStage('Initializing optimization...');
      simulateProgress(); // Start simulated progress
      queryClient.invalidateQueries({ queryKey: ['optimizations'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to start optimization');
      setOptimizationProgress(0);
      setOptimizationStage('');
    },
  });

  // Delete optimization mutation
  const deleteOptimizationMutation = useMutation({
    mutationFn: async (id: string) => {
      // Implement delete API call when available
      return Promise.resolve();
    },
    onSuccess: () => {
      toast.success('Optimization deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['optimizations'] });
    },
    onError: () => {
      toast.error('Failed to delete optimization');
    },
  });

  // Handlers
  const handleStartOptimization = () => {
    if (selectedTrainsets.length === 0) {
      toast.error('Please select at least one trainset');
      return;
    }

    if (selectedTrainsets.length < 2) {
      toast('Optimization works best with at least 2 trainsets', {
        icon: '⚠️',
        duration: 4000,
      });
    }

    // Validate objectives sum to 100%
    const totalWeight = Object.values(objectives).reduce((sum, w) => sum + w, 0);
    if (Math.abs(totalWeight - 1.0) > 0.01) {
      toast.error('Objective weights must sum to 100%');
      return;
    }

    startOptimizationMutation.mutate();
  };

  const handleViewDetails = (optimization: OptimizationRun) => {
    setSelectedOptimization(optimization);
    setShowDetailsModal(true);
  };

  const handleDelete = (optimization: OptimizationRun) => {
    if (window.confirm(`Are you sure you want to delete optimization ${optimization.id}?`)) {
      deleteOptimizationMutation.mutate(optimization.id);
    }
  };

  const handleExportResults = (optimization: OptimizationRun) => {
    const dataToExport = {
      exportDate: new Date().toISOString(),
      optimization,
    };
    
    const blob = new Blob([JSON.stringify(dataToExport, null, 2)], {
      type: 'application/json',
    });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `optimization-${optimization.id}-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Utility functions
  const getStatusColor = (status: string) => {
    switch (status.toUpperCase()) {
      case 'COMPLETED':
        return 'text-green-700 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200';
      case 'RUNNING':
        return 'text-blue-700 bg-gradient-to-r from-blue-50 to-sky-50 border border-blue-200';
      case 'PENDING':
        return 'text-amber-700 bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200';
      case 'FAILED':
        return 'text-red-700 bg-gradient-to-r from-red-50 to-rose-50 border border-red-200';
      default:
        return 'text-gray-700 bg-gradient-to-r from-gray-50 to-slate-50 border border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toUpperCase()) {
      case 'COMPLETED':
        return <CheckCircleIcon className="h-4 w-4" />;
      case 'RUNNING':
        return <ArrowPathIcon className="h-4 w-4 animate-spin" />;
      case 'PENDING':
        return <ClockIcon className="h-4 w-4" />;
      case 'FAILED':
        return <ExclamationTriangleIcon className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const formatDuration = (seconds: number | null | undefined) => {
    if (!seconds) return 'N/A';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  // Chart data for analytics
  const optimizationTrendsData = {
    labels: filteredOptimizations.slice(-7).map((opt) => 
      new Date(opt.createdAt).toLocaleDateString()
    ),
    datasets: [
      {
        label: 'Fitness Score',
        data: filteredOptimizations.slice(-7).map((opt) => opt.fitnessScore || 0),
        borderColor: '#059669',
        backgroundColor: 'rgba(5, 150, 105, 0.1)',
        tension: 0.4,
        fill: true,
      },
    ],
  };

  const statusDistributionData = {
    labels: ['Completed', 'Running', 'Pending', 'Failed'],
    datasets: [
      {
        data: [
          filteredOptimizations.filter(opt => opt.status === 'COMPLETED').length,
          filteredOptimizations.filter(opt => opt.status === 'RUNNING').length,
          filteredOptimizations.filter(opt => opt.status === 'PENDING').length,
          filteredOptimizations.filter(opt => opt.status === 'FAILED').length,
        ],
        backgroundColor: ['#059669', '#3B82F6', '#F59E0B', '#EF4444'],
        borderWidth: 0,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
      },
    },
  };

  if (trainsetsLoading) {
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
          <h1 className="text-3xl font-bold text-gray-900">AI Schedule Optimization</h1>
          <p className="text-gray-600 mt-2">
            Advanced AI-powered train scheduling with real-world constraints and operational intelligence
          </p>
        </motion.div>

        {hasPermission('optimization:create') && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="flex items-center space-x-4"
          >
            <div className={`flex items-center px-3 py-1 rounded-full text-sm ${
              isConnected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}>
              <div className={`h-2 w-2 rounded-full mr-2 ${
                isConnected ? 'bg-green-500' : 'bg-red-500'
              }`} />
              {isConnected ? 'Live Updates' : 'Disconnected'}
            </div>
            <button 
              className="inline-flex items-center px-4 py-2.5 bg-gradient-to-r from-kmrl-600 to-blue-600 text-white font-medium rounded-lg hover:from-kmrl-700 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-kmrl-500 shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200"
              onClick={() => setShowCreateModal(true)}
            >
              <SparklesIcon className="h-5 w-5 mr-2" />
              New Optimization
            </button>
          </motion.div>
        )}
      </div>

      {/* Metrics Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
      >
        <MetricCard
          title="Total Optimizations"
          value={optimizationRuns.length}
          icon={ChartBarIcon}
          color="blue"
          trend={{ value: 12, direction: 'up' }}
        />
        <MetricCard
          title="Success Rate"
          value={Math.round((optimizationRuns.filter(opt => opt.status === 'COMPLETED').length / Math.max(optimizationRuns.length, 1)) * 100)}
          icon={CheckCircleIcon}
          color="green"
          trend={{ value: 8, direction: 'up' }}
          suffix="%"
        />
        <MetricCard
          title="Avg Fitness Score"
          value={Number((optimizationRuns.filter(opt => opt.fitnessScore).reduce((sum, opt) => sum + (opt.fitnessScore || 0), 0) / Math.max(optimizationRuns.filter(opt => opt.fitnessScore).length, 1)).toFixed(1))}
          icon={SparklesIcon}
          color="purple"
          trend={{ value: 0.3, direction: 'up' }}
          suffix="/10"
        />
        <MetricCard
          title="Available Trainsets"
          value={availableTrainsets.length}
          icon={UserGroupIcon}
          color="indigo"
          trend={{ value: 2, direction: 'up' }}
        />
      </motion.div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Card title="Optimization Performance Trend" className="h-80">
            <Line data={optimizationTrendsData} options={chartOptions} />
          </Card>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <Card title="Status Distribution" className="h-80">
            <Doughnut data={statusDistributionData} options={chartOptions} />
          </Card>
        </motion.div>
      </div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
      >
        <Card>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search optimizations..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="form-input pl-10"
              />
            </div>
            <div className="sm:w-40">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="form-input"
              >
                <option value="all">All Status</option>
                <option value="completed">Completed</option>
                <option value="running">Running</option>
                <option value="pending">Pending</option>
                <option value="failed">Failed</option>
              </select>
            </div>
            <button
              onClick={() => queryClient.invalidateQueries({ queryKey: ['optimizations'] })}
              className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
              title="Refresh Data"
            >
              🔄
            </button>
          </div>
        </Card>
      </motion.div>

      {/* Optimization Progress */}
      {optimizationProgress > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
        >
          <Card>
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Optimization in Progress
              </h3>
              <div className="relative">
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-gradient-to-r from-kmrl-500 to-kmrl-600 h-3 rounded-full transition-all duration-500"
                    style={{ width: `${optimizationProgress}%` }}
                  />
                </div>
                <div className="mt-2 text-sm text-gray-600">
                  {optimizationStage} ({optimizationProgress}%)
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-5 gap-4 text-sm">
              <div className={`flex items-center ${optimizationProgress >= 10 ? 'text-green-600' : 'text-gray-400'}`}>
                <CheckCircleIcon className="h-4 w-4 mr-2" />
                Data Validation
              </div>
              <div className={`flex items-center ${optimizationProgress >= 30 ? 'text-green-600' : 'text-gray-400'}`}>
                <CheckCircleIcon className="h-4 w-4 mr-2" />
                Constraint Checking
              </div>
              <div className={`flex items-center ${optimizationProgress >= 60 ? 'text-green-600' : 'text-gray-400'}`}>
                <CheckCircleIcon className="h-4 w-4 mr-2" />
                Running AI Algorithm
              </div>
              <div className={`flex items-center ${optimizationProgress >= 90 ? 'text-green-600' : 'text-gray-400'}`}>
                <CheckCircleIcon className="h-4 w-4 mr-2" />
                Validating Solution
              </div>
              <div className={`flex items-center ${optimizationProgress >= 100 ? 'text-green-600' : 'text-gray-400'}`}>
                <CheckCircleIcon className="h-4 w-4 mr-2" />
                Generating Schedule
              </div>
            </div>
          </Card>
        </motion.div>
      )}

      {/* Optimization Runs List */}
      {optimizationsLoading ? (
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="space-y-4"
        >
          {filteredOptimizations.map((optimization: OptimizationRun, index: number) => (
            <motion.div
              key={optimization.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
            >
              <Card className="hover:shadow-xl transition-all duration-300 hover:transform hover:-translate-y-1">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center">
                    <div className="p-3 bg-kmrl-50 rounded-lg">
                      <SparklesIcon className="h-8 w-8 text-kmrl-600" />
                    </div>
                    <div className="ml-4">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {optimization.name || `Optimization ${optimization.id}`}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {optimization.description || new Date(optimization.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(optimization.status)} shadow-sm`}>
                    {getStatusIcon(optimization.status)}
                    <span className="ml-1.5">
                      {optimization.status.charAt(0) + optimization.status.slice(1).toLowerCase()}
                    </span>
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Configuration</h4>
                    <div className="text-sm text-gray-600 space-y-1">
                      <div>Trainsets: {optimization.trainsetIds.length}</div>
                      <div>Algorithm: Genetic AI</div>
                      <div>Duration: {formatDuration(optimization.duration)}</div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Results</h4>
                    <div className="text-sm text-gray-600 space-y-1">
                      <div>Fitness Score: {optimization.fitnessScore ? `${optimization.fitnessScore.toFixed(2)}/10` : 'N/A'}</div>
                      <div>Status: {optimization.status}</div>
                      {optimization.errorMessage && (
                        <div className="text-red-600">Error: {optimization.errorMessage}</div>
                      )}
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Trainsets</h4>
                    <div className="text-sm text-gray-600">
                      {optimization.trainsetIds.slice(0, 3).map((id, idx) => (
                        <div key={idx} className="truncate">
                          {trainsets.find((t: any) => t.id === id)?.trainsetNumber || id}
                        </div>
                      ))}
                      {optimization.trainsetIds.length > 3 && (
                        <div className="text-gray-400">
                          +{optimization.trainsetIds.length - 3} more
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="pt-4 mt-4 border-t border-gray-100">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1">
                      <button
                        className="inline-flex items-center p-2 text-gray-500 hover:text-kmrl-600 hover:bg-kmrl-50 rounded-lg transition-all duration-200"
                        onClick={() => handleViewDetails(optimization)}
                        title="View Details"
                      >
                        <EyeIcon className="h-4 w-4" />
                      </button>
                      
                      {optimization.status === 'COMPLETED' && (
                        <button
                          className="inline-flex items-center p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-all duration-200"
                          onClick={() => handleExportResults(optimization)}
                          title="Export Results"
                        >
                          <ArrowDownTrayIcon className="h-4 w-4" />
                        </button>
                      )}
                      
                      {hasPermission('optimization:delete') && (
                        <button
                          className="inline-flex items-center p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200"
                          onClick={() => handleDelete(optimization)}
                          title="Delete"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                    
                    <div className="text-xs text-gray-500">
                      ID: {optimization.id}
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Empty State */}
      {!optimizationsLoading && filteredOptimizations.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center py-12"
        >
          <SparklesIcon className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No optimizations found</h3>
          <p className="text-gray-500 mb-4">
            {search || statusFilter !== 'all'
              ? 'Try adjusting your filters'
              : 'Get started by running your first AI optimization'}
          </p>
          {hasPermission('optimization:create') && (
            <button 
              className="inline-flex items-center px-4 py-2 bg-kmrl-600 text-white rounded-lg hover:bg-kmrl-700 transition-colors duration-200 font-medium"
              onClick={() => setShowCreateModal(true)}
            >
              <SparklesIcon className="h-5 w-5 mr-2" />
              New Optimization
            </button>
          )}
        </motion.div>
      )}

      {/* Create Optimization Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2 }}
            className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
          >
            <div className="bg-gradient-to-r from-kmrl-600 to-blue-600 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                    <SparklesIcon className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-white">Create New Optimization</h2>
                    <p className="text-sm text-white/80 mt-0.5">Configure AI parameters and constraints</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors duration-200 group"
                >
                  <svg className="h-5 w-5 text-white group-hover:rotate-90 transition-transform duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-8rem)]">
              <div className="space-y-6">
                {/* Schedule Configuration */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center mb-4">
                    <CalendarDaysIcon className="h-5 w-5 text-kmrl-600 mr-2" />
                    Schedule Configuration
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
                      <input
                        type="date"
                        value={selectedDate}
                        min={new Date().toISOString().split('T')[0]}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="form-input"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Shift</label>
                      <select
                        value={selectedShift}
                        onChange={(e) => setSelectedShift(e.target.value as any)}
                        className="form-input"
                      >
                        <option value="MORNING">Morning (6 AM - 2 PM)</option>
                        <option value="AFTERNOON">Afternoon (2 PM - 10 PM)</option>
                        <option value="EVENING">Evening (10 PM - 6 AM)</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Trainset Selection */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center mb-4">
                    <DocumentTextIcon className="h-5 w-5 text-kmrl-600 mr-2" />
                    Select Trainsets ({selectedTrainsets.length} selected)
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-60 overflow-y-auto">
                    {availableTrainsets.map((trainset: any) => (
                      <label
                        key={trainset.id}
                        className={`flex items-center p-3 border rounded-lg cursor-pointer transition-all ${
                          selectedTrainsets.includes(trainset.id)
                            ? 'border-kmrl-500 bg-kmrl-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedTrainsets.includes(trainset.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedTrainsets([...selectedTrainsets, trainset.id]);
                            } else {
                              setSelectedTrainsets(
                                selectedTrainsets.filter((id) => id !== trainset.id)
                              );
                            }
                          }}
                          className="form-checkbox"
                        />
                        <div className="ml-3 flex-1">
                          <div className="font-medium text-gray-900">
                            {trainset.trainsetNumber || trainset.id}
                          </div>
                          <div className="text-sm text-gray-500">
                            {trainset.manufacturer} {trainset.model}
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Optimization Objectives */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center mb-4">
                    <ChartBarIcon className="h-5 w-5 text-kmrl-600 mr-2" />
                    Optimization Objectives (must sum to 100%)
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    {Object.entries(objectives).map(([key, value]) => (
                      <div key={key}>
                        <label className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-gray-700 capitalize">
                            {key.replace(/([A-Z])/g, ' $1').trim()}
                          </span>
                          <span className="text-sm font-semibold text-kmrl-600">
                            {(value * 100).toFixed(0)}%
                          </span>
                        </label>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={value * 100}
                          onChange={(e) => {
                            const newValue = parseInt(e.target.value) / 100;
                            setObjectives({ ...objectives, [key]: newValue });
                          }}
                          className="w-full"
                        />
                      </div>
                    ))}
                    <div className="col-span-2 pt-4 border-t">
                      <div className="flex justify-between">
                        <span className="text-sm font-medium text-gray-700">Total Weight:</span>
                        <span className={`text-sm font-bold ${
                          Math.abs(Object.values(objectives).reduce((sum, w) => sum + w, 0) - 1.0) < 0.01
                            ? 'text-green-600'
                            : 'text-red-600'
                        }`}>
                          {(Object.values(objectives).reduce((sum, w) => sum + w, 0) * 100).toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quick Constraints */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center mb-4">
                    <ShieldCheckIcon className="h-5 w-5 text-kmrl-600 mr-2" />
                    Key Constraints
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={constraints.fitnessComplianceRequired}
                        onChange={(e) => setConstraints({
                          ...constraints,
                          fitnessComplianceRequired: e.target.checked
                        })}
                        className="form-checkbox"
                      />
                      <span className="ml-2 text-sm font-medium text-gray-700">
                        Require Valid Fitness Certificate
                      </span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={constraints.mandatoryMaintenanceWindow}
                        onChange={(e) => setConstraints({
                          ...constraints,
                          mandatoryMaintenanceWindow: e.target.checked
                        })}
                        className="form-checkbox"
                      />
                      <span className="ml-2 text-sm font-medium text-gray-700">
                        Enforce Maintenance Windows
                      </span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-6 mt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="inline-flex items-center px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-all duration-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleStartOptimization}
                  disabled={selectedTrainsets.length === 0 || startOptimizationMutation.isPending}
                  className="inline-flex items-center px-6 py-2.5 bg-gradient-to-r from-kmrl-600 to-blue-600 text-white font-medium rounded-lg hover:from-kmrl-700 hover:to-blue-700 transition-all duration-200 disabled:opacity-50"
                >
                  {startOptimizationMutation.isPending ? (
                    <>
                      <LoadingSpinner size="sm" />
                      <span className="ml-2">Starting...</span>
                    </>
                  ) : (
                    <>
                      <PlayIcon className="h-4 w-4 mr-2" />
                      Start Optimization
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Details Modal */}
      {showDetailsModal && selectedOptimization && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">
                  {selectedOptimization.name || `Optimization ${selectedOptimization.id}`}
                </h2>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>
              
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h3 className="font-medium text-gray-900 mb-3">Configuration</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Status:</span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedOptimization.status)}`}>
                          {selectedOptimization.status}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Created:</span>
                        <span className="font-medium text-gray-900">
                          {new Date(selectedOptimization.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Duration:</span>
                        <span className="font-medium text-gray-900">
                          {formatDuration(selectedOptimization.duration)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Fitness Score:</span>
                        <span className="font-medium text-gray-900">
                          {selectedOptimization.fitnessScore ? `${selectedOptimization.fitnessScore.toFixed(2)}/10` : 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h3 className="font-medium text-gray-900 mb-3">Trainsets ({selectedOptimization.trainsetIds.length})</h3>
                    <div className="space-y-1 text-sm max-h-32 overflow-y-auto">
                      {selectedOptimization.trainsetIds.map((id, idx) => (
                        <div key={idx} className="flex justify-between">
                          <span className="text-gray-500">Trainset {idx + 1}:</span>
                          <span className="font-medium text-gray-900">
                            {trainsets.find((t: any) => t.id === id)?.trainsetNumber || id}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                
                {selectedOptimization.results && (
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h3 className="font-medium text-gray-900 mb-3">Results Summary</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      {selectedOptimization.results.fitnessScore && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">Fitness Score:</span>
                          <span className="font-medium text-gray-900">{selectedOptimization.results.fitnessScore.toFixed(2)}/10</span>
                        </div>
                      )}
                      {selectedOptimization.results.improvementPercentage && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">Improvement:</span>
                          <span className="font-medium text-green-600">+{selectedOptimization.results.improvementPercentage.toFixed(1)}%</span>
                        </div>
                      )}
                      {selectedOptimization.results.scheduleCount && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">Schedules Generated:</span>
                          <span className="font-medium text-gray-900">{selectedOptimization.results.scheduleCount}</span>
                        </div>
                      )}
                      {selectedOptimization.results.metrics?.totalDistance && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">Total Distance:</span>
                          <span className="font-medium text-gray-900">{selectedOptimization.results.metrics.totalDistance.toFixed(1)} km</span>
                        </div>
                      )}
                      {selectedOptimization.results.metrics?.energyConsumption && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">Energy Used:</span>
                          <span className="font-medium text-gray-900">{selectedOptimization.results.metrics.energyConsumption.toFixed(1)} kWh</span>
                        </div>
                      )}
                      {selectedOptimization.results.metrics?.averageUtilization && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">Average Utilization:</span>
                          <span className="font-medium text-blue-600">{selectedOptimization.results.metrics.averageUtilization.toFixed(1)}%</span>
                        </div>
                      )}
                      {selectedOptimization.results.metrics?.constraintViolations !== undefined && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">Constraint Violations:</span>
                          <span className={`font-medium ${selectedOptimization.results.metrics.constraintViolations === 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {selectedOptimization.results.metrics.constraintViolations}
                          </span>
                        </div>
                      )}
                      {selectedOptimization.results.metrics?.maintenanceCompliance && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">Maintenance Compliance:</span>
                          <span className="font-medium text-green-600">{selectedOptimization.results.metrics.maintenanceCompliance.toFixed(1)}%</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                {selectedOptimization.errorMessage && (
                  <div className="p-4 bg-red-50 rounded-lg">
                    <h3 className="font-medium text-red-900 mb-2">Error Details</h3>
                    <div className="text-sm text-red-700">
                      {selectedOptimization.errorMessage}
                    </div>
                  </div>
                )}
              </div>
              
              <div className="flex items-center justify-end mt-6 space-x-3">
                {selectedOptimization.status === 'COMPLETED' && (
                  <button
                    onClick={() => handleExportResults(selectedOptimization)}
                    className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
                    Export Results
                  </button>
                )}
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="btn-secondary"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OptimizationPage;
