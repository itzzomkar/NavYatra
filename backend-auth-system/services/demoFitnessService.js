const Trainset = require('../models/Trainset');

class DemoFitnessService {
  
  /**
   * 🎭 DEMO-OPTIMIZED: Create impressive fitness assessments for your 11 trains
   * This generates realistic, varied data that showcases your AI system capabilities
   */
  async generateDemoAssessment(trainsetId, options = {}) {
    try {
      // Get actual trainset data from your database
      const trainset = await Trainset.findById(trainsetId);
      if (!trainset) {
        throw new Error('Trainset not found');
      }

      // AI Analysis based on real train characteristics
      const aiMetrics = this.calculateIntelligentMetrics(trainset);
      
      // Create comprehensive assessment optimized for demo
      const assessment = {
        trainsetId: trainset._id,
        trainsetNumber: trainset.trainsetNumber,
        assessmentType: options.assessmentType || 'COMPREHENSIVE_HEALTH_CHECK',
        
        // Assessment details
        assessmentDetails: {
          inspectorId: options.inspectorId,
          inspectorName: options.inspectorName || 'AI Assessment System',
          inspectorCertification: options.inspectorCertification || 'AI_POWERED_ASSESSMENT',
          assessmentDate: new Date(),
          assessmentDuration: this.calculateDuration(trainset),
          assessmentLocation: options.assessmentLocation || trainset.depot,
          weatherConditions: this.getWeatherCondition(),
          assessmentMethod: 'AUTOMATED_AI_ANALYSIS'
        },

        // Health metrics - the core of fitness assessment
        healthMetrics: this.generateHealthMetrics(trainset, aiMetrics),
        
        // Performance metrics
        performanceMetrics: this.generatePerformanceMetrics(trainset, aiMetrics),
        
        // Sensor data simulation
        sensorData: this.generateSensorData(trainset, aiMetrics),
        
        // Environmental impact
        environmentalImpact: this.generateEnvironmentalImpact(trainset, aiMetrics),
        
        // Passenger experience
        passengerExperience: this.generatePassengerExperience(trainset, aiMetrics),
        
        // Operational context
        operationalContext: this.generateOperationalContext(trainset),
        
        // Results and recommendations
        results: this.generateResults(trainset, aiMetrics),
        
        // AI Analysis
        aiAnalysis: this.generateAIAnalysis(trainset, aiMetrics),
        
        // Historical comparison
        historicalComparison: this.generateHistoricalComparison(trainset, aiMetrics),
        
        // Financial metrics
        financialMetrics: this.generateFinancialMetrics(trainset, aiMetrics)
      };

      return assessment;
    } catch (error) {
      console.error('Error generating demo fitness assessment:', error);
      throw error;
    }
  }

  /**
   * Calculate intelligent metrics based on real train data
   */
  calculateIntelligentMetrics(trainset) {
    const currentYear = new Date().getFullYear();
    const ageInYears = currentYear - trainset.yearOfManufacture;
    const mileage = trainset.currentMileage || 50000;
    
    // Base fitness calculation considering real factors
    let baseScore = 10.0;
    
    // Age impact (newer trains score better)
    if (ageInYears > 7) baseScore -= 2.5;
    else if (ageInYears > 5) baseScore -= 1.8;
    else if (ageInYears > 3) baseScore -= 1.2;
    else if (ageInYears > 1) baseScore -= 0.6;
    
    // Mileage impact (higher mileage reduces score)
    if (mileage > 120000) baseScore -= 1.8;
    else if (mileage > 100000) baseScore -= 1.4;
    else if (mileage > 80000) baseScore -= 1.0;
    else if (mileage > 60000) baseScore -= 0.6;
    
    // Status impact
    const statusImpact = {
      'IN_SERVICE': 0,
      'MAINTENANCE': -1.2,
      'OUT_OF_ORDER': -2.5,
      'CLEANING': -0.3,
      'INSPECTION': -0.8
    };
    baseScore += statusImpact[trainset.status] || -1.0;
    
    // Manufacturer quality (BEML gets slight boost as it's indigenous)
    if (trainset.manufacturer === 'BEML') baseScore += 0.3;
    
    // Recent maintenance boost
    if (trainset.lastMaintenanceDate) {
      const daysSince = (Date.now() - new Date(trainset.lastMaintenanceDate)) / (1000 * 60 * 60 * 24);
      if (daysSince < 30) baseScore += 0.5;
      else if (daysSince > 120) baseScore -= 0.8;
    }
    
    // Ensure realistic range
    const finalScore = Math.max(4.5, Math.min(9.8, baseScore));
    
    return {
      finalScore,
      ageInYears,
      mileage,
      ageFactor: 1 - (ageInYears * 0.08),
      mileageFactor: 1 - (mileage / 200000),
      statusFactor: trainset.status === 'IN_SERVICE' ? 1.0 : 0.7,
      maintenanceFactor: this.getMaintenanceFactor(trainset)
    };
  }

