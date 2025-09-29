const realTimeOptimizationEngine = require('../services/realTimeOptimizationEngine');
const Optimization = require('../models/Optimization');

// Start the real-time optimization engine
const startEngine = async (req, res) => {
  try {
    await realTimeOptimizationEngine.start();
    
    res.json({
      success: true,
      message: 'Real-time optimization engine started successfully',
      status: realTimeOptimizationEngine.getEngineStatus(),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Start engine error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to start real-time optimization engine',
      error: error.message
    });
  }
};

// Stop the real-time optimization engine
const stopEngine = async (req, res) => {
  try {
    await realTimeOptimizationEngine.stop();
    
    res.json({
      success: true,
      message: 'Real-time optimization engine stopped successfully',
      status: realTimeOptimizationEngine.getEngineStatus(),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Stop engine error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to stop real-time optimization engine',
      error: error.message
    });
  }
};

// Get engine status and metrics
const getEngineStatus = async (req, res) => {
  try {
    const status = realTimeOptimizationEngine.getEngineStatus();
    
    res.json({
      success: true,
      data: status,
      message: `Engine is ${status.isRunning ? 'running' : 'stopped'}`,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Get engine status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get engine status',
      error: error.message
    });
  }
};

// Get real-time operational data
const getRealTimeData = async (req, res) => {
  try {
    if (!realTimeOptimizationEngine.isRunning) {
      return res.status(400).json({
        success: false,
        message: 'Real-time optimization engine is not running'
      });
    }

    const realTimeData = {
      passengerFlow: Array.from(realTimeOptimizationEngine.realTimeData.passengerFlow.entries()).map(([station, data]) => ({
        station,
        ...data
      })),
      trainPositions: Array.from(realTimeOptimizationEngine.realTimeData.trainPositions.entries()).map(([trainNumber, position]) => ({
        trainNumber,
        ...position
      })),
      weatherConditions: realTimeOptimizationEngine.realTimeData.weatherConditions,
      energyPricing: realTimeOptimizationEngine.realTimeData.energyPricing,
      maintenanceWindows: realTimeOptimizationEngine.realTimeData.maintenanceWindows,
      emergencyAlerts: realTimeOptimizationEngine.realTimeData.emergencyAlerts,
      crowdDensity: Array.from(realTimeOptimizationEngine.realTimeData.crowdDensity.entries()).map(([station, density]) => ({
        station,
        ...density
      }))
    };

    res.json({
      success: true,
      data: realTimeData,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Get real-time data error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get real-time data',
      error: error.message
    });
  }
};

// Get active optimizations
const getActiveOptimizations = async (req, res) => {
  try {
    if (!realTimeOptimizationEngine.isRunning) {
      return res.status(400).json({
        success: false,
        message: 'Real-time optimization engine is not running'
      });
    }

    const activeOptimizations = Array.from(realTimeOptimizationEngine.activeOptimizations.entries()).map(([id, optimization]) => ({
      optimizationId: id,
      strategy: optimization.strategy.priority,
      algorithm: optimization.strategy.algorithm,
      startTime: optimization.startTime,
      operationalContext: {
        periodType: optimization.operationalState.periodType,
        passengerLoad: optimization.operationalState.totalPassengerLoad,
        onTimePerformance: optimization.operationalState.onTimePerformance,
        energyEfficiency: optimization.operationalState.energyEfficiency
      },
      status: 'IN_PROGRESS'
    }));

    res.json({
      success: true,
      data: activeOptimizations,
      count: activeOptimizations.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Get active optimizations error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get active optimizations',
      error: error.message
    });
  }
};

