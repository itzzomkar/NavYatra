import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../hooks/useAuth';
import { api } from '../services/api';
import {
  ChartBarIcon,
  ClockIcon,
  CogIcon,
  BellIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  SparklesIcon,
  CubeTransparentIcon,
  ServerIcon,
  DocumentTextIcon,
  VideoCameraIcon,
  WifiIcon,
  ShieldCheckIcon,
  TruckIcon,
  CalendarIcon,
  UserGroupIcon,
  BoltIcon,
  CpuChipIcon,
  CircleStackIcon,
  GlobeAltIcon
} from '@heroicons/react/24/outline';
import { 
  BellAlertIcon, 
  Square3Stack3DIcon,
  RocketLaunchIcon 
} from '@heroicons/react/24/solid';
import { Line, Bar, Doughnut, Radar, Scatter } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  RadialLinearScale,
  Filler
} from 'chart.js';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  RadialLinearScale,
  Filler
);

// Global Chart.js configuration to disable animations
ChartJS.defaults.animation = false;
ChartJS.defaults.transitions.active.animation = {
  duration: 0
};
ChartJS.defaults.responsive = true;
ChartJS.defaults.maintainAspectRatio = false;

interface TrainStatus {
  id: string;
  name: string;
  status: 'active' | 'maintenance' | 'standby' | 'scheduled';
  fitness: number;
  mileage: number;
  nextMaintenance: string;
  location: string;
  speed: number;
  passengers: number;
  energy: number;
  temperature: number;
}

interface Alert {
  id: string;
  type: 'critical' | 'warning' | 'info' | 'success' | 'error';
  message: string;
  timestamp: Date;
  trainId?: string;
}

interface KPI {
  label: string;
  value: string | number;
  change: number;
  trend: 'up' | 'down' | 'stable';
  icon: React.ElementType;
  color: string;
  bgColor: string;
}

interface AIDecision {
  timestamp: Date;
  date: string;
  shift: string;
  inductionList: Array<{
    trainsetId: string;
    trainsetNumber: string;
    compositeScore: number;
    inductionStatus: string;
    scores: Record<string, number>;
    warnings: string[];
  }>;
  reasoning: {
    summary: Record<string, number>;
    keyFactors: Array<{
      factor: string;
      impact: string;
      description: string;
      recommendation: string;
    }>;
    recommendations: Array<{
      category: string;
      priority: string;
      description: string;
      actions: Array<{
        trainset: string;
        action: string;
        urgency: string;
      }>;
    }>;
    riskFactors: Array<{
      type: string;
      severity: string;
      description: string;
      mitigation: string;
    }>;
  };
  conflicts: Array<{
    type: string;
    severity: string;
    description: string;
    affectedTrainsets: string[];
    recommendation: string;
  }>;
  recommendations: Array<{
    type: string;
    priority: string;
    description: string;
    details: string;
    affectedTrainsets: string[];
  }>;
  confidence: number;
  metadata: {
    totalTrainsets: number;
    availableTrainsets: number;
    constraintsApplied: number;
    aiModelVersion: string;
  };
}

interface OptimizationResult {
  solutions: Array<{
    id: string;
    fitness: number;
    objectives: Record<string, number>;
    selectedTrainsets: number;
  }>;
  report: {
    bestSolution: {
      id: string;
      fitness: number;
      objectives: Record<string, number>;
      selectedTrainsets: number;
      violations: number;
    };
    statistics: {
      totalSolutions: number;
      averageFitness: number;
      bestFitness: number;
      validSolutions: number;
      constraintViolations: number;
    };
    recommendations: Array<{
      type: string;
      priority: string;
      message: string;
      action: string;
    }>;
  };
  metadata: {
    algorithm: string;
    generations: number;
    populationSize: number;
    timestamp: Date;
  };
}

