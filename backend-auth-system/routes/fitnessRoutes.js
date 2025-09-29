const express = require('express');
const {
  getAllFitnessAssessments,
  getFitnessAssessmentById,
  createFitnessAssessment,
  getFitnessDashboard,
  getRealTimeFitnessData,
  fitnessAnalytics
} = require('../controllers/fitnessController');

const router = express.Router();

// Fitness Assessment Routes

// GET /api/fitness - Get all fitness assessments with filtering
// Query params: page, limit, trainsetNumber, status, assessmentType, minScore, maxScore, sortBy, sortOrder
router.get('/', getAllFitnessAssessments);

// GET /api/fitness/dashboard - Get fitness dashboard analytics
// Query params: period (days for trend analysis)
router.get('/dashboard', getFitnessDashboard);

// GET /api/fitness/:id - Get fitness assessment by ID
router.get('/:id', getFitnessAssessmentById);

// POST /api/fitness - Create new fitness assessment
// Body: trainsetId, trainsetNumber, assessmentType, inspectorId, inspectorName, inspectorCertification, assessmentLocation, sensorData, specialCircumstances
router.post('/', createFitnessAssessment);

// GET /api/fitness/realtime/:trainsetId - Get real-time fitness monitoring data
router.get('/realtime/:trainsetId', getRealTimeFitnessData);

// Advanced Analytics Routes

// GET /api/fitness/analytics/fleet-health - Get fleet-wide health statistics
router.get('/analytics/fleet-health', async (req, res) => {
  try {
    const { period = '30' } = req.query;
    const days = parseInt(period);
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const Fitness = require('../models/Fitness');
    
    const [
      fleetAverage,
      healthTrends,
      systemHealth,
      criticalTrainsets,
      performanceDistribution
    ] = await Promise.all([
      // Fleet average score
      Fitness.getFleetAverageScore(),
      
      // Health trends over time
      Fitness.aggregate([
        {
          $match: {
            'assessmentDetails.assessmentDate': { $gte: startDate }
          }
        },
        {
          $group: {
            _id: {
              $dateToString: {
                format: '%Y-%m-%d',
                date: '$assessmentDetails.assessmentDate'
              }
            },
            avgOverallScore: { $avg: '$healthMetrics.overall.fitnessScore' },
            avgMechanical: { $avg: '$healthMetrics.mechanical.average' },
            avgElectrical: { $avg: '$healthMetrics.electrical.average' },
            avgSafety: { $avg: '$healthMetrics.safety.average' },
            avgComfort: { $avg: '$healthMetrics.comfort.average' },
            assessmentCount: { $sum: 1 }
          }
        },
        { $sort: { '_id': 1 } }
      ]),
      
      // System health breakdown
      Fitness.aggregate([
        {
          $group: {
            _id: null,
            avgMechanical: { $avg: '$healthMetrics.mechanical.average' },
            avgElectrical: { $avg: '$healthMetrics.electrical.average' },
            avgSafety: { $avg: '$healthMetrics.safety.average' },
            avgComfort: { $avg: '$healthMetrics.comfort.average' },
            avgReliability: { $avg: '$healthMetrics.overall.reliability' },
            avgAvailability: { $avg: '$healthMetrics.overall.availability' }
          }
        }
      ]),
      
      // Critical trainsets
      Fitness.find({
        'healthMetrics.overall.fitnessScore': { $lt: 6.0 }
      })
      .sort({ 'healthMetrics.overall.fitnessScore': 1 })
      .limit(10)
      .select('trainsetNumber healthMetrics.overall assessmentDetails.assessmentDate results.criticalIssues'),
      
      // Performance distribution
      Fitness.aggregate([
        {
          $bucket: {
            groupBy: '$healthMetrics.overall.fitnessScore',
            boundaries: [0, 5, 6, 7, 8, 9, 10],
            default: 'other',
            output: {
              count: { $sum: 1 },
              avgScore: { $avg: '$healthMetrics.overall.fitnessScore' },
              trainsets: { $addToSet: '$trainsetNumber' }
            }
          }
        }
      ])
    ]);

    res.json({
      success: true,
      data: {
        fleetSummary: {
          averageScore: Math.round(fleetAverage * 100) / 100,
          totalAssessments: await Fitness.countDocuments(),
          lastUpdated: new Date().toISOString()
        },
        systemHealth: systemHealth[0] || {},
        healthTrends,
        criticalTrainsets,
        performanceDistribution,
        analysis: {
          period: days,
          dataQuality: healthTrends.length > 0 ? 'GOOD' : 'LIMITED'
        }
      }
    });
  } catch (error) {
    console.error('Error fetching fleet health analytics:', error);
    res.status(500).json({
      error: 'Failed to fetch fleet health analytics',
      details: error.message
    });
  }
});