// Force manual optimization cycle
const forceOptimizationCycle = async (req, res) => {
  try {
    if (!realTimeOptimizationEngine.isRunning) {
      return res.status(400).json({
        success: false,
        message: 'Real-time optimization engine is not running'
      });
    }

    const { strategy, urgency = 'manual' } = req.body;
    
    console.log('🔧 Manual optimization cycle triggered by user:', req.user?.username);

    // Execute manual optimization cycle
    await realTimeOptimizationEngine.executeOptimizationCycle();

    res.json({
      success: true,
      message: 'Manual optimization cycle triggered successfully',
      triggeredBy: req.user?.username || 'system',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Force optimization cycle error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to trigger manual optimization cycle',
      error: error.message
    });
  }
};

// Stop specific optimization
const stopOptimization = async (req, res) => {
  try {
    const { optimizationId } = req.params;

    if (!realTimeOptimizationEngine.activeOptimizations.has(optimizationId)) {
      return res.status(404).json({
        success: false,
        message: 'Optimization not found or already completed'
      });
    }

    await realTimeOptimizationEngine.stopOptimization(optimizationId);

    res.json({
      success: true,
      message: 'Optimization stopped successfully',
      optimizationId,
      stoppedBy: req.user?.username || 'system',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Stop optimization error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to stop optimization',
      error: error.message
    });
  }
};

// Get system performance metrics
const getSystemMetrics = async (req, res) => {
  try {
    if (!realTimeOptimizationEngine.isRunning) {
      return res.status(400).json({
        success: false,
        message: 'Real-time optimization engine is not running'
      });
    }

    const status = realTimeOptimizationEngine.getEngineStatus();
    
    // Get recent optimization history
    const recentOptimizations = await Optimization.find({
      type: 'real_time',
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
    }).sort({ createdAt: -1 }).limit(10).select('optimizationId execution.status results.fitnessScore results.improvementPercentage createdAt');

    // Calculate additional metrics
    const totalOptimizationsToday = await Optimization.countDocuments({
      type: 'real_time',
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    });

    const completedOptimizationsToday = await Optimization.countDocuments({
      type: 'real_time',
      'execution.status': 'COMPLETED',
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    });

    const avgFitnessScoreToday = await Optimization.aggregate([
      {
        $match: {
          type: 'real_time',
          'execution.status': 'COMPLETED',
          createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
        }
      },
      {
        $group: {
          _id: null,
          avgFitnessScore: { $avg: '$results.fitnessScore' },
          avgImprovement: { $avg: '$results.improvementPercentage' }
        }
      }
    ]);

    const systemMetrics = {
      ...status,
      dailyStats: {
        totalOptimizations: totalOptimizationsToday,
        completedOptimizations: completedOptimizationsToday,
        successRate: totalOptimizationsToday > 0 ? 
          ((completedOptimizationsToday / totalOptimizationsToday) * 100).toFixed(1) : '0',
        avgFitnessScore: avgFitnessScoreToday[0]?.avgFitnessScore?.toFixed(2) || '0',
        avgImprovement: avgFitnessScoreToday[0]?.avgImprovement?.toFixed(1) || '0'
      },
      recentOptimizations: recentOptimizations.map(opt => ({
        optimizationId: opt.optimizationId,
        status: opt.execution.status,
        fitnessScore: opt.results?.fitnessScore || 0,
        improvementPercentage: opt.results?.improvementPercentage || 0,
        createdAt: opt.createdAt
      })),
      operationalHealth: {
        passengerLoad: status.systemMetrics.averagePassengerLoad,
        capacityUtilization: status.systemMetrics.systemCapacityUtilization,
        onTimePerformance: status.systemMetrics.onTimePerformance,
        energyEfficiency: status.systemMetrics.energyEfficiency,
        overall: calculateOverallHealth(status.systemMetrics)
      }
    };

    res.json({
      success: true,
      data: systemMetrics,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Get system metrics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get system metrics',
      error: error.message
    });
  }
};

