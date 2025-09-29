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
  WrenchScrewdriverIcon,
  ShieldCheckIcon,
  BellAlertIcon,
} from '@heroicons/react/24/outline';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

import { useAuth } from '../hooks/useAuth';
import Card from '../components/ui/Card';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { trainsetsApi } from '../services/api';

interface Trainset {
  _id: string;
  id: string;
  trainsetNumber: string;
  model: string;
  manufacturer: string;
  yearManufactured: number;
  capacity: {
    seating: number;
    standing: number;
    total: number;
  };
  specifications: {
    length: number;
    width: number;
    height: number;
    weight: number;
    maxSpeed: number;
    acceleration: number;
    brakingDistance: number;
  };
  status: string;
  currentLocation?: string;
  lastMaintenance: string;
  nextMaintenance: string;
  maintenanceHistory: Array<{
    date: string;
    type: string;
    description: string;
    cost: number;
    technician: string;
  }>;
  operationalHours: number;
  totalDistance: number;
  efficiency: {
    energyConsumption: number;
    averageSpeed: number;
    reliability: number;
  };
  alerts: Array<{
    id: string;
    type: string;
    severity: string;
    message: string;
    timestamp: string;
  }>;
  sensors: {
    brake: { status: string; pressure: number; temperature: number; };
    motor: { status: string; temperature: number; vibration: number; };
    doors: { status: string; cycleCount: number; };
    hvac: { status: string; temperature: number; humidity: number; };
    battery: { status: string; charge: number; health: number; };
  };
  createdAt: string;
  updatedAt: string;
}