  /**
   * Generate health metrics that vary realistically by train
   */
  generateHealthMetrics(trainset, aiMetrics) {
    const baseScore = aiMetrics.finalScore;
    
    // Mechanical systems (affected by age and mileage)
    const mechanical = {
      engineHealth: this.scaleScore(baseScore * aiMetrics.ageFactor, 6.0, 9.5),
      brakeSystem: this.scaleScore(baseScore * aiMetrics.maintenanceFactor, 6.5, 9.8),
      wheelCondition: this.scaleScore(baseScore * aiMetrics.mileageFactor, 6.0, 9.2),
      doorMechanism: this.scaleScore(baseScore * aiMetrics.statusFactor, 6.2, 9.6),
      couplingSystem: this.scaleScore(baseScore, 6.0, 9.4),
      airCompressor: this.scaleScore(baseScore * aiMetrics.maintenanceFactor, 6.3, 9.5),
      auxiliarySystems: this.scaleScore(baseScore, 6.1, 9.3),
      suspension: this.scaleScore(baseScore * aiMetrics.mileageFactor, 6.0, 9.0)
    };
    mechanical.average = this.calculateAverage(mechanical, ['average']);

    // Electrical systems
    const electrical = {
      powerSystem: this.scaleScore(baseScore * aiMetrics.ageFactor, 6.5, 9.8),
      tractionMotors: this.scaleScore(baseScore, 6.8, 9.6),
      controlSystems: this.scaleScore(baseScore, 6.7, 9.7),
      lightingSystems: this.scaleScore(baseScore, 6.4, 9.5),
      batteryHealth: this.scaleScore(baseScore * aiMetrics.ageFactor, 6.0, 9.2),
      chargingSystem: this.scaleScore(baseScore, 6.6, 9.4),
      emergencySystems: this.scaleScore(baseScore, 7.0, 9.9)
    };
    electrical.average = this.calculateAverage(electrical, ['average']);

    // Safety systems (highest priority)
    const safety = {
      emergencyBrakes: this.scaleScore(baseScore * 1.1, 7.0, 9.9),
      fireSuppressionSystem: this.scaleScore(baseScore, 7.2, 9.8),
      emergencyExits: this.scaleScore(baseScore, 7.0, 9.7),
      communicationSystems: this.scaleScore(baseScore, 7.1, 9.6),
      signagingClarity: this.scaleScore(baseScore, 6.8, 9.5),
      cctvSystems: this.scaleScore(baseScore * aiMetrics.ageFactor, 6.5, 9.4),
      accessibilityFeatures: this.scaleScore(baseScore, 6.9, 9.6)
    };
    safety.average = this.calculateAverage(safety, ['average']);

    // Comfort systems
    const comfort = {
      airConditioning: this.scaleScore(baseScore * aiMetrics.statusFactor, 5.5, 9.2),
      seatingCondition: this.scaleScore(baseScore * aiMetrics.mileageFactor, 5.8, 9.0),
      flooringCondition: this.scaleScore(baseScore, 5.6, 8.8),
      windowsCondition: this.scaleScore(baseScore, 5.9, 9.1),
      cleanlinessScore: this.scaleScore(baseScore, 5.2, 9.3),
      noiseLevel: this.scaleScore(baseScore, 5.7, 8.9),
      vibrationLevel: this.scaleScore(baseScore * aiMetrics.mileageFactor, 5.4, 8.7)
    };
    comfort.average = this.calculateAverage(comfort, ['average']);

    // Overall calculation
    const overallScore = (
      mechanical.average * 0.30 +
      electrical.average * 0.30 +
      safety.average * 0.25 +
      comfort.average * 0.15
    );

    const overall = {
      fitnessScore: Math.round(overallScore * 10) / 10,
      healthGrade: this.getHealthGrade(overallScore),
      status: this.getHealthStatus(overallScore),
      reliability: Math.min(100, Math.max(0, Math.round(overallScore * 10 + 5))),
      availability: Math.min(100, Math.max(0, Math.round(overallScore * 9 + 15)))
    };

    return { overall, mechanical, electrical, safety, comfort };
  }

