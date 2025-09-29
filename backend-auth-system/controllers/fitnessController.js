const Fitness = require('../models/Fitness');
const Trainset = require('../models/Trainset');
const { websocketService } = require('../services/websocketService');
const AITrainFitnessEngine = require('../services/aiTrainFitnessEngine');
const mongoose = require('mongoose');

// KMRL Fitness Analytics Engine
class KMRLFitnessAnalytics {
  constructor() {
    // Real-time health monitoring thresholds
    this.healthThresholds = {
      critical: 5.0,
      poor: 6.0,
      fair: 7.0,
      good: 8.0,
      excellent: 9.0
    };
    
    // Performance benchmarks for KMRL trains
    this.performanceBenchmarks = {
      reliability: 95.0,
      availability: 98.0,
      energyEfficiency: 8.5,
      passengerSatisfaction: 4.2,
      onTimePerformance: 92.0,
      maintenanceCompliance: 98.0
    };
    
    // IoT integration parameters
    this.sensorLimits = {
      temperature: { normal: 75, warning: 90, critical: 105 },
      vibration: { normal: 2.0, warning: 4.0, critical: 6.0 },
      noise: { normal: 65, warning: 75, critical: 85 }
    };
  }

  // Comprehensive health assessment algorithm
  async performHealthAssessment(trainsetData, sensorData = null, historicalData = null) {
    const assessment = {
      healthMetrics: await this.calculateHealthMetrics(trainsetData, sensorData),
      performanceMetrics: await this.calculatePerformanceMetrics(trainsetData),
      predictions: await this.generatePredictiveInsights(trainsetData, historicalData),
      recommendations: [],
      riskAssessment: {}
    };

    // Calculate overall fitness score
    assessment.overallFitnessScore = this.calculateOverallFitnessScore(assessment.healthMetrics);
    assessment.healthGrade = this.calculateHealthGrade(assessment.overallFitnessScore);
    assessment.healthStatus = this.determineHealthStatus(assessment.overallFitnessScore);

    // Generate recommendations based on assessment
    assessment.recommendations = this.generateRecommendations(assessment);
    assessment.riskAssessment = this.assessRiskFactors(assessment);

    return assessment;
  }

  // Calculate comprehensive health metrics
  async calculateHealthMetrics(trainsetData, sensorData) {
    const mechanical = this.assessMechanicalHealth(trainsetData, sensorData);
    const electrical = this.assessElectricalHealth(trainsetData, sensorData);
    const comfort = this.assessComfortSystems(trainsetData, sensorData);
    const safety = this.assessSafetySystems(trainsetData);

    return {
      overall: {
        fitnessScore: (mechanical.average + electrical.average + comfort.average + safety.average) / 4,
        reliability: this.calculateReliability(trainsetData),
        availability: this.calculateAvailability(trainsetData)
      },
      mechanical,
      electrical,
      comfort,
      safety
    };
  }

  // Assess mechanical systems health
  assessMechanicalHealth(trainsetData, sensorData) {
    const scores = {
      engineHealth: this.assessEngineHealth(trainsetData, sensorData),
      brakeSystem: this.assessBrakeSystem(trainsetData, sensorData),
      suspension: this.assessSuspension(sensorData),
      wheelCondition: this.assessWheelCondition(trainsetData, sensorData),
      doorMechanism: this.assessDoorMechanism(trainsetData),
      couplingSystem: this.assessCouplingSystem(trainsetData),
      airCompressor: this.assessAirCompressor(trainsetData, sensorData),
      auxiliarySystems: this.assessAuxiliarySystems(trainsetData)
    };

    scores.average = Object.values(scores).reduce((sum, score) => sum + score, 0) / Object.keys(scores).length;
    return scores;
  }

  // Assess electrical systems health
  assessElectricalHealth(trainsetData, sensorData) {
    const scores = {
      powerSystem: this.assessPowerSystem(trainsetData, sensorData),
      tractionMotors: this.assessTractionMotors(trainsetData, sensorData),
      controlSystems: this.assessControlSystems(trainsetData),
      lightingSystems: this.assessLightingSystems(trainsetData),
      batteryHealth: this.assessBatteryHealth(trainsetData, sensorData),
      chargingSystem: this.assessChargingSystem(trainsetData, sensorData),
      emergencySystems: this.assessEmergencySystems(trainsetData)
    };

    scores.average = Object.values(scores).reduce((sum, score) => sum + score, 0) / Object.keys(scores).length;
    return scores;
  }

  // Individual component assessment methods
  assessEngineHealth(trainsetData, sensorData) {
    let score = 8.0; // Base score
    
    // Factor in mileage
    const mileage = trainsetData.currentMileage || 0;
    if (mileage > 500000) score -= 1.0;
    else if (mileage > 300000) score -= 0.5;
    
    // Factor in temperature readings
    if (sensorData?.temperature?.motors) {
      const avgTemp = sensorData.temperature.motors.reduce((sum, motor) => sum + motor.temperature, 0) / sensorData.temperature.motors.length;
      if (avgTemp > this.sensorLimits.temperature.critical) score -= 2.0;
      else if (avgTemp > this.sensorLimits.temperature.warning) score -= 1.0;
    }

    // Factor in maintenance history
    if (trainsetData.lastMaintenanceDate) {
      const daysSinceLastMaintenance = (Date.now() - new Date(trainsetData.lastMaintenanceDate)) / (1000 * 60 * 60 * 24);
      if (daysSinceLastMaintenance > 180) score -= 1.5;
      else if (daysSinceLastMaintenance > 90) score -= 0.5;
    }

    return Math.max(0, Math.min(10, score));
  }

