import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  TruckIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ChartBarIcon,
  CogIcon,
} from '@heroicons/react/24/outline';
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
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '@/hooks/useAuth';
import Card from '@/components/ui/Card';
import MetricCard from '@/components/ui/MetricCard';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { analyticsApi } from '@/services/api';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Generate KMRL fallback data
  const generateKMRLDashboardData = () => ({
    trainsets: {
      total: 25,
      statusBreakdown: [
        { status: 'IN_SERVICE', _count: 18 },
        { status: 'MAINTENANCE', _count: 4 },
        { status: 'AVAILABLE', _count: 3 }
      ],
      availabilityRate: '88.0'
    },
    schedules: {
      total: 156,
      optimizationRuns: 12
    },
    jobCards: {
      completedThisMonth: 45,
      active: 23
    },
    fitness: {
      complianceRate: '88.0'
    },
    maintenance: {
      thisMonth: 28
    }
  });

  const generateKMRLOptimizationData = () => ({
    recent: [
      { id: '1', trainsetIds: ['ts-kmrl-001'], score: 94.2, createdAt: new Date().toISOString(), executionTime: 180000 },
      { id: '2', trainsetIds: ['ts-kmrl-005'], score: 91.8, createdAt: new Date(Date.now() - 86400000).toISOString(), executionTime: 165000 },
      { id: '3', trainsetIds: ['ts-kmrl-012'], score: 89.3, createdAt: new Date(Date.now() - 172800000).toISOString(), executionTime: 142000 },
      { id: '4', trainsetIds: ['ts-kmrl-008'], score: 92.7, createdAt: new Date(Date.now() - 259200000).toISOString(), executionTime: 201000 },
      { id: '5', trainsetIds: ['ts-kmrl-015'], score: 88.9, createdAt: new Date(Date.now() - 345600000).toISOString(), executionTime: 156000 }
    ],
    trends: [
      { date: new Date(Date.now() - 604800000 * 4).toISOString(), _avg: { score: 87.8 } },
      { date: new Date(Date.now() - 604800000 * 3).toISOString(), _avg: { score: 89.1 } },
      { date: new Date(Date.now() - 604800000 * 2).toISOString(), _avg: { score: 90.5 } },
      { date: new Date(Date.now() - 604800000).toISOString(), _avg: { score: 91.7 } }
    ]
  });

  const { data: dashboardResp, isLoading: loadingDashboard } = useQuery({
    queryKey: ['analytics', 'dashboard'],
    queryFn: analyticsApi.getDashboard,
    placeholderData: { success: true, data: generateKMRLDashboardData() },
  });

  const { data: optimizationResp, isLoading: loadingOptimization } = useQuery({
    queryKey: ['analytics', 'optimization'],
    queryFn: analyticsApi.getOptimization,
    placeholderData: { success: true, data: generateKMRLOptimizationData() },
  });

  const dashboardMetrics = useMemo(() => {
    const d = (dashboardResp as any)?.data || {};
    return {
      totalTrainsets: d.trainsets?.total ?? 0,
      activeTrainsets: d.trainsets?.statusBreakdown?.find((s: any) => s.status === 'IN_SERVICE')?._count ?? 0,
      scheduledSessions: d.schedules?.total ?? 0,
      completedSessions: d.jobCards?.completedThisMonth ?? 0,
      pendingSessions: d.jobCards?.active ?? 0,
      avgFitnessScore: Number(d.fitness?.complianceRate ?? 0),
      systemEfficiency: Number(d.trainsets?.availabilityRate ?? 0),
      uptime: 99.1,
    };
  }, [dashboardResp]);

  const recentOptimizations = useMemo(() => {
    const recent = (optimizationResp as any)?.data?.recent || [];
    return recent.slice(0, 5).map((o: any) => ({
      id: o.id,
      trainsetId: (o as any).trainsetIds?.[0] || 'N/A',
      status: 'completed',
      fitnessScore: o.score,
      timestamp: o.createdAt || o.date,
      duration: o.executionTime ? `${Math.round(o.executionTime / 60000)} mins` : null,
    }));
  }, [optimizationResp]);

  const chartOptions = useMemo(() => ({
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
    plugins: {
      legend: {
        position: 'bottom' as const,
        display: true
      },
      tooltip: {
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
        }
      },
      y: {
        display: true,
        grid: {
          display: true,
          drawBorder: false
        }
      }
    }
  }), []);

  const fitnessScoreData = useMemo(() => {
    const trends = (optimizationResp as any)?.data?.trends || [];
    const labels = trends.map((t: any) => new Date(t.date).toLocaleDateString());
    const data = trends.map((t: any) => Number(t._avg?.score ?? 0));
    return {
      labels: labels.length ? labels : ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
      datasets: [
        {
          label: 'Average Fitness Score',
          data: data.length ? data : [7.8, 8.1, 8.5, 8.7],
          borderColor: '#059669',
          backgroundColor: 'rgba(5, 150, 105, 0.1)',
          tension: 0.4,
        },
      ],
    };
  }, [optimizationResp]);

  const sessionStatusData = useMemo(() => {
    const d = (dashboardResp as any)?.data || {};
    const completed = Number(d.jobCards?.completedThisMonth ?? 0);
    const running = Number(d.schedules?.optimizationRuns ?? 0);
    const pending = Number(d.jobCards?.active ?? 0);
    const failed = 0;
    return {
      labels: ['Completed', 'Running', 'Pending', 'Failed'],
      datasets: [
        {
          data: [completed, running, pending, failed],
          backgroundColor: ['#059669', '#3B82F6', '#F59E0B', '#EF4444'],
          borderWidth: 0,
        },
      ],
    };
  }, [dashboardResp]);

  const utilizationData = useMemo(() => {
    const u = (dashboardResp as any)?.data?.maintenance?.thisMonth ?? 0;
    return {
      labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      datasets: [
        {
          label: 'Trainset Utilization (%)',
          data: [85, 92, 88, 94, 89, 76, 68],
          backgroundColor: '#3B82F6',
        },
      ],
    };
  }, [dashboardResp]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 bg-green-100';
      case 'running':
        return 'text-blue-600 bg-blue-100';
      case 'pending':
        return 'text-yellow-600 bg-yellow-100';
      case 'failed':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-2">
            Welcome back, {user ? `${user.firstName} ${user.lastName}` : 'Guest'}! Here's your system overview.
          </p>
        </motion.div>
      </div>

      {(loadingDashboard || loadingOptimization) && (
        <div className="flex items-center justify-center py-8">
          <LoadingSpinner />
        </div>
      )}

      {/* Metrics Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
      >
        <MetricCard
          title="Total Trainsets"
          value={dashboardMetrics.totalTrainsets}
          icon={TruckIcon}
          color="blue"
          trend={{ value: 12, direction: 'up' }}
        />
        <MetricCard
          title="Active Sessions"
          value={dashboardMetrics.activeTrainsets}
          icon={ClockIcon}
          color="green"
          trend={{ value: 8, direction: 'up' }}
        />
        <MetricCard
          title="Avg Fitness Score"
          value={dashboardMetrics.avgFitnessScore}
          icon={ChartBarIcon}
          color="purple"
          trend={{ value: 0.3, direction: 'up' }}
          suffix="/10"
        />
        <MetricCard
          title="System Efficiency"
          value={dashboardMetrics.systemEfficiency}
          icon={CogIcon}
          color="indigo"
          trend={{ value: 2.1, direction: 'up' }}
          suffix="%"
        />
      </motion.div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Fitness Score Trend */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Card title="Fitness Score Trend" className="h-80">
            <div style={{ height: '300px', position: 'relative' }}>
              <Line 
                key="fitness-chart-stable"
                data={fitnessScoreData} 
                options={chartOptions}
                redraw={false}
              />
            </div>
          </Card>
        </motion.div>

        {/* Session Status Distribution */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <Card title="Session Status Distribution" className="h-80">
            <div style={{ height: '300px', position: 'relative' }}>
              <Doughnut 
                key="session-status-chart-stable"
                data={sessionStatusData} 
                options={chartOptions}
                redraw={false}
              />
            </div>
          </Card>
        </motion.div>
      </div>

      {/* Utilization Chart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
      >
        <Card title="Weekly Trainset Utilization" className="h-80">
          <div style={{ height: '300px', position: 'relative' }}>
            <Bar 
              key="utilization-chart-stable"
              data={utilizationData} 
              options={chartOptions}
              redraw={false}
            />
          </div>
        </Card>
      </motion.div>

      {/* Recent Activity */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.5 }}
      >
        <Card title="Recent Optimizations">
          <div className="space-y-4">
            {recentOptimizations.map((optimization: any, index: number) => (
              <motion.div
                key={optimization.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center space-x-4">
                  <div className="flex-shrink-0">
                    <TruckIcon className="h-8 w-8 text-kmrl-600" />
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">
                      Optimization {optimization.id}
                    </h4>
                    <p className="text-sm text-gray-500">
                      {optimization.timestamp ? new Date(optimization.timestamp).toLocaleString() : '—'}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-4">
                  {optimization.fitnessScore && (
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">
                        Score: {optimization.fitnessScore.toFixed ? optimization.fitnessScore.toFixed(2) : optimization.fitnessScore}/10
                      </p>
                    </div>
                  )}
                  
                  {optimization.duration && (
                    <div className="text-right">
                      <p className="text-sm text-gray-500">
                        Duration: {optimization.duration}
                      </p>
                    </div>
                  )}
                  
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor('completed')}`}>
                    Completed
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
          
          <div className="mt-6 text-center">
            <button className="btn-secondary" onClick={() => navigate('/optimization')}>
              View All Optimizations
            </button>
          </div>
        </Card>
      </motion.div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.6 }}
      >
        <Card title="Quick Actions">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <button className="btn-primary flex items-center justify-center" onClick={() => navigate('/optimization')}>
              <TruckIcon className="h-5 w-5 mr-2" />
              New Optimization
            </button>
            <button className="btn-secondary flex items-center justify-center" onClick={() => navigate('/analytics')}>
              <ChartBarIcon className="h-5 w-5 mr-2" />
              View Analytics
            </button>
            <button className="btn-secondary flex items-center justify-center" onClick={() => navigate('/schedules')}>
              <ClockIcon className="h-5 w-5 mr-2" />
              Schedule Session
            </button>
            <button className="btn-secondary flex items-center justify-center" onClick={() => navigate('/settings')}>
              <CogIcon className="h-5 w-5 mr-2" />
              System Settings
            </button>
          </div>
        </Card>
      </motion.div>
    </div>
  );
};

export default DashboardPage;
