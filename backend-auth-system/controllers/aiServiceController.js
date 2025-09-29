const aiOptimizationService = require('../services/aiOptimizationService');

// Initialize AI optimization service
const initializeAIService = async (req, res) => {
  try {
    await aiOptimizationService.initialize();
    
    res.json({
      success: true,
      message: 'AI Optimization Service initialized successfully',
      status: aiOptimizationService.getServiceStatus(),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Initialize AI service error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to initialize AI service',
      error: error.message
    });
  }
};

// Get AI service status and metrics
const getAIServiceStatus = async (req, res) => {
  try {
    const status = aiOptimizationService.getServiceStatus();
    
    res.json({
      success: true,
      data: status,
      message: `AI service is ${status.isInitialized ? 'initialized' : 'not initialized'}`,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Get AI service status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get AI service status',
      error: error.message
    });
  }
};

// Get AI-powered algorithm recommendation
const getAIAlgorithmRecommendation = async (req, res) => {
  try {
    if (!aiOptimizationService.isInitialized) {
      return res.status(400).json({
        success: false,
        message: 'AI service is not initialized'
      });
    }

    const operationalContext = req.body;
    
    // Validate required context fields
    if (!operationalContext) {
      return res.status(400).json({
        success: false,
        message: 'Operational context is required'
      });
    }

    const recommendation = await aiOptimizationService.getOptimalAlgorithm(operationalContext);
    
    res.json({
      success: true,
      data: recommendation,
      message: 'AI algorithm recommendation generated',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Get AI algorithm recommendation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get AI algorithm recommendation',
      error: error.message
    });
  }
};

// Generate AI predictions for operational context
const generateAIPredictions = async (req, res) => {
  try {
    if (!aiOptimizationService.isInitialized) {
      return res.status(400).json({
        success: false,
        message: 'AI service is not initialized'
      });
    }

    const operationalContext = req.body;
    
    const predictions = await aiOptimizationService.generatePredictions(operationalContext);
    
    res.json({
      success: true,
      data: {
        predictions,
        context: operationalContext,
        generatedAt: new Date().toISOString(),
        modelAccuracy: aiOptimizationService.modelAccuracy
      },
      message: 'AI predictions generated successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Generate AI predictions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate AI predictions',
      error: error.message
    });
  }
};

// Detect anomalies in optimization results
const detectOptimizationAnomalies = async (req, res) => {
  try {
    if (!aiOptimizationService.isInitialized) {
      return res.status(400).json({
        success: false,
        message: 'AI service is not initialized'
      });
    }

    const optimizationResult = req.body;
    
    const anomalyDetection = aiOptimizationService.detectAnomalies(optimizationResult);
    
    res.json({
      success: true,
      data: {
        ...anomalyDetection,
        analyzedResult: {
          fitnessScore: optimizationResult.fitnessScore,
          improvementPercentage: optimizationResult.improvementPercentage,
          energyEfficiency: optimizationResult.metrics?.totalDistance / optimizationResult.metrics?.energyConsumption
        }
      },
      message: anomalyDetection.hasAnomaly ? 'Anomalies detected' : 'No anomalies detected',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Detect optimization anomalies error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to detect optimization anomalies',
      error: error.message
    });
  }
};

// Update AI models with new optimization result
const updateAIModels = async (req, res) => {
  try {
    if (!aiOptimizationService.isInitialized) {
      return res.status(400).json({
        success: false,
        message: 'AI service is not initialized'
      });
    }

    const { optimizationResult, operationalContext } = req.body;
    
    if (!optimizationResult || !operationalContext) {
      return res.status(400).json({
        success: false,
        message: 'Both optimization result and operational context are required'
      });
    }

    await aiOptimizationService.updateModelsWithResult(optimizationResult, operationalContext);
    
    res.json({
      success: true,
      message: 'AI models updated with new optimization result',
      updatedModels: Object.keys(aiOptimizationService.models),
      newModelAccuracy: aiOptimizationService.modelAccuracy,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Update AI models error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update AI models',
      error: error.message
    });
  }
};