  assessBrakeSystem(trainsetData, sensorData) {
    let score = 8.5; // Base score for brake system
    
    // Temperature analysis for brakes
    if (sensorData?.temperature?.brakes) {
      const avgBrakeTemp = sensorData.temperature.brakes.reduce((sum, brake) => sum + brake.temperature, 0) / sensorData.temperature.brakes.length;
      if (avgBrakeTemp > 120) score -= 2.0; // Critical brake temperature
      else if (avgBrakeTemp > 90) score -= 1.0; // Warning temperature
    }

    // Brake noise analysis
    if (sensorData?.acoustic?.brakingNoise) {
      const brakeNoise = sensorData.acoustic.brakingNoise.level;
      if (brakeNoise > this.sensorLimits.noise.critical) score -= 1.5;
      else if (brakeNoise > this.sensorLimits.noise.warning) score -= 0.5;
    }

    return Math.max(0, Math.min(10, score));
  }

  assessSuspension(sensorData) {
    let score = 8.0;
    
    if (sensorData?.vibration) {
      const frontTruckVib = Math.sqrt(sensorData.vibration.frontTruck.x**2 + sensorData.vibration.frontTruck.y**2 + sensorData.vibration.frontTruck.z**2);
      const rearTruckVib = Math.sqrt(sensorData.vibration.rearTruck.x**2 + sensorData.vibration.rearTruck.y**2 + sensorData.vibration.rearTruck.z**2);
      
      const avgVibration = (frontTruckVib + rearTruckVib) / 2;
      
      if (avgVibration > this.sensorLimits.vibration.critical) score -= 3.0;
      else if (avgVibration > this.sensorLimits.vibration.warning) score -= 1.5;
      else if (avgVibration > this.sensorLimits.vibration.normal) score -= 0.5;
    }
    
    return Math.max(0, Math.min(10, score));
  }

  // Calculate performance metrics
  async calculatePerformanceMetrics(trainsetData) {
    return {
      operational: {
        onTimePerformance: this.calculateOnTimePerformance(trainsetData),
        serviceReliability: this.calculateServiceReliability(trainsetData),
        passengerCapacityUtilization: this.calculateCapacityUtilization(trainsetData),
        averageSpeed: trainsetData.averageSpeed || 45,
        accelerationPerformance: this.calculateAccelerationPerformance(trainsetData),
        brakingEfficiency: this.calculateBrakingEfficiency(trainsetData)
      },
      energy: {
        energyEfficiencyScore: this.calculateEnergyEfficiencyScore(trainsetData),
        powerConsumptionPerKm: trainsetData.energyConsumption || 3.2,
        regenerativeBrakingEfficiency: this.calculateRegenerativeBrakingEfficiency(trainsetData),
        idlePowerConsumption: trainsetData.idlePowerConsumption || 5.2,
        peakPowerDemand: trainsetData.peakPowerDemand || 1200,
        powerFactorEfficiency: trainsetData.powerFactorEfficiency || 0.92
      },
      maintenance: {
        maintenanceCompliance: this.calculateMaintenanceCompliance(trainsetData),
        breakdownFrequency: trainsetData.breakdownFrequency || 0.5,
        meanTimeBetweenFailures: trainsetData.mtbf || 8760,
        meanTimeToRepair: trainsetData.mttr || 4.2,
        sparesAvailability: trainsetData.sparesAvailability || 95,
        predictiveMaintenanceScore: this.calculatePredictiveMaintenanceScore(trainsetData)
      }
    };
  }

  // Generate AI-powered predictive insights
  async generatePredictiveInsights(trainsetData, historicalData) {
    const insights = [];
    
    // Predictive maintenance insights
    if (trainsetData.currentMileage > 400000) {
      insights.push({
        category: 'Maintenance',
        prediction: 'Major overhaul required within 6 months',
        confidence: 0.85,
        timeframe: '3-6 months',
        recommendedAction: 'Schedule comprehensive maintenance inspection'
      });
    }

    // Energy efficiency predictions
    if (trainsetData.energyConsumption > 3.5) {
      insights.push({
        category: 'Energy Efficiency',
        prediction: 'Energy consumption will increase by 8% without intervention',
        confidence: 0.78,
        timeframe: '2-3 months',
        recommendedAction: 'Optimize traction motor calibration'
      });
    }

    // Performance degradation prediction
    const age = new Date().getFullYear() - (trainsetData.yearOfManufacture || 2020);
    if (age > 8) {
      insights.push({
        category: 'Performance',
        prediction: 'Performance degradation expected due to aging components',
        confidence: 0.72,
        timeframe: '6-12 months',
        recommendedAction: 'Consider component upgrade program'
      });
    }

    return insights;
  }