// GET /api/fitness/analytics/predictive-maintenance - Get predictive maintenance insights
router.get('/analytics/predictive-maintenance', async (req, res) => {
  try {
    const { trainsetId } = req.query;
    const Fitness = require('../models/Fitness');
    const Trainset = require('../models/Trainset');
    
    let query = {};
    if (trainsetId) {
      query.trainsetId = trainsetId;
    }
    
    // Get recent assessments with AI analysis
    const assessments = await Fitness.find(query)
      .sort({ 'assessmentDetails.assessmentDate': -1 })
      .limit(50)
      .populate('trainsetId', 'trainsetNumber manufacturer model currentMileage')
      .select('trainsetNumber aiAnalysis.predictiveInsights healthMetrics.overall operationalContext assessmentDetails.assessmentDate');
    
    // Aggregate predictive insights
    const insights = {
      maintenanceAlerts: [],
      performancePredictions: [],
      costProjections: [],
      riskAssessments: []
    };
    
    assessments.forEach(assessment => {
      if (assessment.aiAnalysis?.predictiveInsights) {
        assessment.aiAnalysis.predictiveInsights.forEach(insight => {
          const enrichedInsight = {
            ...insight,
            trainsetNumber: assessment.trainsetNumber,
            currentScore: assessment.healthMetrics.overall.fitnessScore,
            lastAssessment: assessment.assessmentDetails.assessmentDate,
            mileage: assessment.operationalContext?.totalMileage
          };
          
          if (insight.category === 'Maintenance') {
            insights.maintenanceAlerts.push(enrichedInsight);
          } else if (insight.category === 'Performance') {
            insights.performancePredictions.push(enrichedInsight);
          } else if (insight.category === 'Energy Efficiency') {
            insights.costProjections.push(enrichedInsight);
          }
        });
      }
      
      // Generate risk assessment
      const riskLevel = assessment.healthMetrics.overall.fitnessScore < 6 ? 'HIGH' :
                       assessment.healthMetrics.overall.fitnessScore < 7.5 ? 'MEDIUM' : 'LOW';
      
      if (riskLevel !== 'LOW') {
        insights.riskAssessments.push({
          trainsetNumber: assessment.trainsetNumber,
          riskLevel,
          currentScore: assessment.healthMetrics.overall.fitnessScore,
          lastAssessment: assessment.assessmentDetails.assessmentDate,
          recommendedAction: riskLevel === 'HIGH' ? 'Immediate inspection required' : 'Schedule maintenance within 30 days'
        });
      }
    });
    
    // Sort by priority
    insights.maintenanceAlerts.sort((a, b) => b.confidence - a.confidence);
    insights.performancePredictions.sort((a, b) => a.currentScore - b.currentScore);
    insights.riskAssessments.sort((a, b) => 
      (b.riskLevel === 'HIGH' ? 2 : b.riskLevel === 'MEDIUM' ? 1 : 0) - 
      (a.riskLevel === 'HIGH' ? 2 : a.riskLevel === 'MEDIUM' ? 1 : 0)
    );

    res.json({
      success: true,
      data: {
        summary: {
          totalAlerts: insights.maintenanceAlerts.length,
          highRiskTrainsets: insights.riskAssessments.filter(r => r.riskLevel === 'HIGH').length,
          mediumRiskTrainsets: insights.riskAssessments.filter(r => r.riskLevel === 'MEDIUM').length,
          performanceWarnings: insights.performancePredictions.length
        },
        insights,
        lastUpdated: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error fetching predictive maintenance insights:', error);
    res.status(500).json({
      error: 'Failed to fetch predictive maintenance insights',
      details: error.message
    });
  }
});

// GET /api/fitness/analytics/energy-efficiency - Get energy efficiency analytics
router.get('/analytics/energy-efficiency', async (req, res) => {
  try {
    const { period = '30', trainsetId } = req.query;
    const days = parseInt(period);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const Fitness = require('../models/Fitness');
    
    let matchStage = {
      'assessmentDetails.assessmentDate': { $gte: startDate }
    };
    
    if (trainsetId) {
      matchStage.trainsetId = require('mongoose').Types.ObjectId(trainsetId);
    }
    
    const [energyTrends, efficiencyDistribution, topPerformers, energyInsights] = await Promise.all([
      // Energy efficiency trends over time
      Fitness.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: {
              $dateToString: {
                format: '%Y-%m-%d',
                date: '$assessmentDetails.assessmentDate'
              }
            },
            avgEnergyScore: { $avg: '$performanceMetrics.energy.energyEfficiencyScore' },
            avgConsumption: { $avg: '$performanceMetrics.energy.powerConsumptionPerKm' },
            avgRegenerativeBraking: { $avg: '$performanceMetrics.energy.regenerativeBrakingEfficiency' },
            assessmentCount: { $sum: 1 }
          }
        },
        { $sort: { '_id': 1 } }
      ]),
      
      // Energy efficiency distribution
      Fitness.aggregate([
        { $match: matchStage },
        {
          $bucket: {
            groupBy: '$performanceMetrics.energy.energyEfficiencyScore',
            boundaries: [0, 5, 6, 7, 8, 9, 10],
            default: 'other',
            output: {
              count: { $sum: 1 },
              avgConsumption: { $avg: '$performanceMetrics.energy.powerConsumptionPerKm' },
              trainsets: { $addToSet: '$trainsetNumber' }
            }
          }
        }
      ]),
      
      // Top energy efficient trainsets
      Fitness.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: '$trainsetNumber',
            avgEnergyScore: { $avg: '$performanceMetrics.energy.energyEfficiencyScore' },
            avgConsumption: { $avg: '$performanceMetrics.energy.powerConsumptionPerKm' },
            avgRegenBraking: { $avg: '$performanceMetrics.energy.regenerativeBrakingEfficiency' },
            assessmentCount: { $sum: 1 },
            latestAssessment: { $max: '$assessmentDetails.assessmentDate' }
          }
        },
        { $sort: { avgEnergyScore: -1 } },
        { $limit: 10 }
      ]),
      
      // Energy-related insights
      Fitness.aggregate([
        { $match: matchStage },
        { $unwind: '$aiAnalysis.predictiveInsights' },
        { $match: { 'aiAnalysis.predictiveInsights.category': 'Energy Efficiency' } },
        {
          $group: {
            _id: '$aiAnalysis.predictiveInsights.prediction',
            count: { $sum: 1 },
            avgConfidence: { $avg: '$aiAnalysis.predictiveInsights.confidence' },
            trainsets: { $addToSet: '$trainsetNumber' }
          }
        },
        { $sort: { count: -1 } }
      ])
    ]);

    // Calculate energy savings potential
    const avgConsumption = topPerformers.reduce((sum, tp) => sum + tp.avgConsumption, 0) / topPerformers.length;
    const worstPerformers = await Fitness.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$trainsetNumber',
          avgConsumption: { $avg: '$performanceMetrics.energy.powerConsumptionPerKm' },
          avgEnergyScore: { $avg: '$performanceMetrics.energy.energyEfficiencyScore' }
        }
      },
      { $sort: { avgEnergyScore: 1 } },
      { $limit: 5 }
    ]);

    const potentialSavings = worstPerformers.length > 0 
      ? worstPerformers.reduce((sum, wp) => sum + (wp.avgConsumption - avgConsumption), 0)
      : 0;

    res.json({
      success: true,
      data: {
        summary: {
          avgEnergyScore: energyTrends.length > 0 
            ? (energyTrends.reduce((sum, t) => sum + t.avgEnergyScore, 0) / energyTrends.length).toFixed(2)
            : 0,
          avgConsumption: energyTrends.length > 0 
            ? (energyTrends.reduce((sum, t) => sum + t.avgConsumption, 0) / energyTrends.length).toFixed(2)
            : 0,
          potentialSavingsKwh: potentialSavings.toFixed(2),
          improvementOpportunities: energyInsights.length
        },
        trends: energyTrends,
        distribution: efficiencyDistribution,
        topPerformers,
        worstPerformers,
        insights: energyInsights,
        recommendations: [
          {
            priority: 'HIGH',
            action: 'Optimize regenerative braking efficiency',
            impact: 'Up to 15% energy savings',
            effort: 'Medium'
          },
          {
            priority: 'MEDIUM',
            action: 'Implement predictive energy management',
            impact: 'Up to 8% energy savings',
            effort: 'High'
          },
          {
            priority: 'LOW',
            action: 'Regular motor calibration',
            impact: 'Up to 5% energy savings',
            effort: 'Low'
          }
        ],
        period: days,
        lastUpdated: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error fetching energy efficiency analytics:', error);
    res.status(500).json({
      error: 'Failed to fetch energy efficiency analytics',
      details: error.message
    });
  }
});