// Get pattern recognition insights
const getPatternInsights = async (req, res) => {
  try {
    if (!aiOptimizationService.isInitialized) {
      return res.status(400).json({
        success: false,
        message: 'AI service is not initialized'
      });
    }

    const { type = 'all' } = req.query;
    
    const insights = {
      timestamp: new Date().toISOString()
    };

    if (type === 'all' || type === 'peak_hours') {
      insights.peakHourPatterns = Array.from(aiOptimizationService.patternRecognition.peakHourPatterns.entries())
        .map(([hour, pattern]) => ({
          hour,
          ...pattern
        }))
        .sort((a, b) => a.hour - b.hour);
    }

    if (type === 'all' || type === 'seasonal') {
      insights.seasonalPatterns = Array.from(aiOptimizationService.patternRecognition.seasonalPatterns.entries())
        .map(([month, pattern]) => ({
          month,
          monthName: getMonthName(month),
          ...pattern
        }))
        .sort((a, b) => a.month - b.month);
    }

    if (type === 'all' || type === 'weather') {
      insights.weatherPatterns = Array.from(aiOptimizationService.patternRecognition.weatherPatterns.entries())
        .map(([weather, pattern]) => ({
          weather,
          ...pattern
        }));
    }

    if (type === 'all' || type === 'anomaly') {
      const baseline = aiOptimizationService.patternRecognition.anomalyDetection.get('baseline');
      const thresholds = aiOptimizationService.patternRecognition.anomalyDetection.get('thresholds');
      
      insights.anomalyDetection = {
        baseline: baseline || {},
        thresholds: thresholds || {}
      };
    }

    res.json({
      success: true,
      data: insights,
      message: 'Pattern recognition insights retrieved',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Get pattern insights error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get pattern insights',
      error: error.message
    });
  }
};

// Get model performance metrics
const getModelPerformance = async (req, res) => {
  try {
    if (!aiOptimizationService.isInitialized) {
      return res.status(400).json({
        success: false,
        message: 'AI service is not initialized'
      });
    }

    const performance = {
      modelAccuracy: aiOptimizationService.modelAccuracy,
      lastTrainingTime: aiOptimizationService.lastTrainingTime,
      modelDetails: {},
      healthScore: aiOptimizationService.calculateHealthScore(),
      dataQuality: {
        passengerPatterns: aiOptimizationService.historicalData.passengerPatterns.length,
        energyConsumption: aiOptimizationService.historicalData.energyConsumption.length,
        delays: aiOptimizationService.historicalData.delays.length
      }
    };

    // Get detailed model information
    for (const [modelName, model] of Object.entries(aiOptimizationService.models)) {
      if (model) {
        performance.modelDetails[modelName] = {
          type: model.type,
          accuracy: model.accuracy,
          lastTrained: model.lastTrained,
          predictions: model.predictions || 0,
          layers: model.layers,
          learningRate: model.learningRate
        };
      }
    }

    res.json({
      success: true,
      data: performance,
      message: 'Model performance metrics retrieved',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Get model performance error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get model performance',
      error: error.message
    });
  }
};

// Trigger manual model retraining
const triggerModelRetraining = async (req, res) => {
  try {
    if (!aiOptimizationService.isInitialized) {
      return res.status(400).json({
        success: false,
        message: 'AI service is not initialized'
      });
    }

    const { type = 'incremental' } = req.body;
    
    console.log(`🎯 Manual ${type} training triggered by user:`, req.user?.username);

    if (type === 'full') {
      await aiOptimizationService.performInitialTraining();
    } else {
      await aiOptimizationService.performIncrementalTraining();
    }

    const newAccuracy = aiOptimizationService.modelAccuracy;
    
    res.json({
      success: true,
      message: `Manual ${type} training completed successfully`,
      newModelAccuracy: newAccuracy,
      healthScore: aiOptimizationService.calculateHealthScore(),
      triggeredBy: req.user?.username || 'system',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Trigger model retraining error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to trigger model retraining',
      error: error.message
    });
  }
};

// Get AI recommendations for operational improvements
const getOperationalRecommendations = async (req, res) => {
  try {
    if (!aiOptimizationService.isInitialized) {
      return res.status(400).json({
        success: false,
        message: 'AI service is not initialized'
      });
    }

    const operationalContext = req.body;
    
    // Generate comprehensive AI analysis
    const [predictions, contextAnalysis, patternMatch] = await Promise.all([
      aiOptimizationService.generatePredictions(operationalContext),
      Promise.resolve(aiOptimizationService.analyzeContext(operationalContext)),
      Promise.resolve(aiOptimizationService.matchHistoricalPatterns(operationalContext))
    ]);

    // Generate operational recommendations
    const recommendations = generateOperationalRecommendations(
      predictions, 
      contextAnalysis, 
      patternMatch, 
      operationalContext
    );

    res.json({
      success: true,
      data: {
        predictions,
        contextAnalysis,
        patternMatch,
        recommendations,
        confidence: calculateOverallConfidence(predictions, contextAnalysis, patternMatch),
        applicableTimeframe: determineTimeframe(contextAnalysis),
        priority: assessPriority(recommendations)
      },
      message: 'Operational recommendations generated',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Get operational recommendations error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get operational recommendations',
      error: error.message
    });
  }
};

// Helper functions
function getMonthName(month) {
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return monthNames[month] || 'Unknown';
}