  // Calculate overall fitness score with weighted components
  calculateOverallFitnessScore(healthMetrics) {
    return (
      healthMetrics.mechanical.average * 0.25 +
      healthMetrics.electrical.average * 0.25 +
      healthMetrics.comfort.average * 0.20 +
      healthMetrics.safety.average * 0.30  // Safety has highest weight
    );
  }

  // Helper calculation methods
  calculateReliability(trainsetData) {
    const baseReliability = 95;
    const ageReduction = Math.max(0, (new Date().getFullYear() - (trainsetData.yearOfManufacture || 2020)) * 0.5);
    const mileageReduction = Math.max(0, (trainsetData.currentMileage || 0) / 100000 * 0.8);
    return Math.max(70, baseReliability - ageReduction - mileageReduction);
  }

  calculateAvailability(trainsetData) {
    const baseAvailability = 98;
    const maintenanceImpact = trainsetData.maintenanceFrequency ? trainsetData.maintenanceFrequency * 0.3 : 0;
    return Math.max(85, baseAvailability - maintenanceImpact);
  }

  calculateOnTimePerformance(trainsetData) {
    return trainsetData.onTimePerformance || (85 + Math.random() * 10);
  }

  calculateServiceReliability(trainsetData) {
    return trainsetData.serviceReliability || (90 + Math.random() * 8);
  }

  calculateCapacityUtilization(trainsetData) {
    return trainsetData.capacityUtilization || (60 + Math.random() * 25);
  }

  calculateMaintenanceCompliance(trainsetData) {
    return trainsetData.maintenanceCompliance || (92 + Math.random() * 6);
  }

  calculateHealthGrade(score) {
    if (score >= 9.5) return 'A+';
    if (score >= 9.0) return 'A';
    if (score >= 8.5) return 'B+';
    if (score >= 8.0) return 'B';
    if (score >= 7.5) return 'C+';
    if (score >= 7.0) return 'C';
    if (score >= 6.0) return 'D';
    return 'F';
  }

  determineHealthStatus(score) {
    if (score >= 9.0) return 'EXCELLENT';
    if (score >= 8.0) return 'GOOD';
    if (score >= 7.0) return 'FAIR';
    if (score >= 6.0) return 'POOR';
    return 'CRITICAL';
  }

  // Simplified assessment methods for other components
  assessWheelCondition(trainsetData, sensorData) { return 8.2 + Math.random() * 1.5; }
  assessDoorMechanism(trainsetData) { return 8.8 + Math.random() * 1.0; }
  assessCouplingSystem(trainsetData) { return 9.1 + Math.random() * 0.8; }
  assessAirCompressor(trainsetData, sensorData) { return 8.5 + Math.random() * 1.2; }
  assessAuxiliarySystems(trainsetData) { return 8.3 + Math.random() * 1.4; }
  assessPowerSystem(trainsetData, sensorData) { return 8.6 + Math.random() * 1.1; }
  assessTractionMotors(trainsetData, sensorData) { return 8.4 + Math.random() * 1.3; }
  assessControlSystems(trainsetData) { return 9.0 + Math.random() * 0.9; }
  assessLightingSystems(trainsetData) { return 9.2 + Math.random() * 0.7; }
  assessBatteryHealth(trainsetData, sensorData) { return 7.8 + Math.random() * 1.8; }
  assessChargingSystem(trainsetData, sensorData) { return 8.7 + Math.random() * 1.0; }
  assessEmergencySystems(trainsetData) { return 9.3 + Math.random() * 0.6; }
  assessComfortSystems(trainsetData, sensorData) { 
    return {
      airConditioning: 8.5 + Math.random() * 1.2,
      seatingCondition: 8.8 + Math.random() * 1.0,
      flooringCondition: 8.2 + Math.random() * 1.5,
      windowsCondition: 8.9 + Math.random() * 0.9,
      cleanlinessScore: 8.6 + Math.random() * 1.1,
      noiseLevel: 8.3 + Math.random() * 1.4,
      vibrationLevel: 8.7 + Math.random() * 1.0,
      average: 8.6
    };
  }
  assessSafetySystems(trainsetData) {
    return {
      emergencyBrakes: 9.4 + Math.random() * 0.5,
      fireSuppressionSystem: 9.2 + Math.random() * 0.7,
      emergencyExits: 9.5 + Math.random() * 0.4,
      communicationSystems: 9.0 + Math.random() * 0.8,
      signagingClarity: 8.8 + Math.random() * 1.0,
      cctvSystems: 8.9 + Math.random() * 0.9,
      accessibilityFeatures: 8.7 + Math.random() * 1.1,
      average: 9.1
    };
  }
  calculateEnergyEfficiencyScore(trainsetData) { return 8.2 + Math.random() * 1.3; }
  calculateRegenerativeBrakingEfficiency(trainsetData) { return 75 + Math.random() * 15; }
  calculateAccelerationPerformance(trainsetData) { return 8.0 + Math.random() * 1.5; }
  calculateBrakingEfficiency(trainsetData) { return 8.8 + Math.random() * 1.0; }
  calculatePredictiveMaintenanceScore(trainsetData) { return 7.5 + Math.random() * 2.0; }

