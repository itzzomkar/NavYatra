import { api } from './api';

// Types for analytics data
export interface DashboardStats {
  totalOptimizations: number;
  completedOptimizations: number;
  failedOptimizations: number;
  successRate: number;
  avgFitnessScore: number;
  avgImprovementPercentage: number;
  totalSchedulesGenerated: number;
  avgSchedulesPerOptimization: number;
  avgExecutionTimeMinutes: number;
  totalTrainsetsOptimized: number;
  avgTrainsetsPerOptimization: number;
}

export interface AlgorithmPerformance {
  algorithm: string;
  count: number;
  avgFitnessScore: number;
  avgImprovement: number;
  avgExecutionTimeMinutes: number;
  successRate: number;
}

export interface TimeSeriesData {
  _id: string;
  count: number;
  avgFitnessScore: number;
  completedCount: number;
}

export interface CostSavingsData {
  totalCostSavings: number;
  avgCostSavingsPerOptimization: number;
  maxCostSavings: number;
  minCostSavings: number;
}

export interface EnergyEfficiencyData {
  totalEnergyConsumption: number;
  avgEnergyConsumption: number;
  totalDistance: number;
  avgEnergyPerKm: number;
}

export interface OptimizationInsight {
  type: 'success' | 'warning' | 'info' | 'error';
  title: string;
  message: string;
  priority: 'high' | 'medium' | 'low';
}

export interface DashboardData {
  period: string;
  algorithm: string;
  dateRange: {
    startDate: string;
    endDate: string;
  };
  overallStats: DashboardStats;
  algorithmPerformance: AlgorithmPerformance[];
  timeSeriesData: TimeSeriesData[];
  costSavingsData: CostSavingsData;
  energyEfficiencyData: EnergyEfficiencyData;
  topPerformingOptimizations: any[];
  insights: OptimizationInsight[];
}

export interface CostBenefitAnalysis {
  category: string;
  totalOptimizations: number;
  avgFitnessScore: number;
  avgImprovementPercentage: number;
  totalCostSavings: number;
  avgCostSavingsPerOptimization: number;
  totalEnergyConsumption: number;
  avgEnergyPerOptimization: number;
  avgExecutionTimeMinutes: number;
  successRatePercentage: number;
  roi: number;
}

export interface CostBenefitData {
  period: string;
  groupBy: string;
  costBenefitAnalysis: CostBenefitAnalysis[];
  summary: {
    totalCategories: number;
    bestPerforming: string;
    totalOptimizations: number;
    totalCostSavings: number;
  };
}

export interface ResourceUtilizationData {
  period: string;
  trainsetUtilization: any[];
  algorithmResourceUsage: any[];
  timeBasedUtilization: any[];
  efficiencyMetrics: any[];
  insights: {
    type: string;
    message: string;
    recommendation?: string;
  }[];
}

export interface PredictiveData {
  type: string;
  horizon: string;
  predictions: {
    expectedFitnessScore?: number;
    expectedImprovement?: number;
    expectedSavings?: number;
    expectedEfficiency?: number;
    expectedOptimizations?: number;
    confidence: number;
    trend: 'improving' | 'declining' | 'stable' | 'increasing' | 'decreasing';
  };
  recommendations: {
    type: string;
    message: string;
    action?: string;
  }[];
  confidence: number;
  lastUpdated: string;
}

export interface OptimizationPerformanceDetails {
  basic: {
    optimizationId: string;
    algorithm: string;
    status: string;
    fitnessScore: number;
    improvementPercentage: number;
    executionTime: number;
    trainsetCount: number;
  };
  algorithmDetails: {
    iterations: number;
    convergence: number;
    parameters: any;
  };
  results: {
    schedulesGenerated: number;
    metrics: any;
    generatedSchedules: any[];
  };
  efficiency: {
    energyEfficiency: any;
    costEfficiency: any;
    resourceUtilization: any;
  };
  comparison: {
    fitnessScore: {
      current: number;
      average: number;
      performance: string;
    };
    improvement: {
      current: number;
      average: number;
      performance: string;
    };
    executionTime: {
      current: number;
      average: number;
      performance: string;
    };
  };
  recommendations: {
    type: string;
    title: string;
    description: string;
    priority: string;
  }[];
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

class OptimizationAnalyticsService {
  private baseURL = '/api/optimizations/analytics';

