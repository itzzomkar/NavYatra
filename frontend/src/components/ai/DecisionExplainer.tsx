import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  InformationCircleIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  TruckIcon,
  WrenchScrewdriverIcon,
  ShieldCheckIcon,
  BoltIcon,
  CpuChipIcon,
} from '@heroicons/react/24/outline';
import Card from '@/components/ui/Card';

interface DecisionFactor {
  name: string;
  impact: number; // 0-100
  reason: string;
  status: 'positive' | 'negative' | 'neutral';
  icon: React.ComponentType<{ className?: string }>;
}

interface AlternativeScenario {
  id: string;
  description: string;
  confidence: number;
  pros: string[];
  cons: string[];
  impactScore: number;
}

interface OptimizationResult {
  trainsetId: string;
  trainsetNumber: string;
  assignedSlot: string;
  confidenceScore: number;
  decisionFactors: DecisionFactor[];
  aiReasoning: string;
  alternativeScenarios: AlternativeScenario[];
  riskAssessment: {
    level: 'low' | 'medium' | 'high';
    factors: string[];
    mitigationSuggestions: string[];
  };
}

interface DecisionExplainerProps {
  optimizationResult: OptimizationResult;
  onAcceptDecision?: () => void;
  onRequestAlternative?: (scenarioId: string) => void;
  className?: string;
}

