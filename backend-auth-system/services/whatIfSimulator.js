const AIDecisionEngine = require('./aiDecisionEngine');
const MultiObjectiveOptimizer = require('./multiObjectiveOptimizer');

/**
 * What-If Simulator for KMRL Train Induction
 * 
 * Enables scenario analysis and simulation to test different conditions
 * and their impact on train induction decisions
 */
class WhatIfSimulator {
  constructor() {
    this.aiEngine = new AIDecisionEngine();
    this.optimizer = new MultiObjectiveOptimizer();
    this.scenarios = new Map();
    this.simulationHistory = new Map();
  }

  /**
   * Run what-if simulation with different scenarios
   */
  async runSimulation(baseScenario, variations = []) {
    try {
      console.log('🔮 Starting What-If Simulation...');
      
      const results = {
        baseScenario: await this.simulateScenario(baseScenario),
        variations: [],
        comparison: {},
        recommendations: []
      };

      // Run variations
      for (const variation of variations) {
        const variationResult = await this.simulateScenario(variation);
        results.variations.push({
          name: variation.name,
          description: variation.description,
          result: variationResult
        });
      }

      // Compare results
      results.comparison = this.compareScenarios(results.baseScenario, results.variations);
      
      // Generate recommendations
      results.recommendations = this.generateSimulationRecommendations(results);

      // Store simulation
      const simulationId = `SIM_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      this.simulationHistory.set(simulationId, results);

      return {
        simulationId,
        results,
        metadata: {
          timestamp: new Date(),
          totalScenarios: variations.length + 1,
          simulationDuration: Date.now() - Date.now() // Placeholder
        }
      };

    } catch (error) {
      console.error('❌ What-If Simulation error:', error);
      throw new Error(`Simulation failed: ${error.message}`);
    }
  }

  /**
   * Simulate a single scenario
   */
  async simulateScenario(scenario) {
    const contextData = await this.aiEngine.gatherContextData(scenario.date, scenario.shift);
    
    // Apply scenario modifications
    const modifiedContext = this.applyScenarioModifications(contextData, scenario);
    
    // Run AI decision engine
    const decision = await this.aiEngine.generateInductionDecision(
      scenario.date, 
      scenario.shift, 
      scenario.constraints
    );
    
    // Run optimization
    const optimization = await this.optimizer.optimizeInductionSchedule(
      modifiedContext.trainsets,
      modifiedContext,
      scenario.optimizationPreferences
    );
    
    return {
      scenario: scenario.name,
      decision,
      optimization,
      metrics: this.calculateScenarioMetrics(decision, optimization),
      timestamp: new Date()
    };
  }

  /**
   * Apply scenario modifications to context data
   */
  applyScenarioModifications(contextData, scenario) {
    const modified = { ...contextData };
    
    // Apply fitness modifications
    if (scenario.fitnessModifications) {
      modified.fitnessRecords = this.modifyFitnessRecords(
        contextData.fitnessRecords, 
        scenario.fitnessModifications
      );
    }
    
    // Apply job card modifications
    if (scenario.jobCardModifications) {
      modified.jobCards = this.modifyJobCards(
        contextData.jobCards, 
        scenario.jobCardModifications
      );
    }
    
    // Apply trainset modifications
    if (scenario.trainsetModifications) {
      modified.trainsets = this.modifyTrainsets(
        contextData.trainsets, 
        scenario.trainsetModifications
      );
    }
    
    return modified;
  }

  /**
   * Modify fitness records based on scenario
   */
  modifyFitnessRecords(fitnessRecords, modifications) {
    return fitnessRecords.map(record => {
      const modification = modifications.find(m => m.trainsetId === record.trainsetId);
      if (modification) {
        return {
          ...record,
          expiryDate: modification.newExpiryDate || record.expiryDate,
          status: modification.newStatus || record.status
        };
      }
      return record;
    });
  }

  /**
   * Modify job cards based on scenario
   */
  modifyJobCards(jobCards, modifications) {
    return jobCards.map(jobCard => {
      const modification = modifications.find(m => m.jobCardId === jobCard._id);
      if (modification) {
        return {
          ...jobCard,
          status: modification.newStatus || jobCard.status,
          priority: modification.newPriority || jobCard.priority
        };
      }
      return jobCard;
    });
  }

  /**
   * Modify trainsets based on scenario
   */
  modifyTrainsets(trainsets, modifications) {
    return trainsets.map(trainset => {
      const modification = modifications.find(m => m.trainsetId === trainset._id);
      if (modification) {
        return {
          ...trainset,
          status: modification.newStatus || trainset.status,
          currentMileage: modification.newMileage || trainset.currentMileage,
          location: modification.newLocation || trainset.location
        };
      }
      return trainset;
    });
  }

  /**
   * Calculate metrics for a scenario
   */
  calculateScenarioMetrics(decision, optimization) {
    return {
      serviceReadiness: decision.metadata.availableTrainsets,
      reliability: optimization.report.bestSolution.objectives.reliability,
      costEfficiency: optimization.report.bestSolution.objectives.costEfficiency,
      brandingExposure: optimization.report.bestSolution.objectives.brandingExposure,
      energyEfficiency: optimization.report.bestSolution.objectives.energyEfficiency,
      overallScore: optimization.report.bestSolution.fitness,
      constraintViolations: optimization.report.bestSolution.violations,
      recommendations: decision.recommendations.length
    };
  }

  /**
   * Compare scenarios
   */
  compareScenarios(baseScenario, variations) {
    const comparison = {
      baseMetrics: baseScenario.metrics,
      variationMetrics: variations.map(v => ({
        name: v.name,
        metrics: v.result.metrics
      })),
      improvements: [],
      degradations: [],
      bestScenario: null
    };

    // Find improvements and degradations
    variations.forEach(variation => {
      const base = baseScenario.metrics;
      const variationMetrics = variation.result.metrics;
      
      const improvement = {
        scenario: variation.name,
        metrics: {}
      };
      
      const degradation = {
        scenario: variation.name,
        metrics: {}
      };

      Object.keys(base).forEach(metric => {
        if (variationMetrics[metric] > base[metric]) {
          improvement.metrics[metric] = variationMetrics[metric] - base[metric];
        } else if (variationMetrics[metric] < base[metric]) {
          degradation.metrics[metric] = base[metric] - variationMetrics[metric];
        }
      });

      if (Object.keys(improvement.metrics).length > 0) {
        comparison.improvements.push(improvement);
      }
      if (Object.keys(degradation.metrics).length > 0) {
        comparison.degradations.push(degradation);
      }
    });

    // Find best scenario
    const allScenarios = [baseScenario, ...variations.map(v => v.result)];
    comparison.bestScenario = allScenarios.reduce((best, current) => 
      current.metrics.overallScore > best.metrics.overallScore ? current : best
    );

    return comparison;
  }

  /**
   * Generate simulation recommendations
   */
  generateSimulationRecommendations(results) {
    const recommendations = [];

    // Best scenario recommendation
    if (results.comparison.bestScenario && results.comparison.bestScenario !== results.baseScenario) {
      recommendations.push({
        type: 'BEST_SCENARIO',
        priority: 'HIGH',
        message: `Scenario "${results.comparison.bestScenario.scenario}" shows the best overall performance`,
        action: 'Consider implementing the conditions from this scenario',
        expectedImprovement: this.calculateImprovement(
          results.baseScenario.metrics.overallScore,
          results.comparison.bestScenario.metrics.overallScore
        )
      });
    }

    // Improvement recommendations
    results.comparison.improvements.forEach(improvement => {
      const topMetric = Object.entries(improvement.metrics)
        .sort(([,a], [,b]) => b - a)[0];
      
      if (topMetric) {
        recommendations.push({
          type: 'IMPROVEMENT',
          priority: 'MEDIUM',
          message: `Scenario "${improvement.scenario}" improves ${topMetric[0]} by ${topMetric[1].toFixed(1)}%`,
          action: `Focus on the factors that led to this improvement in ${topMetric[0]}`,
          expectedImprovement: topMetric[1]
        });
      }
    });

    return recommendations;
  }

  /**
   * Calculate improvement percentage
   */
  calculateImprovement(baseValue, newValue) {
    return ((newValue - baseValue) / baseValue) * 100;
  }

  /**
   * Create predefined scenarios
   */
  createPredefinedScenarios() {
    return {
      // Peak hour scenario
      peakHour: {
        name: 'Peak Hour Demand',
        description: 'Simulate high passenger demand during peak hours',
        date: new Date().toISOString().split('T')[0],
        shift: 'MORNING',
        constraints: {
          minTrainsets: 20,
          maxWaitTime: 3
        },
        optimizationPreferences: {
          generations: 150,
          populationSize: 100
        }
      },

      // Maintenance heavy scenario
      maintenanceHeavy: {
        name: 'Heavy Maintenance Period',
        description: 'Simulate when multiple trainsets are under maintenance',
        date: new Date().toISOString().split('T')[0],
        shift: 'MORNING',
        trainsetModifications: [
          { trainsetId: 'TS001', newStatus: 'MAINTENANCE' },
          { trainsetId: 'TS002', newStatus: 'MAINTENANCE' },
          { trainsetId: 'TS003', newStatus: 'MAINTENANCE' }
        ],
        constraints: {
          minTrainsets: 12
        }
      },

      // Fitness expiry scenario
      fitnessExpiry: {
        name: 'Fitness Certificate Expiry',
        description: 'Simulate when multiple fitness certificates are expiring',
        date: new Date().toISOString().split('T')[0],
        shift: 'MORNING',
        fitnessModifications: [
          { trainsetId: 'TS001', newExpiryDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000) },
          { trainsetId: 'TS002', newExpiryDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000) }
        ]
      },

      // Energy optimization scenario
      energyOptimization: {
        name: 'Energy Optimization Focus',
        description: 'Prioritize energy efficiency in train selection',
        date: new Date().toISOString().split('T')[0],
        shift: 'MORNING',
        optimizationPreferences: {
          generations: 200,
          populationSize: 150,
          focusAreas: ['energy_efficiency', 'stabling_geometry']
        }
      }
    };
  }

  /**
   * Get simulation history
   */
  getSimulationHistory(limit = 50) {
    const history = Array.from(this.simulationHistory.values())
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
    
    return history;
  }

  /**
   * Get simulation by ID
   */
  getSimulation(simulationId) {
    return this.simulationHistory.get(simulationId);
  }

  /**
   * Export simulation results
   */
  exportSimulationResults(simulationId, format = 'json') {
    const simulation = this.getSimulation(simulationId);
    if (!simulation) {
      throw new Error('Simulation not found');
    }

    if (format === 'json') {
      return JSON.stringify(simulation, null, 2);
    } else if (format === 'csv') {
      return this.convertToCSV(simulation);
    } else {
      throw new Error('Unsupported format');
    }
  }

  /**
   * Convert simulation results to CSV
   */
  convertToCSV(simulation) {
    // Simplified CSV conversion
    const lines = ['Scenario,Metric,Value'];
    
    Object.entries(simulation.results.baseScenario.metrics).forEach(([metric, value]) => {
      lines.push(`Base,${metric},${value}`);
    });
    
    simulation.results.variations.forEach(variation => {
      Object.entries(variation.result.metrics).forEach(([metric, value]) => {
        lines.push(`${variation.name},${metric},${value}`);
      });
    });
    
    return lines.join('\n');
  }
}

module.exports = WhatIfSimulator;