  /**
   * Generate performance metrics
   */
  generatePerformanceMetrics(trainset, aiMetrics) {
    const baseScore = aiMetrics.finalScore;
    
    return {
      operational: {
        onTimePerformance: Math.round((baseScore * 8.5 + 15) * 10) / 10,
        serviceReliability: Math.round((baseScore * 9.0 + 10) * 10) / 10,
        passengerSatisfaction: Math.round((baseScore * 8.2 + 18) * 10) / 10,
        operationalEfficiency: Math.round((baseScore * 8.8 + 12) * 10) / 10,
        passengerCapacityUtilization: Math.round((baseScore * 7.5 + 22.5) * 10) / 10,
        averageSpeed: Math.round((baseScore * 4.5 + 25.5) * 10) / 10,
        accelerationPerformance: Math.round((baseScore * 0.85 + 1.5) * 10) / 10,
        brakingEfficiency: Math.round((baseScore * 0.92 + 0.8) * 10) / 10
      },
      energy: {
        energyEfficiencyScore: Math.round((baseScore * 0.84 + 1.6) * 10) / 10,
        powerConsumptionPerKm: Math.round((2.5 - baseScore * 0.07) * 100) / 100,
        regenerativeBrakingEfficiency: Math.round((baseScore * 7.8 + 15) * 10) / 10,
        standbyPowerConsumption: Math.round((3.0 - baseScore * 0.08) * 100) / 100,
        idlePowerConsumption: Math.round((3.5 - baseScore * 0.15) * 100) / 100,
        peakPowerDemand: Math.round((800 + (10 - baseScore) * 5) * 10) / 10,
        powerFactorEfficiency: Math.round((0.85 + baseScore * 0.008) * 1000) / 1000
      },
      maintenance: {
        maintenanceCompliance: Math.round((baseScore * 0.85 + 1.5) * 10) / 10,
        breakdownFrequency: Math.round((2 - baseScore * 0.015) * 100) / 100,
        meanTimeBetweenFailures: Math.round((baseScore * 200 + 1000) * 10) / 10,
        meanTimeToRepair: Math.round((8 - baseScore * 0.3) * 10) / 10,
        sparesAvailability: Math.round((baseScore * 0.8 + 2) * 10) / 10,
        predictiveMaintenanceScore: Math.round((baseScore * 0.85 + 1.5) * 10) / 10
      }
    };
  }

