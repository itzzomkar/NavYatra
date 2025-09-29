import React, { useState, useEffect } from 'react';
import { 
  BoltIcon, 
  ClockIcon, 
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ArrowPathIcon,
  ChartBarIcon,
  CpuChipIcon,
  BeakerIcon
} from '@heroicons/react/24/outline';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

interface InductionDecision {
  trainsetId: string;
  trainsetNumber: string;
  decision: 'IN_SERVICE' | 'STANDBY' | 'MAINTENANCE';
  score: number;
  reasons: string[];
  conflicts: string[];
  shuntingMoves: number;
}

interface OptimizationResult {
  timestamp: string;
  processingTime: number;
  decisions: InductionDecision[];
  summary: {
    inService: number;
    standby: number;
    maintenance: number;
    totalShuntingMoves: number;
    conflictsDetected: number;
  };
  recommendations: string[];
}

const OptimizationDashboard: React.FC = () => {
  const [optimizationResult, setOptimizationResult] = useState<OptimizationResult | null>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [metrics, setMetrics] = useState<any>(null);
  const [selectedTab, setSelectedTab] = useState<'decisions' | 'analytics' | 'simulator'>('decisions');

  useEffect(() => {
    fetchLastOptimization();
    fetchMetrics();
  }, []);

const fetchLastOptimization = async () => {
    try {
      const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';
      const response = await fetch(`${API_BASE}/api/optimization/last`);
      const data = await response.json();
      if (data.success) {
        setOptimizationResult(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch optimization:', error);
    }
  };

const fetchMetrics = async () => {
    try {
      const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';
      const response = await fetch(`${API_BASE}/api/optimization/metrics`);
      const data = await response.json();
      if (data.success) {
        setMetrics(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch metrics:', error);
    }
  };

const runOptimization = async () => {
    setIsOptimizing(true);
    const toastId = toast.loading('Running AI optimization...');
    
    try {
      const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';
      const response = await fetch(`${API_BASE}/api/optimization/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await response.json();
      
      if (data.success) {
        setOptimizationResult(data.data);
        toast.success(`Optimization complete in ${data.data.processingTime}ms`, {
          id: toastId,
          duration: 3000
        });
      } else {
        toast.error('Optimization failed', { id: toastId });
      }
    } catch (error) {
      toast.error('Failed to run optimization', { id: toastId });
    } finally {
      setIsOptimizing(false);
    }
  };

  const getDecisionColor = (decision: string) => {
    switch (decision) {
      case 'IN_SERVICE': return 'bg-green-100 text-green-800 border-green-200';
      case 'MAINTENANCE': return 'bg-red-100 text-red-800 border-red-200';
      case 'STANDBY': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getScoreColor = (score: number) => {
    if (score > 0.7) return 'text-green-600';
    if (score > 0.4) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <CpuChipIcon className="h-8 w-8 text-blue-600" />
              AI-Driven Train Induction Optimizer
            </h1>
            <p className="text-gray-600 mt-2">
              Nightly scheduling optimization for 25 trainsets (21:00 - 23:00 IST)
            </p>
          </div>
          <button
            onClick={runOptimization}
            disabled={isOptimizing}
            className={`px-6 py-3 rounded-lg font-semibold flex items-center gap-2 transition-all ${
              isOptimizing 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl'
            }`}
          >
            {isOptimizing ? (
              <>
                <ArrowPathIcon className="h-5 w-5 animate-spin" />
                Optimizing...
              </>
            ) : (
              <>
                <BoltIcon className="h-5 w-5" />
                Run Optimization
              </>
            )}
          </button>
        </div>

        {/* Metrics Bar */}
        {metrics && (
          <div className="grid grid-cols-6 gap-4 mt-6">
            <div className="bg-white rounded-lg p-4 shadow">
              <p className="text-xs text-gray-500">Avg Processing Time</p>
              <p className="text-2xl font-bold text-blue-600">{metrics.avgOptimizationTime}ms</p>
            </div>
            <div className="bg-white rounded-lg p-4 shadow">
              <p className="text-xs text-gray-500">Energy Saved Daily</p>
              <p className="text-2xl font-bold text-green-600">{metrics.dailyEnergyReduction} kWh</p>
            </div>
            <div className="bg-white rounded-lg p-4 shadow">
              <p className="text-xs text-gray-500">Punctuality Rate</p>
              <p className="text-2xl font-bold text-purple-600">{metrics.punctualityRate}%</p>
            </div>
            <div className="bg-white rounded-lg p-4 shadow">
              <p className="text-xs text-gray-500">Maintenance Cost ↓</p>
              <p className="text-2xl font-bold text-orange-600">{metrics.maintenanceCostReduction}%</p>
            </div>
            <div className="bg-white rounded-lg p-4 shadow">
              <p className="text-xs text-gray-500">Branding Compliance</p>
              <p className="text-2xl font-bold text-indigo-600">{metrics.brandingCompliance}%</p>
            </div>
            <div className="bg-white rounded-lg p-4 shadow">
              <p className="text-xs text-gray-500">Shunting Reduced</p>
              <p className="text-2xl font-bold text-teal-600">{metrics.shuntingReduction}%</p>
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-4 mb-6">
        <button
          onClick={() => setSelectedTab('decisions')}
          className={`px-4 py-2 rounded-lg font-medium transition-all ${
            selectedTab === 'decisions' 
              ? 'bg-blue-600 text-white' 
              : 'bg-white text-gray-600 hover:bg-gray-50'
          }`}
        >
          <div className="flex items-center gap-2">
            <CheckCircleIcon className="h-5 w-5" />
            Induction Decisions
          </div>
        </button>
        <button
          onClick={() => setSelectedTab('analytics')}
          className={`px-4 py-2 rounded-lg font-medium transition-all ${
            selectedTab === 'analytics' 
              ? 'bg-blue-600 text-white' 
              : 'bg-white text-gray-600 hover:bg-gray-50'
          }`}
        >
          <div className="flex items-center gap-2">
            <ChartBarIcon className="h-5 w-5" />
            Analytics
          </div>
        </button>
        <button
          onClick={() => setSelectedTab('simulator')}
          className={`px-4 py-2 rounded-lg font-medium transition-all ${
            selectedTab === 'simulator' 
              ? 'bg-blue-600 text-white' 
              : 'bg-white text-gray-600 hover:bg-gray-50'
          }`}
        >
          <div className="flex items-center gap-2">
            <BeakerIcon className="h-5 w-5" />
            What-If Simulator
          </div>
        </button>
      </div>

      {/* Content */}
      {optimizationResult && selectedTab === 'decisions' && (
        <div className="space-y-6">
          {/* Summary */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <ClockIcon className="h-6 w-6 text-gray-600" />
              Optimization Summary
            </h2>
            <div className="grid grid-cols-5 gap-4">
              <div className="text-center">
                <p className="text-3xl font-bold text-green-600">{optimizationResult.summary.inService}</p>
                <p className="text-sm text-gray-500">In Service</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-yellow-600">{optimizationResult.summary.standby}</p>
                <p className="text-sm text-gray-500">Standby</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-red-600">{optimizationResult.summary.maintenance}</p>
                <p className="text-sm text-gray-500">Maintenance</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-blue-600">{optimizationResult.summary.totalShuntingMoves}</p>
                <p className="text-sm text-gray-500">Shunting Moves</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-orange-600">{optimizationResult.summary.conflictsDetected}</p>
                <p className="text-sm text-gray-500">Conflicts</p>
              </div>
            </div>
          </div>

          {/* AI Recommendations */}
          {optimizationResult.recommendations.length > 0 && (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
              <h3 className="text-lg font-bold text-blue-900 mb-3">
                🤖 AI Recommendations
              </h3>
              <ul className="space-y-2">
                {optimizationResult.recommendations.map((rec, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-blue-600 mt-1">•</span>
                    <span className="text-gray-700">{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Decisions Table */}
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="px-6 py-4 bg-gray-50 border-b">
              <h3 className="text-lg font-bold text-gray-900">Trainset Decisions</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Trainset
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Decision
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Score
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Reasons
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Shunting
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Conflicts
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {optimizationResult.decisions.map((decision) => (
                    <motion.tr 
                      key={decision.trainsetId}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="font-medium text-gray-900">{decision.trainsetNumber}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getDecisionColor(decision.decision)}`}>
                          {decision.decision}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`font-bold ${getScoreColor(decision.score)}`}>
                          {decision.score.toFixed(2)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-600">
                          {decision.reasons.map((reason, idx) => (
                            <div key={idx}>• {reason}</div>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-900">{decision.shuntingMoves}</span>
                      </td>
                      <td className="px-6 py-4">
                        {decision.conflicts.length > 0 ? (
                          <div className="flex items-start gap-1">
                            <ExclamationTriangleIcon className="h-5 w-5 text-orange-500 flex-shrink-0" />
                            <div className="text-sm text-orange-600">
                              {decision.conflicts.map((conflict, idx) => (
                                <div key={idx}>{conflict}</div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <CheckCircleIcon className="h-5 w-5 text-green-500" />
                        )}
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {selectedTab === 'analytics' && (
        <div className="bg-white rounded-xl shadow-lg p-8">
          <h2 className="text-2xl font-bold mb-6">Analytics & Insights</h2>
          <div className="grid grid-cols-2 gap-8">
            <div>
              <h3 className="text-lg font-semibold mb-4">Optimization Performance</h3>
              <div className="h-64 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg flex items-center justify-center">
                <p className="text-gray-500">Performance charts would go here</p>
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Historical Trends</h3>
              <div className="h-64 bg-gradient-to-br from-green-50 to-teal-50 rounded-lg flex items-center justify-center">
                <p className="text-gray-500">Trend analysis would go here</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedTab === 'simulator' && (
        <div className="bg-white rounded-xl shadow-lg p-8">
          <h2 className="text-2xl font-bold mb-6">What-If Scenario Simulator</h2>
          <p className="text-gray-600 mb-6">
            Test hypothetical scenarios to see how the optimization would respond to changes.
          </p>
          <div className="space-y-4">
            <div className="p-4 border-2 border-dashed border-gray-300 rounded-lg">
              <p className="text-center text-gray-500">
                Scenario simulator interface would go here
              </p>
            </div>
            <button className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
              Run Simulation
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default OptimizationDashboard;
