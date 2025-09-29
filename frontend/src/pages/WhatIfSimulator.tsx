import React, { useState, useEffect } from 'react';
import { 
  BeakerIcon,
  PlayIcon,
  AdjustmentsHorizontalIcon,
  CheckCircleIcon,
  ArrowPathIcon,
  DocumentDuplicateIcon,
  LightBulbIcon
} from '@heroicons/react/24/outline';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

interface SimulationScenario {
  id: string;
  name: string;
  description: string;
  parameters: ScenarioParameter[];
  constraints: ConstraintChange[];
  impacts: ImpactAnalysis;
}

interface ScenarioParameter {
  trainsetId: string;
  field: string;
  originalValue: any;
  newValue: any;
  changeType: 'MAINTENANCE' | 'FITNESS' | 'OPERATIONAL' | 'CONSTRAINT';
}

interface ConstraintChange {
  constraint: string;
  originalValue: number;
  newValue: number;
}

interface ImpactAnalysis {
  serviceAvailability: number;
  maintenanceLoad: number;
  energyConsumption: number;
  costImpact: number;
  riskScore: number;
  brandingCompliance: number;
}

interface SimulationResult {
  scenarioId: string;
  baseline: any;
  simulated: any;
  differences: any[];
  recommendations: string[];
  confidenceScore: number;
}