  /**
   * Generate sensor data simulation
   */
  generateSensorData(trainset, aiMetrics) {
    const healthScore = aiMetrics.finalScore / 10;
    
    return {
      temperature: {
        engine: { value: this.generateReading(healthScore, 45, 85, 65), unit: '°C', status: 'NORMAL' },
        brakes: { value: this.generateReading(healthScore, 40, 120, 60), unit: '°C', status: 'NORMAL' },
        electronics: { value: this.generateReading(healthScore, 25, 55, 35), unit: '°C', status: 'NORMAL' },
        cabin: { value: this.generateReading(healthScore, 20, 28, 24), unit: '°C', status: 'NORMAL' }
      },
      vibration: {
        bodyVibration: this.generateReading(healthScore, 0.5, 3.0, 1.2),
        wheelVibration: this.generateReading(healthScore, 0.8, 4.0, 1.5),
        motorVibration: this.generateReading(healthScore, 0.3, 2.5, 0.8)
      },
      electrical: {
        voltage: this.generateReading(healthScore, 740, 760, 750),
        current: this.generateReading(healthScore, 100, 400, 200),
        powerFactor: this.generateReading(healthScore, 0.85, 0.98, 0.92)
      },
      mechanical: {
        brakeForce: this.generateReading(healthScore, 80, 100, 95),
        doorOperationTime: this.generateReading(healthScore, 2.0, 4.5, 2.8),
        airPressure: this.generateReading(healthScore, 8.5, 9.5, 9.0)
      }
    };
  }

  /**
   * Generate environmental impact
   */
  generateEnvironmentalImpact(trainset, aiMetrics) {
    const baseScore = aiMetrics.finalScore;
    
    return {
      carbonFootprint: Math.round((2.5 - baseScore * 0.03) * 100) / 100,
      energySource: 'RENEWABLE',
      noiseEmission: Math.round((65 + (10 - baseScore) * 0.2) * 10) / 10,
      recyclingScore: Math.round((baseScore * 0.8 + 2) * 10) / 10,
      wasteGeneration: Math.round((0.5 + (10 - baseScore) * 0.005) * 100) / 100,
      ecoFriendlinessRating: Math.round((baseScore * 0.82 + 1.8) * 10) / 10
    };
  }

  /**
   * Generate passenger experience
   */
  generatePassengerExperience(trainset, aiMetrics) {
    const baseScore = aiMetrics.finalScore;
    
    return {
      comfortRating: Math.round((baseScore * 0.8 + 2) * 10) / 10,
      accessibilityScore: Math.round((baseScore * 0.9 + 1) * 10) / 10,
      informationSystemsQuality: Math.round((baseScore * 0.85 + 1.5) * 10) / 10,
      crowdManagementEffectiveness: Math.round((baseScore * 0.8 + 2) * 10) / 10,
      emergencyPreparedness: Math.round((baseScore * 0.9 + 1) * 10) / 10
    };
  }

  /**
   * Generate operational context
   */
  generateOperationalContext(trainset) {
    return {
      totalMileage: trainset.currentMileage || 50000,
      recentMileage: Math.floor((trainset.currentMileage || 50000) * 0.1),
      operatingHours: trainset.operationalHours || 8000,
      averagePassengerLoad: Math.floor(Math.random() * 40 + 60),
      recentIncidents: 0,
      lastMaintenanceDate: trainset.lastMaintenanceDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      nextScheduledMaintenance: trainset.nextMaintenanceDate || new Date(Date.now() + 60 * 24 * 60 * 60 * 1000)
    };
  }