// GET /api/fitness/analytics/safety-compliance - Get safety compliance analytics
router.get('/analytics/safety-compliance', async (req, res) => {
  try {
    const { period = '90' } = req.query;
    const days = parseInt(period);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const Fitness = require('../models/Fitness');
    
    const [
      complianceOverview,
      safetyTrends,
      nonComplianceIssues,
      safetySystemHealth,
      emergencyReadiness
    ] = await Promise.all([
      // Overall compliance statistics
      Fitness.aggregate([
        {
          $match: {
            'assessmentDetails.assessmentDate': { $gte: startDate }
          }
        },
        {
          $group: {
            _id: null,
            totalAssessments: { $sum: 1 },
            safetyCompliant: {
              $sum: { $cond: ['$results.compliance.safetyStandards.isCompliant', 1, 0] }
            },
            performanceCompliant: {
              $sum: { $cond: ['$results.compliance.performanceStandards.isCompliant', 1, 0] }
            },
            avgSafetyScore: { $avg: '$healthMetrics.safety.average' },
            criticalSafetyIssues: {
              $sum: {
                $size: {
                  $filter: {
                    input: '$results.criticalIssues',
                    cond: { $eq: ['$$this.category', 'SAFETY'] }
                  }
                }
              }
            }
          }
        }
      ]),
      
      // Safety score trends
      Fitness.aggregate([
        {
          $match: {
            'assessmentDetails.assessmentDate': { $gte: startDate }
          }
        },
        {
          $group: {
            _id: {
              $dateToString: {
                format: '%Y-%m-%d',
                date: '$assessmentDetails.assessmentDate'
              }
            },
            avgSafetyScore: { $avg: '$healthMetrics.safety.average' },
            avgEmergencyBrakes: { $avg: '$healthMetrics.safety.emergencyBrakes' },
            avgFireSuppression: { $avg: '$healthMetrics.safety.fireSuppressionSystem' },
            avgEmergencyExits: { $avg: '$healthMetrics.safety.emergencyExits' },
            complianceRate: {
              $avg: { $cond: ['$results.compliance.safetyStandards.isCompliant', 100, 0] }
            }
          }
        },
        { $sort: { '_id': 1 } }
      ]),
      
      // Non-compliance issues breakdown
      Fitness.aggregate([
        {
          $match: {
            'assessmentDetails.assessmentDate': { $gte: startDate },
            'results.compliance.safetyStandards.isCompliant': false
          }
        },
        { $unwind: '$results.compliance.safetyStandards.nonComplianceIssues' },
        {
          $group: {
            _id: '$results.compliance.safetyStandards.nonComplianceIssues',
            count: { $sum: 1 },
            trainsets: { $addToSet: '$trainsetNumber' },
            avgSafetyScore: { $avg: '$healthMetrics.safety.average' }
          }
        },
        { $sort: { count: -1 } }
      ]),
      
      // Safety system component health
      Fitness.aggregate([
        {
          $match: {
            'assessmentDetails.assessmentDate': { $gte: startDate }
          }
        },
        {
          $group: {
            _id: null,
            avgEmergencyBrakes: { $avg: '$healthMetrics.safety.emergencyBrakes' },
            avgFireSuppression: { $avg: '$healthMetrics.safety.fireSuppressionSystem' },
            avgEmergencyExits: { $avg: '$healthMetrics.safety.emergencyExits' },
            avgCommunication: { $avg: '$healthMetrics.safety.communicationSystems' },
            avgSignaging: { $avg: '$healthMetrics.safety.signagingClarity' },
            avgCCTV: { $avg: '$healthMetrics.safety.cctvSystems' },
            avgAccessibility: { $avg: '$healthMetrics.safety.accessibilityFeatures' }
          }
        }
      ]),
      
      // Emergency preparedness
      Fitness.aggregate([
        {
          $match: {
            'assessmentDetails.assessmentDate': { $gte: startDate }
          }
        },
        {
          $group: {
            _id: '$trainsetNumber',
            avgEmergencyPreparedness: { $avg: '$passengerExperience.emergencyPreparedness' },
            latestAssessment: { $max: '$assessmentDetails.assessmentDate' },
            safetyScore: { $avg: '$healthMetrics.safety.average' }
          }
        },
        { $sort: { avgEmergencyPreparedness: -1 } },
        { $limit: 20 }
      ])
    ]);

    // Calculate compliance rates
    const overview = complianceOverview[0] || {};
    const safetyComplianceRate = overview.totalAssessments > 0 
      ? (overview.safetyCompliant / overview.totalAssessments * 100).toFixed(1)
      : 0;
    const performanceComplianceRate = overview.totalAssessments > 0 
      ? (overview.performanceCompliant / overview.totalAssessments * 100).toFixed(1)
      : 0;

    res.json({
      success: true,
      data: {
        summary: {
          totalAssessments: overview.totalAssessments || 0,
          safetyComplianceRate: parseFloat(safetyComplianceRate),
          performanceComplianceRate: parseFloat(performanceComplianceRate),
          averageSafetyScore: overview.avgSafetyScore ? overview.avgSafetyScore.toFixed(2) : 0,
          criticalSafetyIssues: overview.criticalSafetyIssues || 0
        },
        trends: safetyTrends,
        systemHealth: safetySystemHealth[0] || {},
        nonComplianceIssues,
        emergencyReadiness,
        recommendations: [
          {
            priority: 'CRITICAL',
            area: 'Emergency Systems',
            action: 'Conduct monthly emergency system drills',
            impact: 'Improved emergency response time by 25%'
          },
          {
            priority: 'HIGH',
            area: 'Fire Suppression',
            action: 'Upgrade fire suppression system sensors',
            impact: 'Enhanced early fire detection capabilities'
          },
          {
            priority: 'MEDIUM',
            area: 'Communication',
            action: 'Regular PA system maintenance',
            impact: 'Improved passenger communication during emergencies'
          }
        ],
        compliance: {
          standards: ['IS 16295:2014', 'EN 50128:2011', 'IEC 62267:2009'],
          nextAuditDue: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString(),
          certificationStatus: 'VALID'
        },
        period: days,
        lastUpdated: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error fetching safety compliance analytics:', error);
    res.status(500).json({
      error: 'Failed to fetch safety compliance analytics',
      details: error.message
    });
  }
});

// POST /api/fitness/analytics/custom-report - Generate custom fitness report
router.post('/analytics/custom-report', async (req, res) => {
  try {
    const {
      reportType,
      trainsetIds,
      dateRange,
      metrics,
      format = 'json'
    } = req.body;

    const Fitness = require('../models/Fitness');
    
    // Build query based on filters
    let query = {};
    
    if (trainsetIds && trainsetIds.length > 0) {
      query.trainsetId = { $in: trainsetIds.map(id => require('mongoose').Types.ObjectId(id)) };
    }
    
    if (dateRange) {
      query['assessmentDetails.assessmentDate'] = {
        $gte: new Date(dateRange.start),
        $lte: new Date(dateRange.end)
      };
    }

    // Generate report based on type
    let reportData = {};
    
    switch (reportType) {
      case 'COMPREHENSIVE':
        reportData = await generateComprehensiveReport(query, metrics);
        break;
      case 'SUMMARY':
        reportData = await generateSummaryReport(query, metrics);
        break;
      case 'TREND_ANALYSIS':
        reportData = await generateTrendAnalysisReport(query, metrics);
        break;
      case 'COMPLIANCE':
        reportData = await generateComplianceReport(query, metrics);
        break;
      default:
        reportData = await generateSummaryReport(query, metrics);
    }

    res.json({
      success: true,
      data: {
        reportType,
        filters: { trainsetIds, dateRange, metrics },
        report: reportData,
        generatedAt: new Date().toISOString(),
        format
      }
    });
  } catch (error) {
    console.error('Error generating custom fitness report:', error);
    res.status(500).json({
      error: 'Failed to generate custom fitness report',
      details: error.message
    });
  }
});

// Helper functions for custom reports
const generateComprehensiveReport = async (query, metrics) => {
  const Fitness = require('../models/Fitness');
  
  const assessments = await Fitness.find(query)
    .populate('trainsetId', 'trainsetNumber manufacturer model')
    .sort({ 'assessmentDetails.assessmentDate': -1 });

  return {
    totalAssessments: assessments.length,
    assessmentDetails: assessments,
    aggregatedMetrics: await calculateAggregatedMetrics(assessments, metrics),
    trends: await calculateTrendMetrics(assessments),
    recommendations: await generateReportRecommendations(assessments)
  };
};

const generateSummaryReport = async (query, metrics) => {
  const Fitness = require('../models/Fitness');
  
  const [summary, distribution] = await Promise.all([
    Fitness.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalAssessments: { $sum: 1 },
          avgFitnessScore: { $avg: '$healthMetrics.overall.fitnessScore' },
          avgReliability: { $avg: '$healthMetrics.overall.reliability' },
          avgAvailability: { $avg: '$healthMetrics.overall.availability' },
          criticalIssuesCount: { $sum: { $size: '$results.criticalIssues' } }
        }
      }
    ]),
    Fitness.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$healthMetrics.overall.status',
          count: { $sum: 1 }
        }
      }
    ])
  ]);

  return {
    summary: summary[0] || {},
    distribution,
    lastUpdated: new Date().toISOString()
  };
};

