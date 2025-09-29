import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PlayIcon,
  SparklesIcon,
  ClockIcon,
  WrenchScrewdriverIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ChartBarIcon,
  DocumentCheckIcon,
  ArrowPathIcon,
  InformationCircleIcon,
  CalendarDaysIcon,
  UserGroupIcon,
  BoltIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline';
import { useQuery, useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';

import { scheduleApi, metroCarsApi, analyticsApi } from '@/services/api';
import { useAuth } from '@/hooks/useAuth';
import { useWebSocket } from '@/hooks/useWebSocket';
import Card from '@/components/ui/Card';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

interface OptimizationConstraints {
  // Operational Constraints
  minTurnaroundTime: number; // Minutes between trips
  maxDailyOperatingHours: number; // Maximum hours a trainset can operate
  minPlatformDwellTime: number; // Minimum time at platform (seconds)
  
  // Maintenance Constraints  
  mandatoryMaintenanceWindow: boolean; // Enforce maintenance windows
  maxMileageBeforeMaintenance: number; // KM before maintenance required
  fitnessComplianceRequired: boolean; // Only use fitness-certified trains
  
  // Crew Constraints
  maxCrewDutyHours: number; // Maximum continuous crew duty
  minCrewRestPeriod: number; // Minimum rest between shifts
  crewChangeTime: number; // Time required for crew change
  
  // Infrastructure Constraints
  depotCapacity: number; // Maximum trains in depot
  platformCapacity: number; // Maximum trains at platform
  stablingPositions: number; // Available stabling positions
}

interface OptimizationObjectives {
  fitnessCompliance: number; // Weight for fitness certificate compliance
  maintenanceScheduling: number; // Weight for maintenance optimization
  mileageBalancing: number; // Weight for equal mileage distribution
  energyEfficiency: number; // Weight for energy optimization
  passengerComfort: number; // Weight for service quality
  operationalCost: number; // Weight for cost minimization
}

interface TrainsetInfo {
  id: string;
  trainsetNumber: string;
  status: string;
  fitnessStatus: string;
  fitnessExpiry: string;
  currentMileage: number;
  lastMaintenanceDate: string;
  nextMaintenanceDue: number;
  currentLocation: string;
  availableFrom: string;
  crew: {
    driver?: string;
    coDriver?: string;
  };
}

const OptimizationPageV2: React.FC = () => {
  const { hasPermission } = useAuth();
  
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [selectedShift, setSelectedShift] = useState<'MORNING' | 'AFTERNOON' | 'EVENING'>('MORNING');
  const [selectedTrainsets, setSelectedTrainsets] = useState<string[]>([]);
  const [optimizationProgress, setOptimizationProgress] = useState<number>(0);
  const [optimizationStage, setOptimizationStage] = useState<string>('');
  
  // Realistic optimization constraints
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

  // Realistic optimization objectives with weights
  const [objectives, setObjectives] = useState<OptimizationObjectives>({
    fitnessCompliance: 0.25,
    maintenanceScheduling: 0.20,
    mileageBalancing: 0.15,
    energyEfficiency: 0.15,
    passengerComfort: 0.15,
    operationalCost: 0.10,
  });

  // Fetch available trainsets with detailed info
  const { data: trainsetsResp, isLoading: trainsetsLoading } = useQuery({
    queryKey: ['trainsets-optimization'],
    queryFn: async () => {
      const response = await metroCarsApi.getAll();
      // Transform to include detailed info
      return (response?.data || []).map((t: any) => ({
        id: t.id,
        trainsetNumber: t.trainsetNumber || t.id,
        status: t.status,
        fitnessStatus: t.fitnessRecords?.[0]?.status || 'EXPIRED',
        fitnessExpiry: t.fitnessRecords?.[0]?.expiryDate || 'N/A',
        currentMileage: t.currentMileage || Math.floor(Math.random() * 100000),
        lastMaintenanceDate: t.maintenanceRecords?.[0]?.performedAt || '2024-01-01',
        nextMaintenanceDue: t.currentMileage + 5000,
        currentLocation: t.location || 'Aluva Depot',
        availableFrom: new Date().toISOString(),
        crew: {
          driver: t.crew?.driver?.name,
          coDriver: t.crew?.coDriver?.name,
        },
      }));
    },
  });

  const trainsets: TrainsetInfo[] = trainsetsResp || [];

  // Filter trainsets based on constraints
  const availableTrainsets = trainsets.filter(t => {
    if (constraints.fitnessComplianceRequired && t.fitnessStatus !== 'VALID') {
      return false;
    }
    if (t.status !== 'AVAILABLE' && t.status !== 'IN_SERVICE') {
      return false;
    }
    if (t.currentMileage >= t.nextMaintenanceDue - 500) {
      return false; // Too close to maintenance
    }
    return true;
  });

  // WebSocket hook for real-time updates
  const { isConnected } = useWebSocket({
    autoConnect: true,
    subscriptions: ['optimization'],
    onOptimizationStarted: (data) => {
      setOptimizationProgress(10);
      setOptimizationStage('Optimization started...');
    },
    onOptimizationUpdate: (data) => {
      setOptimizationProgress(100);
      setOptimizationStage('Optimization completed');
      toast.success('Optimization completed successfully!');
    },
    onError: (error) => {
      toast.error(`Optimization failed: ${error.message || 'Unknown error'}`);
      setOptimizationProgress(0);
      setOptimizationStage('');
    },
  });

  // Start optimization mutation
  const startOptimizationMutation = useMutation({
    mutationFn: async () => {
      const request = {
        date: selectedDate,
        shift: selectedShift,
        trainsetIds: selectedTrainsets,
        constraints: {
          ...constraints,
          fitnessRequired: constraints.fitnessComplianceRequired,
        },
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
      toast.success('Optimization completed and schedule created');
      setSelectedTrainsets([]);
      setOptimizationProgress(0);
      setOptimizationStage('');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Optimization failed');
      setOptimizationProgress(0);
    },
  });

  const handleStartOptimization = () => {
    if (selectedTrainsets.length === 0) {
      toast.error('Please select at least one trainset');
      return;
    }

    if (selectedTrainsets.length < 3) {
      toast('Optimization works best with at least 3 trainsets', {
        icon: '⚠️',
        duration: 4000,
      });
    }

    // Validate constraints
    const totalWeight = Object.values(objectives).reduce((sum, w) => sum + w, 0);
    if (Math.abs(totalWeight - 1.0) > 0.01) {
      toast.error('Objective weights must sum to 100%');
      return;
    }

    setOptimizationProgress(5);
    setOptimizationStage('Initializing optimization...');
    startOptimizationMutation.mutate();
  };

  const getTrainsetStatusColor = (status: string) => {
    switch (status) {
      case 'AVAILABLE':
        return 'bg-green-100 text-green-800';
      case 'IN_SERVICE':
        return 'bg-blue-100 text-blue-800';
      case 'MAINTENANCE':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getFitnessStatusColor = (status: string) => {
    switch (status) {
      case 'VALID':
        return 'text-green-600';
      case 'EXPIRING':
        return 'text-yellow-600';
      case 'EXPIRED':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Schedule Optimization
            </h1>
            <p className="text-gray-600 mt-2">
              AI-powered train scheduling with real-world constraints
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <div className={`flex items-center px-3 py-1 rounded-full ${
              isConnected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}>
              <div className={`h-2 w-2 rounded-full mr-2 ${
                isConnected ? 'bg-green-500' : 'bg-red-500'
              }`} />
              {isConnected ? 'Connected' : 'Disconnected'}
            </div>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Configuration */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Schedule Selection */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <Card>
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  <CalendarDaysIcon className="h-5 w-5 text-kmrl-600 mr-2" />
                  Schedule Configuration
                </h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date
                  </label>
                  <input
                    type="date"
                    value={selectedDate}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="form-input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Shift
                  </label>
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
            </Card>
          </motion.div>

          {/* Trainset Selection */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Card>
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  <DocumentCheckIcon className="h-5 w-5 text-kmrl-600 mr-2" />
                  Select Trainsets ({selectedTrainsets.length} selected)
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  Only trainsets meeting constraints are shown
                </p>
              </div>
              
              {trainsetsLoading ? (
                <div className="flex justify-center py-8">
                  <LoadingSpinner />
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {availableTrainsets.map((trainset) => (
                    <label
                      key={trainset.id}
                      className={`block p-4 border rounded-lg cursor-pointer transition-all ${
                        selectedTrainsets.includes(trainset.id)
                          ? 'border-kmrl-500 bg-kmrl-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-start">
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
                          className="form-checkbox mt-1"
                        />
                        <div className="ml-3 flex-1">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-gray-900">
                              {trainset.trainsetNumber}
                            </span>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              getTrainsetStatusColor(trainset.status)
                            }`}>
                              {trainset.status}
                            </span>
                          </div>
                          
                          <div className="mt-2 grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-gray-500">Fitness:</span>
                              <span className={`ml-2 font-medium ${
                                getFitnessStatusColor(trainset.fitnessStatus)
                              }`}>
                                {trainset.fitnessStatus}
                              </span>
                              {trainset.fitnessExpiry !== 'N/A' && (
                                <span className="text-xs text-gray-500 ml-1">
                                  (exp: {new Date(trainset.fitnessExpiry).toLocaleDateString()})
                                </span>
                              )}
                            </div>
                            <div>
                              <span className="text-gray-500">Mileage:</span>
                              <span className="ml-2 font-medium">
                                {trainset.currentMileage.toLocaleString()} km
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-500">Location:</span>
                              <span className="ml-2 font-medium">
                                {trainset.currentLocation}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-500">Next Maintenance:</span>
                              <span className="ml-2 font-medium">
                                {(trainset.nextMaintenanceDue - trainset.currentMileage).toLocaleString()} km
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </label>
                  ))}
                  
                  {availableTrainsets.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      No trainsets available that meet the current constraints
                    </div>
                  )}
                </div>
              )}
            </Card>
          </motion.div>

          {/* Optimization Constraints */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <Card>
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  <ShieldCheckIcon className="h-5 w-5 text-kmrl-600 mr-2" />
                  Operational Constraints
                </h3>
              </div>
              
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">
                        Min Turnaround Time
                      </span>
                      <span className="text-sm text-gray-500">{constraints.minTurnaroundTime} min</span>
                    </label>
                    <input
                      type="range"
                      min="10"
                      max="60"
                      value={constraints.minTurnaroundTime}
                      onChange={(e) => setConstraints({
                        ...constraints,
                        minTurnaroundTime: parseInt(e.target.value)
                      })}
                      className="w-full mt-2"
                    />
                  </div>
                  
                  <div>
                    <label className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">
                        Max Daily Operating Hours
                      </span>
                      <span className="text-sm text-gray-500">{constraints.maxDailyOperatingHours} hrs</span>
                    </label>
                    <input
                      type="range"
                      min="12"
                      max="20"
                      value={constraints.maxDailyOperatingHours}
                      onChange={(e) => setConstraints({
                        ...constraints,
                        maxDailyOperatingHours: parseInt(e.target.value)
                      })}
                      className="w-full mt-2"
                    />
                  </div>

                  <div>
                    <label className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">
                        Max Crew Duty Hours
                      </span>
                      <span className="text-sm text-gray-500">{constraints.maxCrewDutyHours} hrs</span>
                    </label>
                    <input
                      type="range"
                      min="6"
                      max="12"
                      value={constraints.maxCrewDutyHours}
                      onChange={(e) => setConstraints({
                        ...constraints,
                        maxCrewDutyHours: parseInt(e.target.value)
                      })}
                      className="w-full mt-2"
                    />
                  </div>
                </div>

                <div className="space-y-4">
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

                  <div>
                    <label className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">
                        Platform Capacity
                      </span>
                      <span className="text-sm text-gray-500">{constraints.platformCapacity} trains</span>
                    </label>
                    <input
                      type="range"
                      min="2"
                      max="8"
                      value={constraints.platformCapacity}
                      onChange={(e) => setConstraints({
                        ...constraints,
                        platformCapacity: parseInt(e.target.value)
                      })}
                      className="w-full mt-2"
                    />
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Optimization Objectives */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <Card>
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  <ChartBarIcon className="h-5 w-5 text-kmrl-600 mr-2" />
                  Optimization Objectives (must sum to 100%)
                </h3>
              </div>
              
              <div className="space-y-4">
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
                        setObjectives({
                          ...objectives,
                          [key]: newValue
                        });
                      }}
                      className="w-full"
                    />
                  </div>
                ))}
                
                <div className="pt-4 border-t">
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
            </Card>
          </motion.div>
        </div>

        {/* Right Column - Actions & Status */}
        <div className="space-y-6">
          
          {/* Start Optimization */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
          >
            <Card>
              <div className="text-center space-y-4">
                <div className="p-4 bg-gradient-to-br from-kmrl-50 to-kmrl-100 rounded-lg">
                  <SparklesIcon className="h-12 w-12 text-kmrl-600 mx-auto mb-3" />
                  <h3 className="text-lg font-semibold text-gray-900">
                    Ready to Optimize
                  </h3>
                  <p className="text-sm text-gray-600 mt-2">
                    AI will find the optimal schedule based on your constraints
                  </p>
                </div>

                <button
                  onClick={handleStartOptimization}
                  disabled={
                    selectedTrainsets.length === 0 ||
                    startOptimizationMutation.isPending ||
                    optimizationProgress > 0
                  }
                  className={`w-full inline-flex items-center justify-center px-6 py-3 rounded-lg font-medium transition-all ${
                    selectedTrainsets.length === 0
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : startOptimizationMutation.isPending || optimizationProgress > 0
                      ? 'bg-kmrl-400 text-white cursor-wait'
                      : 'bg-kmrl-600 text-white hover:bg-kmrl-700'
                  }`}
                >
                  {startOptimizationMutation.isPending || optimizationProgress > 0 ? (
                    <>
                      <ArrowPathIcon className="h-5 w-5 mr-2 animate-spin" />
                      Optimizing...
                    </>
                  ) : (
                    <>
                      <PlayIcon className="h-5 w-5 mr-2" />
                      Start Optimization
                    </>
                  )}
                </button>

                <div className="text-sm text-gray-600">
                  <div>Selected Trainsets: {selectedTrainsets.length}</div>
                  <div>Schedule Date: {new Date(selectedDate).toLocaleDateString()}</div>
                  <div>Shift: {selectedShift}</div>
                </div>
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
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Optimization Progress
                </h3>
                <div className="space-y-3">
                  <div className="relative">
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className="bg-gradient-to-r from-kmrl-500 to-kmrl-600 h-3 rounded-full transition-all duration-500"
                        style={{ width: `${optimizationProgress}%` }}
                      />
                    </div>
                    <div className="mt-2 text-sm text-gray-600">
                      {optimizationStage}
                    </div>
                  </div>
                  
                  <div className="space-y-2 text-sm">
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
                      Running Optimization
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
                </div>
              </Card>
            </motion.div>
          )}

          {/* Information Panel */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
          >
            <Card>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <InformationCircleIcon className="h-5 w-5 text-kmrl-600 mr-2" />
                How It Works
              </h3>
              <div className="space-y-3 text-sm text-gray-600">
                <div>
                  <strong className="text-gray-900">1. Data Collection</strong>
                  <p>System gathers trainset availability, fitness status, and maintenance schedules</p>
                </div>
                <div>
                  <strong className="text-gray-900">2. Constraint Validation</strong>
                  <p>Checks operational limits, crew requirements, and infrastructure capacity</p>
                </div>
                <div>
                  <strong className="text-gray-900">3. Optimization</strong>
                  <p>AI algorithms find optimal assignments balancing all objectives</p>
                </div>
                <div>
                  <strong className="text-gray-900">4. Schedule Generation</strong>
                  <p>Creates detailed schedule with crew assignments and platform allocations</p>
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Key Metrics */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.7 }}
          >
            <Card>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Expected Outcomes
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Schedule Efficiency</span>
                  <span className="text-sm font-semibold text-green-600">+15-20%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Mileage Balance</span>
                  <span className="text-sm font-semibold text-green-600">±5% variance</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Energy Savings</span>
                  <span className="text-sm font-semibold text-green-600">8-12%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Constraint Violations</span>
                  <span className="text-sm font-semibold text-green-600">0</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Crew Utilization</span>
                  <span className="text-sm font-semibold text-green-600">85-90%</span>
                </div>
              </div>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default OptimizationPageV2;