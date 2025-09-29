import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  ChartBarIcon,
  CalendarIcon,
  ArrowDownTrayIcon,
  ClockIcon,
  TruckIcon,
  ArrowPathIcon,
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
import { Line, Bar, Doughnut, Scatter } from 'react-chartjs-2';
import { useQuery } from '@tanstack/react-query';

import { useAuth } from '../hooks/useAuth';
import { useWebSocket } from '../hooks/useWebSocket';
import Card from '../components/ui/Card';
import MetricCard from '../components/ui/MetricCard';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { analyticsApi, metroCarsApi, fitnessApi, jobCardsApi } from '../services/api';

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

const AnalyticsPage: React.FC = () => {
  const { user } = useAuth();
  const [dateRange, setDateRange] = useState('30d');
  const [selectedMetric, setSelectedMetric] = useState('fitness');
  
  // Generate fallback data function
  const generateKMRLFallbackData = () => {
    const now = new Date();
    const last30Days = Array.from({length: 30}, (_, i) => {
      const date = new Date(now);
      date.setDate(date.getDate() - (29 - i));
      return date;
    });
    
    return {
      dashboard: {
        trainsets: {
          total: 25, // Total KMRL fleet
          statusBreakdown: [
            { status: 'IN_SERVICE', _count: 18 },
            { status: 'MAINTENANCE', _count: 4 },
            { status: 'AVAILABLE', _count: 3 }
          ],
          availabilityRate: '88.0'
        },
        fitness: {
          total: 25,
          valid: 22,
          expired: 1,
          expiringThisWeek: 2,
          complianceRate: '88.0'
        },
        jobCards: {
          total: 156,
          active: 23,
          completedThisMonth: 45,
          overdue: 3,
          averageCompletionTime: 4.2
        },
        maintenance: {
          thisMonth: 28,
          preventive: 22,
          emergency: 6,
          preventiveRatio: '78.6'
        },
        branding: {
          keralaTourismRevenue: 125000,
          flipkartRevenue: 89000,
          totalBrandedTrains: 8,
          exposureHours: 2400
        }
      },
      performance: {
        optimizationScores: last30Days.map(date => ({
          date: date.toISOString(),
          score: 85 + Math.random() * 10
        })),
        energyEfficiency: last30Days.map(date => ({
          date: date.toISOString(),
          efficiency: 92 + Math.random() * 6
        })),
        punctuality: last30Days.map(date => ({
          date: date.toISOString(),
          onTime: 96 + Math.random() * 3
        }))
      },
      trainsets: {
        alstomMetropolis: {
          totalFleet: 25,
          averageMileage: 42000,
          energyEfficiency: 94.2,
          availability: 88.0
        },
        depots: {
          aluva: { trainsets: 15, utilization: 89.2 },
          muttom: { trainsets: 10, utilization: 86.8 }
        }
      },
      routes: {
        line1: {
          aluvaToMg: { passengers: 45000, punctuality: 97.2 },
          mgToAluva: { passengers: 43000, punctuality: 96.8 }
        }
      },
      // Chart data structures
      charts: {
        fitnessScoreData: {
          labels: last30Days.map(date => date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })),
          datasets: [{
            label: 'Alstom Metropolis Fleet',
            data: last30Days.map(() => 85 + Math.random() * 10),
            borderColor: '#3B82F6',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            fill: true,
            tension: 0.4
          }]
        },
        energyConsumptionData: {
          labels: ['Aluva', 'Kalamassery', 'Cusat', 'Pathadipalam', 'Edapally', 'Changampuzha Park', 'Palarivattom', 'JLN Stadium', 'Town Hall', 'MG Road'],
          datasets: [{
            label: 'Energy Consumption (kWh)',
            data: [1200, 980, 1100, 950, 1350, 1050, 1250, 1400, 1180, 1320],
            backgroundColor: 'rgba(34, 197, 94, 0.8)',
            borderColor: '#22C55E',
            borderWidth: 1
          }]
        },
        maintenanceTypeData: {
          labels: ['Preventive', 'Corrective', 'Emergency', 'Scheduled'],
          datasets: [{
            data: [65, 20, 10, 5],
            backgroundColor: ['#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6'],
            borderWidth: 2,
            borderColor: '#ffffff'
          }]
        },
        trainsetMileageData: {
          labels: ['ts-kmrl-001', 'ts-kmrl-005', 'ts-kmrl-012', 'ts-kmrl-008', 'ts-kmrl-015'],
          datasets: [{
            label: 'Mileage (km)',
            data: [48500, 47200, 46800, 45900, 45100],
            backgroundColor: 'rgba(168, 85, 247, 0.8)',
            borderColor: '#A855F7',
            borderWidth: 1
          }]
        }
      },
      // Insights data
      insights: {
        fitnessImprovement: '8.2',
        energyEfficiencyGain: '3.1',
        peakHourDelays: '12',
        weekendVolumeReduction: '38'
      },
      // Recommendations data
      recommendations: {
        delayReductionPotential: '25',
        criticalTrainset: 'ts-kmrl-012',
        fitnessDecline: '6',
        energyOptimizationTarget: 'ts-kmrl-018',
        energyEfficiencyTarget: '94'
      },
      // Root-level fitness data for compatibility
      fitness: {
        complianceRate: '88.0',
        validCertificates: 22,
        expiredCertificates: 1,
        expiringThisWeek: 2
      },
      // Root-level job cards data for compatibility
      jobCards: {
        active: 23,
        completed: 45,
        overdue: 3,
        total: 156
      },
      timestamp: now
    };
  };
  
  const [realAnalyticsData, setRealAnalyticsData] = useState<any>(generateKMRLFallbackData());
  const [isLoadingReal, setIsLoadingReal] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(30); // seconds
  const [selectedMetrics, setSelectedMetrics] = useState(['fitness', 'energy', 'maintenance', 'performance']);
  const [comparisonMode, setComparisonMode] = useState(false);
  const [customDateRange, setCustomDateRange] = useState({ start: '', end: '' });
  const [showExportDropdown, setShowExportDropdown] = useState(false);

  // Fetch real KMRL analytics data
  const fetchRealAnalyticsData = async () => {
    try {
      setIsLoadingReal(true);
      console.log('KMRL analytics data initialized with fallback');
      
      // Try to fetch real data and overlay it
      const [dashboardData, performanceData, trainsetsData, fitnessData, jobCardsData] = await Promise.all([
        analyticsApi.getDashboard().catch(() => null),
        analyticsApi.getPerformance().catch(() => null),
        metroCarsApi.getStats().catch(() => null),
        fitnessApi.getStats().catch(() => null),
        jobCardsApi.getStats().catch(() => null)
      ]);
      
      // If we have real data, merge it with fallback
      const hasRealData = dashboardData || performanceData || trainsetsData || fitnessData || jobCardsData;
      
      if (hasRealData) {
        const currentFallback = realAnalyticsData;
        const combinedData = {
          ...currentFallback,
          dashboard: dashboardData?.data || currentFallback.dashboard,
          performance: performanceData?.data || currentFallback.performance,
          trainsets: trainsetsData?.data || currentFallback.trainsets,
          fitness: fitnessData?.data || currentFallback.fitness,
          jobCards: jobCardsData?.data || currentFallback.jobCards,
          timestamp: new Date()
        };
        
        setRealAnalyticsData(combinedData);
        setLastUpdated(new Date());
        console.log('Real KMRL analytics data loaded and merged:', combinedData);
        toast.success('KMRL analytics updated with live data');
      } else {
        console.log('Using KMRL fallback data - APIs unavailable');
        toast('Showing KMRL demo data - Live APIs unavailable', { icon: 'ℹ️' });
      }
    } catch (error) {
      console.error('Failed to fetch real analytics data:', error);
      toast.error('Using KMRL demo analytics data - API error');
    } finally {
      setIsLoadingReal(false);
    }
  };
  
  
  // WebSocket integration for real-time updates
  useWebSocket({
    subscriptions: ['trainsets', 'optimization', 'fitness'],
    onSystemNotification: (notification) => {
      if (notification.message.includes('analytics') || notification.message.includes('performance') || notification.message.includes('trainset')) {
        console.log('📊 Analytics notification received:', notification.message);
        toast(notification.message, {
          duration: 3000,
          position: 'top-right',
          icon: '📊'
        });
        // Refresh data when receiving analytics updates
        fetchRealAnalyticsData();
      }
    },
    onOptimizationUpdate: () => {
      // Refresh analytics when optimization completes
      fetchRealAnalyticsData();
    },
    onTrainsetUpdate: () => {
      // Refresh analytics when trainset data changes
      fetchRealAnalyticsData();
    },
    onFitnessUpdate: () => {
      // Refresh analytics when fitness data changes
      fetchRealAnalyticsData();
    },
    onConnectionEstablished: () => {
      console.log('✅ WebSocket connected for Analytics page');
    }
  });
  
  // Auto-refresh functionality
  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    
    if (autoRefresh && refreshInterval > 0) {
      intervalId = setInterval(() => {
        fetchRealAnalyticsData();
      }, refreshInterval * 1000);
    }
    
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [autoRefresh, refreshInterval]);
  
  // Close export dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (showExportDropdown && !target.closest('.export-dropdown')) {
        setShowExportDropdown(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showExportDropdown]);
  
  useEffect(() => {
    fetchRealAnalyticsData();
  }, [dateRange]);
  
  // Filter data based on selected metrics and date range
  const getFilteredData = () => {
    let filteredData = { ...realAnalyticsData };
    
    // Apply custom date range if set
    if (customDateRange.start && customDateRange.end) {
      const startDate = new Date(customDateRange.start);
      const endDate = new Date(customDateRange.end);
      const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      
      // Generate filtered chart data for the custom date range
      const customDates = Array.from({length: daysDiff}, (_, i) => {
        const date = new Date(startDate);
        date.setDate(date.getDate() + i);
        return date;
      });
      
      if (filteredData.charts) {
        filteredData.charts.fitnessScoreData = {
          ...filteredData.charts.fitnessScoreData,
          labels: customDates.map(date => date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })),
          datasets: filteredData.charts.fitnessScoreData.datasets.map((dataset: any) => ({
            ...dataset,
            data: customDates.map(() => 85 + Math.random() * 10)
          }))
        };
      }
    }
    
    return filteredData;
  };
  
  const filteredAnalyticsData = getFilteredData();
  
  // Check if metric is selected for display
  const isMetricSelected = (metric: string) => selectedMetrics.includes(metric);
  
  // Show metrics cards based on selection
  const getVisibleMetricCards = () => {
    const allCards = [
      {
        id: 'fleet',
        metric: 'performance',
        component: (
          <MetricCard
            title="Alstom Metropolis Fleet"
            value={filteredAnalyticsData?.dashboard?.trainsets?.total || filteredAnalyticsData?.trainsets?.alstomMetropolis?.totalFleet || 25}
            icon={TruckIcon}
            color="blue"
            trend={{ value: 0, direction: 'up' as const }}
            suffix=" trains"
          />
        )
      },
      {
        id: 'availability',
        metric: 'performance',
        component: (
          <MetricCard
            title="Service Availability"
            value={parseFloat(filteredAnalyticsData?.dashboard?.trainsets?.availabilityRate || filteredAnalyticsData?.trainsets?.alstomMetropolis?.availability || '88.0')}
            icon={ChartBarIcon}
            color="green"
            trend={{ value: 2.3, direction: 'up' as const }}
            suffix="%"
          />
        )
      },
      {
        id: 'fitness',
        metric: 'fitness',
        component: (
          <MetricCard
            title="Fitness Compliance"
            value={parseFloat(filteredAnalyticsData?.dashboard?.fitness?.complianceRate || '88.0')}
            icon={ClockIcon}
            color="purple"
            trend={{ value: 1.5, direction: 'up' as const }}
            suffix="%"
          />
        )
      },
      {
        id: 'jobcards',
        metric: 'maintenance',
        component: (
          <MetricCard
            title="Active Job Cards"
            value={filteredAnalyticsData?.dashboard?.jobCards?.active || filteredAnalyticsData?.jobCards?.active || 23}
            icon={CalendarIcon}
            color="indigo"
            trend={{ value: 4, direction: 'down' as const }}
            suffix=""
          />
        )
      },
      {
        id: 'branding',
        metric: 'performance',
        component: (
          <MetricCard
            title="Branding Revenue"
            value={Math.round((filteredAnalyticsData?.dashboard?.branding?.keralaTourismRevenue + filteredAnalyticsData?.dashboard?.branding?.flipkartRevenue || 214000) / 1000)}
            icon={ChartBarIcon}
            color="yellow"
            trend={{ value: 12, direction: 'up' as const }}
            suffix="k ₹"
          />
        )
      }
    ];
    
    return allCards.filter(card => isMetricSelected(card.metric));
  };

  // Fetch analytics from backend
  const { data: performanceResp, isLoading } = useQuery({
    queryKey: ['analytics', 'performance', dateRange],
    queryFn: async () => analyticsApi.getPerformance(),
  });

  const { data: dashboardResp } = useQuery({
    queryKey: ['analytics', 'dashboard', dateRange],
    queryFn: async () => analyticsApi.getDashboard(),
  });

  const { data: utilizationResp } = useQuery({
    queryKey: ['analytics', 'utilization', dateRange],
    queryFn: async () => analyticsApi.getUtilization(),
  });

  const { data: maintenanceResp } = useQuery({
    queryKey: ['analytics', 'maintenance', dateRange],
    queryFn: async () => analyticsApi.getMaintenance(),
  });

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    animation: {
      duration: 1000,
      easing: 'easeInOutCubic' as const,
    },
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          usePointStyle: true,
          padding: 20,
          font: {
            size: 12,
            weight: 'normal' as const,
          },
        },
      },
      tooltip: {
        backgroundColor: '#1F2937',
        titleColor: '#F9FAFB',
        bodyColor: '#F9FAFB',
        cornerRadius: 8,
        padding: 12,
        titleFont: {
          size: 14,
          weight: 'bold' as const,
        },
        bodyFont: {
          size: 12,
        },
        displayColors: true,
        callbacks: {
          label: function(context: any) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed.y !== null) {
              if (context.dataset.label?.includes('%')) {
                label += context.parsed.y.toFixed(1) + '%';
              } else if (context.dataset.label?.includes('₹')) {
                label += '₹' + context.parsed.y.toLocaleString();
              } else {
                label += context.parsed.y.toLocaleString();
              }
            }
            return label;
          },
        },
      },
    },
    scales: {
      x: {
        grid: {
          color: '#F3F4F6',
          borderColor: '#D1D5DB',
        },
        ticks: {
          font: {
            size: 11,
          },
          color: '#6B7280',
        },
      },
      y: {
        grid: {
          color: '#F3F4F6',
          borderColor: '#D1D5DB',
        },
        ticks: {
          font: {
            size: 11,
          },
          color: '#6B7280',
        },
      },
    },
  };

  // Chart data configurations with filtering and comparison
  const getChartData = (chartType: string) => {
    const baseData = filteredAnalyticsData.charts?.[chartType] || {};
    
    if (comparisonMode && baseData.labels) {
      // Generate comparison data (previous period)
      const comparisonData = baseData.datasets?.[0]?.data?.map((value: number) => 
        value * (0.85 + Math.random() * 0.3) // Simulate previous period data
      );
      
      return {
        ...baseData,
        datasets: [
          ...(baseData.datasets || []),
          {
            label: 'Previous Period',
            data: comparisonData,
            borderColor: '#94A3B8',
            backgroundColor: 'rgba(148, 163, 184, 0.1)',
            tension: 0.4,
            fill: false,
            borderDash: [5, 5],
          }
        ]
      };
    }
    
    return baseData;
  };
  
  const fitnessLineData = getChartData('fitnessScoreData');

  const energyBarData = getChartData('energyConsumptionData');
  const trainsetTypeData = getChartData('maintenanceTypeData');
  const routePerformanceData = getChartData('trainsetMileageData');

  const correlationData = {
    datasets: [
      {
        label: 'Fitness vs Efficiency',
        data: [
          { x: 7.2, y: 88 },
          { x: 8.1, y: 91 },
          { x: 8.7, y: 94 },
          { x: 9.2, y: 97 },
          { x: 8.5, y: 92 },
          { x: 7.8, y: 89 },
          { x: 8.9, y: 95 },
          { x: 8.3, y: 90 },
        ],
        backgroundColor: '#8B5CF6',
        borderColor: '#8B5CF6',
        pointRadius: 6,
        pointHoverRadius: 8,
      },
    ],
  };

  const correlationOptions = {
    ...chartOptions,
    scales: {
      x: {
        type: 'linear' as const,
        position: 'bottom' as const,
        title: {
          display: true,
          text: 'Fitness Score',
        },
        grid: {
          color: '#E5E7EB',
        },
      },
      y: {
        title: {
          display: true,
          text: 'Energy Efficiency (%)',
        },
        grid: {
          color: '#E5E7EB',
        },
      },
    },
  };
  
  // Advanced Analytics Data Generation Functions
  const generatePredictiveMaintenanceData = () => {
    const dates = Array.from({length: 30}, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() + i);
      return date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
    });
    
    return {
      labels: dates,
      datasets: [
        {
          label: 'Predicted Failures',
          data: dates.map(() => Math.floor(Math.random() * 3) + 1),
          borderColor: '#EF4444',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          fill: true,
          tension: 0.4,
          borderDash: [5, 5],
        },
        {
          label: 'Historical Average',
          data: dates.map(() => 2.1),
          borderColor: '#6B7280',
          backgroundColor: 'transparent',
          borderWidth: 1,
          pointRadius: 0,
        },
      ],
    };
  };
  
  const generateAnomalyDetectionData = () => {
    const dates = Array.from({length: 24}, (_, i) => `${i}:00`);
    const normalData = dates.map(() => 85 + Math.random() * 10);
    const anomalyIndices = [6, 13, 18, 22];
    const anomalyData = dates.map((_, i) => {
      return anomalyIndices.includes(i) ? normalData[i] * 1.4 : null;
    });
    
    return {
      labels: dates,
      datasets: [
        {
          label: 'Normal Energy Usage',
          data: normalData,
          borderColor: '#22C55E',
          backgroundColor: 'rgba(34, 197, 94, 0.1)',
          fill: true,
          tension: 0.4,
        },
        {
          label: 'Detected Anomalies',
          data: anomalyData,
          borderColor: '#EF4444',
          backgroundColor: '#EF4444',
          pointRadius: 8,
          pointHoverRadius: 10,
          showLine: false,
          borderWidth: 0,
          pointBorderWidth: 2,
          pointBorderColor: '#DC2626',
        },
      ],
    };
  };

  const handleExportData = async (format: 'json' | 'csv' | 'pdf' = 'json') => {
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `kmrl-analytics-${dateRange}-${timestamp}`;
    
    const dataToExport = {
      exportDate: new Date().toISOString(),
      dateRange,
      lastUpdated: lastUpdated.toISOString(),
      metadata: {
        totalTrainsets: realAnalyticsData?.dashboard?.trainsets?.total || 25,
        availabilityRate: realAnalyticsData?.dashboard?.trainsets?.availabilityRate || '88.0',
        fitnessCompliance: realAnalyticsData?.dashboard?.fitness?.complianceRate || '88.0',
        activeJobCards: realAnalyticsData?.dashboard?.jobCards?.active || 23,
      },
      data: {
        performance: performanceResp,
        utilization: utilizationResp,
        maintenance: maintenanceResp,
        analytics: realAnalyticsData
      },
    };
    
    try {
      let blob: Blob;
      let mimeType: string;
      let extension: string;
      
      switch (format) {
        case 'csv':
          const csvContent = generateCSVContent(dataToExport);
          blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
          mimeType = 'text/csv';
          extension = 'csv';
          break;
          
        case 'pdf':
          toast('PDF export will be available in the full version', {
            icon: 'ℹ️',
            duration: 3000
          });
          return;
          
        default: // json
          blob = new Blob([JSON.stringify(dataToExport, null, 2)], {
            type: 'application/json',
          });
          mimeType = 'application/json';
          extension = 'json';
      }
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${filename}.${extension}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success(`Analytics data exported as ${format.toUpperCase()}`);
    } catch (error) {
      toast.error('Export failed: ' + error);
    }
  };
  
  const generateCSVContent = (data: any) => {
    const headers = ['Metric', 'Value', 'Date', 'Status'];
    let csvContent = headers.join(',') + '\n';
    
    // Add key metrics
    const metrics = [
      ['Total Trainsets', data.metadata.totalTrainsets, data.exportDate, 'Active'],
      ['Availability Rate', data.metadata.availabilityRate + '%', data.exportDate, 'Optimal'],
      ['Fitness Compliance', data.metadata.fitnessCompliance + '%', data.exportDate, 'Good'],
      ['Active Job Cards', data.metadata.activeJobCards, data.exportDate, 'In Progress'],
    ];
    
    metrics.forEach(row => {
      csvContent += row.map(cell => `"${cell}"`).join(',') + '\n';
    });
    
    return csvContent;
  };

  if (isLoading && !realAnalyticsData) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="text-gray-600">Loading KMRL analytics data...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 px-4 sm:px-6 lg:px-8 py-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex flex-col space-y-4 lg:flex-row lg:items-start lg:justify-between lg:space-y-0">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="flex-1"
          >
            <div className="flex items-center space-x-3 mb-3">
              <h1 className="text-3xl font-bold text-gray-900">KMRL Analytics</h1>
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${autoRefresh ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
                <span className="text-sm font-medium text-gray-600">
                  {autoRefresh ? 'Live' : 'Paused'}
                </span>
              </div>
            </div>
            <p className="text-gray-600 text-base leading-relaxed max-w-2xl">
              Real-time insights into Kochi Metro Line 1 operations and Alstom Metropolis fleet performance
            </p>
            <div className="mt-3 flex items-center text-sm text-gray-500">
              <span>Last updated: {lastUpdated.toLocaleTimeString()}</span>
              <span className="mx-2">•</span>
              <span>Auto-refresh: {autoRefresh ? `Every ${refreshInterval}s` : 'Disabled'}</span>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="lg:flex-shrink-0"
          >
            <div className="bg-gray-50 rounded-lg p-4 space-y-4">
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Controls</div>
              
              {/* Control Buttons Row 1 */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setAutoRefresh(!autoRefresh)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 shadow-sm ${
                    autoRefresh 
                      ? 'bg-green-500 text-white hover:bg-green-600'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {autoRefresh ? 'Pause' : 'Resume'}
                </button>
                
                <select
                  value={refreshInterval}
                  onChange={(e) => setRefreshInterval(Number(e.target.value))}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={!autoRefresh}
                >
                  <option value={15}>15s</option>
                  <option value={30}>30s</option>
                  <option value={60}>1m</option>
                  <option value={300}>5m</option>
                </select>
                
                <button 
                  onClick={fetchRealAnalyticsData} 
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 shadow-sm font-medium"
                  disabled={isLoadingReal}
                >
                  {isLoadingReal ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  ) : (
                    <ArrowPathIcon className="h-4 w-4 mr-2" />
                  )}
                  Refresh
                </button>
              </div>
              
              {/* Control Buttons Row 2 */}
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="7d">Last 7 days</option>
                  <option value="30d">Last 30 days</option>
                  <option value="90d">Last 90 days</option>
                  <option value="1y">Last year</option>
                </select>
                
                {/* Export Dropdown */}
                <div className="relative export-dropdown">
                  <button
                    onClick={() => setShowExportDropdown(!showExportDropdown)}
                    className="inline-flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-all duration-200 shadow-sm font-medium"
                  >
                    <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
                    Export
                    <svg className="ml-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  
                  {showExportDropdown && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-50 border border-gray-200">
                      <div className="py-1">
                        <button
                          onClick={() => {
                            handleExportData('json');
                            setShowExportDropdown(false);
                          }}
                          className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          📋 Export as JSON
                        </button>
                        <button
                          onClick={() => {
                            handleExportData('csv');
                            setShowExportDropdown(false);
                          }}
                          className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          📊 Export as CSV
                        </button>
                        <button
                          onClick={() => {
                            handleExportData('pdf');
                            setShowExportDropdown(false);
                          }}
                          className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          📄 Export as PDF
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Advanced Filters Panel */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <Card title="Advanced Filters & Controls" className="mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Metric Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Metrics to Display</label>
              <div className="space-y-2">
                {[
                  { id: 'fitness', label: 'Fitness Score' },
                  { id: 'energy', label: 'Energy Efficiency' },
                  { id: 'maintenance', label: 'Maintenance' },
                  { id: 'performance', label: 'Performance' }
                ].map(metric => (
                  <label key={metric.id} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={selectedMetrics.includes(metric.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedMetrics([...selectedMetrics, metric.id]);
                        } else {
                          setSelectedMetrics(selectedMetrics.filter(m => m !== metric.id));
                        }
                      }}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-600">{metric.label}</span>
                  </label>
                ))}
              </div>
            </div>
            
            {/* Custom Date Range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Custom Date Range</label>
              <div className="space-y-2">
                <input
                  type="date"
                  value={customDateRange.start}
                  onChange={(e) => setCustomDateRange(prev => ({ ...prev, start: e.target.value }))}
                  className="w-full text-sm border border-gray-300 rounded-md px-3 py-2"
                  placeholder="Start Date"
                />
                <input
                  type="date"
                  value={customDateRange.end}
                  onChange={(e) => setCustomDateRange(prev => ({ ...prev, end: e.target.value }))}
                  className="w-full text-sm border border-gray-300 rounded-md px-3 py-2"
                  placeholder="End Date"
                />
              </div>
            </div>
            
            {/* Comparison Mode */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Analysis Mode</label>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={comparisonMode}
                    onChange={(e) => setComparisonMode(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-600">Comparison Mode</span>
                </label>
                <div className="text-xs text-gray-500">
                  Compare current period with previous period
                </div>
              </div>
            </div>
            
            {/* Quick Actions */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Quick Actions</label>
              <div className="space-y-2">
                <button
                  onClick={() => {
                    setSelectedMetrics(['fitness', 'energy', 'maintenance', 'performance']);
                    setCustomDateRange({ start: '', end: '' });
                    setComparisonMode(false);
                  }}
                  className="w-full text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-md transition-colors"
                >
                  Reset Filters
                </button>
                <button
                  onClick={fetchRealAnalyticsData}
                  className="w-full text-sm bg-blue-100 hover:bg-blue-200 text-blue-700 px-3 py-2 rounded-md transition-colors"
                  disabled={isLoadingReal}
                >
                  Apply Filters
                </button>
              </div>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Key Metrics */}
      {getVisibleMetricCards().length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-${Math.min(getVisibleMetricCards().length, 5)} gap-6`}
        >
          {getVisibleMetricCards().map((card, index) => (
            <div key={card.id}>
              {card.component}
            </div>
          ))}
        </motion.div>
      )}

      {/* Main Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Fitness Score Trend */}
        {isMetricSelected('fitness') && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Card title="Alstom Metropolis - Fitness Score Trends" className="h-80">
              <div className="relative">
                {comparisonMode && (
                  <div className="absolute top-2 right-2 bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-medium">
                    Comparison Mode
                  </div>
                )}
                <Line data={fitnessLineData} options={chartOptions} />
              </div>
            </Card>
          </motion.div>
        )}

        {/* Energy Consumption */}
        {isMetricSelected('energy') && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <Card title="Energy Consumption - Metro Line 1" className="h-80">
              <div className="relative">
                {comparisonMode && (
                  <div className="absolute top-2 right-2 bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-medium">
                    Comparison Mode
                  </div>
                )}
                <Bar data={energyBarData} options={chartOptions} />
              </div>
            </Card>
          </motion.div>
        )}
      </div>

      {/* Secondary Charts */}
      {(isMetricSelected('maintenance') || isMetricSelected('performance')) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Maintenance by Type */}
          {isMetricSelected('maintenance') && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              <Card title="Maintenance by Type - KMRL Fleet" className="h-64">
                <div className="relative">
                  {comparisonMode && (
                    <div className="absolute top-2 right-2 bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-medium">
                      Comparison Mode
                    </div>
                  )}
                  <Doughnut data={trainsetTypeData} options={chartOptions} />
                </div>
              </Card>
            </motion.div>
          )}

          {/* Top Trainsets by Mileage */}
          {isMetricSelected('performance') && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.5 }}
            >
              <Card title="Top Alstom Trainsets by Mileage" className="h-64">
                <div className="relative">
                  {comparisonMode && (
                    <div className="absolute top-2 right-2 bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-medium">
                      Comparison Mode
                    </div>
                  )}
                  <Bar data={routePerformanceData} options={chartOptions} />
                </div>
              </Card>
            </motion.div>
          )}
        </div>
      )}
      
      {/* Advanced Analytics Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.6 }}
        className="mt-8"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Advanced Analytics & Predictions</h2>
          <div className="flex items-center space-x-2">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
              🧠 AI Powered
            </span>
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Predictive Maintenance Forecast */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.7 }}
          >
            <Card title="Predictive Maintenance Forecast" className="h-80">
              <Line data={generatePredictiveMaintenanceData()} options={chartOptions} />
            </Card>
          </motion.div>
          
          {/* Correlation Analysis */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.8 }}
          >
            <Card title="Performance Correlation Matrix" className="h-80">
              <Scatter data={correlationData} options={correlationOptions} />
            </Card>
          </motion.div>
          
          {/* Anomaly Detection */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.9 }}
          >
            <Card title="Anomaly Detection - Energy Usage" className="h-80">
              <Line data={generateAnomalyDetectionData()} options={chartOptions} />
            </Card>
          </motion.div>
        </div>
        
        {/* Real-time Performance Gauges */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mt-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 1.0 }}
          >
            <Card title="System Health" className="h-64">
              <div className="flex items-center justify-center h-full">
                <div className="relative w-32 h-32">
                  <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 144 144">
                    <circle cx="72" cy="72" r="60" stroke="#E5E7EB" strokeWidth="8" fill="none" />
                    <circle 
                      cx="72" 
                      cy="72" 
                      r="60" 
                      stroke="#10B981" 
                      strokeWidth="8" 
                      fill="none"
                      strokeDasharray={`${(94 / 100) * 377} 377`}
                      className="transition-all duration-1000 ease-out"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">94%</div>
                      <div className="text-xs text-gray-500">Healthy</div>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 1.1 }}
          >
            <Card title="Energy Efficiency" className="h-64">
              <div className="flex items-center justify-center h-full">
                <div className="relative w-32 h-32">
                  <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 144 144">
                    <circle cx="72" cy="72" r="60" stroke="#E5E7EB" strokeWidth="8" fill="none" />
                    <circle 
                      cx="72" 
                      cy="72" 
                      r="60" 
                      stroke="#3B82F6" 
                      strokeWidth="8" 
                      fill="none"
                      strokeDasharray={`${(88 / 100) * 377} 377`}
                      className="transition-all duration-1000 ease-out"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">88%</div>
                      <div className="text-xs text-gray-500">Efficient</div>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 1.2 }}
          >
            <Card title="Service Reliability" className="h-64">
              <div className="flex items-center justify-center h-full">
                <div className="relative w-32 h-32">
                  <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 144 144">
                    <circle cx="72" cy="72" r="60" stroke="#E5E7EB" strokeWidth="8" fill="none" />
                    <circle 
                      cx="72" 
                      cy="72" 
                      r="60" 
                      stroke="#F59E0B" 
                      strokeWidth="8" 
                      fill="none"
                      strokeDasharray={`${(92 / 100) * 377} 377`}
                      className="transition-all duration-1000 ease-out"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-yellow-600">92%</div>
                      <div className="text-xs text-gray-500">Reliable</div>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 1.3 }}
          >
            <Card title="Passenger Satisfaction" className="h-64">
              <div className="flex items-center justify-center h-full">
                <div className="relative w-32 h-32">
                  <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 144 144">
                    <circle cx="72" cy="72" r="60" stroke="#E5E7EB" strokeWidth="8" fill="none" />
                    <circle 
                      cx="72" 
                      cy="72" 
                      r="60" 
                      stroke="#8B5CF6" 
                      strokeWidth="8" 
                      fill="none"
                      strokeDasharray={`${(89 / 100) * 377} 377`}
                      className="transition-all duration-1000 ease-out"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">89%</div>
                      <div className="text-xs text-gray-500">Satisfied</div>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>
        </div>
      </motion.div>

      {/* Insights and Recommendations */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.8 }}
        className="grid grid-cols-1 md:grid-cols-2 gap-6"
      >
        <Card title="Key Insights" className="bg-gradient-to-br from-blue-50 to-indigo-50">
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
              <div>
                <h4 className="text-sm font-semibold text-gray-900">
                  Improved Efficiency
                </h4>
                <p className="text-sm text-gray-600">
                  Alstom Metropolis fleet fitness scores improved by {realAnalyticsData?.insights?.fitnessImprovement || '7.3'}% this month, with {realAnalyticsData?.insights?.energyEfficiencyGain || '2.1'}% better energy efficiency.
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2 flex-shrink-0"></div>
              <div>
                <h4 className="text-sm font-semibold text-gray-900">
                  Peak Hour Challenges
                </h4>
                <p className="text-sm text-gray-600">
                  Kochi Metro Line 1 shows {realAnalyticsData?.insights?.peakHourDelays || '15'}% higher delays during peak hours (6-9 AM, 5-8 PM), suggesting need for schedule optimization.
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
              <div>
                <h4 className="text-sm font-semibold text-gray-900">
                  Seasonal Patterns
                </h4>
                <p className="text-sm text-gray-600">
                  Weekend passenger volumes are {realAnalyticsData?.insights?.weekendVolumeReduction || '35'}% lower, creating opportunity for maintenance scheduling optimization.
                </p>
              </div>
            </div>
          </div>
        </Card>

        <Card title="Recommendations" className="bg-gradient-to-br from-green-50 to-emerald-50">
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-green-600 rounded-full mt-2 flex-shrink-0"></div>
              <div>
                <h4 className="text-sm font-semibold text-gray-900">
                  Optimize Peak Hour Scheduling
                </h4>
                <p className="text-sm text-gray-600">
                  Implement AI-driven dynamic scheduling for Kochi Metro Line 1 to reduce peak hour delays by an estimated {realAnalyticsData?.recommendations?.delayReductionPotential || '20'}%.
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
              <div>
                <h4 className="text-sm font-semibold text-gray-900">
                  Predictive Maintenance
                </h4>
                <p className="text-sm text-gray-600">
                  Deploy predictive maintenance for {realAnalyticsData?.recommendations?.criticalTrainset || 'ts-kmrl-008'} trainsets showing {realAnalyticsData?.recommendations?.fitnessDecline || '8'}% fitness decline to prevent service disruptions.
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-purple-600 rounded-full mt-2 flex-shrink-0"></div>
              <div>
                <h4 className="text-sm font-semibold text-gray-900">
                  Energy Optimization
                </h4>
                <p className="text-sm text-gray-600">
                  Focus optimization efforts on {realAnalyticsData?.recommendations?.energyOptimizationTarget || 'ts-kmrl-015'} Alstom trainsets to achieve target {realAnalyticsData?.recommendations?.energyEfficiencyTarget || '96'}% energy efficiency baseline.
                </p>
              </div>
            </div>
          </div>
        </Card>
      </motion.div>
    </div>
  );
};

export default AnalyticsPage;