  // Get comprehensive dashboard analytics
  async getDashboardAnalytics(
    period: '7d' | '30d' | '90d' | '1y' = '30d',
    algorithm: 'all' | 'GENETIC' | 'SIMULATED_ANNEALING' | 'LOCAL_SEARCH' | 'HYBRID' = 'all'
  ): Promise<DashboardData> {
    try {
      const response = await api.get<ApiResponse<DashboardData>>(`${this.baseURL}/dashboard`, {
        params: { period, algorithm }
      });

      if (!response.data?.success) {
        throw new Error(response.data?.message || 'Failed to fetch dashboard analytics');
      }

      return response.data?.data;
    } catch (error: any) {
      console.error('Error fetching dashboard analytics:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to fetch dashboard analytics');
    }
  }

  // Get optimization performance details for specific optimization
  async getOptimizationPerformanceDetails(optimizationId: string): Promise<OptimizationPerformanceDetails> {
    try {
      const response = await api.get<ApiResponse<OptimizationPerformanceDetails>>(
        `${this.baseURL}/performance/${optimizationId}`
      );

      if (!response.data?.success) {
        throw new Error(response.data?.message || 'Failed to fetch performance details');
      }

      return response.data?.data;
    } catch (error: any) {
      console.error('Error fetching optimization performance details:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to fetch performance details');
    }
  }

  // Get cost-benefit analysis
  async getCostBenefitAnalysis(
    period: '7d' | '30d' | '90d' | '1y' = '30d',
    groupBy: 'algorithm' | 'shift' | 'trainsetCount' = 'algorithm'
  ): Promise<CostBenefitData> {
    try {
      const response = await api.get<ApiResponse<CostBenefitData>>(`${this.baseURL}/cost-benefit`, {
        params: { period, groupBy }
      });

      if (!response.data?.success) {
        throw new Error(response.data?.message || 'Failed to fetch cost-benefit analysis');
      }

      return response.data?.data;
    } catch (error: any) {
      console.error('Error fetching cost-benefit analysis:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to fetch cost-benefit analysis');
    }
  }

  // Get resource utilization analytics
  async getResourceUtilizationAnalytics(
    period: '7d' | '30d' | '90d' | '1y' = '30d'
  ): Promise<ResourceUtilizationData> {
    try {
      const response = await api.get<ApiResponse<ResourceUtilizationData>>(
        `${this.baseURL}/resource-utilization`,
        { params: { period } }
      );

      if (!response.data?.success) {
        throw new Error(response.data?.message || 'Failed to fetch resource utilization analytics');
      }

      return response.data?.data;
    } catch (error: any) {
      console.error('Error fetching resource utilization analytics:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to fetch resource utilization analytics');
    }
  }

  // Get predictive analytics
  async getPredictiveAnalytics(
    type: 'performance' | 'cost' | 'energy' | 'demand' = 'performance',
    horizon: '7d' | '14d' | '30d' | '90d' = '7d'
  ): Promise<PredictiveData> {
    try {
      const response = await api.get<ApiResponse<PredictiveData>>(`${this.baseURL}/predictive`, {
        params: { type, horizon }
      });

      if (!response.data?.success) {
        throw new Error(response.data?.message || 'Failed to fetch predictive analytics');
      }

      return response.data?.data;
    } catch (error: any) {
      console.error('Error fetching predictive analytics:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to fetch predictive analytics');
    }
  }