const generateTrendAnalysisReport = async (query, metrics) => {
  const Fitness = require('../models/Fitness');
  
  return await Fitness.aggregate([
    { $match: query },
    {
      $group: {
        _id: {
          $dateToString: {
            format: '%Y-%m',
            date: '$assessmentDetails.assessmentDate'
          }
        },
        avgFitnessScore: { $avg: '$healthMetrics.overall.fitnessScore' },
        avgReliability: { $avg: '$healthMetrics.overall.reliability' },
        assessmentCount: { $sum: 1 }
      }
    },
    { $sort: { '_id': 1 } }
  ]);
};

const generateComplianceReport = async (query, metrics) => {
  const Fitness = require('../models/Fitness');
  
  return await Fitness.aggregate([
    { $match: query },
    {
      $group: {
        _id: null,
        totalAssessments: { $sum: 1 },
        safetyCompliant: {
          $sum: { $cond: ['$results.compliance.safetyStandards.isCompliant', 1, 0] }
        },
        performanceCompliant: {
          $sum: { $cond: ['$results.compliance.performanceStandards.isCompliant', 1, 0] }
        }
      }
    }
  ]);
};

const calculateAggregatedMetrics = async (assessments, metrics) => {
  // Implementation for calculating aggregated metrics
  return {
    overall: assessments.reduce((sum, a) => sum + a.healthMetrics.overall.fitnessScore, 0) / assessments.length,
    mechanical: assessments.reduce((sum, a) => sum + a.healthMetrics.mechanical.average, 0) / assessments.length,
    electrical: assessments.reduce((sum, a) => sum + a.healthMetrics.electrical.average, 0) / assessments.length,
    safety: assessments.reduce((sum, a) => sum + a.healthMetrics.safety.average, 0) / assessments.length,
    comfort: assessments.reduce((sum, a) => sum + a.healthMetrics.comfort.average, 0) / assessments.length
  };
};

const calculateTrendMetrics = async (assessments) => {
  // Implementation for calculating trend metrics
  return {
    improving: assessments.filter(a => a.historicalComparison?.overallImprovement > 0).length,
    declining: assessments.filter(a => a.historicalComparison?.overallImprovement < 0).length,
    stable: assessments.filter(a => Math.abs(a.historicalComparison?.overallImprovement || 0) < 2).length
  };
};

const generateReportRecommendations = async (assessments) => {
  // Implementation for generating report recommendations
  const recommendations = [];
  
  const lowScoreTrainsets = assessments.filter(a => a.healthMetrics.overall.fitnessScore < 7);
  if (lowScoreTrainsets.length > 0) {
    recommendations.push({
      priority: 'HIGH',
      area: 'Overall Health',
      description: `${lowScoreTrainsets.length} trainsets require immediate attention`,
      action: 'Schedule comprehensive health inspections'
    });
  }

  return recommendations;
};

module.exports = router;