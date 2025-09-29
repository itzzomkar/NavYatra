import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  ChartBarIcon,
  ArrowTrendingUpIcon as TrendingUpIcon,
  ArrowTrendingDownIcon as TrendingDownIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  ClockIcon,
  CurrencyDollarIcon,
  WrenchScrewdriverIcon,
  BoltIcon,
  ShieldCheckIcon,
  CheckCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  RadialBarChart,
  RadialBar,
} from 'recharts';
import Card from '@/components/ui/Card';

interface MaintenancePrediction {
  trainsetId: string;
  trainsetNumber: string;
  component: string;
  failureProbability: number;
  predictedFailureDate: string;
  recommendedActionDate: string;
  estimatedCost: number;
  criticality: 'low' | 'medium' | 'high' | 'critical';
  currentCondition: number; // 0-100
  remaningLifespan: number; // days
}

interface PerformanceMetric {
  date: string;
  punctuality: number;
  energyEfficiency: number;
  costPerKm: number;
  passengerSatisfaction: number;
  maintenanceScore: number;
}

interface CostOptimization {
  category: string;
  currentCost: number;
  optimizedCost: number;
  savingsPotential: number;
  implementation: string;
}

interface PredictiveAnalyticsProps {
  className?: string;
}

const PredictiveAnalytics: React.FC<PredictiveAnalyticsProps> = ({ className = '' }) => {
  const [activeTab, setActiveTab] = useState<'predictions' | 'performance' | 'optimization' | 'insights'>('predictions');
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d');
  const [selectedTrainset, setSelectedTrainset] = useState<string | null>(null);

  // Mock data - in real implementation, this would come from AI/ML backend
  const maintenancePredictions: MaintenancePrediction[] = [
    {
      trainsetId: 'ts-kmrl-001',
      trainsetNumber: 'KMRL-001',
      component: 'Brake System',
      failureProbability: 87,
      predictedFailureDate: '2024-10-15',
      recommendedActionDate: '2024-10-08',
      estimatedCost: 45000,
      criticality: 'high',
      currentCondition: 23,
      remaningLifespan: 12,
    },
    {
      trainsetId: 'ts-kmrl-003',
      trainsetNumber: 'KMRL-003',
      component: 'Door Controller',
      failureProbability: 64,
      predictedFailureDate: '2024-11-02',
      recommendedActionDate: '2024-10-25',
      estimatedCost: 28000,
      criticality: 'medium',
      currentCondition: 45,
      remaningLifespan: 28,
    },
    {
      trainsetId: 'ts-kmrl-007',
      trainsetNumber: 'KMRL-007',
      component: 'Air Conditioning',
      failureProbability: 92,
      predictedFailureDate: '2024-09-28',
      recommendedActionDate: '2024-09-25',
      estimatedCost: 35000,
      criticality: 'critical',
      currentCondition: 18,
      remaningLifespan: 5,
    },
  ];

  const performanceData: PerformanceMetric[] = Array.from({ length: 30 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (29 - i));
    return {
      date: date.toISOString().split('T')[0],
      punctuality: 95 + Math.random() * 4,
      energyEfficiency: 88 + Math.random() * 8,
      costPerKm: 12 + Math.random() * 3,
      passengerSatisfaction: 85 + Math.random() * 10,
      maintenanceScore: 80 + Math.random() * 15,
    };
  });

  const costOptimizations: CostOptimization[] = [
    {
      category: 'Preventive Maintenance',
      currentCost: 2800000,
      optimizedCost: 2240000,
      savingsPotential: 560000,
      implementation: 'AI-driven scheduling and predictive maintenance',
    },
    {
      category: 'Energy Consumption',
      currentCost: 1650000,
      optimizedCost: 1400000,
      savingsPotential: 250000,
      implementation: 'Smart route optimization and regenerative braking',
    },
    {
      category: 'Spare Parts Inventory',
      currentCost: 890000,
      optimizedCost: 680000,
      savingsPotential: 210000,
      implementation: 'Demand forecasting and JIT procurement',
    },
  ];

  const getCriticalityColor = (criticality: string) => {
    switch (criticality) {
      case 'low': return 'text-green-600 bg-green-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'high': return 'text-orange-600 bg-orange-100';
      case 'critical': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const totalSavingsPotential = costOptimizations.reduce((sum, item) => sum + item.savingsPotential, 0);

  return (
    <div className={className}>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Predictive Analytics</h2>
            <p className="text-gray-600 mt-1">AI-powered insights for fleet optimization</p>
          </div>
          <div className="flex items-center space-x-3">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as any)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
              <option value="1y">Last year</option>
            </select>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Cost Savings Potential</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(totalSavingsPotential)}</p>
                <p className="text-sm text-gray-500">Next 12 months</p>
              </div>
              <CurrencyDollarIcon className="h-12 w-12 text-green-600 opacity-20" />
            </div>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Predictions Active</p>
                <p className="text-2xl font-bold text-blue-600">{maintenancePredictions.length}</p>
                <p className="text-sm text-gray-500">High accuracy</p>
              </div>
              <ChartBarIcon className="h-12 w-12 text-blue-600 opacity-20" />
            </div>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Fleet Efficiency</p>
                <div className="flex items-center space-x-1">
                  <p className="text-2xl font-bold text-purple-600">94.2%</p>
                  <TrendingUpIcon className="h-5 w-5 text-green-500" />
                </div>
                <p className="text-sm text-gray-500">+2.1% vs last month</p>
              </div>
              <BoltIcon className="h-12 w-12 text-purple-600 opacity-20" />
            </div>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Punctuality Score</p>
                <div className="flex items-center space-x-1">
                  <p className="text-2xl font-bold text-emerald-600">99.1%</p>
                  <CheckCircleIcon className="h-5 w-5 text-green-500" />
                </div>
                <p className="text-sm text-gray-500">Above SLA target</p>
              </div>
              <ClockIcon className="h-12 w-12 text-emerald-600 opacity-20" />
            </div>
          </Card>
        </motion.div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex space-x-8">
          {[
            { key: 'predictions', label: 'Maintenance Predictions', icon: WrenchScrewdriverIcon },
            { key: 'performance', label: 'Performance Trends', icon: TrendingUpIcon },
            { key: 'optimization', label: 'Cost Optimization', icon: CurrencyDollarIcon },
            { key: 'insights', label: 'AI Insights', icon: InformationCircleIcon },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key as any)}
              className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 transition-colors ${
                activeTab === key
                  ? 'border-purple-500 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'predictions' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Maintenance Predictions</h3>
            <div className="space-y-4">
              {maintenancePredictions.map((prediction, index) => (
                <motion.div
                  key={prediction.trainsetId}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-gray-100 rounded-lg">
                        <WrenchScrewdriverIcon className="h-6 w-6 text-gray-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">
                          {prediction.trainsetNumber} - {prediction.component}
                        </h4>
                        <p className="text-sm text-gray-600">
                          Predicted failure: {new Date(prediction.predictedFailureDate).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${getCriticalityColor(prediction.criticality)}`}>
                        {prediction.criticality.toUpperCase()}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div>
                      <p className="text-xs text-gray-500">Failure Probability</p>
                      <div className="flex items-center space-x-2">
                        <div className="text-lg font-bold text-red-600">{prediction.failureProbability}%</div>
                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-red-500 h-2 rounded-full"
                            style={{ width: `${prediction.failureProbability}%` }}
                          />
                        </div>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Current Condition</p>
                      <div className="flex items-center space-x-2">
                        <div className="text-lg font-bold text-yellow-600">{prediction.currentCondition}%</div>
                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-yellow-500 h-2 rounded-full"
                            style={{ width: `${prediction.currentCondition}%` }}
                          />
                        </div>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Remaining Lifespan</p>
                      <div className="text-lg font-bold text-blue-600">{prediction.remaningLifespan} days</div>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Estimated Cost</p>
                      <div className="text-lg font-bold text-green-600">{formatCurrency(prediction.estimatedCost)}</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                    <div className="text-sm text-gray-600">
                      Recommended action by: {new Date(prediction.recommendedActionDate).toLocaleDateString()}
                    </div>
                    <div className="flex space-x-2">
                      <button className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors">
                        Schedule Maintenance
                      </button>
                      <button className="px-3 py-1 text-sm border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors">
                        View Details
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </Card>
        </motion.div>
      )}

      {activeTab === 'performance' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Trends</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={performanceData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tickFormatter={(value) => new Date(value).toLocaleDateString()} />
                  <YAxis />
                  <Tooltip
                    labelFormatter={(value) => new Date(value).toLocaleDateString()}
                    formatter={(value: number, name: string) => [`${value.toFixed(1)}%`, name]}
                  />
                  <Line type="monotone" dataKey="punctuality" stroke="#10b981" strokeWidth={2} />
                  <Line type="monotone" dataKey="energyEfficiency" stroke="#3b82f6" strokeWidth={2} />
                  <Line type="monotone" dataKey="passengerSatisfaction" stroke="#8b5cf6" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="p-6">
              <h4 className="font-semibold text-gray-900 mb-4">Fleet Efficiency Distribution</h4>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Excellent (90%+)', value: 68, fill: '#10b981' },
                        { name: 'Good (80-89%)', value: 24, fill: '#3b82f6' },
                        { name: 'Average (70-79%)', value: 6, fill: '#f59e0b' },
                        { name: 'Poor (<70%)', value: 2, fill: '#ef4444' },
                      ]}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}%`}
                    >
                      {[
                        { name: 'Excellent (90%+)', value: 68, fill: '#10b981' },
                        { name: 'Good (80-89%)', value: 24, fill: '#3b82f6' },
                        { name: 'Average (70-79%)', value: 6, fill: '#f59e0b' },
                        { name: 'Poor (<70%)', value: 2, fill: '#ef4444' },
                      ].map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card className="p-6">
              <h4 className="font-semibold text-gray-900 mb-4">Key Performance Indicators</h4>
              <div className="space-y-4">
                {[
                  { name: 'Punctuality', current: 99.1, target: 99.5, color: '#10b981' },
                  { name: 'Energy Efficiency', current: 94.2, target: 95.0, color: '#3b82f6' },
                  { name: 'Fleet Availability', current: 96.8, target: 98.0, color: '#8b5cf6' },
                  { name: 'Passenger Satisfaction', current: 87.5, target: 90.0, color: '#f59e0b' },
                ].map((kpi, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-900">{kpi.name}</span>
                      <div className="flex items-center space-x-2">
                        <span className="text-lg font-bold" style={{ color: kpi.color }}>
                          {kpi.current}%
                        </span>
                        <span className="text-sm text-gray-500">/ {kpi.target}%</span>
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="h-2 rounded-full transition-all duration-500"
                        style={{
                          width: `${(kpi.current / kpi.target) * 100}%`,
                          backgroundColor: kpi.color,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </motion.div>
      )}

      {activeTab === 'optimization' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Cost Optimization Opportunities</h3>
              <div className="text-right">
                <p className="text-sm text-gray-600">Total Potential Savings</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(totalSavingsPotential)}</p>
              </div>
            </div>

            <div className="space-y-4">
              {costOptimizations.map((optimization, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="border border-gray-200 rounded-lg p-4"
                >
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-gray-900">{optimization.category}</h4>
                    <div className="text-right">
                      <p className="text-lg font-bold text-green-600">
                        {formatCurrency(optimization.savingsPotential)}
                      </p>
                      <p className="text-sm text-gray-600">potential savings</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                    <div>
                      <p className="text-xs text-gray-500">Current Cost</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {formatCurrency(optimization.currentCost)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Optimized Cost</p>
                      <p className="text-lg font-semibold text-blue-600">
                        {formatCurrency(optimization.optimizedCost)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Reduction</p>
                      <p className="text-lg font-semibold text-green-600">
                        {((optimization.savingsPotential / optimization.currentCost) * 100).toFixed(1)}%
                      </p>
                    </div>
                  </div>

                  <p className="text-sm text-gray-600 mb-3">{optimization.implementation}</p>

                  <button className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium">
                    Implement Optimization
                  </button>
                </motion.div>
              ))}
            </div>
          </Card>
        </motion.div>
      )}

      {activeTab === 'insights' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <InformationCircleIcon className="h-6 w-6 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">AI Insights</h3>
              </div>
              <div className="space-y-4">
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h4 className="font-semibold text-blue-900 mb-2">Peak Performance Pattern</h4>
                  <p className="text-blue-800 text-sm">
                    Analysis shows 15% higher efficiency during 10-14:00 slot. Recommend scheduling
                    energy-intensive maintenance during off-peak hours to optimize overall performance.
                  </p>
                </div>
                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <h4 className="font-semibold text-green-900 mb-2">Predictive Success Rate</h4>
                  <p className="text-green-800 text-sm">
                    Our AI model has achieved 94.7% accuracy in failure prediction over the last 6 months,
                    preventing 12 potential breakdowns and saving ₹2.3 crores in emergency repairs.
                  </p>
                </div>
                <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                  <h4 className="font-semibold text-yellow-900 mb-2">Optimization Opportunity</h4>
                  <p className="text-yellow-800 text-sm">
                    Identified 23% energy savings potential through AI-optimized route scheduling and
                    regenerative braking pattern improvements across the fleet.
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <ChartBarIcon className="h-6 w-6 text-purple-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Trend Analysis</h3>
              </div>
              <div className="space-y-4">
                {[
                  {
                    metric: 'Overall Fleet Performance',
                    trend: 'up',
                    value: '+8.2%',
                    description: 'Consistent improvement over last quarter',
                  },
                  {
                    metric: 'Maintenance Cost Efficiency',
                    trend: 'up',
                    value: '+12.5%',
                    description: 'Predictive maintenance reducing costs',
                  },
                  {
                    metric: 'Energy Consumption',
                    trend: 'down',
                    value: '-6.8%',
                    description: 'Optimization algorithms showing impact',
                  },
                  {
                    metric: 'Passenger Satisfaction',
                    trend: 'up',
                    value: '+4.3%',
                    description: 'Improved punctuality and service quality',
                  },
                ].map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                    <div className="flex items-center space-x-3">
                      {item.trend === 'up' ? (
                        <TrendingUpIcon className="h-5 w-5 text-green-500" />
                      ) : (
                        <TrendingDownIcon className="h-5 w-5 text-green-500" />
                      )}
                      <div>
                        <p className="font-medium text-gray-900">{item.metric}</p>
                        <p className="text-sm text-gray-600">{item.description}</p>
                      </div>
                    </div>
                    <div className="text-lg font-bold text-green-600">{item.value}</div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default PredictiveAnalytics;