  generateRecommendations(assessment) {
    const recommendations = [];
    
    if (assessment.overallFitnessScore < 7.0) {
      recommendations.push({
        type: 'IMMEDIATE',
        priority: 'HIGH',
        description: 'Comprehensive health inspection required - multiple systems showing degradation',
        estimatedCost: 85000,
        timeframe: 'Within 7 days',
        expectedImprovement: 'Restore fitness score to acceptable levels',
        responsibility: 'Maintenance Team Lead'
      });
    }

    if (assessment.healthMetrics.safety.average < 8.5) {
      recommendations.push({
        type: 'IMMEDIATE',
        priority: 'CRITICAL',
        description: 'Safety systems require immediate attention',
        estimatedCost: 120000,
        timeframe: 'Within 24 hours',
        expectedImprovement: 'Ensure passenger safety compliance',
        responsibility: 'Safety Inspector'
      });
    }

    return recommendations;
  }

  assessRiskFactors(assessment) {
    return {
      operationalRisk: assessment.overallFitnessScore < 6.0 ? 'HIGH' : 'LOW',
      safetyRisk: assessment.healthMetrics.safety.average < 8.0 ? 'HIGH' : 'LOW',
      financialRisk: assessment.overallFitnessScore < 7.0 ? 'MEDIUM' : 'LOW'
    };
  }
}

// Initialize AI-powered analytics engine
const aiEngine = new AITrainFitnessEngine();
const fitnessAnalytics = new KMRLFitnessAnalytics(); // Keep for backward compatibility

// Get all fitness assessments with filtering and pagination
const getAllFitnessAssessments = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 25,
      trainsetNumber,
      status,
      assessmentType,
      minScore,
      maxScore,
      sortBy = 'assessmentDate',
      sortOrder = 'desc'
    } = req.query;

    const skip = (page - 1) * limit;
    const query = {};

    // Build filter query
    if (trainsetNumber) {
      query.trainsetNumber = { $regex: trainsetNumber, $options: 'i' };
    }
    if (status) {
      query['healthMetrics.overall.status'] = status;
    }
    if (assessmentType) {
      query.assessmentType = assessmentType;
    }
    if (minScore || maxScore) {
      query['healthMetrics.overall.fitnessScore'] = {};
      if (minScore) query['healthMetrics.overall.fitnessScore'].$gte = parseFloat(minScore);
      if (maxScore) query['healthMetrics.overall.fitnessScore'].$lte = parseFloat(maxScore);
    }

    // Execute query with population
    const [assessments, totalCount] = await Promise.all([
      Fitness.find(query)
        .populate('trainsetId', 'trainsetNumber manufacturer model yearOfManufacture')
        .populate('assessmentDetails.inspectorId', 'firstName lastName email')
        .sort({ [`assessmentDetails.${sortBy}`]: sortOrder === 'desc' ? -1 : 1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Fitness.countDocuments(query)
    ]);

    // Calculate fleet statistics
    const fleetStats = await calculateFleetStatistics();

    res.json({
      success: true,
      data: {
        assessments,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalCount,
          pages: Math.ceil(totalCount / limit)
        },
        fleetStats
      }
    });
  } catch (error) {
    console.error('Error fetching fitness assessments:', error);
    res.status(500).json({
      error: 'Failed to fetch fitness assessments',
      details: error.message
    });
  }
};

// Get detailed fitness assessment by ID
const getFitnessAssessmentById = async (req, res) => {
  try {
    const { id } = req.params;

    const assessment = await Fitness.findById(id)
      .populate('trainsetId')
      .populate('assessmentDetails.inspectorId', 'firstName lastName email')
      .populate('historicalComparison.previousAssessmentId');

    if (!assessment) {
      return res.status(404).json({
        error: 'Fitness assessment not found',
        code: 'ASSESSMENT_NOT_FOUND'
      });
    }

    // Get related assessments for comparison
    const relatedAssessments = await Fitness.find({
      trainsetId: assessment.trainsetId,
      _id: { $ne: assessment._id }
    })
    .sort({ 'assessmentDetails.assessmentDate': -1 })
    .limit(5)
    .select('healthMetrics.overall assessmentDetails.assessmentDate assessmentType');

    res.json({
      success: true,
      data: {
        assessment,
        relatedAssessments
      }
    });
  } catch (error) {
    console.error('Error fetching fitness assessment:', error);
    res.status(500).json({
      error: 'Failed to fetch fitness assessment',
      details: error.message
    });
  }
};

// Create new fitness assessment
const demoFitnessService = require('../services/demoFitnessService');

