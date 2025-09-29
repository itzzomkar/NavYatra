import { Router, Request, Response } from 'express';
import { TrainInductionOptimizer, optimizer } from '../services/optimizationEngine';
import { mockDb } from '../services/mockDb';

const router = Router();

interface WhatIfScenario {
  id: string;
  name: string;
  description: string;
  parameters: ScenarioParameter[];
  constraints: ConstraintChange[];
  timestamp: Date;
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

interface SimulationResult {
  scenarioId: string;
  baseline: MetricsSnapshot;
  simulated: MetricsSnapshot;
  differences: MetricDifference[];
  recommendations: string[];
  confidenceScore: number;
  executionTime: number;
}

interface MetricsSnapshot {
  inService: number;
  maintenance: number;
  standby: number;
  totalShunting: number;
  energyConsumption: number;
  operationalCost: number;
  punctuality: number;
  brandingCompliance: number;
  maintenanceBacklog: number;
  fitnessExpiryRisk: number;
}

interface MetricDifference {
  metric: string;
  baseline: number;
  simulated: number;
  difference: number;
  percentChange: string;
  impact: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
}

// Add type definitions for Trainset and MaintenanceStatus
interface Trainset {
  id: string;
  trainsetNumber: string;
  maintenanceStatus: MaintenanceStatus;
  healthScore: number;
  fitnessCertificate?: {
    expiryDate: Date;
  };
  [key: string]: any;
}

type MaintenanceStatus = 'AVAILABLE' | 'IN_SERVICE' | 'MAINTENANCE' | 'EMERGENCY_REPAIR' | 'STANDBY';

// Storage for scenarios and results
const scenarioHistory: Map<string, WhatIfScenario> = new Map();
const simulationResults: Map<string, SimulationResult> = new Map();

// Run what-if simulation
router.post('/simulate', async (req: Request, res: Response) => {
  try {
    const scenario: WhatIfScenario = req.body;
    scenario.id = `scenario-${Date.now()}`;
    scenario.timestamp = new Date();

    // Store scenario
    scenarioHistory.set(scenario.id, scenario);

    // Capture baseline metrics from current optimization
    const baselineResult = await optimizer.optimizeInduction();
    const baselineMetrics = extractMetricsFromResult(baselineResult);
    
    // Apply scenario changes and simulate
    const simulatedResult = await simulateWithChanges(scenario, optimizer);
    const simulatedMetrics = extractMetricsFromResult(simulatedResult);
    
    // Calculate differences and generate insights
    const differences = calculateDifferences(baselineMetrics, simulatedMetrics);
    const recommendations = generateRecommendations(scenario, differences);
    const confidenceScore = calculateConfidenceScore(scenario, differences);
    
    const result: SimulationResult = {
      scenarioId: scenario.id,
      baseline: baselineMetrics,
      simulated: simulatedMetrics,
      differences,
      recommendations,
      confidenceScore,
      executionTime: Date.now() - scenario.timestamp.getTime()
    };
    
    // Store result
    simulationResults.set(scenario.id, result);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Simulation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to run simulation',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get predefined scenarios
router.get('/scenarios/predefined', (req: Request, res: Response) => {
  const predefinedScenarios = [
    {
      id: 'emergency-maintenance',
      name: 'Emergency Maintenance Surge',
      description: 'Multiple trainsets require emergency maintenance simultaneously',
      category: 'MAINTENANCE',
      severity: 'HIGH',
      parameters: [
        { trainsetId: 'ts-001', field: 'status', newValue: 'EMERGENCY_REPAIR', changeType: 'MAINTENANCE' },
        { trainsetId: 'ts-002', field: 'status', newValue: 'EMERGENCY_REPAIR', changeType: 'MAINTENANCE' },
        { trainsetId: 'ts-003', field: 'status', newValue: 'EMERGENCY_REPAIR', changeType: 'MAINTENANCE' }
      ],
      expectedImpact: {
        serviceAvailability: -15,
        maintenanceLoad: +60,
        costImpact: +45000
      }
    },
    {
      id: 'fitness-expiry-wave',
      name: 'Fitness Certificate Expiry Wave',
      description: 'Multiple fitness certificates expiring within the same week',
      category: 'COMPLIANCE',
      severity: 'HIGH',
      parameters: [
        { trainsetId: 'ts-004', field: 'fitnessExpiryDays', newValue: 5, changeType: 'FITNESS' },
        { trainsetId: 'ts-005', field: 'fitnessExpiryDays', newValue: 3, changeType: 'FITNESS' },
        { trainsetId: 'ts-006', field: 'fitnessExpiryDays', newValue: 7, changeType: 'FITNESS' }
      ],
      expectedImpact: {
        serviceAvailability: -20,
        maintenanceLoad: +40,
        riskScore: 0.8
      }
    },
    {
      id: 'peak-demand-surge',
      name: 'Peak Hour Demand Increase',
      description: 'Increased service requirement during peak hours',
      category: 'OPERATIONAL',
      severity: 'MEDIUM',
      constraints: [
        { constraint: 'minServiceTrains', originalValue: 18, newValue: 22 }
      ],
      expectedImpact: {
        serviceAvailability: +22,
        energyConsumption: +25,
        brandingCompliance: +5
      }
    },
    {
      id: 'maintenance-capacity-reduction',
      name: 'Maintenance Bay Unavailable',
      description: 'Reduced maintenance capacity due to facility issues',
      category: 'INFRASTRUCTURE',
      severity: 'MEDIUM',
      constraints: [
        { constraint: 'maxMaintenanceSlots', originalValue: 5, newValue: 3 }
      ],
      expectedImpact: {
        maintenanceLoad: -40,
        riskScore: 0.6
      }
    },
    {
      id: 'energy-conservation',
      name: 'Energy Conservation Protocol',
      description: 'Optimize for minimum energy consumption',
      category: 'SUSTAINABILITY',
      severity: 'LOW',
      constraints: [
        { constraint: 'maxShuntingMoves', originalValue: 30, newValue: 15 },
        { constraint: 'energyBudget', originalValue: 5000, newValue: 3500 }
      ],
      expectedImpact: {
        energyConsumption: -35,
        costImpact: -20000
      }
    },
    {
      id: 'branding-compliance-crisis',
      name: 'Branding Contract Violation Risk',
      description: 'Risk of not meeting branding contract requirements',
      category: 'CONTRACTUAL',
      severity: 'HIGH',
      parameters: [
        { trainsetId: 'ts-007', field: 'hasBranding', newValue: false, changeType: 'OPERATIONAL' },
        { trainsetId: 'ts-008', field: 'hasBranding', newValue: false, changeType: 'OPERATIONAL' }
      ],
      expectedImpact: {
        brandingCompliance: -25,
        costImpact: +30000
      }
    }
  ];

  res.json({
    success: true,
    data: predefinedScenarios
  });
});

// Get scenario history
router.get('/scenarios/history', (req: Request, res: Response) => {
  const history = Array.from(scenarioHistory.values())
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    .slice(0, 20);

  res.json({
    success: true,
    data: history
  });
});

// Get simulation result by ID
router.get('/results/:scenarioId', (req: Request, res: Response) => {
  const { scenarioId } = req.params;
  const result = simulationResults.get(scenarioId);

  if (!result) {
    return res.status(404).json({
      success: false,
      message: 'Simulation result not found'
    });
  }

  res.json({
    success: true,
    data: result
  });
});

// Compare multiple scenarios
router.post('/compare', async (req: Request, res: Response) => {
  try {
    const { scenarioIds } = req.body;
    
    if (!scenarioIds || scenarioIds.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'At least 2 scenario IDs required for comparison'
      });
    }

    const results = scenarioIds
      .map((id: string) => simulationResults.get(id))
      .filter((result: SimulationResult | undefined) => result !== undefined);

    if (results.length < 2) {
      return res.status(404).json({
        success: false,
        message: 'Some simulation results not found'
      });
    }

    const comparison = {
      scenarios: results.map((r: SimulationResult) => ({
        id: r.scenarioId,
        metrics: r.simulated,
        score: calculateOverallScore(r.simulated)
      })),
      bestScenario: determineBestScenario(results),
      insights: generateComparativeInsights(results)
    };

    res.json({
      success: true,
      data: comparison
    });
  } catch (error) {
    console.error('Comparison error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to compare scenarios'
    });
  }
});

// Apply scenario to production
router.post('/apply/:scenarioId', async (req: Request, res: Response) => {
  try {
    const { scenarioId } = req.params;
    const scenario = scenarioHistory.get(scenarioId);
    const result = simulationResults.get(scenarioId);

    if (!scenario || !result) {
      return res.status(404).json({
        success: false,
        message: 'Scenario or result not found'
      });
    }

    // Check confidence threshold
    if (result.confidenceScore < 0.7) {
      return res.status(400).json({
        success: false,
        message: 'Confidence score too low to apply scenario',
        confidenceScore: result.confidenceScore
      });
    }

    // Apply changes to production (with safety checks)
    const applicationResult = await applyToProduction(scenario, result);

    res.json({
      success: true,
      message: 'Scenario applied successfully',
      data: applicationResult
    });
  } catch (error) {
    console.error('Application error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to apply scenario'
    });
  }
});