  /**
   * Generate results and recommendations
   */
  generateResults(trainset, aiMetrics) {
    const healthScore = aiMetrics.finalScore;
    const criticalIssues = [];
    const recommendations = [];
    
    // Generate issues based on health score
    if (healthScore < 6.0) {
      criticalIssues.push({
        category: 'SAFETY',
        severity: 'CRITICAL',
        issue: 'Overall fitness below acceptable threshold',
        description: `Train ${trainset.trainsetNumber} requires immediate comprehensive inspection`,
        recommendation: 'Suspend operations until thorough inspection completed',
        estimatedCost: 500000
      });
    }
    
    // Generate recommendations
    if (aiMetrics.ageInYears > 6) {
      recommendations.push({
        type: 'SCHEDULED',
        priority: 'MEDIUM',
        category: 'MECHANICAL',
        title: 'Enhanced Age-Based Maintenance',
        description: `Implement enhanced maintenance schedule for ${aiMetrics.ageInYears}-year-old trainset`,
        estimatedCost: 150000,
        timelineWeeks: 4,
        confidence: 0.88
      });
    }
    
    if (aiMetrics.mileage > 100000) {
      recommendations.push({
        type: 'MONITORING',
        priority: 'HIGH',
        category: 'MECHANICAL',
        title: 'High-Mileage Component Assessment',
        description: 'Comprehensive evaluation of wear components',
        estimatedCost: 75000,
        timelineWeeks: 2,
        confidence: 0.92
      });
    }
    
    return {
      overallStatus: this.getHealthStatus(healthScore),
      criticalIssues,
      recommendations,
      compliance: {
        safetyStandards: {
          isCompliant: healthScore >= 6.0,
          complianceScore: Math.round(healthScore * 10),
          nonComplianceIssues: healthScore >= 6.0 ? [] : ['Overall fitness below standard']
        },
        performanceStandards: {
          isCompliant: healthScore >= 6.5,
          complianceScore: Math.round(healthScore * 10),
          nonComplianceIssues: healthScore >= 6.5 ? [] : ['Performance requires improvement']
        }
      }
    };
  }

  /**
   * Generate AI analysis
   */
  generateAIAnalysis(trainset, aiMetrics) {
    const predictions = [];
    
    // Maintenance predictions
    if (trainset.lastMaintenanceDate) {
      const daysSince = (Date.now() - new Date(trainset.lastMaintenanceDate)) / (1000 * 60 * 60 * 24);
      if (daysSince > 90) {
        predictions.push({
          category: 'Maintenance',
          prediction: 'Major maintenance recommended within 30 days',
          confidence: 0.85,
          timeframe: '30 days',
          impact: 'HIGH'
        });
      }
    }
    
    return {
      confidenceScore: Math.round((75 + Math.random() * 20)),
      predictiveInsights: predictions,
      riskAssessment: this.generateRiskAssessment(trainset, aiMetrics),
      trendAnalysis: {
        trendDirection: 'STABLE',
        overallTrend: 'STABLE',
        reliabilityTrend: 'STABLE',
        maintenanceTrend: 'STABLE',
        predictionAccuracy: 85
      }
    };
  }

  /**
   * Generate risk assessment
   */
  generateRiskAssessment(trainset, aiMetrics) {
    const healthScore = aiMetrics.finalScore;
    let riskScore = 0;
    
    if (healthScore < 6.0) riskScore += 40;
    else if (healthScore < 7.0) riskScore += 20;
    
    if (aiMetrics.ageInYears > 7) riskScore += 15;
    if (trainset.status === 'OUT_OF_ORDER') riskScore += 25;
    
    const riskLevel = riskScore >= 50 ? 'HIGH' : riskScore >= 25 ? 'MEDIUM' : 'LOW';
    
    return {
      overallRiskLevel: riskLevel,
      riskScore: Math.min(100, riskScore),
      operationalRisk: healthScore < 6.5 ? 'HIGH' : 'LOW',
      safetyRisk: healthScore < 7.0 ? 'HIGH' : 'LOW',
      financialRisk: riskScore > 30 ? 'MEDIUM' : 'LOW'
    };
  }