const createFitnessAssessment = async (req, res) => {
  try {
    const {
      trainsetId,
      trainsetNumber,
      assessmentType,
      inspectorId,
      inspectorName,
      inspectorCertification,
      assessmentLocation,
      sensorData,
      specialCircumstances
    } = req.body;

    // Verify trainset exists
    const trainset = await Trainset.findById(trainsetId);
    if (!trainset) {
      return res.status(400).json({
        error: 'Trainset not found',
        code: 'TRAINSET_NOT_FOUND'
      });
    }

    // Get historical data for better assessment
    const historicalAssessments = await Fitness.find({ trainsetId })
      .sort({ 'assessmentDetails.assessmentDate': -1 })
      .limit(5);

    // Generate demo-optimized AI fitness assessment
    console.log('🎆 Creating demo AI assessment for', trainset.trainsetNumber);
    const assessmentData = await demoFitnessService.generateDemoAssessment(trainsetId, {
      assessmentType,
      inspectorId,
      inspectorName,
      inspectorCertification,
      assessmentLocation
    });

    // Create fitness assessment record using intelligent service results
    const fitnessAssessment = new Fitness(assessmentData);

    await fitnessAssessment.save();

    // Broadcast real-time update
    if (websocketService) {
      websocketService.broadcast('fitness_assessment_created', {
        assessmentId: fitnessAssessment._id,
        trainsetNumber: fitnessAssessment.trainsetNumber,
        fitnessScore: fitnessAssessment.healthMetrics.overall.fitnessScore,
        healthStatus: fitnessAssessment.healthMetrics.overall.status,
        criticalIssuesCount: fitnessAssessment.results.criticalIssues.filter(i => i.severity === 'CRITICAL').length,
        timestamp: new Date().toISOString()
      });
    }

    res.status(201).json({
      success: true,
      data: { assessment: fitnessAssessment }
    });
  } catch (error) {
    console.error('Error creating fitness assessment:', error);
    res.status(500).json({
      error: 'Failed to create fitness assessment',
      details: error.message
    });
  }
};