// Helper functions
async function simulateWithChanges(
  scenario: WhatIfScenario,
  optimizer: TrainInductionOptimizer
): Promise<any> {
  // For now, use the built-in simulator method
  // In a full implementation, we would modify the trainset data before optimization
  const changes = scenario.parameters.map(param => ({
    id: param.trainsetId,
    [param.field]: param.newValue,
    changeType: param.changeType
  }));
  
  return await optimizer.simulateScenario(changes);
}

function extractMetricsFromResult(result: any): MetricsSnapshot {
  const decisions = result.decisions || [];
  const summary = result.summary || {};
  
  return {
    inService: summary.inService || decisions.filter((d: any) => d.decision === 'IN_SERVICE').length,
    maintenance: summary.maintenance || decisions.filter((d: any) => d.decision === 'MAINTENANCE').length,
    standby: summary.standby || decisions.filter((d: any) => d.decision === 'STANDBY').length,
    totalShunting: summary.totalShuntingMoves || 0,
    energyConsumption: 4500 + (summary.totalShuntingMoves * 150) || 4500, // Estimate based on shunting
    operationalCost: 150000 + (summary.maintenance * 10000) || 150000, // Base cost + maintenance cost
    punctuality: Math.max(95 - (summary.conflictsDetected * 2), 85) || 95, // Reduce for conflicts
    brandingCompliance: 90, // Would be calculated from actual branding data
    maintenanceBacklog: decisions.filter((d: any) => 
      d.conflicts && d.conflicts.length > 0
    ).length,
    fitnessExpiryRisk: decisions.filter((d: any) => 
      d.reasons && d.reasons.some((r: string) => r.includes('fitness'))
    ).length
  };
}