const TrainsetsPage: React.FC = () => {
  const { hasPermission } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [aiPredictiveMode, setAiPredictiveMode] = useState(true);
  const [useDemo, setUseDemo] = useState(false);

  // Generate comprehensive KMRL trainset demo data
  const generateKMRLTrainsetsData = () => {
    const models = ['EMU-3C', 'EMU-4C', 'EMU-6C'];
    const manufacturers = ['Alstom', 'Siemens', 'BEML'];
    const statuses = ['ACTIVE', 'MAINTENANCE', 'IDLE', 'OUT_OF_SERVICE'];
    const locations = ['Aluva Depot', 'Palarivattom', 'MG Road', 'Edapally', 'Town Hall'];

    return Array.from({ length: 12 }, (_, i) => {
      const model = models[i % models.length];
      const manufacturer = manufacturers[i % manufacturers.length];
      const status = statuses[i % statuses.length];
      const location = locations[i % locations.length];

      // Generate realistic maintenance prediction data
      const lastMaintenance = new Date();
      lastMaintenance.setDate(lastMaintenance.getDate() - Math.floor(Math.random() * 30));
      const nextMaintenance = new Date();
      nextMaintenance.setDate(nextMaintenance.getDate() + Math.floor(Math.random() * 60) + 30);

      return {
        _id: `trainset-${i + 1}`,
        id: `trainset-${i + 1}`,
        trainsetNumber: `KMRL-${String(i + 1).padStart(3, '0')}`,
        model,
        manufacturer,
        yearManufactured: 2020 + (i % 4),
        capacity: {
          seating: 280 + (i * 10),
          standing: 570 + (i * 15), 
          total: 850 + (i * 25)
        },
        specifications: {
          length: 65.5 + (i * 0.5),
          width: 3.2,
          height: 3.8,
          weight: 180 + (i * 2),
          maxSpeed: 80,
          acceleration: 1.3,
          brakingDistance: 450
        },
        status,
        currentLocation: status === 'ACTIVE' ? 'En Route' : location,
        lastMaintenance: lastMaintenance.toISOString(),
        nextMaintenance: nextMaintenance.toISOString(),
        maintenanceHistory: Array.from({ length: 5 }, (_, j) => ({
          date: new Date(Date.now() - j * 7 * 24 * 60 * 60 * 1000).toISOString(),
          type: ['Preventive', 'Corrective', 'Scheduled'][j % 3],
          description: ['Brake inspection', 'Motor overhaul', 'Door system check', 'HVAC maintenance'][j % 4],
          cost: Math.floor(Math.random() * 50000) + 10000,
          technician: `Tech-${j + 1}`
        })),
        operationalHours: 5000 + (i * 200) + Math.floor(Math.random() * 1000),
        totalDistance: 125000 + (i * 5000) + Math.floor(Math.random() * 10000),
        efficiency: {
          energyConsumption: 2.5 + Math.random() * 0.5,
          averageSpeed: 45 + Math.random() * 10,
          reliability: 88 + Math.random() * 12
        },
        alerts: status === 'MAINTENANCE' || Math.random() > 0.7 ? [{
          id: `alert-${i}-1`,
          type: 'PREDICTIVE',
          severity: Math.random() > 0.5 ? 'HIGH' : 'MEDIUM',
          message: 'AI predicts brake pad replacement needed within 500km',
          timestamp: new Date().toISOString()
        }] : [],
        sensors: {
          brake: {
            status: Math.random() > 0.8 ? 'WARNING' : 'NORMAL',
            pressure: 4.5 + Math.random() * 1.5,
            temperature: 65 + Math.random() * 25
          },
          motor: {
            status: Math.random() > 0.9 ? 'WARNING' : 'NORMAL',
            temperature: 75 + Math.random() * 20,
            vibration: 0.5 + Math.random() * 0.3
          },
          doors: {
            status: 'NORMAL',
            cycleCount: 50000 + i * 1000
          },
          hvac: {
            status: 'NORMAL',
            temperature: 22 + Math.random() * 6,
            humidity: 45 + Math.random() * 20
          },
          battery: {
            status: 'NORMAL',
            charge: 85 + Math.random() * 15,
            health: 90 + Math.random() * 10
          }
        },
        // AI Predictive Maintenance Data
        aiMaintenanceScore: 75 + Math.floor(Math.random() * 25),
        predictiveAlerts: Math.floor(Math.random() * 3),
        estimatedServiceLife: 25 + Math.floor(Math.random() * 10),
        createdAt: new Date(2023, 0, 1 + i).toISOString(),
        updatedAt: new Date().toISOString(),
      };
    });
  };

  // Enhanced API call with fallback
  const { data: trainsetsResponse, isLoading, error } = useQuery({
    queryKey: ['trainsets', statusFilter],
    queryFn: async () => {
      try {
        const params: any = {};
        if (statusFilter !== 'all') params.status = statusFilter;
        
        const response = await trainsetsApi.getAll(params);
        console.log('API Success - Trainsets response:', response);
        setUseDemo(false);
        return response;
      } catch (error: any) {
        console.warn('API Failed - Using demo data:', error.message);
        setUseDemo(true);
        
        // Return demo data in API format
        return {
          success: true,
          data: generateKMRLTrainsetsData(),
          message: 'Demo data loaded - API unavailable'
        };
      }
    },
    retry: 1,
    refetchOnWindowFocus: false,
  });

  const trainsets = trainsetsResponse?.data || [];

  // AI Predictive Maintenance Insights
  const aiInsights = [
    {
      type: 'PREDICTIVE_MAINTENANCE',
      message: 'AI predicts KMRL-003 requires brake maintenance in 7 days based on usage patterns',
      confidence: 94,
      priority: 'HIGH',
      estimatedCost: 15000
    },
    {
      type: 'EFFICIENCY_OPTIMIZATION',
      message: 'Energy consumption optimization suggests 8% savings through speed profile adjustments',
      confidence: 87,
      priority: 'MEDIUM',
      estimatedSavings: 45000
    },
    {
      type: 'FLEET_ANALYTICS',
      message: 'Fleet utilization can be improved by 12% with optimized deployment strategies',
      confidence: 91,
      priority: 'MEDIUM',
      potentialIncrease: '₹2.3L/month'
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

  // AI-enhanced filtering
  const filteredTrainsets = trainsets.filter((trainset: any) => {
    const matchesSearch = search === '' || 
      trainset.trainsetNumber?.toLowerCase().includes(search.toLowerCase()) ||
      trainset.model?.toLowerCase().includes(search.toLowerCase()) ||
      trainset.manufacturer?.toLowerCase().includes(search.toLowerCase()) ||
      trainset.currentLocation?.toLowerCase().includes(search.toLowerCase());
      
    const matchesStatus = statusFilter === 'all' || trainset.status?.toLowerCase() === statusFilter.toLowerCase();
    
    return matchesSearch && matchesStatus;
  });

  // Process trainsets with AI insights
  const processedTrainsets = filteredTrainsets.map((trainset: any) => ({
    ...trainset,
    maintenanceUrgency: trainset.predictiveAlerts > 1 ? 'HIGH' : trainset.predictiveAlerts === 1 ? 'MEDIUM' : 'LOW',
    healthScore: trainset.aiMaintenanceScore || 85,
    criticalAlerts: trainset.alerts?.filter((alert: any) => alert.severity === 'HIGH').length || 0
  }));

  const getStatusColor = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'ACTIVE':
        return 'text-green-600 bg-green-100';
      case 'MAINTENANCE':
        return 'text-orange-600 bg-orange-100';
      case 'IDLE':
        return 'text-gray-600 bg-gray-100';
      case 'OUT_OF_SERVICE':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'ACTIVE':
        return <PlayIcon className="h-4 w-4" />;
      case 'MAINTENANCE':
        return <WrenchScrewdriverIcon className="h-4 w-4" />;
      case 'IDLE':
        return <PauseIcon className="h-4 w-4" />;
      case 'OUT_OF_SERVICE':
        return <XCircleIcon className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const formatDistance = (km: number) => {
    if (km >= 1000000) {
      return `${(km / 1000000).toFixed(1)}M km`;
    } else if (km >= 1000) {
      return `${(km / 1000).toFixed(1)}K km`;
    }
    return `${km} km`;
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
          <h1 className="text-3xl font-bold text-gray-900">Trainsets</h1>
          <p className="text-gray-600 mt-2">
            AI-Powered Fleet Management & Predictive Maintenance
          </p>
        </motion.div>

        {hasPermission('trainsets:create') && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            <button className="inline-flex items-center px-4 py-2 bg-kmrl-600 text-white rounded-lg hover:bg-kmrl-700 transition-colors duration-200 font-medium">
              <PlusIcon className="h-5 w-5 mr-2" />
              Register Trainset
            </button>
          </motion.div>
        )}
      </div>

      {/* AI Predictive Insights Panel */}
      {aiPredictiveMode && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <Card className="bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-2">
                <SparklesIcon className="h-6 w-6 text-purple-600" />
                <h3 className="text-lg font-semibold text-purple-900">AI Predictive Maintenance</h3>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  ACTIVE
                </span>
              </div>
              <button
                onClick={() => setAiPredictiveMode(false)}
                className="text-purple-400 hover:text-purple-600 p-1 rounded"
              >
                <XCircleIcon className="h-5 w-5" />
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {aiInsights.map((insight, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                  className="bg-white rounded-lg p-4 shadow-sm border"
                >
                  <div className="flex items-start space-x-2 mb-2">
                    <div className={`p-1 rounded-full ${
                      insight.type === 'PREDICTIVE_MAINTENANCE' ? 'bg-red-100' :
                      insight.type === 'EFFICIENCY_OPTIMIZATION' ? 'bg-green-100' : 'bg-blue-100'
                    }`}>
                      {insight.type === 'PREDICTIVE_MAINTENANCE' && <WrenchScrewdriverIcon className="h-4 w-4 text-red-600" />}
                      {insight.type === 'EFFICIENCY_OPTIMIZATION' && <BoltIcon className="h-4 w-4 text-green-600" />}
                      {insight.type === 'FLEET_ANALYTICS' && <ChartBarIcon className="h-4 w-4 text-blue-600" />}
                    </div>
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-gray-900 mb-1">
                        {insight.type.replace('_', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
                      </h4>
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="text-xs text-gray-600">Confidence: {insight.confidence}%</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded ${
                          insight.priority === 'HIGH' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {insight.priority}
                        </span>
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-gray-700 mb-2">{insight.message}</p>
                  {insight.estimatedCost && (
                    <div className="text-xs text-orange-600 font-medium">
                      Est. Cost: ₹{insight.estimatedCost.toLocaleString()}
                    </div>
                  )}
                  {insight.estimatedSavings && (
                    <div className="text-xs text-green-600 font-medium">
                      Est. Savings: ₹{insight.estimatedSavings.toLocaleString()}/year
                    </div>
                  )}
                  {insight.potentialIncrease && (
                    <div className="text-xs text-blue-600 font-medium">
                      Potential Revenue: {insight.potentialIncrease}
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </Card>
        </motion.div>
      )}

      {/* Fleet Statistics */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card className="text-center">
            <div className="text-2xl font-bold text-kmrl-600">{processedTrainsets.length}</div>
            <div className="text-sm text-gray-600">Total Fleet</div>
          </Card>
          <Card className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {processedTrainsets.filter((t: any) => t.status === 'ACTIVE').length}
            </div>
            <div className="text-sm text-gray-600">Active</div>
          </Card>
          <Card className="text-center">
            <div className="text-2xl font-bold text-orange-600">
              {processedTrainsets.filter((t: any) => t.status === 'MAINTENANCE').length}
            </div>
            <div className="text-sm text-gray-600">Maintenance</div>
          </Card>
          <Card className="text-center">
            <div className="text-2xl font-bold text-red-600">
              {processedTrainsets.filter((t: any) => t.criticalAlerts > 0).length}
            </div>
            <div className="text-sm text-gray-600">Alerts</div>
          </Card>
          <Card className="text-center">
            <div className="text-2xl font-bold text-purple-600">
              {Math.round(processedTrainsets.reduce((acc: any, t: any) => acc + (t.healthScore || 0), 0) / processedTrainsets.length)}%
            </div>
            <div className="text-sm text-gray-600">Avg Health</div>
          </Card>
        </div>
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <Card>
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search trainsets..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="form-input pl-10"
                />
              </div>
            </div>

            {/* Status Filter */}
            <div className="sm:w-48">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="form-input"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="maintenance">Maintenance</option>
                <option value="idle">Idle</option>
                <option value="out_of_service">Out of Service</option>
              </select>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Trainsets List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="space-y-4"
        >
          {processedTrainsets.map((trainset: any, index: number) => (
            <motion.div
              key={trainset._id || trainset.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
            >
              <Card className="hover:shadow-lg transition-shadow border-l-4 border-l-kmrl-500">
                <div className="space-y-4">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-xl font-bold text-gray-900">
                          {trainset.trainsetNumber}
                        </h3>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(trainset.status)}`}>
                          {getStatusIcon(trainset.status)}
                          <span className="ml-1">{trainset.status}</span>
                        </span>

                        {/* AI Health Score */}
                        {aiPredictiveMode && (
                          <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-md ${
                            trainset.healthScore >= 90 ? 'bg-green-100 text-green-700' :
                            trainset.healthScore >= 75 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
                          }`}>
                            <ShieldCheckIcon className="h-3 w-3 mr-1" />
                            Health: {trainset.healthScore}%
                          </span>
                        )}

                        {/* Critical Alerts */}
                        {trainset.criticalAlerts > 0 && (
                          <span className="inline-flex items-center px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-md">
                            <BellAlertIcon className="h-3 w-3 mr-1" />
                            {trainset.criticalAlerts} Alert{trainset.criticalAlerts > 1 ? 's' : ''}
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

                      <div className="text-sm text-gray-600 space-x-4">
                        <span>{trainset.model} • {trainset.manufacturer}</span>
                        <span>Year: {trainset.yearManufactured}</span>
                        {trainset.currentLocation && (
                          <span className="text-blue-600">📍 {trainset.currentLocation}</span>
                        )}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-lg font-semibold text-gray-900">
                        {trainset.capacity?.total || 850} pax
                      </div>
                      <div className="text-sm text-gray-500">
                        {formatDistance(trainset.totalDistance)}
                      </div>
                    </div>
                  </div>

                  {/* Enhanced Details Grid */}
                  <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
                    {/* Specifications */}
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 mb-2 flex items-center">
                        <TruckIcon className="h-4 w-4 mr-1 text-kmrl-600" />
                        Specifications
                      </h4>
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Length</span>
                          <span className="font-medium">{trainset.specifications?.length || 65.5}m</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Max Speed</span>
                          <span className="font-medium">{trainset.specifications?.maxSpeed || 80} km/h</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Weight</span>
                          <span className="font-medium">{trainset.specifications?.weight || 180}t</span>
                        </div>
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
                          <span className="text-gray-600">Reliability</span>
                          <span className="font-medium text-green-600">
                            {Math.round(trainset.efficiency?.reliability || 95)}%
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Energy Use</span>
                          <span className="font-medium">
                            {trainset.efficiency?.energyConsumption?.toFixed(1) || '2.5'} kWh/km
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Op. Hours</span>
                          <span className="font-medium">{trainset.operationalHours?.toLocaleString() || '5,240'}h</span>
                        </div>
                      </div>
                    </div>

                    {/* Maintenance */}
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 mb-2 flex items-center">
                        <WrenchScrewdriverIcon className="h-4 w-4 mr-1 text-kmrl-600" />
                        Maintenance
                      </h4>
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Last Service</span>
                          <span className="font-medium">
                            {new Date(trainset.lastMaintenance).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Next Due</span>
                          <span className={`font-medium ${
                            new Date(trainset.nextMaintenance) < new Date(Date.now() + 7*24*60*60*1000) 
                              ? 'text-red-600' : 'text-green-600'
                          }`}>
                            {new Date(trainset.nextMaintenance).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Urgency</span>
                          <span className={`font-medium ${
                            trainset.maintenanceUrgency === 'HIGH' ? 'text-red-600' :
                            trainset.maintenanceUrgency === 'MEDIUM' ? 'text-yellow-600' : 'text-green-600'
                          }`}>
                            {trainset.maintenanceUrgency || 'LOW'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Sensor Status */}
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 mb-2 flex items-center">
                        <CpuChipIcon className="h-4 w-4 mr-1 text-kmrl-600" />
                        Sensor Status
                      </h4>
                      <div className="space-y-1 text-xs">
                        {Object.entries(trainset.sensors || {}).slice(0, 3).map(([sensor, data]: [string, any]) => (
                          <div key={sensor} className="flex justify-between">
                            <span className="text-gray-600 capitalize">{sensor}</span>
                            <span className={`font-medium ${
                              data?.status === 'WARNING' ? 'text-yellow-600' :
                              data?.status === 'ERROR' ? 'text-red-600' : 'text-green-600'
                            }`}>
                              {data?.status || 'NORMAL'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                    <div className="flex space-x-1">
                      <button 
                        className="p-2 text-gray-500 hover:text-kmrl-600 hover:bg-gray-50 rounded-lg transition-all duration-200" 
                        title="View Details"
                      >
                        <EyeIcon className="h-5 w-5" />
                      </button>
                      
                      {hasPermission('trainsets:update') && (
                        <button 
                          className="p-2 text-gray-500 hover:text-kmrl-600 hover:bg-gray-50 rounded-lg transition-all duration-200" 
                          title="Edit Trainset"
                        >
                          <PencilIcon className="h-5 w-5" />
                        </button>
                      )}

                      <button 
                        className="p-2 text-gray-500 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-all duration-200" 
                        title="Maintenance Schedule"
                      >
                        <WrenchScrewdriverIcon className="h-5 w-5" />
                      </button>
                    </div>

                    <div className="text-xs text-gray-500">
                      Service Life: {trainset.estimatedServiceLife || 25} years
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Empty State */}
      {!isLoading && filteredTrainsets.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center py-12"
        >
          <TruckIcon className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No trainsets found</h3>
          <p className="text-gray-500 mb-4">
            {search || statusFilter !== 'all'
              ? 'Try adjusting your filters'
              : 'Get started by registering your first trainset'}
          </p>
          {hasPermission('trainsets:create') && (
            <button className="inline-flex items-center px-4 py-2 bg-kmrl-600 text-white rounded-lg hover:bg-kmrl-700 transition-colors duration-200 font-medium">
              <PlusIcon className="h-5 w-5 mr-2" />
              Register Trainset
            </button>
          )}
        </motion.div>
      )}
    </div>
  );
};

export default TrainsetsPage;