interface SimulationResult {
  simulationId: string;
  results: {
    baseScenario: {
      scenario: string;
      decision: AIDecision;
      optimization: OptimizationResult;
      metrics: Record<string, number>;
      timestamp: Date;
    };
    variations: Array<{
      name: string;
      description: string;
      result: {
        scenario: string;
        decision: AIDecision;
        optimization: OptimizationResult;
        metrics: Record<string, number>;
        timestamp: Date;
      };
    }>;
    comparison: {
      baseMetrics: Record<string, number>;
      variationMetrics: Array<{
        name: string;
        metrics: Record<string, number>;
      }>;
      improvements: Array<{
        scenario: string;
        metrics: Record<string, number>;
      }>;
      degradations: Array<{
        scenario: string;
        metrics: Record<string, number>;
      }>;
      bestScenario: {
        scenario: string;
        decision: AIDecision;
        optimization: OptimizationResult;
        metrics: Record<string, number>;
        timestamp: Date;
      };
    };
    recommendations: Array<{
      type: string;
      priority: string;
      message: string;
      action: string;
      expectedImprovement: number;
    }>;
  };
  metadata: {
    timestamp: Date;
    totalScenarios: number;
    simulationDuration: number;
  };
}

const EnhancedDashboard: React.FC = () => {
  const { user } = useAuth();
  const [selectedView, setSelectedView] = useState<'overview' | 'fleet' | 'optimization' | 'analytics'>('overview');
  const [trains, setTrains] = useState<TrainStatus[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [selectedTrain, setSelectedTrain] = useState<TrainStatus | null>(null);
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d'>('24h');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [aiDecision, setAiDecision] = useState<AIDecision | null>(null);
  const [optimizationResults, setOptimizationResults] = useState<OptimizationResult | null>(null);
  const [simulationResults, setSimulationResults] = useState<SimulationResult | null>(null);
  const [isAiProcessing, setIsAiProcessing] = useState(false);

  // AI Decision Handler
  const handleAiDecision = async () => {
    setIsAiProcessing(true);
    try {
      const response = await api.post('/ai/decision', {
        date: new Date().toISOString().split('T')[0],
        shift: 'MORNING',
        constraints: {
          minTrainsets: 15,
          maxWaitTime: 3
        }
      });
      
      if (response.data.success) {
        setAiDecision(response.data.data);
        setAlerts(prev => [...prev, {
          id: `ai_${Date.now()}`,
          type: 'success',
          message: 'AI Decision Generated Successfully',
          timestamp: new Date(),
          severity: 'info'
        }]);
      }
    } catch (error) {
      console.error('AI Decision Error:', error);
      setAlerts(prev => [...prev, {
        id: `ai_error_${Date.now()}`,
        type: 'error',
        message: 'Failed to generate AI decision',
        timestamp: new Date(),
        severity: 'high'
      }]);
    } finally {
      setIsAiProcessing(false);
    }
  };

  // Optimization Handler
  const handleOptimization = async () => {
    setIsOptimizing(true);
    try {
      const response = await api.post('/ai/optimize', {
        trainsets: trains,
        context: {
          date: new Date().toISOString().split('T')[0],
          shift: 'MORNING',
          fitnessRecords: [],
          jobCards: []
        },
        preferences: {
          generations: 100,
          populationSize: 50
        }
      });
      
      if (response.data.success) {
        setOptimizationResults(response.data.data);
        setAlerts(prev => [...prev, {
          id: `opt_${Date.now()}`,
          type: 'success',
          message: 'Optimization Completed Successfully',
          timestamp: new Date(),
          severity: 'info'
        }]);
      }
    } catch (error) {
      console.error('Optimization Error:', error);
      setAlerts(prev => [...prev, {
        id: `opt_error_${Date.now()}`,
        type: 'error',
        message: 'Failed to run optimization',
        timestamp: new Date(),
        severity: 'high'
      }]);
    } finally {
      setIsOptimizing(false);
    }
  };

  // Simulation Handler
  const handleSimulation = async () => {
    setIsAiProcessing(true);
    try {
      const baseScenario = {
        name: 'Current Scenario',
        description: 'Current operational conditions',
        date: new Date().toISOString().split('T')[0],
        shift: 'MORNING',
        constraints: {
          minTrainsets: 15
        }
      };

      const variations = [
        {
          name: 'Peak Hour Demand',
          description: 'High passenger demand scenario',
          date: new Date().toISOString().split('T')[0],
          shift: 'MORNING',
          constraints: {
            minTrainsets: 20,
            maxWaitTime: 2
          }
        },
        {
          name: 'Maintenance Heavy',
          description: 'Multiple trainsets under maintenance',
          date: new Date().toISOString().split('T')[0],
          shift: 'MORNING',
          trainsetModifications: [
            { trainsetId: 'TS001', newStatus: 'MAINTENANCE' },
            { trainsetId: 'TS002', newStatus: 'MAINTENANCE' }
          ]
        }
      ];

      const response = await api.post('/ai/simulate', {
        baseScenario,
        variations
      });
      
      if (response.data.success) {
        setSimulationResults(response.data.data);
        setAlerts(prev => [...prev, {
          id: `sim_${Date.now()}`,
          type: 'success',
          message: 'Simulation Completed Successfully',
          timestamp: new Date(),
          severity: 'info'
        }]);
      }
    } catch (error) {
      console.error('Simulation Error:', error);
      setAlerts(prev => [...prev, {
        id: `sim_error_${Date.now()}`,
        type: 'error',
        message: 'Failed to run simulation',
        timestamp: new Date(),
        severity: 'high'
      }]);
    } finally {
      setIsAiProcessing(false);
    }
  };

  // Initialize data only once
  useEffect(() => {
    if (!dataLoaded) {
      // Generate mock train data
      const mockTrains: TrainStatus[] = Array.from({ length: 25 }, (_, i) => ({
        id: `TS${String(i + 1).padStart(3, '0')}`,
        name: `Train ${i + 1}`,
        status: ['active', 'maintenance', 'standby', 'scheduled'][Math.floor(Math.random() * 4)] as any,
        fitness: 75 + Math.random() * 25,
        mileage: Math.floor(Math.random() * 50000),
        nextMaintenance: new Date(Date.now() + Math.random() * 30 * 24 * 60 * 60 * 1000).toLocaleDateString(),
        location: ['Aluva', 'Pulinchodu', 'Companypady', 'Ambattukavu', 'Muttom', 'Kalamassery'][Math.floor(Math.random() * 6)],
        speed: Math.floor(Math.random() * 80),
        passengers: Math.floor(Math.random() * 1000),
        energy: 60 + Math.random() * 40,
        temperature: 20 + Math.random() * 15
      }));
      setTrains(mockTrains);

      // Generate mock alerts
      const mockAlerts: Alert[] = [
        { 
          id: '1', 
          type: 'critical', 
          message: 'Train TS005 requires immediate maintenance - brake system alert', 
          timestamp: new Date(),
          trainId: 'TS005'
        },
        { 
          id: '2', 
          type: 'warning', 
          message: 'Fitness certificate expiring for TS012 in 7 days', 
          timestamp: new Date(Date.now() - 3600000),
          trainId: 'TS012'
        },
        { 
          id: '3', 
          type: 'info', 
          message: 'Optimization completed - 15% energy savings achieved', 
          timestamp: new Date(Date.now() - 7200000)
        }
      ];
      setAlerts(mockAlerts);
      setDataLoaded(true);
    }
  }, [dataLoaded]);

  // KPI data
  const kpis: KPI[] = [
    {
      label: 'Fleet Availability',
      value: '92%',
      change: 3.2,
      trend: 'up',
      icon: TruckIcon,
      color: 'text-green-600',
      bgColor: 'bg-green-100'
    },
    {
      label: 'On-Time Performance',
      value: '98.5%',
      change: 1.5,
      trend: 'up',
      icon: ClockIcon,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    },
    {
      label: 'Energy Efficiency',
      value: '85%',
      change: -2.1,
      trend: 'down',
      icon: BoltIcon,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100'
    },
    {
      label: 'Maintenance Score',
      value: '94',
      change: 0,
      trend: 'stable',
      icon: CogIcon,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100'
    },
    {
      label: 'Active Trains',
      value: '20/25',
      change: 5,
      trend: 'up',
      icon: RocketLaunchIcon,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-100'
    },
    {
      label: 'Daily Passengers',
      value: '45.2K',
      change: 8.4,
      trend: 'up',
      icon: UserGroupIcon,
      color: 'text-pink-600',
      bgColor: 'bg-pink-100'
    }
  ];

  // Chart configurations - memoized to prevent unnecessary re-renders
  const performanceChartData = useMemo(() => ({
    labels: ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00', '24:00'],
    datasets: [
      {
        label: 'Fleet Utilization',
        data: [65, 59, 80, 95, 92, 85, 70],
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4,
        fill: true
      },
      {
        label: 'Energy Consumption',
        data: [28, 48, 40, 65, 75, 60, 45],
        borderColor: 'rgb(251, 146, 60)',
        backgroundColor: 'rgba(251, 146, 60, 0.1)',
        tension: 0.4,
        fill: true
      }
    ]
  }), []); // Remove timeRange dependency to prevent re-renders

  const maintenanceChartData = useMemo(() => ({
    labels: ['Scheduled', 'Preventive', 'Corrective', 'Emergency'],
    datasets: [{
      data: [45, 30, 20, 5],
      backgroundColor: [
        'rgba(34, 197, 94, 0.8)',
        'rgba(59, 130, 246, 0.8)',
        'rgba(251, 146, 60, 0.8)',
        'rgba(239, 68, 68, 0.8)'
      ],
      borderWidth: 0
    }]
  }), []);

  const fleetRadarData = useMemo(() => ({
    labels: ['Fitness', 'Mileage', 'Branding', 'Energy', 'Cleaning', 'Safety'],
    datasets: [{
      label: 'Current Status',
      data: [92, 78, 85, 88, 95, 98],
      backgroundColor: 'rgba(99, 102, 241, 0.2)',
      borderColor: 'rgba(99, 102, 241, 1)',
      pointBackgroundColor: 'rgba(99, 102, 241, 1)',
      pointBorderColor: '#fff',
      pointHoverBackgroundColor: '#fff',
      pointHoverBorderColor: 'rgba(99, 102, 241, 1)'
    },
    {
      label: 'Target',
      data: [95, 85, 90, 92, 98, 100],
      backgroundColor: 'rgba(156, 163, 175, 0.1)',
      borderColor: 'rgba(156, 163, 175, 0.5)',
      borderDash: [5, 5]
    }]
  }), []);

  // Chart options - completely static to prevent any movement
  const chartOptions = useMemo(() => ({
    performance: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false as const,
      elements: {
        point: {
          radius: 0
        },
        line: {
          tension: 0.4
        }
      },
      interaction: {
        intersect: false,
        mode: 'index' as const
      },
      plugins: {
        legend: {
          position: 'bottom' as const,
          display: true
        },
        tooltip: {
          mode: 'index' as const,
          intersect: false,
          animation: false as const,
          enabled: true
        }
      },
      scales: {
        x: {
          display: true,
          grid: {
            display: true,
            drawBorder: false
          },
          ticks: {
            maxTicksLimit: 7
          }
        },
        y: {
          beginAtZero: true,
          max: 100,
          display: true,
          grid: {
            display: true,
            drawBorder: false
          },
          ticks: {
            callback: function(value: any) {
              return value + '%';
            },
            maxTicksLimit: 6
          }
        }
      }
    },
    maintenance: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false as const,
      elements: {
        arc: {
          borderWidth: 0
        }
      },
      plugins: {
        legend: {
          position: 'bottom' as const,
          display: true
        },
        tooltip: {
          animation: false as const,
          enabled: true
        }
      }
    },
    radar: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false as const,
      elements: {
        point: {
          radius: 3
        }
      },
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          animation: false as const,
          enabled: true
        }
      },
      scales: {
        r: {
          beginAtZero: true,
          max: 100,
          ticks: {
            stepSize: 20,
            display: false
          },
          grid: {
            display: true,
            color: 'rgba(0, 0, 0, 0.1)'
          },
          angleLines: {
            display: true,
            color: 'rgba(0, 0, 0, 0.1)'
          }
        }
      }
    }
  }), []);

  const handleOptimize = async () => {
    await handleOptimization();
  };

  const handleAiDecisionClick = async () => {
    await handleAiDecision();
  };

  const handleSimulationClick = async () => {
    await handleSimulation();
  };

  const handleOptimizeOld = async () => {
    setIsOptimizing(true);
    // Simulate optimization process
    setTimeout(() => {
      setIsOptimizing(false);
      setAlerts(prev => [{
        id: Date.now().toString(),
        type: 'info',
        message: 'Optimization complete! Schedule updated with 18% efficiency improvement.',
        timestamp: new Date()
      }, ...prev]);
    }, 3000);
  };

  // Show loading state until data is loaded
  if (!dataLoaded) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-gradient-to-br from-gray-50 to-gray-100'}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-gradient-to-br from-gray-50 to-gray-100'}`}>
      {/* Header */}
      <header className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg border-b border-gray-200`}>
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg">
                  <Square3Stack3DIcon className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    KMRL Train Induction System
                  </h1>
                  <p className="text-sm text-gray-500">Intelligent Fleet Management & Optimization</p>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              {/* Time Range Selector */}
              <div className="flex items-center bg-gray-100 rounded-lg p-1">
                {(['24h', '7d', '30d'] as const).map(range => (
                  <button
                    key={range}
                    onClick={() => setTimeRange(range)}
                    className={`px-3 py-1 rounded-md text-sm font-medium transition-all ${
                      timeRange === range
                        ? 'bg-white text-blue-600 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    {range === '24h' ? 'Today' : range === '7d' ? 'Week' : 'Month'}
                  </button>
                ))}
              </div>

              {/* Optimize Button */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleOptimize}
                disabled={isOptimizing}
                className="px-6 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg font-medium shadow-lg hover:shadow-xl transition-all disabled:opacity-50 flex items-center space-x-2"
              >
                {isOptimizing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                    <span>Optimizing...</span>
                  </>
                ) : (
                  <>
                    <SparklesIcon className="h-5 w-5" />
                    <span>Optimize Schedule</span>
                  </>
                )}
              </motion.button>

              {/* AI Decision Button */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleAiDecisionClick}
                disabled={isAiProcessing}
                className="px-6 py-2 bg-gradient-to-r from-green-500 to-teal-600 text-white rounded-lg font-medium shadow-lg hover:shadow-xl transition-all disabled:opacity-50 flex items-center space-x-2"
              >
                {isAiProcessing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                    <span>AI Processing...</span>
                  </>
                ) : (
                  <>
                    <CpuChipIcon className="h-5 w-5" />
                    <span>AI Decision</span>
                  </>
                )}
              </motion.button>

              {/* Simulation Button */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleSimulationClick}
                disabled={isAiProcessing}
                className="px-6 py-2 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-lg font-medium shadow-lg hover:shadow-xl transition-all disabled:opacity-50 flex items-center space-x-2"
              >
                {isAiProcessing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                    <span>Simulating...</span>
                  </>
                ) : (
                  <>
                    <RocketLaunchIcon className="h-5 w-5" />
                    <span>What-If Sim</span>
                  </>
                )}
              </motion.button>

              {/* Notifications */}
              <div className="relative">
                <button className="p-2 rounded-lg hover:bg-gray-100 relative">
                  <BellIcon className="h-6 w-6 text-gray-600" />
                  {alerts.length > 0 && (
                    <span className="absolute top-0 right-0 h-2 w-2 bg-red-500 rounded-full animate-pulse" />
                  )}
                </button>
              </div>

              {/* Dark Mode Toggle */}
              <button
                onClick={() => setIsDarkMode(!isDarkMode)}
                className="p-2 rounded-lg hover:bg-gray-100"
              >
                {isDarkMode ? '🌙' : '☀️'}
              </button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex space-x-1 mt-4">
            {(['overview', 'fleet', 'optimization', 'analytics'] as const).map(view => (
              <button
                key={view}
                onClick={() => setSelectedView(view)}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  selectedView === view
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                {view.charAt(0).toUpperCase() + view.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-6 py-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          {kpis.map((kpi, index) => (
            <motion.div
              key={kpi.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg p-4 hover:shadow-xl transition-shadow cursor-pointer`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className={`p-2 ${kpi.bgColor} rounded-lg`}>
                  <kpi.icon className={`h-5 w-5 ${kpi.color}`} />
                </div>
                <div className={`flex items-center text-xs font-medium ${
                  kpi.trend === 'up' ? 'text-green-600' : 
                  kpi.trend === 'down' ? 'text-red-600' : 
                  'text-gray-500'
                }`}>
                  {kpi.trend === 'up' ? <ArrowUpIcon className="h-3 w-3 mr-1" /> :
                   kpi.trend === 'down' ? <ArrowDownIcon className="h-3 w-3 mr-1" /> : null}
                  {Math.abs(kpi.change)}%
                </div>
              </div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">{kpi.value}</div>
              <div className="text-xs text-gray-500 mt-1">{kpi.label}</div>
            </motion.div>
          ))}
        </div>

        {/* Alerts Section */}
        {alerts.length > 0 && (
          <div className="mb-6">
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-4">
              <h3 className="text-lg font-semibold mb-3 flex items-center">
                <BellAlertIcon className="h-5 w-5 mr-2 text-blue-600" />
                Active Alerts
              </h3>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                <AnimatePresence>
                  {alerts.slice(0, 3).map((alert) => (
                    <motion.div
                      key={alert.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className={`flex items-start space-x-3 p-3 rounded-lg ${
                        alert.type === 'critical' ? 'bg-red-50 border-l-4 border-red-500' :
                        alert.type === 'warning' ? 'bg-yellow-50 border-l-4 border-yellow-500' :
                        'bg-blue-50 border-l-4 border-blue-500'
                      }`}
                    >
                      <div className="flex-shrink-0">
                        {alert.type === 'critical' ? <XCircleIcon className="h-5 w-5 text-red-600" /> :
                         alert.type === 'warning' ? <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600" /> :
                         <CheckCircleIcon className="h-5 w-5 text-blue-600" />}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{alert.message}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(alert.timestamp).toLocaleTimeString()}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          </div>
        )}

        {/* Main Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Performance Chart */}
          <div className={`lg:col-span-2 ${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg p-6`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">System Performance</h3>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-500">Live</span>
                <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
              </div>
            </div>
            {/* Temporarily replace with static content to test */}
            <div className="h-[300px] bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg flex items-center justify-center">
              <div className="text-center">
                <div className="text-4xl font-bold text-blue-600 mb-2">94.2%</div>
                <div className="text-sm text-gray-600">Fleet Utilization</div>
                <div className="mt-4 text-xs text-gray-500">Chart temporarily disabled for testing</div>
              </div>
            </div>
          </div>

          {/* Maintenance Distribution */}
          <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg p-6`}>
            <h3 className="text-lg font-semibold mb-4">Maintenance Distribution</h3>
            <div style={{ height: '300px', position: 'relative' }}>
              <Doughnut 
                key="maintenance-chart-stable"
                data={maintenanceChartData}
                options={chartOptions.maintenance}
                redraw={false}
              />
            </div>
          </div>
        </div>

        {/* Fleet Status Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          {/* Fleet Performance Radar */}
          <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg p-6`}>
            <h3 className="text-lg font-semibold mb-4">Fleet Performance Metrics</h3>
            <div style={{ height: '300px', position: 'relative' }}>
              <Radar
                key="radar-chart-stable"
                data={fleetRadarData}
                options={chartOptions.radar}
                redraw={false}
              />
            </div>
          </div>

          {/* Train Fleet Status */}
          <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg p-6`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Fleet Status Overview</h3>
              <button className="text-sm text-blue-600 hover:text-blue-800 font-medium">
                View All →
              </button>
            </div>
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {trains.slice(0, 8).map((train) => (
                <motion.div
                  key={train.id}
                  whileHover={{ scale: 1.02 }}
                  onClick={() => setSelectedTrain(train)}
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${
                    train.status === 'active' ? 'border-green-200 bg-green-50 hover:bg-green-100' :
                    train.status === 'maintenance' ? 'border-red-200 bg-red-50 hover:bg-red-100' :
                    train.status === 'standby' ? 'border-yellow-200 bg-yellow-50 hover:bg-yellow-100' :
                    'border-blue-200 bg-blue-50 hover:bg-blue-100'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`h-2 w-2 rounded-full ${
                        train.status === 'active' ? 'bg-green-500' :
                        train.status === 'maintenance' ? 'bg-red-500' :
                        train.status === 'standby' ? 'bg-yellow-500' :
                        'bg-blue-500'
                      }`} />
                      <div>
                        <div className="font-medium text-gray-900">{train.id}</div>
                        <div className="text-xs text-gray-500">{train.location}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">{train.fitness.toFixed(0)}% Fit</div>
                      <div className="text-xs text-gray-500">{train.mileage.toLocaleString()} km</div>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs">
                    <span className="text-gray-500">Next maintenance: {train.nextMaintenance}</span>
                    <div className="flex items-center space-x-2">
                      <WifiIcon className="h-3 w-3 text-green-500" />
                      <ShieldCheckIcon className="h-3 w-3 text-blue-500" />
                      <BoltIcon className="h-3 w-3 text-yellow-500" />
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        {/* AI Insights Section */}
        <div className="mt-6">
          <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-gradient-to-r from-purple-500 to-blue-600'} rounded-xl shadow-lg p-6 text-white`}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <CpuChipIcon className="h-8 w-8" />
                <div>
                  <h3 className="text-xl font-bold">AI-Powered Insights</h3>
                  <p className="text-sm opacity-90">Real-time optimization recommendations</p>
                </div>
              </div>
              <div className="flex space-x-2">
                <button 
                  onClick={handleAiDecisionClick}
                  disabled={isAiProcessing}
                  className="px-4 py-2 bg-white bg-opacity-20 rounded-lg hover:bg-opacity-30 transition-all disabled:opacity-50"
                >
                  {isAiProcessing ? 'Processing...' : 'Generate Decision'}
                </button>
                <button 
                  onClick={handleSimulationClick}
                  disabled={isAiProcessing}
                  className="px-4 py-2 bg-white bg-opacity-20 rounded-lg hover:bg-opacity-30 transition-all disabled:opacity-50"
                >
                  {isAiProcessing ? 'Simulating...' : 'Run Simulation'}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
              <div className="bg-white bg-opacity-10 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <BoltIcon className="h-5 w-5" />
                  <span className="font-medium">Energy Optimization</span>
                </div>
                <p className="text-sm opacity-90">Potential 18% reduction in energy consumption by adjusting stabling positions</p>
                <button className="mt-3 text-sm underline">Apply Suggestion</button>
              </div>
              
              <div className="bg-white bg-opacity-10 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <CalendarIcon className="h-5 w-5" />
                  <span className="font-medium">Schedule Optimization</span>
                </div>
                <p className="text-sm opacity-90">Rescheduling TS003 and TS007 can improve fleet availability by 12%</p>
                <button className="mt-3 text-sm underline">View Details</button>
              </div>
              
              <div className="bg-white bg-opacity-10 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <CogIcon className="h-5 w-5" />
                  <span className="font-medium">Predictive Maintenance</span>
                </div>
                <p className="text-sm opacity-90">TS015 showing early signs of brake wear - schedule inspection in 5 days</p>
                <button className="mt-3 text-sm underline">Schedule Now</button>
              </div>
            </div>

            {/* AI Results Display */}
            {(aiDecision || optimizationResults || simulationResults) && (
              <div className="mt-6 space-y-4">
                {aiDecision && (
                  <div className="bg-white bg-opacity-10 rounded-lg p-4">
                    <h4 className="text-lg font-semibold mb-3 flex items-center">
                      <CpuChipIcon className="h-5 w-5 mr-2" />
                      AI Decision Results
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm opacity-90 mb-2">Induction List:</p>
                        <div className="space-y-1">
                          {aiDecision.inductionList?.slice(0, 5).map((train, index) => (
                            <div key={index} className="text-sm bg-white bg-opacity-10 rounded px-2 py-1">
                              {train.trainsetNumber} - Score: {train.compositeScore?.toFixed(1)}%
                            </div>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-sm opacity-90 mb-2">Confidence: {aiDecision.confidence}%</p>
                        <p className="text-sm opacity-90 mb-2">Ready for Induction: {aiDecision.metadata?.availableTrainsets}</p>
                        <p className="text-sm opacity-90">Conflicts: {aiDecision.conflicts?.length || 0}</p>
                      </div>
                    </div>
                  </div>
                )}

                {optimizationResults && (
                  <div className="bg-white bg-opacity-10 rounded-lg p-4">
                    <h4 className="text-lg font-semibold mb-3 flex items-center">
                      <SparklesIcon className="h-5 w-5 mr-2" />
                      Optimization Results
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <p className="text-sm opacity-90 mb-1">Best Solution Fitness:</p>
                        <p className="text-lg font-bold">{optimizationResults.report?.bestSolution?.fitness?.toFixed(1)}%</p>
                      </div>
                      <div>
                        <p className="text-sm opacity-90 mb-1">Service Readiness:</p>
                        <p className="text-lg font-bold">{optimizationResults.report?.bestSolution?.objectives?.serviceReadiness?.toFixed(1)}%</p>
                      </div>
                      <div>
                        <p className="text-sm opacity-90 mb-1">Reliability:</p>
                        <p className="text-lg font-bold">{optimizationResults.report?.bestSolution?.objectives?.reliability?.toFixed(1)}%</p>
                      </div>
                    </div>
                  </div>
                )}

                {simulationResults && (
                  <div className="bg-white bg-opacity-10 rounded-lg p-4">
                    <h4 className="text-lg font-semibold mb-3 flex items-center">
                      <RocketLaunchIcon className="h-5 w-5 mr-2" />
                      Simulation Results
                    </h4>
                    <div className="space-y-2">
                      <p className="text-sm opacity-90">Best Scenario: {simulationResults.results?.comparison?.bestScenario?.scenario}</p>
                      <p className="text-sm opacity-90">Improvements Found: {simulationResults.results?.comparison?.improvements?.length || 0}</p>
                      <p className="text-sm opacity-90">Recommendations: {simulationResults.results?.recommendations?.length || 0}</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Train Details Modal */}
      <AnimatePresence>
        {selectedTrain && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedTrain(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-xl shadow-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold">Train {selectedTrain.id} Details</h2>
                <button
                  onClick={() => setSelectedTrain(null)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  ✕
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div>
                    <label className="text-sm text-gray-500">Status</label>
                    <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                      selectedTrain.status === 'active' ? 'bg-green-100 text-green-800' :
                      selectedTrain.status === 'maintenance' ? 'bg-red-100 text-red-800' :
                      selectedTrain.status === 'standby' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {selectedTrain.status.charAt(0).toUpperCase() + selectedTrain.status.slice(1)}
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-sm text-gray-500">Current Location</label>
                    <p className="font-medium">{selectedTrain.location}</p>
                  </div>
                  
                  <div>
                    <label className="text-sm text-gray-500">Speed</label>
                    <p className="font-medium">{selectedTrain.speed} km/h</p>
                  </div>
                  
                  <div>
                    <label className="text-sm text-gray-500">Passengers</label>
                    <p className="font-medium">{selectedTrain.passengers}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-sm text-gray-500">Fitness Score</label>
                    <div className="flex items-center space-x-2">
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-gradient-to-r from-green-500 to-blue-500 h-2 rounded-full"
                          style={{ width: `${selectedTrain.fitness}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium">{selectedTrain.fitness.toFixed(1)}%</span>
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-sm text-gray-500">Total Mileage</label>
                    <p className="font-medium">{selectedTrain.mileage.toLocaleString()} km</p>
                  </div>
                  
                  <div>
                    <label className="text-sm text-gray-500">Next Maintenance</label>
                    <p className="font-medium">{selectedTrain.nextMaintenance}</p>
                  </div>
                  
                  <div>
                    <label className="text-sm text-gray-500">Energy Efficiency</label>
                    <div className="flex items-center space-x-2">
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-gradient-to-r from-yellow-500 to-green-500 h-2 rounded-full"
                          style={{ width: `${selectedTrain.energy}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium">{selectedTrain.energy.toFixed(1)}%</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex space-x-3">
                <button className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                  View Full Report
                </button>
                <button className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
                  Schedule Maintenance
                </button>
                <button className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
                  View IoT Data
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default React.memo(EnhancedDashboard);