const WhatIfSimulator: React.FC = () => {
  const [, setActiveScenario] = useState<SimulationScenario | null>(null);
  const [customScenario, setCustomScenario] = useState<Partial<SimulationScenario>>({});
  const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [savedScenarios, setSavedScenarios] = useState<SimulationScenario[]>([]);
  const [trainsets, setTrainsets] = useState<any[]>([]);
  const [selectedTab, setSelectedTab] = useState<'predefined' | 'custom' | 'results'>('predefined');

  // Predefined scenarios
  const predefinedScenarios: SimulationScenario[] = [
    {
      id: 'emergency-maintenance',
      name: 'Emergency Maintenance Surge',
      description: 'What if 3 trainsets require emergency maintenance simultaneously?',
      parameters: [
        { trainsetId: 'ts-001', field: 'status', originalValue: 'AVAILABLE', newValue: 'EMERGENCY_REPAIR', changeType: 'MAINTENANCE' },
        { trainsetId: 'ts-002', field: 'status', originalValue: 'IN_SERVICE', newValue: 'EMERGENCY_REPAIR', changeType: 'MAINTENANCE' },
        { trainsetId: 'ts-003', field: 'status', originalValue: 'AVAILABLE', newValue: 'EMERGENCY_REPAIR', changeType: 'MAINTENANCE' }
      ],
      constraints: [],
      impacts: {
        serviceAvailability: -15,
        maintenanceLoad: +60,
        energyConsumption: -10,
        costImpact: +45000,
        riskScore: 0.7,
        brandingCompliance: -8
      }
    },
    {
      id: 'fitness-expiry',
      name: 'Multiple Fitness Expiries',
      description: 'What if 5 trainsets have fitness certificates expiring within 7 days?',
      parameters: [
        { trainsetId: 'ts-004', field: 'fitnessExpiryDays', originalValue: 30, newValue: 5, changeType: 'FITNESS' },
        { trainsetId: 'ts-005', field: 'fitnessExpiryDays', originalValue: 45, newValue: 3, changeType: 'FITNESS' },
        { trainsetId: 'ts-006', field: 'fitnessExpiryDays', originalValue: 60, newValue: 6, changeType: 'FITNESS' },
        { trainsetId: 'ts-007', field: 'fitnessExpiryDays', originalValue: 90, newValue: 2, changeType: 'FITNESS' },
        { trainsetId: 'ts-008', field: 'fitnessExpiryDays', originalValue: 120, newValue: 7, changeType: 'FITNESS' }
      ],
      constraints: [],
      impacts: {
        serviceAvailability: -20,
        maintenanceLoad: +40,
        energyConsumption: -5,
        costImpact: +25000,
        riskScore: 0.8,
        brandingCompliance: -12
      }
    },
    {
      id: 'peak-demand',
      name: 'Peak Hour Demand Surge',
      description: 'What if we need 22 trains in service during peak hours?',
      parameters: [],
      constraints: [
        { constraint: 'minServiceTrains', originalValue: 18, newValue: 22 }
      ],
      impacts: {
        serviceAvailability: +22,
        maintenanceLoad: -20,
        energyConsumption: +25,
        costImpact: -10000,
        riskScore: 0.3,
        brandingCompliance: +5
      }
    },
    {
      id: 'maintenance-capacity',
      name: 'Reduced Maintenance Capacity',
      description: 'What if maintenance bay capacity is reduced to 3 slots?',
      parameters: [],
      constraints: [
        { constraint: 'maxMaintenanceSlots', originalValue: 5, newValue: 3 }
      ],
      impacts: {
        serviceAvailability: +5,
        maintenanceLoad: -40,
        energyConsumption: +10,
        costImpact: +15000,
        riskScore: 0.6,
        brandingCompliance: 0
      }
    },
    {
      id: 'energy-optimization',
      name: 'Energy Conservation Mode',
      description: 'What if we optimize for minimum energy consumption?',
      parameters: [],
      constraints: [
        { constraint: 'maxShuntingMoves', originalValue: 30, newValue: 15 },
        { constraint: 'energyBudget', originalValue: 5000, newValue: 3500 }
      ],
      impacts: {
        serviceAvailability: -5,
        maintenanceLoad: 0,
        energyConsumption: -35,
        costImpact: -20000,
        riskScore: 0.2,
        brandingCompliance: -3
      }
    }
  ];

  useEffect(() => {
    fetchTrainsets();
    loadSavedScenarios();
  }, []);

const fetchTrainsets = async () => {
    try {
      const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';
      const response = await fetch(`${API_BASE}/api/trainsets`);
      const data = await response.json();
      if (data.success) {
        setTrainsets(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch trainsets:', error);
    }
  };

  const loadSavedScenarios = () => {
    const saved = localStorage.getItem('whatif_scenarios');
    if (saved) {
      setSavedScenarios(JSON.parse(saved));
    }
  };

  const saveScenario = (scenario: SimulationScenario) => {
    const updated = [...savedScenarios, scenario];
    setSavedScenarios(updated);
    localStorage.setItem('whatif_scenarios', JSON.stringify(updated));
    toast.success('Scenario saved successfully');
  };

  const runSimulation = async (scenario: SimulationScenario) => {
    setIsSimulating(true);
    const toastId = toast.loading('Running simulation...');

    try {
      // Simulate API call with delay
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Generate simulation result
      const result: SimulationResult = {
        scenarioId: scenario.id,
        baseline: generateBaselineMetrics(),
        simulated: generateSimulatedMetrics(scenario),
        differences: calculateDifferences(scenario),
        recommendations: generateRecommendations(scenario),
        confidenceScore: 0.85 + Math.random() * 0.1
      };

      setSimulationResult(result);
      setSelectedTab('results');
      toast.success('Simulation completed successfully', { id: toastId });
    } catch (error) {
      toast.error('Simulation failed', { id: toastId });
    } finally {
      setIsSimulating(false);
    }
  };

  const generateBaselineMetrics = () => ({
    inService: 18,
    maintenance: 3,
    standby: 4,
    totalShunting: 25,
    energyConsumption: 4500,
    operationalCost: 150000,
    punctuality: 99.5,
    brandingCompliance: 92
  });

  const generateSimulatedMetrics = (scenario: SimulationScenario) => {
    const baseline = generateBaselineMetrics();
    return {
      inService: Math.max(0, baseline.inService + (scenario.impacts.serviceAvailability / 5)),
      maintenance: Math.max(0, baseline.maintenance + (scenario.impacts.maintenanceLoad / 20)),
      standby: 25 - baseline.inService - baseline.maintenance,
      totalShunting: baseline.totalShunting + (scenario.impacts.energyConsumption / 2),
      energyConsumption: baseline.energyConsumption * (1 + scenario.impacts.energyConsumption / 100),
      operationalCost: baseline.operationalCost + scenario.impacts.costImpact,
      punctuality: Math.max(90, baseline.punctuality - scenario.impacts.riskScore * 5),
      brandingCompliance: Math.max(0, baseline.brandingCompliance + scenario.impacts.brandingCompliance)
    };
  };

  const calculateDifferences = (scenario: SimulationScenario) => {
    const baseline = generateBaselineMetrics();
    const simulated = generateSimulatedMetrics(scenario);
    
    return Object.keys(baseline).map(key => ({
      metric: key,
      baseline: baseline[key as keyof typeof baseline],
      simulated: simulated[key as keyof typeof simulated],
      difference: simulated[key as keyof typeof simulated] - baseline[key as keyof typeof baseline],
      percentChange: ((simulated[key as keyof typeof simulated] - baseline[key as keyof typeof baseline]) / baseline[key as keyof typeof baseline] * 100).toFixed(2)
    }));
  };

  const generateRecommendations = (scenario: SimulationScenario): string[] => {
    const recommendations = [];
    
    if (scenario.impacts.serviceAvailability < -10) {
      recommendations.push('Consider promoting high-score standby trains to service');
    }
    if (scenario.impacts.maintenanceLoad > 30) {
      recommendations.push('Schedule non-critical maintenance during off-peak hours');
    }
    if (scenario.impacts.energyConsumption > 20) {
      recommendations.push('Optimize stabling positions to reduce shunting movements');
    }
    if (scenario.impacts.riskScore > 0.5) {
      recommendations.push('Implement contingency plans for high-risk scenarios');
    }
    if (scenario.impacts.brandingCompliance < -5) {
      recommendations.push('Prioritize branded trainsets for service to maintain SLA compliance');
    }
    
    return recommendations;
  };

  const createCustomScenario = () => {
    const scenario: SimulationScenario = {
      id: `custom-${Date.now()}`,
      name: customScenario.name || 'Custom Scenario',
      description: customScenario.description || 'User-defined scenario',
      parameters: customScenario.parameters || [],
      constraints: customScenario.constraints || [],
      impacts: customScenario.impacts || {
        serviceAvailability: 0,
        maintenanceLoad: 0,
        energyConsumption: 0,
        costImpact: 0,
        riskScore: 0,
        brandingCompliance: 0
      }
    };
    
    setActiveScenario(scenario);
    runSimulation(scenario);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <BeakerIcon className="h-8 w-8 text-purple-600" />
              What-If Scenario Simulator
            </h1>
            <p className="text-gray-600 mt-2">
              Test hypothetical scenarios and analyze their impact on train operations
            </p>
          </div>
          <div className="flex gap-4">
            <button
              onClick={() => setSelectedTab('predefined')}
              className="px-4 py-2 bg-white rounded-lg shadow hover:shadow-md transition-shadow"
            >
              <DocumentDuplicateIcon className="h-5 w-5 inline mr-2" />
              Templates
            </button>
            <button
              onClick={() => setSelectedTab('custom')}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg shadow hover:shadow-md transition-shadow"
            >
              <AdjustmentsHorizontalIcon className="h-5 w-5 inline mr-2" />
              Custom Scenario
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 mb-6">
        <button
          onClick={() => setSelectedTab('predefined')}
          className={`px-6 py-3 rounded-lg font-medium transition-all ${
            selectedTab === 'predefined' 
              ? 'bg-purple-600 text-white shadow-lg' 
              : 'bg-white text-gray-600 hover:bg-gray-50'
          }`}
        >
          Predefined Scenarios
        </button>
        <button
          onClick={() => setSelectedTab('custom')}
          className={`px-6 py-3 rounded-lg font-medium transition-all ${
            selectedTab === 'custom' 
              ? 'bg-purple-600 text-white shadow-lg' 
              : 'bg-white text-gray-600 hover:bg-gray-50'
          }`}
        >
          Custom Builder
        </button>
        <button
          onClick={() => setSelectedTab('results')}
          className={`px-6 py-3 rounded-lg font-medium transition-all ${
            selectedTab === 'results' 
              ? 'bg-purple-600 text-white shadow-lg' 
              : 'bg-white text-gray-600 hover:bg-gray-50'
          }`}
        >
          Simulation Results
        </button>
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {selectedTab === 'predefined' && (
          <motion.div
            key="predefined"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {predefinedScenarios.map((scenario) => (
              <motion.div
                key={scenario.id}
                whileHover={{ scale: 1.02 }}
                className="bg-white rounded-xl shadow-lg p-6 cursor-pointer border-2 border-transparent hover:border-purple-400 transition-all"
                onClick={() => setActiveScenario(scenario)}
              >
                <div className="mb-4">
                  <h3 className="text-lg font-bold text-gray-900">{scenario.name}</h3>
                  <p className="text-sm text-gray-600 mt-1">{scenario.description}</p>
                </div>

                <div className="space-y-3">
                  {/* Impact Preview */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">Service:</span>
                      <span className={scenario.impacts.serviceAvailability >= 0 ? 'text-green-600' : 'text-red-600'}>
                        {scenario.impacts.serviceAvailability >= 0 ? '+' : ''}{scenario.impacts.serviceAvailability}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">Energy:</span>
                      <span className={scenario.impacts.energyConsumption <= 0 ? 'text-green-600' : 'text-red-600'}>
                        {scenario.impacts.energyConsumption >= 0 ? '+' : ''}{scenario.impacts.energyConsumption}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">Cost:</span>
                      <span className={scenario.impacts.costImpact <= 0 ? 'text-green-600' : 'text-red-600'}>
                        ₹{Math.abs(scenario.impacts.costImpact / 1000)}k
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">Risk:</span>
                      <span className={scenario.impacts.riskScore < 0.5 ? 'text-green-600' : 'text-orange-600'}>
                        {(scenario.impacts.riskScore * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      runSimulation(scenario);
                    }}
                    disabled={isSimulating}
                    className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center gap-2"
                  >
                    {isSimulating ? (
                      <>
                        <ArrowPathIcon className="h-4 w-4 animate-spin" />
                        Simulating...
                      </>
                    ) : (
                      <>
                        <PlayIcon className="h-4 w-4" />
                        Run Simulation
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}

        {selectedTab === 'custom' && (
          <motion.div
            key="custom"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-white rounded-xl shadow-lg p-8"
          >
            <h2 className="text-2xl font-bold mb-6">Build Custom Scenario</h2>
            
            <div className="space-y-6">
              {/* Scenario Details */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Scenario Name
                </label>
                <input
                  type="text"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Enter scenario name"
                  value={customScenario.name || ''}
                  onChange={(e) => setCustomScenario({ ...customScenario, name: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  rows={3}
                  placeholder="Describe the scenario"
                  value={customScenario.description || ''}
                  onChange={(e) => setCustomScenario({ ...customScenario, description: e.target.value })}
                />
              </div>

              {/* Trainset Modifications */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Trainset Modifications</h3>
                <div className="space-y-3">
                  <div className="p-4 border-2 border-dashed border-gray-300 rounded-lg">
                    <p className="text-center text-gray-500">
                      Select trainsets and modify their parameters
                    </p>
                    <div className="mt-4 grid grid-cols-2 gap-4">
                      {trainsets.slice(0, 4).map((trainset) => (
                        <div key={trainset.id} className="flex items-center gap-2">
                          <input type="checkbox" className="rounded" />
                          <span className="text-sm">{trainset.trainsetNumber}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Constraint Modifications */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Constraint Adjustments</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Min Service Trains</label>
                    <input
                      type="number"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      defaultValue={18}
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Max Maintenance Slots</label>
                    <input
                      type="number"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      defaultValue={5}
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Max Shunting Moves</label>
                    <input
                      type="number"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      defaultValue={30}
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Energy Budget (kWh)</label>
                    <input
                      type="number"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      defaultValue={5000}
                    />
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-4">
                <button
                  onClick={createCustomScenario}
                  className="flex-1 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center gap-2"
                >
                  <PlayIcon className="h-5 w-5" />
                  Run Custom Simulation
                </button>
                <button
                  onClick={() => saveScenario(customScenario as SimulationScenario)}
                  className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Save Scenario
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {selectedTab === 'results' && simulationResult && (
          <motion.div
            key="results"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            {/* Results Header */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-gray-900">Simulation Results</h2>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">Confidence:</span>
                  <span className="text-lg font-bold text-purple-600">
                    {(simulationResult.confidenceScore * 100).toFixed(1)}%
                  </span>
                </div>
              </div>

              {/* Metrics Comparison */}
              <div className="grid grid-cols-4 gap-4">
                {simulationResult.differences.slice(0, 4).map((diff) => (
                  <div key={diff.metric} className="bg-gray-50 rounded-lg p-4">
                    <p className="text-xs text-gray-500 uppercase mb-1">{diff.metric}</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {typeof diff.simulated === 'number' ? diff.simulated.toFixed(1) : diff.simulated}
                    </p>
                    <p className={`text-sm mt-1 ${
                      diff.difference >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {diff.difference >= 0 ? '↑' : '↓'} {Math.abs(diff.difference).toFixed(1)} ({diff.percentChange}%)
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Impact Visualization */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-bold mb-4">Impact Analysis</h3>
              <div className="h-64 bg-gradient-to-br from-purple-50 to-blue-50 rounded-lg flex items-center justify-center">
                <p className="text-gray-500">Impact visualization charts would go here</p>
              </div>
            </div>

            {/* Recommendations */}
            {simulationResult.recommendations.length > 0 && (
              <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-6 border border-purple-200">
                <h3 className="text-lg font-bold text-purple-900 mb-4 flex items-center gap-2">
                  <LightBulbIcon className="h-5 w-5" />
                  AI Recommendations
                </h3>
                <ul className="space-y-2">
                  {simulationResult.recommendations.map((rec, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <CheckCircleIcon className="h-5 w-5 text-purple-600 mt-0.5" />
                      <span className="text-gray-700">{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-4">
              <button className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
                Apply Scenario
              </button>
              <button className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors">
                Export Report
              </button>
              <button
                onClick={() => setSelectedTab('predefined')}
                className="px-6 py-3 bg-white text-gray-700 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
              >
                New Simulation
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Saved Scenarios Sidebar */}
      {savedScenarios.length > 0 && (
        <div className="fixed right-0 top-1/2 transform -translate-y-1/2 bg-white rounded-l-xl shadow-lg p-4 max-w-xs">
          <h3 className="text-sm font-bold text-gray-700 mb-3">Saved Scenarios</h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {savedScenarios.map((scenario) => (
              <button
                key={scenario.id}
                onClick={() => {
                  setActiveScenario(scenario);
                  runSimulation(scenario);
                }}
                className="w-full text-left px-3 py-2 text-xs bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                {scenario.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default WhatIfSimulator;