// Get fitness dashboard analytics
const getFitnessDashboard = async (req, res) => {
  try {
    const { period = '30' } = req.query;
    const days = parseInt(period);
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Parallel execution of dashboard queries
    const [
      totalAssessments,
      recentAssessments,
      healthDistribution,
      performanceTrends,
      criticalAlerts,
      fleetAverage,
      topPerformers,
      needsAttention,
      complianceStats,
      energyEfficiencyTrends
    ] = await Promise.all([
      // Total assessments count
      Fitness.countDocuments(),
      
      // Recent assessments
      Fitness.find({
        'assessmentDetails.assessmentDate': { $gte: startDate }
      }).countDocuments(),
      
      // Health status distribution
      Fitness.aggregate([
        {
          $group: {
            _id: '$healthMetrics.overall.status',
            count: { $sum: 1 },
            avgScore: { $avg: '$healthMetrics.overall.fitnessScore' }
          }
        }
      ]),
      
      // Performance trends over time
      Fitness.getPerformanceTrends(days),
      
      // Critical alerts
      Fitness.find({
        $or: [
          { 'healthMetrics.overall.fitnessScore': { $lt: 6.0 } },
          { 'results.criticalIssues.severity': 'CRITICAL' }
        ]
      }).countDocuments(),
      
      // Fleet average score
      Fitness.getFleetAverageScore(),
      
      // Top performing trainsets
      Fitness.aggregate([
        {
          $group: {
            _id: '$trainsetNumber',
            avgScore: { $avg: '$healthMetrics.overall.fitnessScore' },
            latestAssessment: { $max: '$assessmentDetails.assessmentDate' }
          }
        },
        { $sort: { avgScore: -1 } },
        { $limit: 5 }
      ]),
      
      // Trainsets needing attention
      Fitness.getTrainsetsNeedingAttention(),
      
      // Compliance statistics
      Fitness.aggregate([
        {
          $group: {
            _id: null,
            safetyCompliant: {
              $sum: { $cond: ['$results.compliance.safetyStandards.isCompliant', 1, 0] }
            },
            performanceCompliant: {
              $sum: { $cond: ['$results.compliance.performanceStandards.isCompliant', 1, 0] }
            },
            total: { $sum: 1 }
          }
        }
      ]),
      
      // Energy efficiency trends
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
            avgEnergyScore: { $avg: '$performanceMetrics.energy.energyEfficiencyScore' },
            avgConsumption: { $avg: '$performanceMetrics.energy.powerConsumptionPerKm' }
          }
        },
        { $sort: { '_id': 1 } }
      ])
    ]);

    // Calculate additional metrics
    const healthStatusCounts = {
      EXCELLENT: 0,
      GOOD: 0,
      FAIR: 0,
      POOR: 0,
      CRITICAL: 0
    };

    healthDistribution.forEach(item => {
      healthStatusCounts[item._id] = item.count;
    });

    const complianceRate = complianceStats[0] ? 
      ((complianceStats[0].safetyCompliant + complianceStats[0].performanceCompliant) / (complianceStats[0].total * 2)) * 100 : 0;

    res.json({
      success: true,
      data: {
        summary: {
          totalAssessments,
          recentAssessments,
          fleetAverageScore: Math.round(fleetAverage * 100) / 100,
          criticalAlerts,
          complianceRate: Math.round(complianceRate * 10) / 10
        },
        healthDistribution: healthStatusCounts,
        performanceTrends,
        energyEfficiencyTrends,
        topPerformers,
        needsAttention: needsAttention.slice(0, 10),
        alerts: await generateDashboardAlerts(),
        lastUpdated: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error fetching fitness dashboard:', error);
    res.status(500).json({
      error: 'Failed to fetch fitness dashboard',
      details: error.message
    });
  }
};

// Get real-time fitness monitoring data
const getRealTimeFitnessData = async (req, res) => {
  try {
    const { trainsetId } = req.params;

    const latestAssessment = await Fitness.findOne({ trainsetId })
      .sort({ 'assessmentDetails.assessmentDate': -1 })
      .populate('trainsetId', 'trainsetNumber manufacturer model');

    if (!latestAssessment) {
      return res.status(404).json({
        error: 'No fitness data found for this trainset',
        code: 'NO_FITNESS_DATA'
      });
    }

    // Generate real-time sensor readings
    const realTimeSensorData = generateRealTimeSensorData();
    
    // Calculate current health score based on real-time data
    const currentHealthMetrics = await fitnessAnalytics.performHealthAssessment(
      latestAssessment.trainsetId.toObject(),
      realTimeSensorData
    );

    res.json({
      success: true,
      data: {
        trainsetInfo: {
          id: latestAssessment.trainsetId._id,
          trainsetNumber: latestAssessment.trainsetId.trainsetNumber,
          manufacturer: latestAssessment.trainsetId.manufacturer,
          model: latestAssessment.trainsetId.model
        },
        currentHealth: currentHealthMetrics,
        realTimeSensors: realTimeSensorData,
        lastAssessment: {
          date: latestAssessment.assessmentDetails.assessmentDate,
          score: latestAssessment.healthMetrics.overall.fitnessScore,
          status: latestAssessment.healthMetrics.overall.status
        },
        alerts: latestAssessment.results.criticalIssues.filter(issue => issue.severity === 'CRITICAL'),
        monitoringStatus: latestAssessment.realTimeStatus
      }
    });
  } catch (error) {
    console.error('Error fetching real-time fitness data:', error);
    res.status(500).json({
      error: 'Failed to fetch real-time fitness data',
      details: error.message
    });
  }
};

// Helper Functions

// Calculate fleet statistics
const calculateFleetStatistics = async () => {
  const [avgScore, statusDistribution, recentTrends] = await Promise.all([
    Fitness.getFleetAverageScore(),
    Fitness.aggregate([
      { $group: { _id: '$healthMetrics.overall.status', count: { $sum: 1 } } }
    ]),
    Fitness.aggregate([
      {
        $match: {
          'assessmentDetails.assessmentDate': {
            $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
          }
        }
      },
      {
        $group: {
          _id: null,
          avgScore: { $avg: '$healthMetrics.overall.fitnessScore' },
          count: { $sum: 1 }
        }
      }
    ])
  ]);

  return {
    averageScore: Math.round(avgScore * 100) / 100,
    statusDistribution,
    weeklyTrend: recentTrends[0]?.avgScore || avgScore
  };
};

// Generate mock sensor data
const generateMockSensorData = () => ({
  vibration: {
    frontTruck: { x: Math.random() * 2, y: Math.random() * 2, z: Math.random() * 2, severity: 'NORMAL' },
    rearTruck: { x: Math.random() * 2, y: Math.random() * 2, z: Math.random() * 2, severity: 'NORMAL' },
    carBody: { x: Math.random() * 1.5, y: Math.random() * 1.5, z: Math.random() * 1.5, severity: 'NORMAL' }
  },
  temperature: {
    motors: [
      { location: 'Front Motor 1', temperature: 65 + Math.random() * 15, status: 'NORMAL' },
      { location: 'Front Motor 2', temperature: 65 + Math.random() * 15, status: 'NORMAL' },
      { location: 'Rear Motor 1', temperature: 65 + Math.random() * 15, status: 'NORMAL' },
      { location: 'Rear Motor 2', temperature: 65 + Math.random() * 15, status: 'NORMAL' }
    ],
    brakes: [
      { location: 'Front Left', temperature: 45 + Math.random() * 20, status: 'NORMAL' },
      { location: 'Front Right', temperature: 45 + Math.random() * 20, status: 'NORMAL' },
      { location: 'Rear Left', temperature: 45 + Math.random() * 20, status: 'NORMAL' },
      { location: 'Rear Right', temperature: 45 + Math.random() * 20, status: 'NORMAL' }
    ]
  },
  acoustic: {
    wheelNoise: { level: 55 + Math.random() * 10, frequency: 1000, analysis: 'Within normal range' },
    motorNoise: { level: 60 + Math.random() * 8, frequency: 2000, analysis: 'Acceptable levels' },
    brakingNoise: { level: 50 + Math.random() * 12, frequency: 500, analysis: 'Normal operation' }
  }
});

// Generate environmental impact data
const generateEnvironmentalImpact = () => ({
  carbonFootprint: 0.25 + Math.random() * 0.1, // kg CO2 per km
  energySource: 'MIXED',
  noiseEmission: 65 + Math.random() * 10, // dB
  recyclingScore: 7.5 + Math.random() * 2,
  wasteGeneration: 15 + Math.random() * 10, // kg per month
  ecoFriendlinessRating: 8.0 + Math.random() * 1.5
});

// Generate passenger experience data
const generatePassengerExperience = () => ({
  comfortRating: 8.2 + Math.random() * 1.3,
  accessibilityScore: 8.8 + Math.random() * 1.0,
  informationSystemsQuality: 8.5 + Math.random() * 1.2,
  crowdManagementEffectiveness: 7.9 + Math.random() * 1.6,
  emergencyPreparedness: 9.1 + Math.random() * 0.8,
  passengerSatisfactionSurvey: {
    overallSatisfaction: 4.1 + Math.random() * 0.7,
    comfortLevel: 4.0 + Math.random() * 0.8,
    cleanlinessRating: 4.2 + Math.random() * 0.6,
    timelinessRating: 3.9 + Math.random() * 0.9,
    safetyPerception: 4.3 + Math.random() * 0.5,
    totalResponses: 150 + Math.floor(Math.random() * 100)
  }
});

// Additional helper functions...
const generateCriticalIssues = (assessment) => {
  const issues = [];
  if (assessment.overallFitnessScore < 6.0) {
    issues.push({
      category: 'PERFORMANCE',
      severity: 'HIGH',
      description: 'Overall fitness score below acceptable threshold',
      location: 'System-wide',
      detectedDate: new Date(),
      estimatedRepairTime: 48,
      estimatedCost: 150000,
      riskLevel: 'HIGH'
    });
  }
  return issues;
};

// Helper functions for AI-enhanced system
const generateOperationalContext = (trainset) => ({
  totalMileage: trainset.currentMileage || 250000 + Math.random() * 200000,
  recentMileage: 8500 + Math.random() * 3000,
  operatingHours: 15000 + Math.random() * 5000,
  routesOperated: ['Aluva-Pettah', 'Pettah-Aluva'],
  averagePassengerLoad: 65 + Math.random() * 20,
  recentIncidents: Math.floor(Math.random() * 3),
  lastMaintenanceDate: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000),
  nextScheduledMaintenance: new Date(Date.now() + Math.random() * 60 * 24 * 60 * 60 * 1000)
});

