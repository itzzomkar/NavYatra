import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CpuChipIcon,
  ChartBarIcon,
  WrenchScrewdriverIcon,
  BoltIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  EyeIcon,
  PlayIcon,
  DocumentArrowDownIcon,
  MagnifyingGlassIcon,
  LightBulbIcon
} from '@heroicons/react/24/outline';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { useAuth } from '../hooks/useAuth';
import { useWebSocket } from '../hooks/useWebSocket';
import Card from '../components/ui/Card';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import aiInsightsService, {
  AIInsight,
  AIInsightFilters,
  OptimizationType,
  InsightSeverity,
  InsightType,
  InsightStatus
} from '../services/aiInsightsService';
import '../styles/aiInsightsOverride.css';

const AIInsightsPage: React.FC = () => {
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  
  // State management
  const [filters, setFilters] = useState<AIInsightFilters>({ 
    type: 'all', 
    severity: 'all', 
    category: 'all', 
    status: 'all' 
  });
  const [selectedInsight, setSelectedInsight] = useState<AIInsight | null>(null);
  const [showInsightModal, setShowInsightModal] = useState(false);
  const [showOptimizationModal, setShowOptimizationModal] = useState(false);
  const [activeView, setActiveView] = useState<'insights' | 'models' | 'metrics'>('insights');
  const [page, setPage] = useState(1);
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  
  // Close export dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (showExportDropdown && !target.closest('.export-dropdown')) {
        setShowExportDropdown(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showExportDropdown]);

  // React Query integration for AI insights data
  const { data: insightsData, isLoading: insightsLoading, refetch } = useQuery({
    queryKey: ['ai-insights', filters, page],
    queryFn: () => aiInsightsService.getInsights(filters, page, 20),
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // Refresh every minute for real-time updates
    refetchOnWindowFocus: true,
  });

  // Get predictive models
  const { data: models } = useQuery({
    queryKey: ['ai-models'],
    queryFn: () => aiInsightsService.getPredictiveModels(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Get system metrics
  const { data: systemMetrics } = useQuery({
    queryKey: ['ai-metrics'],
    queryFn: () => aiInsightsService.getSystemMetrics(),
    staleTime: 1 * 60 * 1000, // 1 minute
    refetchInterval: 2 * 60 * 1000, // Refresh every 2 minutes
  });

  // Mutations for insight operations
  const acknowledgeInsightMutation = useMutation({
    mutationFn: (insightId: string) => aiInsightsService.acknowledgeInsight(insightId, currentUser?.id || ''),
    onSuccess: (updatedInsight) => {
      queryClient.invalidateQueries({ queryKey: ['ai-insights'] });
      toast.success(`Insight "${updatedInsight.title}" acknowledged successfully!`);
    },
    onError: (error: Error) => {
      toast.error(`Failed to acknowledge insight: ${error.message}`);
    },
  });

  const dismissInsightMutation = useMutation({
    mutationFn: (insightId: string) => aiInsightsService.dismissInsight(insightId, 'Dismissed by user'),
    onSuccess: (updatedInsight) => {
      queryClient.invalidateQueries({ queryKey: ['ai-insights'] });
      toast.success(`Insight "${updatedInsight.title}" dismissed.`);
    },
    onError: (error: Error) => {
      toast.error(`Failed to dismiss insight: ${error.message}`);
    },
  });

  const executeRecommendationMutation = useMutation({
    mutationFn: ({ insightId, recommendationId }: { insightId: string; recommendationId: string }) => 
      aiInsightsService.executeRecommendation(insightId, recommendationId),
    onSuccess: (result: any) => {
      // Show main success message
      toast.success(result.message, { 
        duration: 4000,
        style: {
          zIndex: 10001
        }
      });
      
      // Show work order details if available
      if (result.trackingId) {
        toast(`📋 Work Order: ${result.trackingId}`, { 
          duration: 6000,
          position: 'top-right',
          style: {
            zIndex: 10001
          }
        });
      }
      
                      // Show detailed actions if available
                      if (result.details && result.details.actions) {
                        setTimeout(() => {
                          result.details.actions.forEach((action: string, index: number) => {
                            setTimeout(() => {
                              toast(`✓ ${action}`, {
                                duration: 3000,
                                position: 'top-right',
                                style: {
                                  background: '#10b981',
                                  color: 'white',
                                  zIndex: 10001
                                }
                              });
                            }, index * 800);
                          });
                          
                          // Refresh insights after all notifications are done
                          setTimeout(() => {
                            queryClient.invalidateQueries({ queryKey: ['ai-insights'] });
                            refetch(); // Force a refetch to update the UI
                          }, result.details.actions.length * 800 + 1000);
                        }, 1000);
                      } else {
                        // Refresh immediately if no detailed actions
                        setTimeout(() => {
                          queryClient.invalidateQueries({ queryKey: ['ai-insights'] });
                          refetch();
                        }, 1500);
                      }
    },
    onError: (error: Error) => {
      toast.error(`Failed to execute recommendation: ${error.message}`);
    },
  });

  const runOptimizationMutation = useMutation({
    mutationFn: ({ type, parameters }: { type: OptimizationType; parameters: Record<string, any> }) => 
      aiInsightsService.runOptimization(type, parameters),
    onSuccess: (result) => {
      toast.success(`Optimization completed successfully! Expected benefit: ₹${result.expectedBenefit.toLocaleString()}`);
      queryClient.invalidateQueries({ queryKey: ['ai-insights'] });
      setShowOptimizationModal(false);
    },
    onError: (error: Error) => {
      toast.error(`Optimization failed: ${error.message}`);
    },
  });

  const trainModelMutation = useMutation({
    mutationFn: (modelId: string) => aiInsightsService.trainModel(modelId),
    onSuccess: (result) => {
      toast.success(`Model training initiated! Job ID: ${result.jobId}. Estimated duration: ${result.estimatedDuration}`);
      queryClient.invalidateQueries({ queryKey: ['ai-models'] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to initiate model training: ${error.message}`);
    },
  });

  // WebSocket integration for real-time updates
  useWebSocket({
    subscriptions: ['optimization', 'schedules'],
    onSystemNotification: (notification) => {
      if (notification.message.includes('AI') || notification.message.includes('model') || notification.message.includes('insight')) {
        console.log('🤖 AI-related notification:', notification.message);
        toast(notification.message, {
          duration: 4000,
          position: 'top-right'
        });
        refetch();
      }
    },
    onConnectionEstablished: () => {
      console.log('✅ WebSocket connected for AI Insights page');
    }
  });
  
  // Periodic check for completed tasks
  React.useEffect(() => {
    const checkCompletedTasks = () => {
      aiInsightsService.checkAndUpdateCompletedTasks();
      queryClient.invalidateQueries({ queryKey: ['ai-insights'] });
    };
    
    // Check immediately
    checkCompletedTasks();
    
    // Check every 30 seconds for demo purposes (in real system would be longer)
    const interval = setInterval(checkCompletedTasks, 30000);
    
    return () => clearInterval(interval);
  }, [queryClient]);

  // Extract data with fallback
  const insights = insightsData?.insights || [];
  const insightStats = insightsData?.stats;
  const criticalInsights = insights.filter(insight => insight.severity === 'CRITICAL');

  // Handle filter changes
  const handleFilterChange = (key: keyof AIInsightFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1); // Reset to first page when filtering
  };

  // Export insights
  const handleExport = async (format: 'csv' | 'xlsx' | 'pdf' | 'json' = 'csv') => {
    try {
      const blob = await aiInsightsService.exportInsights(format, filters);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `kmrl-ai-insights-${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('AI insights data exported successfully!');
    } catch (error) {
      toast.error('Failed to export AI insights data');
    }
  };

  // Helper functions for styling
  const getSeverityColor = (severity: InsightSeverity) => {
    switch (severity) {
      case 'CRITICAL':
        return 'text-rose-700 bg-rose-50 border border-rose-200';
      case 'HIGH':
        return 'text-amber-700 bg-amber-50 border border-amber-200';
      case 'MEDIUM':
        return 'text-emerald-700 bg-emerald-50 border border-emerald-200';
      case 'LOW':
        return 'text-sky-700 bg-sky-50 border border-sky-200';
      default:
        return 'text-slate-700 bg-slate-50 border border-slate-200';
    }
  };

  const getStatusColor = (status: InsightStatus) => {
    switch (status) {
      case 'ACTIVE':
        return 'text-emerald-700 bg-emerald-50 border border-emerald-200';
      case 'ACKNOWLEDGED':
        return 'text-indigo-700 bg-indigo-50 border border-indigo-200';
      case 'IN_PROGRESS':
        return 'text-amber-700 bg-amber-50 border border-amber-200';
      case 'RESOLVED':
        return 'text-teal-700 bg-teal-50 border border-teal-200';
      case 'DISMISSED':
        return 'text-slate-700 bg-slate-50 border border-slate-200';
      default:
        return 'text-slate-700 bg-slate-50 border border-slate-200';
    }
  };

  const getTypeIcon = (type: InsightType) => {
    switch (type) {
      case 'PREDICTIVE_MAINTENANCE':
        return WrenchScrewdriverIcon;
      case 'ENERGY_EFFICIENCY':
        return BoltIcon;
      case 'PERFORMANCE_OPTIMIZATION':
        return ChartBarIcon;
      case 'SCHEDULE_CONFLICT':
        return ExclamationTriangleIcon;
      default:
        return CpuChipIcon;
    }
  };

  if (insightsLoading && !insightsData) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="ai-insights-page min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex items-center space-x-3">
            <h1 className="text-3xl font-bold text-slate-800">AI-Driven Insights</h1>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 border border-emerald-200">
              <CpuChipIcon className="h-3 w-3 mr-1" />
              AI Powered
            </span>
          </div>
          <p className="text-slate-600 mt-2">
            Advanced machine learning insights for intelligent metro operations • Real-time AI analysis
          </p>
          {currentUser && (
            <div className="mt-3 flex items-center text-sm text-slate-500">
              <span>Logged in as: </span>
              <span className="ml-1 font-medium text-indigo-700">
                {currentUser.firstName} {currentUser.lastName}
              </span>
              <span className="ml-2 px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded text-xs">
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
          {/* Critical Insights Badge */}
          {criticalInsights.length > 0 && (
            <div className="flex items-center px-3 py-2 bg-rose-50 border border-rose-200 rounded-lg">
              <ExclamationTriangleIcon className="h-4 w-4 text-rose-600 mr-2" />
              <span className="text-sm font-medium text-rose-800">
                {criticalInsights.length} Critical Alert{criticalInsights.length !== 1 ? 's' : ''}
              </span>
            </div>
          )}
          
          <div className="flex items-center space-x-3">
            {/* Export Dropdown */}
            <div className="relative export-dropdown">
              <button
                onClick={() => setShowExportDropdown(!showExportDropdown)}
                className="inline-flex items-center px-4 py-2 border border-slate-300 rounded-lg text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all duration-200 shadow-sm"
              >
                <DocumentArrowDownIcon className="h-4 w-4 mr-2" />
                Export Insights
                <svg className="ml-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              {showExportDropdown && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-50 border border-gray-200">
                  <div className="py-1">
                    <button
                      onClick={() => {
                        handleExport('csv');
                        setShowExportDropdown(false);
                      }}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      📊 Export as CSV
                    </button>
                    <button
                      onClick={() => {
                        handleExport('json');
                        setShowExportDropdown(false);
                      }}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      📋 Export as JSON
                    </button>
                    <button
                      onClick={() => {
                        handleExport('xlsx');
                        setShowExportDropdown(false);
                      }}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      📈 Export as Excel
                    </button>
                  </div>
                </div>
              )}
            </div>
            
            <button
              onClick={() => setShowOptimizationModal(true)}
              className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-all duration-200 shadow-lg font-semibold"
            >
              <PlayIcon className="h-4 w-4 mr-2" />
              Run AI Optimization
            </button>
          </div>
          
          <div className="text-right text-sm text-slate-500">
            <p>AI Insights Portal</p>
            <p className="text-xs">Real-time Analysis</p>
            {process.env.NODE_ENV === 'development' && (
              <button
                onClick={() => {
                  aiInsightsService.forceRefresh();
                  window.location.reload();
                }}
                className="mt-1 text-xs text-indigo-600 hover:text-indigo-700"
                title="Force refresh AI data"
              >
                🔄 Refresh Data
              </button>
            )}
          </div>
        </motion.div>
      </div>

      {/* Navigation Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <div className="border-b border-slate-200">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'insights', name: 'AI Insights', icon: LightBulbIcon },
              { id: 'models', name: 'Predictive Models', icon: CpuChipIcon },
              { id: 'metrics', name: 'System Metrics', icon: ChartBarIcon }
            ].map((tab) => {
              const getTabCount = (tabId: string) => {
                switch (tabId) {
                  case 'insights':
                    return insightStats?.active || 0;
                  case 'models':
                    return models?.filter(m => m.status === 'ACTIVE').length || 0;
                  case 'metrics':
                    return systemMetrics?.modelCount || 0;
                  default:
                    return 0;
                }
              };

              const count = getTabCount(tab.id);
              
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveView(tab.id as any)}
                  className={`group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm ${
                    activeView === tab.id
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                  }`}
                >
                  <tab.icon className="h-5 w-5 mr-2" />
                  {tab.name}
                  {count > 0 && (
                    <span className={`ml-2 text-xs font-medium px-2 py-1 rounded-full ${
                      activeView === tab.id 
                        ? 'bg-indigo-100 text-indigo-600'
                        : 'bg-slate-100 text-slate-600'
                    }`}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </motion.div>

      {/* Statistics Cards */}
      {insightStats && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200">
            <div className="flex items-center p-6">
              <div className="flex-shrink-0">
                <LightBulbIcon className="h-10 w-10 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-purple-700">Total Insights</p>
                <p className="text-2xl font-bold text-purple-900">{insightStats.total}</p>
              </div>
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200">
            <div className="flex items-center p-6">
              <div className="flex-shrink-0">
                <CheckCircleIcon className="h-10 w-10 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-green-700">Active Insights</p>
                <p className="text-2xl font-bold text-green-900">{insightStats.active}</p>
              </div>
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-red-50 to-red-100 border border-red-200">
            <div className="flex items-center p-6">
              <div className="flex-shrink-0">
                <ExclamationTriangleIcon className="h-10 w-10 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-red-700">Critical Alerts</p>
                <p className="text-2xl font-bold text-red-900">{insightStats.critical}</p>
              </div>
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200">
            <div className="flex items-center p-6">
              <div className="flex-shrink-0">
                <div className="h-10 w-10 bg-blue-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-sm">{Math.round(insightStats.averageConfidence)}%</span>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-blue-700">Avg Confidence</p>
                <p className="text-2xl font-bold text-blue-900">{Math.round(insightStats.averageConfidence)}%</p>
              </div>
            </div>
          </Card>
        </motion.div>
      )}

      {/* Content based on active view */}
      {activeView === 'insights' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="space-y-6"
        >
          {/* Filters */}
          <Card className="p-6 bg-white border border-gray-200 shadow-sm">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search insights..."
                    className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white text-slate-900 placeholder-slate-500 shadow-sm"
                    value={filters.search || ''}
                    onChange={(e) => handleFilterChange('search', e.target.value)}
                  />
                </div>
              </div>
              
              <div className="flex gap-4">
                <select
                  className="min-w-[140px] px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white text-slate-900 shadow-sm"
                  value={filters.severity || 'all'}
                  onChange={(e) => handleFilterChange('severity', e.target.value === 'all' ? 'all' : e.target.value as InsightSeverity)}
                >
                  <option value="all">All Severities</option>
                  <option value="CRITICAL">Critical</option>
                  <option value="HIGH">High</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="LOW">Low</option>
                </select>
                
                <select
                  className="min-w-[140px] px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white text-slate-900 shadow-sm"
                  value={filters.type || 'all'}
                  onChange={(e) => handleFilterChange('type', e.target.value === 'all' ? 'all' : e.target.value as InsightType)}
                >
                  <option value="all">All Types</option>
                  <option value="PREDICTIVE_MAINTENANCE">Maintenance</option>
                  <option value="ENERGY_EFFICIENCY">Energy</option>
                  <option value="PERFORMANCE_OPTIMIZATION">Performance</option>
                  <option value="SCHEDULE_CONFLICT">Schedule</option>
                  <option value="SAFETY_ALERT">Safety</option>
                </select>
                
                <select
                  className="min-w-[120px] px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white text-slate-900 shadow-sm"
                  value={filters.status || 'all'}
                  onChange={(e) => handleFilterChange('status', e.target.value === 'all' ? 'all' : e.target.value as InsightStatus)}
                >
                  <option value="all">All Status</option>
                  <option value="ACTIVE">Active</option>
                  <option value="ACKNOWLEDGED">Acknowledged</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="RESOLVED">Resolved</option>
                  <option value="DISMISSED">Dismissed</option>
                </select>
              </div>
            </div>
          </Card>

          {/* Insights Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {insights.map((insight: AIInsight, index: number) => {
              const TypeIcon = getTypeIcon(insight.type);
              return (
                <motion.div
                  key={insight.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                >
                  <div 
                    className="hover:shadow-lg transition-shadow duration-200 cursor-pointer"
                    onClick={() => {
                      setSelectedInsight(insight);
                      setShowInsightModal(true);
                    }}
                  >
                    <Card className="bg-white border border-gray-200 shadow-sm">
                    <div className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <div className={`p-2 rounded-lg ${
                            insight.severity === 'CRITICAL' ? 'bg-red-500' :
                            insight.severity === 'HIGH' ? 'bg-orange-500' :
                            insight.severity === 'MEDIUM' ? 'bg-yellow-500' :
                            'bg-blue-500'
                          }`}>
                            <TypeIcon className="h-5 w-5 text-white" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900 text-sm leading-tight">
                              {insight.title}
                            </h3>
                            <p className="text-xs text-gray-600 mt-1">
                              {insight.aiModel.modelName}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          {insight.status === 'ACTIVE' && (
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                          )}
                          <span className="text-xs font-medium text-gray-600">
                            {Math.round(insight.confidence)}%
                          </span>
                        </div>
                      </div>
                      
                      <p className="text-sm text-gray-700 mb-4 line-clamp-3">
                        {insight.description}
                      </p>
                      
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex space-x-2">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getSeverityColor(insight.severity)}`}>
                            {insight.severity}
                          </span>
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(insight.status)}`}>
                            {insight.status}
                          </span>
                        </div>
                        
                        <span className="text-xs text-gray-500">
                          Priority {insight.priority}
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4 text-xs text-gray-600">
                          <span>Impact: {insight.impact.operationalImpact}/100</span>
                          <span>{insight.recommendations.length} rec{insight.recommendations.length !== 1 ? 's' : ''}</span>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          {insight.status === 'ACTIVE' && (
                            <>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (window.confirm(`Acknowledge insight "${insight.title}"?`)) {
                                    acknowledgeInsightMutation.mutate(insight.id);
                                  }
                                }}
                                className="p-1 text-gray-400 hover:text-green-500 transition-colors duration-200"
                                title="Acknowledge"
                              >
                                <CheckCircleIcon className="h-4 w-4" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (window.confirm(`Dismiss insight "${insight.title}"?`)) {
                                    dismissInsightMutation.mutate(insight.id);
                                  }
                                }}
                                className="p-1 text-gray-400 hover:text-red-500 transition-colors duration-200"
                                title="Dismiss"
                              >
                                <XCircleIcon className="h-4 w-4" />
                              </button>
                            </>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedInsight(insight);
                              setShowInsightModal(true);
                            }}
                            className="p-1 text-gray-400 hover:text-purple-500 transition-colors duration-200"
                            title="View Details"
                          >
                            <EyeIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                    </Card>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {insights.length === 0 && (
            <div className="text-center py-12">
              <LightBulbIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No insights found</h3>
              <p className="mt-1 text-sm text-gray-500">
                Try adjusting your search or filter criteria.
              </p>
            </div>
          )}
        </motion.div>
      )}

      {/* Predictive Models View */}
      {activeView === 'models' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="space-y-6"
        >
          {/* Models Overview Cards */}
          {models && models.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {models.map((model, index) => {
                const getStatusColor = (status: string) => {
                  switch (status) {
                    case 'ACTIVE':
                      return 'text-green-700 bg-green-50 border border-green-200';
                    case 'TRAINING':
                      return 'text-yellow-700 bg-yellow-50 border border-yellow-200';
                    case 'IDLE':
                      return 'text-gray-700 bg-gray-50 border border-gray-200';
                    case 'ERROR':
                      return 'text-red-700 bg-red-50 border border-red-200';
                    case 'MAINTENANCE':
                      return 'text-purple-700 bg-purple-50 border border-purple-200';
                    default:
                      return 'text-gray-700 bg-gray-50 border border-gray-200';
                  }
                };

                const getTypeIcon = (type: string) => {
                  switch (type) {
                    case 'LSTM':
                      return '🧠';
                    case 'NEURAL_NETWORK':
                      return '🤖';
                    case 'RANDOM_FOREST':
                      return '🌳';
                    case 'SVM':
                      return '📊';
                    case 'ENSEMBLE':
                      return '🔗';
                    case 'ARIMA':
                      return '📈';
                    default:
                      return '⚙️';
                  }
                };

                return (
                  <motion.div
                    key={model.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                  >
            <Card className="p-6 bg-white border border-slate-200 shadow-md hover:shadow-xl transition-all duration-200 backdrop-blur-sm bg-white/90">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <div className="text-2xl">{getTypeIcon(model.type)}</div>
                          <div>
                            <h3 className="font-semibold text-gray-900 text-sm leading-tight">
                              {model.name}
                            </h3>
                            <p className="text-xs text-gray-500 mt-1">
                              {model.type} • {model.dataPoints.toLocaleString()} data points
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          {model.status === 'ACTIVE' && (
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                          )}
                          {model.status === 'TRAINING' && (
                            <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
                          )}
                          <span className="text-xs font-medium text-gray-600">
                            {Math.round(model.accuracy * 10) / 10}%
                          </span>
                        </div>
                      </div>
                      
                      <div className="mb-4">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(model.status)}`}>
                          {model.status}
                        </span>
                      </div>
                      
                      {/* Model Performance Metrics */}
                      <div className="grid grid-cols-2 gap-3 mb-4">
                        <div className="text-center">
                          <div className="text-lg font-bold text-purple-600">{model.performance.f1Score.toFixed(3)}</div>
                          <div className="text-xs text-gray-500">F1 Score</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-bold text-blue-600">{model.performance.precision.toFixed(3)}</div>
                          <div className="text-xs text-gray-500">Precision</div>
                        </div>
                      </div>
                      
                      {/* Recent Predictions */}
                      {model.predictions && model.predictions.length > 0 && (
                        <div className="mb-4">
                          <h4 className="text-xs font-medium text-gray-700 mb-2">Recent Predictions</h4>
                          <div className="space-y-2">
                            {model.predictions.slice(0, 2).map((pred) => (
                              <div key={pred.id} className="bg-gray-50 p-2 rounded text-xs">
                                <div className="flex justify-between items-center">
                                  <span className="text-gray-600">{pred.category}</span>
                                  <span className="font-medium">{pred.predictedValue}</span>
                                </div>
                                <div className="flex justify-between items-center mt-1">
                                  <span className="text-gray-500">Confidence: {Math.round(pred.confidence)}%</span>
                                  {pred.actualValue && (
                                    <span className={`text-xs ${
                                      Math.abs(pred.deviation || 0) < 1 ? 'text-green-600' : 'text-yellow-600'
                                    }`}>
                                      Actual: {pred.actualValue}
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>Last Trained: {new Date(model.lastTrained).toLocaleDateString()}</span>
                        {model.status === 'ACTIVE' && (
                          <button
                            onClick={() => trainModelMutation.mutate(model.id)}
                            className="text-purple-600 hover:text-purple-700 font-medium"
                            disabled={trainModelMutation.isPending}
                          >
                            {trainModelMutation.isPending ? 'Training...' : 'Retrain'}
                          </button>
                        )}
                      </div>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <CpuChipIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No models available</h3>
              <p className="mt-1 text-sm text-gray-500">
                AI models are being loaded or may be temporarily unavailable.
              </p>
            </div>
          )}
        </motion.div>
      )}

      {/* System Metrics View */}
      {activeView === 'metrics' && systemMetrics && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="grid grid-cols-1 lg:grid-cols-3 gap-6"
        >
          <Card className="p-6 bg-white border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-semibold text-gray-900">AI System Status</h4>
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Active Models:</span>
                <span className="text-sm font-medium text-green-600">{systemMetrics.modelCount}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">System Uptime:</span>
                <span className="text-sm font-medium text-green-600">{systemMetrics.uptime}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">CPU Usage:</span>
                <span className="text-sm font-medium text-blue-600">{systemMetrics.resourceUsage.cpuUtilization}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Memory Usage:</span>
                <span className="text-sm font-medium text-purple-600">{systemMetrics.resourceUsage.memoryUsage}GB</span>
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-white border border-gray-200 shadow-sm">
            <h4 className="font-semibold text-gray-900 mb-4">Performance Metrics</h4>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Overall Accuracy:</span>
                <span className="text-sm font-medium text-green-600">{systemMetrics.accuracy.overall}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Avg Response Time:</span>
                <span className="text-sm font-medium text-blue-600">{systemMetrics.processingTime.avg}s</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Decisions/Hour:</span>
                <span className="text-sm font-medium text-purple-600">{systemMetrics.throughput.decisionsPerHour}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Predictions/Hour:</span>
                <span className="text-sm font-medium text-orange-600">{systemMetrics.throughput.predictionsPerHour}</span>
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-white border border-gray-200 shadow-sm">
            <h4 className="font-semibold text-gray-900 mb-4">System Health</h4>
            <div className="space-y-3 text-sm">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-gray-600">All models operational</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span className="text-gray-600">Data pipelines healthy</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                <span className="text-gray-600">API endpoints responsive</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                <span className="text-gray-600">Scheduled maintenance: {new Date(systemMetrics.nextMaintenanceDate).toLocaleDateString()}</span>
              </div>
            </div>
          </Card>
        </motion.div>
      )}

      {/* Insight Detail Modal */}
      <AnimatePresence>
        {showInsightModal && selectedInsight && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="ai-modal-container fixed inset-0 z-50 overflow-y-auto"
            style={{ zIndex: 9999, backgroundColor: 'rgba(0,0,0,0.75)' }}
          >
            <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.85 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-gradient-to-br from-blue-900/75 to-cyan-900/80"
                style={{ background: 'linear-gradient(135deg, rgba(30, 58, 138, 0.8) 0%, rgba(22, 78, 99, 0.85) 100%)', zIndex: 9998 }}
                onClick={() => setShowInsightModal(false)}
              />

              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="ai-insight-modal relative inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full mx-4"
                style={{ zIndex: 10000, backgroundColor: 'white', color: 'black' }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="bg-white px-6 pt-6 pb-4" style={{ backgroundColor: 'white', color: '#111827' }}>
                  <div className="flex items-start justify-between mb-6">
                    <div className="flex items-center space-x-3">
                      <div className={`p-3 rounded-lg ${
                        selectedInsight.severity === 'CRITICAL' ? 'bg-red-500' :
                        selectedInsight.severity === 'HIGH' ? 'bg-orange-500' :
                        selectedInsight.severity === 'MEDIUM' ? 'bg-yellow-500' :
                        'bg-blue-500'
                      }`}>
                        {React.createElement(getTypeIcon(selectedInsight.type), { className: "h-6 w-6 text-white" })}
                      </div>
                      <div>
                        <h3 className="text-lg font-medium text-gray-900" style={{ color: '#111827', fontWeight: 500, fontSize: '18px' }}>{selectedInsight.title}</h3>
                        <p className="text-sm text-gray-500" style={{ color: '#6b7280', fontSize: '14px' }}>{selectedInsight.aiModel.modelName}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowInsightModal(false)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <XCircleIcon className="h-6 w-6" />
                    </button>
                  </div>

                  <div className="mb-6">
                    <p className="text-gray-700" style={{ color: '#374151', fontWeight: 400 }}>{selectedInsight.description}</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div>
                      <h4 className="font-medium text-gray-900 mb-3" style={{ color: '#111827', fontWeight: 500 }}>Impact Assessment</h4>
                      <div className="space-y-2 text-sm" style={{ color: '#4b5563' }}>
                        <div className="flex justify-between">
                          <span>Operational Impact:</span>
                          <span className="font-medium">{selectedInsight.impact.operationalImpact}/100</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Safety Impact:</span>
                          <span className="font-medium">{selectedInsight.impact.safetyImpact}/100</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Financial Impact:</span>
                          <span className="font-medium">₹{Math.abs(selectedInsight.impact.financialImpact).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Passenger Impact:</span>
                          <span className="font-medium">{selectedInsight.impact.passengerImpact}/100</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium text-gray-900 mb-3" style={{ color: '#111827', fontWeight: 500 }}>AI Model Info</h4>
                      <div className="space-y-2 text-sm" style={{ color: '#4b5563' }}>
                        <div className="flex justify-between">
                          <span>Confidence:</span>
                          <span className="font-medium">{Math.round(selectedInsight.confidence)}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Model Version:</span>
                          <span className="font-medium">{selectedInsight.aiModel.modelVersion}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Accuracy:</span>
                          <span className="font-medium">{selectedInsight.aiModel.accuracy}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Last Training:</span>
                          <span className="font-medium">{new Date(selectedInsight.aiModel.lastTrainingDate).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mb-6">
                    <h4 className="font-medium text-gray-900 mb-3" style={{ color: '#111827', fontWeight: 500 }}>Recommendations</h4>
                    <div className="space-y-3">
                      {selectedInsight.recommendations.map((rec, idx) => (
                        <div key={rec.id} className="border rounded-lg p-4" style={{ border: '1px solid #e5e7eb', backgroundColor: 'white' }}>
                          <div className="flex items-start justify-between mb-2">
                            <h5 className="font-medium text-gray-900" style={{ color: '#111827', fontWeight: 500 }}>{rec.title}</h5>
                            {selectedInsight.status === 'IN_PROGRESS' && selectedInsight.metadata?.executedRecommendation === rec.id ? (
                              <div className="flex items-center space-x-2">
                                <div className="text-sm bg-amber-100 text-amber-800 px-3 py-1 rounded border border-amber-200">
                                  🔄 In Progress
                                </div>
                                {selectedInsight.metadata?.progressPercentage && (
                                  <span className="text-xs text-amber-700">
                                    {selectedInsight.metadata.progressPercentage}%
                                  </span>
                                )}
                              </div>
                            ) : selectedInsight.status === 'RESOLVED' && selectedInsight.metadata?.executedRecommendation === rec.id ? (
                              <div className="text-sm bg-green-100 text-green-800 px-3 py-1 rounded border border-green-200">
                                ✅ Completed
                              </div>
                            ) : selectedInsight.status === 'ACTIVE' ? (
                              <button
                                onClick={() => {
                                  // Close modal first to ensure notifications are visible
                                  setShowInsightModal(false);
                                  
                                  // Execute with a small delay to ensure modal closes
                                  setTimeout(() => {
                                    executeRecommendationMutation.mutate({ 
                                      insightId: selectedInsight.id, 
                                      recommendationId: rec.id 
                                    });
                                  }, 200);
                                }}
                                className="text-sm bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-3 py-1 rounded hover:from-emerald-700 hover:to-teal-700 transition-all duration-200 shadow-md"
                              >
                                Execute
                              </button>
                            ) : selectedInsight.status === 'ACKNOWLEDGED' ? (
                              <div className="text-sm bg-blue-100 text-blue-800 px-3 py-1 rounded border border-blue-200">
                                📝 Acknowledged
                              </div>
                            ) : (
                              <div className="text-sm bg-gray-100 text-gray-600 px-3 py-1 rounded">
                                ⏸️ Not Started
                              </div>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 mb-2" style={{ color: '#4b5563' }}>{rec.description}</p>
                          <div className="flex items-center justify-between text-xs text-gray-500">
                            <span>Impact: {rec.estimatedImpact}</span>
                            <span>Time: {rec.implementationTime}</span>
                            {rec.estimatedCost && <span>Cost: ₹{rec.estimatedCost.toLocaleString()}</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 px-6 py-4 sm:flex sm:flex-row-reverse" style={{ backgroundColor: '#f9fafb' }}>
                  {selectedInsight.status === 'ACTIVE' && (
                    <button
                      onClick={() => {
                        acknowledgeInsightMutation.mutate(selectedInsight.id);
                        setShowInsightModal(false);
                      }}
                      className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-gradient-to-r from-emerald-600 to-green-600 text-base font-medium text-white hover:from-emerald-700 hover:to-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 sm:ml-3 sm:w-auto sm:text-sm transition-all duration-200"
                    >
                      Acknowledge
                    </button>
                  )}
                  <button
                    onClick={() => setShowInsightModal(false)}
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-slate-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 sm:mt-0 sm:w-auto sm:text-sm transition-all duration-200"
                  >
                    Close
                  </button>
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Optimization Modal */}
      <AnimatePresence>
        {showOptimizationModal && (
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
                animate={{ opacity: 0.85 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-gradient-to-br from-cyan-900/75 to-blue-900/80"
                style={{ background: 'linear-gradient(135deg, rgba(22, 78, 99, 0.8) 0%, rgba(30, 58, 138, 0.85) 100%)' }}
                onClick={() => setShowOptimizationModal(false)}
              />

              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full mx-4"
                style={{ zIndex: 10000 }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="bg-white px-6 pt-6 pb-4">
                  <div className="text-center">
                    <CpuChipIcon className="mx-auto h-12 w-12 text-purple-600" />
                    <h3 className="mt-4 text-lg font-medium text-gray-900">Run AI Optimization</h3>
                    <p className="mt-2 text-sm text-gray-500">
                      Execute AI-powered optimization to improve system performance
                    </p>
                  </div>

                  <div className="mt-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Optimization Type
                    </label>
                    <select className="form-input w-full">
                      <option value="ENERGY">Energy Optimization</option>
                      <option value="SCHEDULING">Schedule Optimization</option>
                      <option value="ROUTING">Route Optimization</option>
                      <option value="MAINTENANCE">Maintenance Optimization</option>
                    </select>
                  </div>
                </div>

                <div className="bg-gray-50 px-6 py-4 sm:flex sm:flex-row-reverse">
                  <button
                    onClick={() => {
                      runOptimizationMutation.mutate({ 
                        type: 'ENERGY', 
                        parameters: { scope: 'system-wide' }
                      });
                    }}
                    disabled={runOptimizationMutation.isPending}
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-base font-semibold text-white hover:from-purple-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 transition-all duration-200"
                  >
                    {runOptimizationMutation.isPending ? 'Running...' : 'Start Optimization'}
                  </button>
                  <button
                    onClick={() => setShowOptimizationModal(false)}
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:w-auto sm:text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AIInsightsPage;