  // Export optimization report
  async exportOptimizationReport(
    format: 'json' | 'csv' | 'pdf' = 'json',
    period: '7d' | '30d' | '90d' | '1y' = '30d',
    includeDetails = false
  ): Promise<any> {
    try {
      const response = await api.get<any>(`${this.baseURL}/export`, {
        params: { format, period, includeDetails }
      });

      if (format === 'csv' || format === 'pdf') {
        // Handle file download
        const blob = new Blob([response.data || ''], {
          type: format === 'csv' ? 'text/csv' : 'application/pdf'
        });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `optimization_report_${period}.${format}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        return { success: true, message: 'Report downloaded successfully' };
      }

      if (!response.data?.success) {
        throw new Error(response.data?.message || 'Failed to export report');
      }

      return response.data?.data;
    } catch (error: any) {
      console.error('Error exporting optimization report:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to export report');
    }
  }

  // Utility methods for data processing and visualization

  // Calculate performance trends
  calculatePerformanceTrends(timeSeriesData: TimeSeriesData[]): {
    trend: 'improving' | 'declining' | 'stable';
    trendPercentage: number;
  } {
    if (timeSeriesData.length < 2) {
      return { trend: 'stable', trendPercentage: 0 };
    }

    const sortedData = timeSeriesData.sort((a, b) => a._id.localeCompare(b._id));
    const recent = sortedData.slice(-3); // Last 3 data points
    const earlier = sortedData.slice(0, 3); // First 3 data points

    if (recent.length === 0 || earlier.length === 0) {
      return { trend: 'stable', trendPercentage: 0 };
    }

    const recentAvg = recent.reduce((sum, item) => sum + (item.avgFitnessScore || 0), 0) / recent.length;
    const earlierAvg = earlier.reduce((sum, item) => sum + (item.avgFitnessScore || 0), 0) / earlier.length;

    const change = ((recentAvg - earlierAvg) / earlierAvg) * 100;

    if (Math.abs(change) < 5) {
      return { trend: 'stable', trendPercentage: change };
    } else if (change > 0) {
      return { trend: 'improving', trendPercentage: change };
    } else {
      return { trend: 'declining', trendPercentage: Math.abs(change) };
    }
  }

  // Format currency values
  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  }

  // Format percentage values
  formatPercentage(value: number): string {
    return `${value.toFixed(1)}%`;
  }

  // Format duration in minutes
  formatDuration(minutes: number): string {
    if (minutes < 1) {
      return `${Math.round(minutes * 60)}s`;
    } else if (minutes < 60) {
      return `${Math.round(minutes)}m`;
    } else {
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = Math.round(minutes % 60);
      return `${hours}h ${remainingMinutes}m`;
    }
  }

  // Get performance color based on value
  getPerformanceColor(value: number, type: 'fitness' | 'success_rate' | 'efficiency'): string {
    switch (type) {
      case 'fitness':
        if (value >= 8) return '#10B981'; // green
        if (value >= 6) return '#F59E0B'; // amber
        return '#EF4444'; // red
      case 'success_rate':
        if (value >= 90) return '#10B981';
        if (value >= 70) return '#F59E0B';
        return '#EF4444';
      case 'efficiency':
        if (value >= 80) return '#10B981';
        if (value >= 60) return '#F59E0B';
        return '#EF4444';
      default:
        return '#6B7280'; // gray
    }
  }

  // Generate chart data for visualization libraries
  generateChartData(timeSeriesData: TimeSeriesData[], metric: 'count' | 'avgFitnessScore' | 'completedCount') {
    return {
      labels: timeSeriesData.map(item => {
        // Format date labels
        const date = new Date(item._id);
        return date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
      }),
      datasets: [{
        label: this.getMetricLabel(metric),
        data: timeSeriesData.map(item => item[metric] || 0),
        borderColor: '#3B82F6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4,
      }]
    };
  }

  private getMetricLabel(metric: string): string {
    switch (metric) {
      case 'count': return 'Total Optimizations';
      case 'avgFitnessScore': return 'Average Fitness Score';
      case 'completedCount': return 'Completed Optimizations';
      default: return metric;
    }
  }

  // Get algorithm performance summary
  getAlgorithmSummary(algorithmPerformance: AlgorithmPerformance[]) {
    if (algorithmPerformance.length === 0) {
      return { bestAlgorithm: 'N/A', worstAlgorithm: 'N/A', averageScore: 0 };
    }

    const sorted = [...algorithmPerformance].sort((a, b) => b.avgFitnessScore - a.avgFitnessScore);
    const averageScore = algorithmPerformance.reduce((sum, alg) => sum + alg.avgFitnessScore, 0) / algorithmPerformance.length;

    return {
      bestAlgorithm: sorted[0].algorithm,
      worstAlgorithm: sorted[sorted.length - 1].algorithm,
      averageScore: parseFloat(averageScore.toFixed(2))
    };
  }

  // Validate period parameter
  isValidPeriod(period: string): period is '7d' | '30d' | '90d' | '1y' {
    return ['7d', '30d', '90d', '1y'].includes(period);
  }

  // Validate algorithm parameter
  isValidAlgorithm(algorithm: string): algorithm is 'all' | 'GENETIC' | 'SIMULATED_ANNEALING' | 'LOCAL_SEARCH' | 'HYBRID' {
    return ['all', 'GENETIC', 'SIMULATED_ANNEALING', 'LOCAL_SEARCH', 'HYBRID'].includes(algorithm);
  }
}

// Export singleton instance
const optimizationAnalyticsService = new OptimizationAnalyticsService();
export default optimizationAnalyticsService;