// Get operational insights and recommendations
const getOperationalInsights = async (req, res) => {
  try {
    if (!realTimeOptimizationEngine.isRunning) {
      return res.status(400).json({
        success: false,
        message: 'Real-time optimization engine is not running'
      });
    }

    const operationalState = await realTimeOptimizationEngine.analyzeOperationalState();
    const insights = generateOperationalInsights(operationalState);

    res.json({
      success: true,
      data: {
        operationalState: {
          periodType: operationalState.periodType,
          totalPassengerLoad: operationalState.totalPassengerLoad,
          systemCapacityUtilization: operationalState.systemCapacityUtilization,
          onTimePerformance: operationalState.onTimePerformance,
          energyEfficiency: operationalState.energyEfficiency,
          activeTrains: operationalState.activeTrains,
          weatherImpact: operationalState.weatherImpact,
          emergencyAlerts: operationalState.emergencyAlerts.length,
          crowdedStations: operationalState.crowdedStations.length
        },
        insights,
        recommendations: generateOperationalRecommendations(operationalState),
        alerts: generateOperationalAlerts(operationalState)
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Get operational insights error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get operational insights',
      error: error.message
    });
  }
};

// Helper functions
function calculateOverallHealth(metrics) {
  const weights = {
    averagePassengerLoad: 0.25,
    systemCapacityUtilization: 0.25,
    onTimePerformance: 0.3,
    energyEfficiency: 0.2
  };

  // Normalize passenger load (optimal around 0.6-0.8)
  const passengerLoadScore = metrics.averagePassengerLoad > 0.8 ? 
    (1 - (metrics.averagePassengerLoad - 0.8) / 0.2) : 
    metrics.averagePassengerLoad / 0.8;

  // Normalize capacity utilization (optimal around 0.7-0.85)
  const capacityScore = metrics.systemCapacityUtilization > 0.85 ? 
    (1 - (metrics.systemCapacityUtilization - 0.85) / 0.15) : 
    metrics.systemCapacityUtilization / 0.85;

  const overallScore = 
    (passengerLoadScore * weights.averagePassengerLoad) +
    (capacityScore * weights.systemCapacityUtilization) +
    (metrics.onTimePerformance * weights.onTimePerformance) +
    (metrics.energyEfficiency * weights.energyEfficiency);

  if (overallScore >= 0.9) return 'excellent';
  if (overallScore >= 0.8) return 'good';
  if (overallScore >= 0.7) return 'fair';
  if (overallScore >= 0.6) return 'poor';
  return 'critical';
}

function generateOperationalInsights(operationalState) {
  const insights = [];

  // Passenger load insights
  if (operationalState.totalPassengerLoad > 0.85) {
    insights.push({
      type: 'passenger_load',
      severity: 'high',
      title: 'High Passenger Demand',
      message: 'Current passenger load is very high. Consider increasing service frequency.',
      metric: operationalState.totalPassengerLoad,
      recommendation: 'Deploy additional trains or reduce headways'
    });
  } else if (operationalState.totalPassengerLoad < 0.3) {
    insights.push({
      type: 'passenger_load',
      severity: 'medium',
      title: 'Low Passenger Demand',
      message: 'Passenger load is low. Energy optimization opportunities available.',
      metric: operationalState.totalPassengerLoad,
      recommendation: 'Consider energy-efficient operations or reduced frequency'
    });
  }

  // Performance insights
  if (operationalState.onTimePerformance < 0.8) {
    insights.push({
      type: 'performance',
      severity: 'high',
      title: 'Poor On-Time Performance',
      message: `On-time performance is ${(operationalState.onTimePerformance * 100).toFixed(1)}%. Immediate attention required.`,
      metric: operationalState.onTimePerformance,
      recommendation: 'Review scheduling and identify bottlenecks'
    });
  }

  // Energy efficiency insights
  if (operationalState.energyEfficiency < 0.7) {
    insights.push({
      type: 'energy',
      severity: 'medium',
      title: 'Energy Efficiency Concern',
      message: 'Energy efficiency is below optimal levels.',
      metric: operationalState.energyEfficiency,
      recommendation: 'Implement energy-saving measures and optimize speeds'
    });
  }

  // Weather impact insights
  if (operationalState.weatherImpact !== 'none') {
    insights.push({
      type: 'weather',
      severity: operationalState.weatherImpact === 'severe' ? 'high' : 'medium',
      title: 'Weather Impact Detected',
      message: `Current weather conditions have ${operationalState.weatherImpact} impact on operations.`,
      recommendation: 'Monitor conditions and adjust operations accordingly'
    });
  }

  // Emergency alerts insights
  if (operationalState.emergencyAlerts.length > 0) {
    insights.push({
      type: 'emergency',
      severity: 'high',
      title: 'Active Emergency Alerts',
      message: `${operationalState.emergencyAlerts.length} active emergency alerts require attention.`,
      recommendation: 'Review and respond to emergency conditions'
    });
  }

  return insights;
}

function generateOperationalRecommendations(operationalState) {
  const recommendations = [];

  // Peak hour recommendations
  if (operationalState.periodType.includes('peak')) {
    recommendations.push({
      priority: 'high',
      category: 'service_optimization',
      title: 'Peak Hour Service Enhancement',
      description: 'Optimize service frequency and capacity during peak hours',
      actions: [
        'Deploy all available trains',
        'Minimize dwell times at stations',
        'Implement crowd management measures'
      ],
      expectedBenefit: 'Improved passenger throughput and satisfaction'
    });
  }

  // Energy optimization recommendations
  if (operationalState.energyPrice > 6) {
    recommendations.push({
      priority: 'medium',
      category: 'energy_optimization',
      title: 'High Energy Price Period',
      description: 'Implement energy-saving measures during high-price periods',
      actions: [
        'Optimize train speeds for energy efficiency',
        'Maximize regenerative braking',
        'Reduce non-essential energy consumption'
      ],
      expectedBenefit: 'Reduced operational costs'
    });
  }

  // Maintenance recommendations
  if (operationalState.maintenanceWindows.length > 0) {
    recommendations.push({
      priority: 'high',
      category: 'maintenance_coordination',
      title: 'Active Maintenance Windows',
      description: 'Coordinate service with ongoing maintenance activities',
      actions: [
        'Implement alternative service patterns',
        'Communicate service changes to passengers',
        'Monitor service quality during maintenance'
      ],
      expectedBenefit: 'Maintained service reliability during maintenance'
    });
  }

  return recommendations;
}

function generateOperationalAlerts(operationalState) {
  const alerts = [];

  // Critical performance alert
  if (operationalState.onTimePerformance < 0.75) {
    alerts.push({
      level: 'critical',
      type: 'performance',
      message: 'On-time performance critically low',
      value: `${(operationalState.onTimePerformance * 100).toFixed(1)}%`,
      threshold: '75%'
    });
  }

  // High passenger load alert
  if (operationalState.totalPassengerLoad > 0.9) {
    alerts.push({
      level: 'warning',
      type: 'capacity',
      message: 'System approaching capacity limits',
      value: `${(operationalState.totalPassengerLoad * 100).toFixed(1)}%`,
      threshold: '90%'
    });
  }

  // Energy efficiency alert
  if (operationalState.energyEfficiency < 0.6) {
    alerts.push({
      level: 'warning',
      type: 'energy',
      message: 'Energy efficiency below acceptable levels',
      value: `${(operationalState.energyEfficiency * 100).toFixed(1)}%`,
      threshold: '60%'
    });
  }

  // Crowded stations alert
  if (operationalState.crowdedStations.length > 3) {
    alerts.push({
      level: 'warning',
      type: 'crowding',
      message: 'Multiple stations experiencing high crowd density',
      value: `${operationalState.crowdedStations.length} stations`,
      threshold: '3 stations'
    });
  }

  return alerts;
}

module.exports = {
  startEngine,
  stopEngine,
  getEngineStatus,
  getRealTimeData,
  getActiveOptimizations,
  forceOptimizationCycle,
  stopOptimization,
  getSystemMetrics,
  getOperationalInsights
};