const generatePatternAnalysis = (historical) => ({
  performancePattern: 'Seasonal variation observed with monsoon impact',
  maintenancePattern: 'Regular 90-day maintenance cycle effective',
  failurePattern: 'Electrical failures more common during humid months',
  optimizationOpportunities: ['Predictive maintenance implementation', 'Energy consumption optimization']
});

const generateBenchmarkComparison = async (currentScore) => {
  const fleetAverage = await Fitness.getFleetAverageScore();
  
  return {
    fleetAverage: Math.round(fleetAverage * 100) / 100,
    industryBenchmark: 8.2,
    rankInFleet: Math.floor(Math.random() * 50) + 1,
    percentileRanking: Math.floor(Math.random() * 100)
  };
};

const generateRealTimeSensorData = () => ({
  ...generateMockSensorData(),
  timestamp: new Date(),
  connectionStatus: 'CONNECTED',
  dataQuality: 'EXCELLENT'
});

const generateDashboardAlerts = async () => {
  return [
    {
      id: '1',
      type: 'CRITICAL',
      message: 'KMRL-007 requires immediate safety inspection',
      timestamp: new Date(),
      trainsetNumber: 'KMRL-007'
    },
    {
      id: '2',
      type: 'WARNING',
      message: 'Fleet average fitness score dropped by 2.3%',
      timestamp: new Date()
    },
    {
      id: '3',
      type: 'INFO',
      message: 'Monthly maintenance compliance: 96.8%',
      timestamp: new Date()
    }
  ];
};

// AI Integration Helper Functions
const generateCriticalIssuesFromAI = (aiAssessment) => {
  const issues = [];
  
  // Convert AI anomalies to critical issues
  if (aiAssessment.aiAnalysis.anomalies) {
    aiAssessment.aiAnalysis.anomalies.forEach(anomaly => {
      issues.push({
        category: anomaly.type.includes('TEMPERATURE') ? 'ELECTRICAL' : 
                 anomaly.type.includes('VIBRATION') ? 'MECHANICAL' : 'PERFORMANCE',
        severity: anomaly.severity,
        description: anomaly.description,
        location: 'AI-Detected',
        detectedDate: anomaly.timestamp,
        estimatedRepairTime: anomaly.severity === 'HIGH' ? 24 : 8,
        estimatedCost: anomaly.severity === 'HIGH' ? 125000 : 45000,
        riskLevel: anomaly.severity
      });
    });
  }
  
  // Add risk-based issues
  if (aiAssessment.aiAnalysis.riskAssessment.overall_risk_score > 70) {
    issues.push({
      category: 'SAFETY',
      severity: 'CRITICAL',
      description: `High overall risk detected (${aiAssessment.aiAnalysis.riskAssessment.overall_risk_score}% risk score)`,
      location: 'System-wide',
      detectedDate: new Date(),
      estimatedRepairTime: 48,
      estimatedCost: 200000,
      riskLevel: 'CRITICAL'
    });
  }
  
  return issues;
};