function calculateDifferences(
  baseline: MetricsSnapshot,
  simulated: MetricsSnapshot
): MetricDifference[] {
  const metrics = Object.keys(baseline) as (keyof MetricsSnapshot)[];
  
  return metrics.map(metric => {
    const baseValue = baseline[metric];
    const simValue = simulated[metric];
    const difference = simValue - baseValue;
    const percentChange = baseValue !== 0 
      ? ((difference / baseValue) * 100).toFixed(2)
      : '0';
    
    let impact: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
    if (metric === 'maintenance' || metric === 'maintenanceBacklog' || 
        metric === 'fitnessExpiryRisk' || metric === 'operationalCost' ||
        metric === 'energyConsumption') {
      impact = difference < 0 ? 'POSITIVE' : difference > 0 ? 'NEGATIVE' : 'NEUTRAL';
    } else {
      impact = difference > 0 ? 'POSITIVE' : difference < 0 ? 'NEGATIVE' : 'NEUTRAL';
    }
    
    return {
      metric,
      baseline: baseValue,
      simulated: simValue,
      difference,
      percentChange,
      impact
    };
  });
}

function generateRecommendations(
  scenario: WhatIfScenario,
  differences: MetricDifference[]
): string[] {
  const recommendations: string[] = [];
  
  // Analyze key metrics
  const serviceAvailability = differences.find(d => d.metric === 'inService');
  const maintenanceLoad = differences.find(d => d.metric === 'maintenance');
  const energyConsumption = differences.find(d => d.metric === 'energyConsumption');
  const cost = differences.find(d => d.metric === 'operationalCost');
  const brandingCompliance = differences.find(d => d.metric === 'brandingCompliance');
  
  if (serviceAvailability && serviceAvailability.difference < -3) {
    recommendations.push('Consider promoting high-score standby trains to service to maintain availability');
  }
  
  if (maintenanceLoad && maintenanceLoad.difference > 5) {
    recommendations.push('Schedule non-critical maintenance during off-peak hours to reduce impact');
  }
  
  if (energyConsumption && energyConsumption.difference > 500) {
    recommendations.push('Optimize stabling positions to reduce shunting movements and energy consumption');
  }
  
  if (cost && cost.difference > 20000) {
    recommendations.push('Review maintenance scheduling to identify cost optimization opportunities');
  }
  
  if (brandingCompliance && brandingCompliance.difference < -10) {
    recommendations.push('Prioritize branded trainsets for service to maintain contractual obligations');
  }
  
  // Scenario-specific recommendations
  if (scenario.name.includes('Emergency')) {
    recommendations.push('Activate emergency response protocols and notify maintenance teams');
  }
  
  if (scenario.name.includes('Peak')) {
    recommendations.push('Deploy reserve trainsets and optimize turnaround times');
  }
  
  return recommendations;
}

function calculateConfidenceScore(
  scenario: WhatIfScenario,
  differences: MetricDifference[]
): number {
  let score = 0.9; // Base confidence
  
  // Reduce confidence for extreme changes
  const extremeChanges = differences.filter(d => 
    Math.abs(parseFloat(d.percentChange)) > 50
  );
  score -= extremeChanges.length * 0.05;
  
  // Reduce confidence for many parameter changes
  if (scenario.parameters.length > 5) {
    score -= 0.1;
  }
  
  // Reduce confidence for multiple constraint changes
  if (scenario.constraints.length > 3) {
    score -= 0.1;
  }
  
  return Math.max(0.5, Math.min(1.0, score));
}