function generateOperationalRecommendations(predictions, contextAnalysis, patternMatch, operationalContext) {
  const recommendations = [];

  // High passenger demand recommendations
  if (predictions.passengerDemand > 0.8) {
    recommendations.push({
      category: 'capacity_management',
      priority: 'high',
      title: 'Increase Service Frequency',
      description: 'AI predicts high passenger demand. Consider deploying additional trains or reducing headways.',
      expectedImpact: 'Improve passenger satisfaction and reduce overcrowding',
      confidenceLevel: 0.85,
      timeframe: 'immediate',
      actions: [
        'Deploy all available trainsets',
        'Reduce minimum headway to 2-3 minutes',
        'Implement crowd management at major stations'
      ]
    });
  }

  // Energy optimization recommendations
  if (contextAnalysis.operationalMode === 'energy_focused' || predictions.energyConsumption > 1800) {
    recommendations.push({
      category: 'energy_efficiency',
      priority: 'medium',
      title: 'Implement Energy Optimization',
      description: 'AI analysis suggests opportunities for energy savings through optimized operations.',
      expectedImpact: 'Reduce operational costs by 8-12%',
      confidenceLevel: 0.78,
      timeframe: 'short_term',
      actions: [
        'Optimize train speeds for energy efficiency',
        'Implement regenerative braking strategies',
        'Schedule energy-intensive operations during off-peak pricing'
      ]
    });
  }

  // Delay prevention recommendations
  if (predictions.delayProbability > 0.3) {
    recommendations.push({
      category: 'reliability',
      priority: 'high',
      title: 'Proactive Delay Prevention',
      description: 'AI predicts higher than normal delay risk. Implement preventive measures.',
      expectedImpact: 'Maintain on-time performance above 90%',
      confidenceLevel: 0.82,
      timeframe: 'immediate',
      actions: [
        'Increase buffer times in critical sections',
        'Enhance weather monitoring and response',
        'Prepare contingency plans for high-risk periods'
      ]
    });
  }

  // Maintenance optimization recommendations
  if (predictions.maintenanceRisk > 0.7) {
    recommendations.push({
      category: 'maintenance',
      priority: 'high',
      title: 'Urgent Maintenance Review',
      description: 'AI analysis indicates elevated maintenance risk. Schedule preventive maintenance.',
      expectedImpact: 'Prevent service disruptions and equipment failures',
      confidenceLevel: 0.75,
      timeframe: 'immediate',
      actions: [
        'Conduct immediate system diagnostics',
        'Schedule preventive maintenance for high-risk components',
        'Prepare backup equipment and contingency plans'
      ]
    });
  }

  // Pattern-based recommendations
  if (patternMatch.confidence > 0.8) {
    recommendations.push({
      category: 'pattern_optimization',
      priority: 'medium',
      title: 'Apply Historical Best Practices',
      description: `AI found strong similarity to historical scenario with ${patternMatch.historicalPerformance?.fitnessScore?.toFixed(1)} fitness score.`,
      expectedImpact: `Expected improvement: ${patternMatch.historicalPerformance?.improvement?.toFixed(1)}%`,
      confidenceLevel: patternMatch.confidence,
      timeframe: 'short_term',
      actions: [
        `Use ${patternMatch.recommendedAlgorithm} algorithm`,
        'Apply similar operational parameters',
        'Monitor performance against historical benchmark'
      ]
    });
  }

  return recommendations;
}

function calculateOverallConfidence(predictions, contextAnalysis, patternMatch) {
  // Calculate weighted confidence based on different factors
  const weights = {
    systemStress: 0.3,
    patternMatch: 0.4,
    contextClarity: 0.3
  };

  const systemStressConfidence = 1 - predictions.systemStress; // Lower stress = higher confidence
  const patternMatchConfidence = patternMatch.confidence;
  const contextClarityConfidence = contextAnalysis.riskLevel === 'low' ? 0.9 : 
                                  contextAnalysis.riskLevel === 'medium' ? 0.7 : 0.5;

  const overallConfidence = 
    (systemStressConfidence * weights.systemStress) +
    (patternMatchConfidence * weights.patternMatch) +
    (contextClarityConfidence * weights.contextClarity);

  return Math.round(overallConfidence * 100) / 100; // Round to 2 decimal places
}

function determineTimeframe(contextAnalysis) {
  if (contextAnalysis.riskLevel === 'high') return 'immediate';
  if (contextAnalysis.operationalMode === 'emergency_mode') return 'immediate';
  if (contextAnalysis.timeOfDay.includes('peak')) return 'short_term';
  return 'medium_term';
}

function assessPriority(recommendations) {
  const highPriority = recommendations.filter(r => r.priority === 'high').length;
  const totalRecommendations = recommendations.length;
  
  if (highPriority / totalRecommendations > 0.6) return 'critical';
  if (highPriority > 0) return 'high';
  return 'medium';
}

module.exports = {
  initializeAIService,
  getAIServiceStatus,
  getAIAlgorithmRecommendation,
  generateAIPredictions,
  detectOptimizationAnomalies,
  updateAIModels,
  getPatternInsights,
  getModelPerformance,
  triggerModelRetraining,
  getOperationalRecommendations
};