const DecisionExplainer: React.FC<DecisionExplainerProps> = ({
  optimizationResult,
  onAcceptDecision,
  onRequestAlternative,
  className = '',
}) => {
  const [activeTab, setActiveTab] = useState<'reasoning' | 'factors' | 'alternatives' | 'risks'>('reasoning');
  const [expandedScenario, setExpandedScenario] = useState<string | null>(null);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'positive':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'negative':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'neutral':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'low':
        return 'text-green-600 bg-green-100';
      case 'medium':
        return 'text-yellow-600 bg-yellow-100';
      case 'high':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 90) return 'text-green-600';
    if (confidence >= 70) return 'text-blue-600';
    if (confidence >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <Card className={`${className} overflow-hidden`}>
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 px-6 py-4 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <CpuChipIcon className="h-8 w-8" />
            <div>
              <h3 className="text-xl font-semibold">AI Decision Analysis</h3>
              <p className="text-sm text-purple-100">
                Trainset {optimizationResult.trainsetNumber} • Slot {optimizationResult.assignedSlot}
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className={`text-2xl font-bold ${getConfidenceColor(optimizationResult.confidenceScore)}`}>
              {optimizationResult.confidenceScore}%
            </div>
            <div className="text-sm text-purple-100">Confidence</div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8 px-6">
          {[
            { key: 'reasoning', label: 'AI Reasoning', icon: CpuChipIcon },
            { key: 'factors', label: 'Decision Factors', icon: ChartBarIcon },
            { key: 'alternatives', label: 'Alternatives', icon: BoltIcon },
            { key: 'risks', label: 'Risk Assessment', icon: ExclamationTriangleIcon },
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
      <div className="p-6">
        <AnimatePresence mode="wait">
          {activeTab === 'reasoning' && (
            <motion.div
              key="reasoning"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <InformationCircleIcon className="h-6 w-6 text-blue-600 flex-shrink-0 mt-1" />
                  <div>
                    <h4 className="font-semibold text-blue-900 mb-2">AI Reasoning</h4>
                    <p className="text-blue-800 leading-relaxed">{optimizationResult.aiReasoning}</p>
                  </div>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <ClockIcon className="h-8 w-8 text-gray-600 mx-auto mb-2" />
                  <div className="text-lg font-semibold text-gray-900">2.3s</div>
                  <div className="text-sm text-gray-600">Processing Time</div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <ChartBarIcon className="h-8 w-8 text-gray-600 mx-auto mb-2" />
                  <div className="text-lg font-semibold text-gray-900">847</div>
                  <div className="text-sm text-gray-600">Scenarios Analyzed</div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <CheckCircleIcon className="h-8 w-8 text-gray-600 mx-auto mb-2" />
                  <div className="text-lg font-semibold text-gray-900">12</div>
                  <div className="text-sm text-gray-600">Constraints Satisfied</div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'factors' && (
            <motion.div
              key="factors"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              <h4 className="font-semibold text-gray-900 mb-4">Key Decision Factors</h4>
              {optimizationResult.decisionFactors.map((factor, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`p-4 rounded-lg border ${getStatusColor(factor.status)}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-3">
                      <factor.icon className="h-5 w-5" />
                      <span className="font-semibold">{factor.name}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="text-sm text-gray-600">Impact:</div>
                      <div className="font-semibold">{factor.impact}%</div>
                    </div>
                  </div>
                  <p className="text-sm">{factor.reason}</p>
                  {/* Impact bar */}
                  <div className="mt-3">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${factor.impact}%` }}
                        transition={{ delay: 0.5 + index * 0.1, duration: 0.8 }}
                        className={`h-2 rounded-full ${
                          factor.status === 'positive' ? 'bg-green-500' :
                          factor.status === 'negative' ? 'bg-red-500' : 'bg-blue-500'
                        }`}
                      />
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}

          {activeTab === 'alternatives' && (
            <motion.div
              key="alternatives"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              <h4 className="font-semibold text-gray-900 mb-4">Alternative Scenarios</h4>
              {optimizationResult.alternativeScenarios.map((scenario, index) => (
                <motion.div
                  key={scenario.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="border border-gray-200 rounded-lg overflow-hidden"
                >
                  <div className="p-4 bg-gray-50 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <h5 className="font-semibold text-gray-900">{scenario.description}</h5>
                        <span className="text-sm text-gray-600">
                          Impact Score: {scenario.impactScore}/100
                        </span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className={`text-lg font-semibold ${getConfidenceColor(scenario.confidence)}`}>
                          {scenario.confidence}%
                        </div>
                        <button
                          onClick={() => setExpandedScenario(
                            expandedScenario === scenario.id ? null : scenario.id
                          )}
                          className="text-purple-600 hover:text-purple-800 font-medium text-sm"
                        >
                          {expandedScenario === scenario.id ? 'Less' : 'More'}
                        </button>
                      </div>
                    </div>
                  </div>

                  <AnimatePresence>
                    {expandedScenario === scenario.id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="p-4 space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <h6 className="font-semibold text-green-600 mb-2">Advantages</h6>
                              <ul className="text-sm text-gray-600 space-y-1">
                                {scenario.pros.map((pro, i) => (
                                  <li key={i} className="flex items-start space-x-2">
                                    <CheckCircleIcon className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                                    <span>{pro}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                            <div>
                              <h6 className="font-semibold text-red-600 mb-2">Considerations</h6>
                              <ul className="text-sm text-gray-600 space-y-1">
                                {scenario.cons.map((con, i) => (
                                  <li key={i} className="flex items-start space-x-2">
                                    <ExclamationTriangleIcon className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                                    <span>{con}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                          <div className="pt-3 border-t border-gray-200">
                            <button
                              onClick={() => onRequestAlternative?.(scenario.id)}
                              className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
                            >
                              Use This Alternative
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </motion.div>
          )}

          {activeTab === 'risks' && (
            <motion.div
              key="risks"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-semibold text-gray-900">Risk Assessment</h4>
                <div className={`px-3 py-1 rounded-full text-sm font-medium ${getRiskColor(optimizationResult.riskAssessment.level)}`}>
                  {optimizationResult.riskAssessment.level.toUpperCase()} RISK
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <h5 className="font-semibold text-gray-900 mb-3">Risk Factors</h5>
                  <div className="space-y-2">
                    {optimizationResult.riskAssessment.factors.map((factor, index) => (
                      <div key={index} className="flex items-start space-x-3 p-3 bg-red-50 rounded-lg">
                        <ExclamationTriangleIcon className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-red-800">{factor}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h5 className="font-semibold text-gray-900 mb-3">Mitigation Suggestions</h5>
                  <div className="space-y-2">
                    {optimizationResult.riskAssessment.mitigationSuggestions.map((suggestion, index) => (
                      <div key={index} className="flex items-start space-x-3 p-3 bg-blue-50 rounded-lg">
                        <InformationCircleIcon className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-blue-800">{suggestion}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Action Buttons */}
      <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            AI recommendation based on 12 constraints and historical performance data
          </div>
          <div className="flex space-x-3">
            <button className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium">
              Request Review
            </button>
            <button
              onClick={onAcceptDecision}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
            >
              Accept Decision
            </button>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default DecisionExplainer;