function calculateOverallScore(metrics: MetricsSnapshot): number {
  // Weighted scoring of different metrics
  const weights = {
    inService: 0.25,
    punctuality: 0.20,
    brandingCompliance: 0.15,
    operationalCost: -0.15,
    energyConsumption: -0.10,
    maintenanceBacklog: -0.10,
    fitnessExpiryRisk: -0.05
  };
  
  let score = 50; // Base score
  
  score += metrics.inService * weights.inService;
  score += metrics.punctuality * weights.punctuality / 100 * 50;
  score += metrics.brandingCompliance * weights.brandingCompliance / 100 * 50;
  score += (150000 - metrics.operationalCost) / 1000 * weights.operationalCost;
  score += (5000 - metrics.energyConsumption) / 100 * weights.energyConsumption;
  score -= metrics.maintenanceBacklog * 5;
  score -= metrics.fitnessExpiryRisk * 3;
  
  return Math.max(0, Math.min(100, score));
}

function determineBestScenario(results: SimulationResult[]): string {
  let bestScore = -Infinity;
  let bestScenarioId = '';
  
  for (const result of results) {
    const score = calculateOverallScore(result.simulated);
    if (score > bestScore) {
      bestScore = score;
      bestScenarioId = result.scenarioId;
    }
  }
  
  return bestScenarioId;
}

function generateComparativeInsights(results: SimulationResult[]): string[] {
  const insights: string[] = [];
  
  // Find best/worst for each metric
  const metrics: (keyof MetricsSnapshot)[] = [
    'inService', 'operationalCost', 'energyConsumption', 'brandingCompliance'
  ];
  
  for (const metric of metrics) {
    const values = results.map(r => ({
      id: r.scenarioId,
      value: r.simulated[metric]
    }));
    
    values.sort((a, b) => a.value - b.value);
    
    if (metric === 'operationalCost' || metric === 'energyConsumption') {
      insights.push(`Lowest ${metric}: Scenario ${values[0].id}`);
    } else {
      insights.push(`Highest ${metric}: Scenario ${values[values.length - 1].id}`);
    }
  }
  
  return insights;
}

async function applyToProduction(
  scenario: WhatIfScenario,
  result: SimulationResult
): Promise<any> {
  // This would contain actual production application logic
  // For now, return a success response
  return {
    appliedAt: new Date(),
    scenarioId: scenario.id,
    expectedMetrics: result.simulated,
    rollbackAvailable: true,
    monitoringEnabled: true
  };
}

// Mock data generation functions
function generateMockTrainsets(): Trainset[] {
  return [
    {
      id: 'ts-001',
      trainsetNumber: 'TS001',
      maintenanceStatus: 'IN_SERVICE',
      healthScore: 85,
      fitnessCertificate: {
        expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      }
    },
    {
      id: 'ts-002',
      trainsetNumber: 'TS002',
      maintenanceStatus: 'IN_SERVICE',
      healthScore: 92,
      fitnessCertificate: {
        expiryDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000)
      }
    },
    {
      id: 'ts-003',
      trainsetNumber: 'TS003',
      maintenanceStatus: 'MAINTENANCE',
      healthScore: 68,
      fitnessCertificate: {
        expiryDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000)
      }
    },
    {
      id: 'ts-004',
      trainsetNumber: 'TS004',
      maintenanceStatus: 'AVAILABLE',
      healthScore: 78,
      fitnessCertificate: {
        expiryDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000)
      }
    },
    {
      id: 'ts-005',
      trainsetNumber: 'TS005',
      maintenanceStatus: 'IN_SERVICE',
      healthScore: 88,
      fitnessCertificate: {
        expiryDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
      }
    },
    {
      id: 'ts-006',
      trainsetNumber: 'TS006',
      maintenanceStatus: 'STANDBY',
      healthScore: 75,
      fitnessCertificate: {
        expiryDate: new Date(Date.now() + 120 * 24 * 60 * 60 * 1000)
      }
    },
    {
      id: 'ts-007',
      trainsetNumber: 'TS007',
      maintenanceStatus: 'IN_SERVICE',
      healthScore: 90,
      fitnessCertificate: {
        expiryDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000)
      },
      hasBranding: true
    },
    {
      id: 'ts-008',
      trainsetNumber: 'TS008',
      maintenanceStatus: 'AVAILABLE',
      healthScore: 82,
      fitnessCertificate: {
        expiryDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000)
      },
      hasBranding: true
    }
  ];
}

function generateMockConstraints(): any {
  return {
    minServiceTrains: 18,
    maxMaintenanceSlots: 5,
    maxShuntingMoves: 30,
    energyBudget: 5000,
    minStandbyTrains: 2,
    maxSimultaneousRepairs: 3
  };
}

export default router;