  /**
   * Generate historical comparison
   */
  generateHistoricalComparison(trainset, aiMetrics) {
    return {
      overallImprovement: Math.round((Math.random() - 0.5) * 20) / 10,
      mechanicalImprovement: Math.round((Math.random() - 0.5) * 15) / 10,
      electricalImprovement: Math.round((Math.random() - 0.5) * 18) / 10,
      safetyImprovement: Math.round((Math.random() - 0.5) * 12) / 10,
      comfortImprovement: Math.round((Math.random() - 0.5) * 25) / 10,
      trendAnalysis: {
        trendDirection: 'STABLE',
        overallTrend: 'STABLE',
        reliabilityTrend: 'STABLE',
        maintenanceTrend: 'STABLE',
        predictionAccuracy: 85
      },
      benchmarkComparison: {
        fleetAverageComparison: 'ABOVE_AVERAGE',
        industryBenchmark: 'MEETS_STANDARD',
        manufacturerAverage: 'ABOVE_AVERAGE'
      }
    };
  }

  /**
   * Generate financial metrics
   */
  generateFinancialMetrics(trainset, aiMetrics) {
    const baseScore = aiMetrics.finalScore;
    const ageInYears = aiMetrics.ageInYears;
    
    return {
      maintenanceCostPerMonth: Math.round(50000 * (1 + ageInYears * 0.08) * (2 - baseScore / 10)),
      operationalCostPerKm: Math.round(15 * (1 + ageInYears * 0.05) * (2 - baseScore / 10) * 100) / 100,
      revenueGenerationCapacity: Math.round(trainset.capacity * 12 * baseScore),
      depreciationRate: Math.round((5 + ageInYears * 0.5) * 100) / 100,
      residualValue: Math.round(50000000 * Math.pow(0.9, ageInYears) * (baseScore / 10)),
      costBenefitRatio: Math.round((baseScore * 0.12 + 0.8) * 100) / 100
    };
  }

  // Utility methods
  scaleScore(score, min, max) {
    return Math.round((min + (score / 10) * (max - min)) * 10) / 10;
  }

  calculateAverage(obj, excludeKeys = []) {
    const keys = Object.keys(obj).filter(key => !excludeKeys.includes(key));
    const sum = keys.reduce((acc, key) => acc + obj[key], 0);
    return Math.round((sum / keys.length) * 10) / 10;
  }

  getHealthGrade(score) {
    if (score >= 9.0) return 'A+';
    if (score >= 8.5) return 'A';
    if (score >= 8.0) return 'A-';
    if (score >= 7.5) return 'B+';
    if (score >= 7.0) return 'B';
    if (score >= 6.5) return 'B-';
    if (score >= 6.0) return 'C+';
    if (score >= 5.5) return 'C';
    return 'D';
  }

  getHealthStatus(score) {
    if (score >= 8.5) return 'EXCELLENT';
    if (score >= 7.5) return 'GOOD';
    if (score >= 6.5) return 'FAIR';
    if (score >= 5.0) return 'POOR';
    return 'CRITICAL';
  }

  getMaintenanceFactor(trainset) {
    if (!trainset.lastMaintenanceDate) return 0.8;
    const daysSince = (Date.now() - new Date(trainset.lastMaintenanceDate)) / (1000 * 60 * 60 * 24);
    if (daysSince < 30) return 1.0;
    if (daysSince < 60) return 0.95;
    if (daysSince < 90) return 0.9;
    return 0.7;
  }

  calculateDuration(trainset) {
    const baseTime = 2.0;
    const ageInYears = new Date().getFullYear() - trainset.yearOfManufacture;
    return Math.round((baseTime + (ageInYears > 5 ? 0.5 : 0)) * 10) / 10;
  }

  getWeatherCondition() {
    const conditions = ['Clear', 'Partly Cloudy', 'Overcast', 'Light Rain'];
    return conditions[Math.floor(Math.random() * conditions.length)];
  }

  generateReading(healthScore, min, max, optimal) {
    const deviation = (1 - healthScore) * 0.3;
    const range = max - min;
    const reading = optimal + (Math.random() - 0.5) * range * deviation;
    return Math.round(Math.max(min, Math.min(max, reading)) * 100) / 100;
  }
}

module.exports = new DemoFitnessService();