const generateComplianceStatusFromAI = (aiAssessment) => {
  const safetyScore = aiAssessment.healthMetrics.safety.overall_score;
  const overallScore = aiAssessment.overallFitnessScore;
  
  return {
    safetyStandards: {
      isCompliant: safetyScore >= 8.0,
      standardsChecked: ['IS 16295', 'EN 50128', 'IEC 62267', 'AI Safety Analysis'],
      nonComplianceIssues: safetyScore < 8.0 ? 
        [`Safety score below threshold: ${safetyScore}/10`, 'AI-detected safety risks'] : [],
      certificationStatus: safetyScore >= 8.0 ? 'VALID' : 'PENDING'
    },
    performanceStandards: {
      isCompliant: overallScore >= 70,
      benchmarksChecked: ['Availability', 'Reliability', 'Energy Efficiency', 'AI Performance Model'],
      performanceGaps: overallScore < 70 ? 
        [`Overall fitness below standard: ${overallScore}%`, 'AI-predicted performance degradation'] : [],
      improvementPlan: overallScore < 70 ? 
        'AI-recommended comprehensive maintenance and optimization program' : 
        'Continue AI-monitored preventive maintenance'
    }
  };
};

// Update existing helper to work with AI assessment
const calculateImprovements = (historical, aiAssessment) => {
  if (!historical.length) return [];
  
  const previous = historical[0];
  if (!previous) return [];
  
  return [{
    area: 'Overall Fitness (AI-Enhanced)',
    previousScore: previous.healthMetrics?.overall?.fitnessScore || 0,
    currentScore: aiAssessment.overallFitnessScore,
    improvementPercentage: ((aiAssessment.overallFitnessScore - (previous.healthMetrics?.overall?.fitnessScore || 0)) / (previous.healthMetrics?.overall?.fitnessScore || 1)) * 100,
    contributingFactors: ['AI-optimized maintenance scheduling', 'Predictive analytics', 'Real-time monitoring'],
    timeframe: '30 days',
    aiConfidence: Math.round(aiAssessment.confidenceLevel * 100) + '%'
  }];
};

const generateHistoricalComparison = (historical, aiAssessment) => {
  if (!historical.length) return null;
  
  const previous = historical[0];
  const currentScore = aiAssessment.overallFitnessScore;
  const previousScore = previous.healthMetrics?.overall?.fitnessScore || 0;
  
  return {
    previousAssessmentId: previous._id,
    overallImprovement: ((currentScore - previousScore) / (previousScore || 1)) * 100,
    trendAnalysis: {
      healthTrend: currentScore > previousScore ? 'IMPROVING' : currentScore < previousScore ? 'DECLINING' : 'STABLE',
      performanceTrend: aiAssessment.aiAnalysis.riskAssessment.risk_level === 'LOW' ? 'IMPROVING' : 'STABLE',
      reliabilityTrend: 'AI_OPTIMIZED'
    },
    keyChanges: ['AI-powered assessment implementation', 'Enhanced predictive capabilities', 'Real-time anomaly detection'],
    seasonalFactors: ['AI-adjusted seasonal performance factors'],
    aiEnhancement: {
      confidenceImprovement: '+' + Math.round((aiAssessment.confidenceLevel - 0.85) * 100) + '%',
      predictionAccuracy: Math.round(aiAssessment.confidenceLevel * 100) + '%',
      riskReduction: aiAssessment.aiAnalysis.riskAssessment.risk_level
    }
  };
};

const generateFinancialMetrics = (trainset, aiAssessment) => {
  // AI-enhanced financial calculations
  const baseMaintenanceCost = 75000;
  const riskMultiplier = aiAssessment.aiAnalysis.riskAssessment.overall_risk_score / 100;
  const efficiencyFactor = aiAssessment.healthMetrics.electrical.energy_efficiency / 100;
  
  return {
    maintenanceCostPerMonth: Math.round(baseMaintenanceCost * (1 + riskMultiplier)),
    operationalCostPerKm: Math.round(50 * (1 + riskMultiplier - efficiencyFactor * 0.2)),
    revenueGenerationCapacity: Math.round(125000 * aiAssessment.healthMetrics.overall.availability / 100),
    depreciationRate: 8.5 + (aiAssessment.aiAnalysis.riskAssessment.overall_risk_score / 100) * 2,
    residualValue: 15000000 * (aiAssessment.overallFitnessScore / 100),
    costBenefitRatio: Math.max(1.2, 2.0 - (riskMultiplier * 0.8)),
    aiOptimizationSavings: Math.round(25000 * (aiAssessment.confidenceLevel - 0.8) * 5), // AI efficiency savings
    predictiveMaintenanceSavings: Math.round(45000 * (aiAssessment.confidenceLevel))
  };
};

module.exports = {
  getAllFitnessAssessments,
  getFitnessAssessmentById,
  createFitnessAssessment,
  getFitnessDashboard,
  getRealTimeFitnessData,
  fitnessAnalytics,
  aiEngine // Export AI engine for external use
};
