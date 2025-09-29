const mongoose = require('mongoose');
const Fitness = require('../models/Fitness');
const Trainset = require('../models/Trainset');

// MongoDB connection
require('dotenv').config();
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/auth_system_db');

// Sample fitness data generation for KMRL trains
const generateSampleFitnessData = async () => {
  try {
    console.log('🚀 Starting KMRL Fitness Data Generation...');

    // Clear existing fitness data
    console.log('🗑️ Clearing existing fitness data...');
    await Fitness.deleteMany({});

    // Get all trainsets
    const trainsets = await Trainset.find({});
    if (trainsets.length === 0) {
      console.log('❌ No trainsets found. Please run trainset creation script first.');
      process.exit(1);
    }

    console.log(`📋 Found ${trainsets.length} trainsets. Generating fitness assessments...`);

    // Assessment types for variety
    const assessmentTypes = [
      'COMPREHENSIVE_HEALTH_CHECK',
      'PERFORMANCE_ANALYSIS',
      'SAFETY_INSPECTION',
      'ENERGY_EFFICIENCY_AUDIT',
      'PREVENTIVE_MAINTENANCE_REVIEW',
      'ROUTINE_MONITORING',
      'COMPLIANCE_AUDIT'
    ];

    // Inspector profiles
    const inspectors = [
      {
        name: 'Dr. Rajesh Kumar',
        certification: 'KMRL-INSP-001',
        specialization: 'Mechanical Systems'
      },
      {
        name: 'Eng. Priya Sharma',
        certification: 'KMRL-INSP-002',
        specialization: 'Electrical Systems'
      },
      {
        name: 'Mr. Arun Nair',
        certification: 'KMRL-INSP-003',
        specialization: 'Safety Systems'
      },
      {
        name: 'Ms. Lakshmi Menon',
        certification: 'KMRL-INSP-004',
        specialization: 'Performance Analysis'
      },
      {
        name: 'Dr. Suresh Babu',
        certification: 'KMRL-INSP-005',
        specialization: 'Energy Efficiency'
      }
    ];

    const locations = [
      'Aluva Depot',
      'Muttom Workshop',
      'Kalamassery Station',
      'MG Road Terminal',
      'Vytila Mobility Hub'
    ];

    const fitnessAssessments = [];

    // Generate fitness assessments for each trainset
    for (const trainset of trainsets) {
      // Generate 3-8 historical assessments per trainset
      const numAssessments = Math.floor(Math.random() * 6) + 3;
      
      for (let i = 0; i < numAssessments; i++) {
        const daysAgo = Math.floor(Math.random() * 180) + (i * 30);
        const assessmentDate = new Date();
        assessmentDate.setDate(assessmentDate.getDate() - daysAgo);
        
        const inspector = inspectors[Math.floor(Math.random() * inspectors.length)];
        const location = locations[Math.floor(Math.random() * locations.length)];
        const assessmentType = assessmentTypes[Math.floor(Math.random() * assessmentTypes.length)];

        // Generate health metrics based on trainset condition
        const healthMetrics = generateHealthMetrics(trainset, assessmentDate);
        const performanceMetrics = generatePerformanceMetrics(trainset, assessmentDate);
        const sensorData = generateRealisticSensorData(trainset, assessmentDate);
        const environmentalImpact = generateEnvironmentalImpact(trainset);
        const passengerExperience = generatePassengerExperience(trainset);
        
        // Generate AI analysis
        const aiAnalysis = generateAIAnalysis(healthMetrics, performanceMetrics, trainset);
        
        // Generate critical issues and recommendations
        const criticalIssues = generateCriticalIssues(healthMetrics, performanceMetrics);
        const recommendations = generateRecommendations(healthMetrics, performanceMetrics, criticalIssues);
        
        // Generate compliance status
        const compliance = generateComplianceStatus(healthMetrics, performanceMetrics);
        
        // Generate operational context
        const operationalContext = generateOperationalContext(trainset, assessmentDate);
        
        // Generate financial metrics
        const financialMetrics = generateFinancialMetrics(trainset, healthMetrics);

        const fitnessAssessment = {
          trainsetId: trainset._id,
          trainsetNumber: trainset.trainsetNumber,
          assessmentType,
          
          healthMetrics,
          performanceMetrics,
          sensorData,
          environmentalImpact,
          passengerExperience,
          
          results: {
            criticalIssues,
            recommendations,
            improvements: generateImprovements(i > 0),
            compliance
          },
          
          historicalComparison: i > 0 ? generateHistoricalComparison() : null,
          
          assessmentDetails: {
            inspectorId: new mongoose.Types.ObjectId(), // Generate a dummy ObjectId
            inspectorName: inspector.name,
            inspectorCertification: inspector.certification,
            assessmentDate,
            assessmentDuration: Math.floor(Math.random() * 120) + 90, // 90-210 minutes
            assessmentLocation: location,
            weatherConditions: generateWeatherConditions(assessmentDate),
            specialCircumstances: generateSpecialCircumstances()
          },
          
          operationalContext,
          aiAnalysis,
          
          realTimeStatus: {
            isMonitored: Math.random() > 0.3, // 70% are monitored
            lastDataUpdate: new Date(),
            dataQuality: ['EXCELLENT', 'GOOD', 'FAIR'][Math.floor(Math.random() * 3)],
            connectedSensors: Math.floor(Math.random() * 20) + 30, // 30-50 sensors
            alertsActive: criticalIssues.filter(issue => issue.severity === 'CRITICAL').length,
            monitoringFrequency: ['REAL_TIME', 'HOURLY', 'DAILY'][Math.floor(Math.random() * 3)]
          },
          
          certificates: generateFitnessCertificates(trainset, assessmentDate),
          financialMetrics,
          
          createdAt: assessmentDate,
          updatedAt: assessmentDate
        };

        fitnessAssessments.push(fitnessAssessment);
      }
    }

    console.log(`💾 Saving ${fitnessAssessments.length} fitness assessments...`);
    
    // Bulk insert fitness assessments
    await Fitness.insertMany(fitnessAssessments);

    console.log('✅ Sample fitness data generation completed!');
    console.log(`📊 Generated ${fitnessAssessments.length} fitness assessments for ${trainsets.length} trainsets`);
    
    // Generate summary statistics
    const stats = await generateSummaryStats();
    console.log('\n📈 Summary Statistics:');
    console.log(`- Average Fleet Fitness Score: ${stats.averageScore.toFixed(2)}`);
    console.log(`- Trainsets with Excellent Health (9+): ${stats.excellent}`);
    console.log(`- Trainsets with Good Health (8-9): ${stats.good}`);
    console.log(`- Trainsets with Fair Health (7-8): ${stats.fair}`);
    console.log(`- Trainsets Needing Attention (<7): ${stats.needsAttention}`);
    console.log(`- Critical Issues Identified: ${stats.criticalIssues}`);
    console.log(`- Total Recommendations Generated: ${stats.totalRecommendations}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error generating fitness data:', error);
    process.exit(1);
  }
};

// Helper functions for data generation
const generateHealthMetrics = (trainset, assessmentDate) => {
  const baseScore = 7.0 + Math.random() * 2.5; // Base score between 7.0-9.5
  const ageImpact = Math.max(0, (new Date().getFullYear() - trainset.yearOfManufacture) * 0.1);
  const mileageImpact = Math.max(0, (trainset.currentMileage || 0) / 500000);
  const adjustedBase = Math.max(5.0, baseScore - ageImpact - mileageImpact);

  const mechanical = {
    engineHealth: adjustedBase + (Math.random() * 1.5 - 0.75),
    brakeSystem: adjustedBase + (Math.random() * 1.2 - 0.6),
    suspension: adjustedBase + (Math.random() * 1.0 - 0.5),
    wheelCondition: adjustedBase + (Math.random() * 1.3 - 0.65),
    doorMechanism: adjustedBase + (Math.random() * 0.8 - 0.4),
    couplingSystem: adjustedBase + (Math.random() * 0.6 - 0.3),
    airCompressor: adjustedBase + (Math.random() * 1.1 - 0.55),
    auxiliarySystems: adjustedBase + (Math.random() * 0.9 - 0.45)
  };

  const electrical = {
    powerSystem: adjustedBase + (Math.random() * 1.2 - 0.6),
    tractionMotors: adjustedBase + (Math.random() * 1.4 - 0.7),
    controlSystems: adjustedBase + (Math.random() * 0.8 - 0.4),
    lightingSystems: adjustedBase + (Math.random() * 0.6 - 0.3),
    batteryHealth: adjustedBase + (Math.random() * 1.6 - 0.8),
    chargingSystem: adjustedBase + (Math.random() * 1.0 - 0.5),
    emergencySystems: adjustedBase + (Math.random() * 0.7 - 0.35)
  };

  const comfort = {
    airConditioning: adjustedBase + (Math.random() * 1.2 - 0.6),
    seatingCondition: adjustedBase + (Math.random() * 0.8 - 0.4),
    flooringCondition: adjustedBase + (Math.random() * 1.0 - 0.5),
    windowsCondition: adjustedBase + (Math.random() * 0.9 - 0.45),
    cleanlinessScore: adjustedBase + (Math.random() * 1.1 - 0.55),
    noiseLevel: adjustedBase + (Math.random() * 1.3 - 0.65),
    vibrationLevel: adjustedBase + (Math.random() * 1.2 - 0.6)
  };

  const safety = {
    emergencyBrakes: Math.max(8.0, adjustedBase + (Math.random() * 0.8 - 0.4)),
    fireSuppressionSystem: Math.max(8.2, adjustedBase + (Math.random() * 0.6 - 0.3)),
    emergencyExits: Math.max(8.5, adjustedBase + (Math.random() * 0.5 - 0.25)),
    communicationSystems: Math.max(8.0, adjustedBase + (Math.random() * 0.9 - 0.45)),
    signagingClarity: Math.max(7.8, adjustedBase + (Math.random() * 0.7 - 0.35)),
    cctvSystems: Math.max(8.1, adjustedBase + (Math.random() * 0.8 - 0.4)),
    accessibilityFeatures: Math.max(7.9, adjustedBase + (Math.random() * 0.9 - 0.45))
  };

  // Calculate averages and constrain to 0-10 range
  mechanical.average = constrainScore(Object.values(mechanical).reduce((sum, val) => sum + val, 0) / Object.keys(mechanical).length);
  electrical.average = constrainScore(Object.values(electrical).reduce((sum, val) => sum + val, 0) / Object.keys(electrical).length);
  comfort.average = constrainScore(Object.values(comfort).reduce((sum, val) => sum + val, 0) / Object.keys(comfort).length);
  safety.average = constrainScore(Object.values(safety).reduce((sum, val) => sum + val, 0) / Object.keys(safety).length);

  // Constrain individual scores
  Object.keys(mechanical).forEach(key => mechanical[key] = constrainScore(mechanical[key]));
  Object.keys(electrical).forEach(key => electrical[key] = constrainScore(electrical[key]));
  Object.keys(comfort).forEach(key => comfort[key] = constrainScore(comfort[key]));
  Object.keys(safety).forEach(key => safety[key] = constrainScore(safety[key]));

  const overallScore = (mechanical.average * 0.25 + electrical.average * 0.25 + comfort.average * 0.20 + safety.average * 0.30);
  
  return {
    overall: {
      fitnessScore: constrainScore(overallScore),
      healthGrade: calculateHealthGrade(overallScore),
      status: determineHealthStatus(overallScore),
      reliability: Math.max(70, 95 - Math.random() * 15),
      availability: Math.max(85, 98 - Math.random() * 8)
    },
    mechanical,
    electrical,
    comfort,
    safety
  };
};

const generatePerformanceMetrics = (trainset, assessmentDate) => {
  return {
    operational: {
      onTimePerformance: 85 + Math.random() * 12, // 85-97%
      serviceReliability: 90 + Math.random() * 8, // 90-98%
      passengerCapacityUtilization: 55 + Math.random() * 30, // 55-85%
      averageSpeed: 40 + Math.random() * 15, // 40-55 km/h
      accelerationPerformance: 7.0 + Math.random() * 2.5, // 7.0-9.5
      brakingEfficiency: 8.0 + Math.random() * 1.8 // 8.0-9.8
    },
    energy: {
      energyEfficiencyScore: 7.5 + Math.random() * 2.2, // 7.5-9.7
      powerConsumptionPerKm: 2.8 + Math.random() * 1.0, // 2.8-3.8 kWh/km
      regenerativeBrakingEfficiency: 70 + Math.random() * 25, // 70-95%
      idlePowerConsumption: 4.5 + Math.random() * 2.0, // 4.5-6.5 kWh
      peakPowerDemand: 1100 + Math.random() * 300, // 1100-1400 kW
      powerFactorEfficiency: 0.88 + Math.random() * 0.10 // 0.88-0.98
    },
    maintenance: {
      maintenanceCompliance: 88 + Math.random() * 10, // 88-98%
      breakdownFrequency: Math.random() * 1.2, // 0-1.2 per month
      meanTimeBetweenFailures: 6000 + Math.random() * 4000, // 6000-10000 hours
      meanTimeToRepair: 2.5 + Math.random() * 4.0, // 2.5-6.5 hours
      sparesAvailability: 85 + Math.random() * 13, // 85-98%
      predictiveMaintenanceScore: 6.5 + Math.random() * 2.8 // 6.5-9.3
    }
  };
};

const generateRealisticSensorData = (trainset, assessmentDate) => {
  return {
    vibration: {
      frontTruck: {
        x: Math.random() * 3.0,
        y: Math.random() * 2.8,
        z: Math.random() * 2.5,
        severity: Math.random() > 0.8 ? 'WARNING' : 'NORMAL'
      },
      rearTruck: {
        x: Math.random() * 3.2,
        y: Math.random() * 3.0,
        z: Math.random() * 2.7,
        severity: Math.random() > 0.85 ? 'WARNING' : 'NORMAL'
      },
      carBody: {
        x: Math.random() * 1.8,
        y: Math.random() * 2.0,
        z: Math.random() * 1.6,
        severity: 'NORMAL'
      }
    },
    temperature: {
      motors: [
        { location: 'Front Motor 1', temperature: 60 + Math.random() * 25, status: Math.random() > 0.9 ? 'WARNING' : 'NORMAL' },
        { location: 'Front Motor 2', temperature: 58 + Math.random() * 27, status: Math.random() > 0.9 ? 'WARNING' : 'NORMAL' },
        { location: 'Rear Motor 1', temperature: 62 + Math.random() * 23, status: Math.random() > 0.9 ? 'WARNING' : 'NORMAL' },
        { location: 'Rear Motor 2', temperature: 59 + Math.random() * 26, status: Math.random() > 0.9 ? 'WARNING' : 'NORMAL' }
      ],
      brakes: [
        { location: 'Front Left', temperature: 35 + Math.random() * 30, status: Math.random() > 0.85 ? 'WARNING' : 'NORMAL' },
        { location: 'Front Right', temperature: 37 + Math.random() * 28, status: Math.random() > 0.85 ? 'WARNING' : 'NORMAL' },
        { location: 'Rear Left', temperature: 36 + Math.random() * 29, status: Math.random() > 0.85 ? 'WARNING' : 'NORMAL' },
        { location: 'Rear Right', temperature: 38 + Math.random() * 27, status: Math.random() > 0.85 ? 'WARNING' : 'NORMAL' }
      ],
      bearings: generateBearingTemperatures(),
      electronics: generateElectronicsTemperatures()
    },
    acoustic: {
      wheelNoise: { level: 50 + Math.random() * 20, frequency: 800 + Math.random() * 400, analysis: 'Within acceptable range' },
      motorNoise: { level: 55 + Math.random() * 15, frequency: 1500 + Math.random() * 800, analysis: 'Normal operation detected' },
      brakingNoise: { level: 45 + Math.random() * 25, frequency: 400 + Math.random() * 300, analysis: 'Brake system functioning normally' }
    },
    electrical: {
      voltageReadings: generateVoltageReadings(),
      currentReadings: generateCurrentReadings(),
      powerReadings: generatePowerReadings()
    }
  };
};

const generateEnvironmentalImpact = (trainset) => {
  return {
    carbonFootprint: 0.15 + Math.random() * 0.25, // kg CO2 per km
    energySource: ['RENEWABLE', 'MIXED', 'CONVENTIONAL'][Math.floor(Math.random() * 3)],
    noiseEmission: 58 + Math.random() * 15, // dB average
    recyclingScore: 6.5 + Math.random() * 3.0,
    wasteGeneration: 10 + Math.random() * 20, // kg per month
    ecoFriendlinessRating: 7.2 + Math.random() * 2.3
  };
};

const generatePassengerExperience = (trainset) => {
  return {
    comfortRating: 7.8 + Math.random() * 1.8,
    accessibilityScore: 8.2 + Math.random() * 1.5,
    informationSystemsQuality: 8.0 + Math.random() * 1.7,
    crowdManagementEffectiveness: 7.5 + Math.random() * 2.0,
    emergencyPreparedness: 8.8 + Math.random() * 1.0,
    passengerSatisfactionSurvey: {
      overallSatisfaction: 3.8 + Math.random() * 1.1,
      comfortLevel: 3.9 + Math.random() * 1.0,
      cleanlinessRating: 4.0 + Math.random() * 0.9,
      timelinessRating: 3.7 + Math.random() * 1.2,
      safetyPerception: 4.2 + Math.random() * 0.7,
      totalResponses: 120 + Math.floor(Math.random() * 180)
    }
  };
};

const generateAIAnalysis = (healthMetrics, performanceMetrics, trainset) => {
  const insights = [];
  const anomalies = [];
  
  // Generate predictive insights based on actual metrics
  if (healthMetrics.overall.fitnessScore < 7.0) {
    insights.push({
      category: 'Maintenance',
      prediction: 'Declining health trend detected - maintenance required within 30 days',
      confidence: 0.82,
      timeframe: '2-4 weeks',
      recommendedAction: 'Schedule comprehensive health inspection'
    });
  }

  if (performanceMetrics.energy.energyEfficiencyScore < 7.5) {
    insights.push({
      category: 'Energy Efficiency',
      prediction: 'Energy consumption may increase by 10-15% without optimization',
      confidence: 0.75,
      timeframe: '1-2 months',
      recommendedAction: 'Implement energy optimization protocols'
    });
  }

  if (healthMetrics.mechanical.average < 7.0) {
    insights.push({
      category: 'Performance',
      prediction: 'Mechanical system degradation affecting operational reliability',
      confidence: 0.78,
      timeframe: '3-6 weeks',
      recommendedAction: 'Focus on mechanical system maintenance'
    });
  }

  return {
    predictiveInsights: insights,
    anomalyDetection: anomalies,
    patternAnalysis: {
      performancePattern: 'Seasonal variation with monsoon impact on operations',
      maintenancePattern: 'Regular maintenance schedule showing positive impact',
      failurePattern: healthMetrics.overall.fitnessScore < 7.0 ? 'Increased failure risk detected' : 'Low failure probability',
      optimizationOpportunities: [
        'Energy consumption optimization',
        'Predictive maintenance implementation',
        'Performance monitoring enhancement'
      ]
    },
    benchmarkComparison: {
      fleetAverage: 8.2,
      industryBenchmark: 8.0,
      rankInFleet: Math.floor(Math.random() * 50) + 1,
      percentileRanking: Math.floor(Math.random() * 100)
    }
  };
};

const generateCriticalIssues = (healthMetrics, performanceMetrics) => {
  const issues = [];

  if (healthMetrics.safety.average < 8.0) {
    issues.push({
      category: 'SAFETY',
      severity: 'CRITICAL',
      description: 'Safety systems performance below acceptable threshold',
      location: 'Multiple safety systems',
      detectedDate: new Date(),
      estimatedRepairTime: 24,
      estimatedCost: 180000,
      riskLevel: 'HIGH'
    });
  }

  if (healthMetrics.mechanical.brakeSystem < 7.0) {
    issues.push({
      category: 'MECHANICAL',
      severity: 'HIGH',
      description: 'Brake system performance degradation detected',
      location: 'Brake system',
      detectedDate: new Date(),
      estimatedRepairTime: 16,
      estimatedCost: 95000,
      riskLevel: 'HIGH'
    });
  }

  if (healthMetrics.electrical.batteryHealth < 6.5) {
    issues.push({
      category: 'ELECTRICAL',
      severity: 'MEDIUM',
      description: 'Battery health declining - replacement recommended',
      location: 'Battery compartment',
      detectedDate: new Date(),
      estimatedRepairTime: 8,
      estimatedCost: 250000,
      riskLevel: 'MEDIUM'
    });
  }

  return issues;
};

const generateRecommendations = (healthMetrics, performanceMetrics, criticalIssues) => {
  const recommendations = [];

  if (criticalIssues.some(issue => issue.severity === 'CRITICAL')) {
    recommendations.push({
      type: 'IMMEDIATE',
      priority: 'CRITICAL',
      description: 'Address all critical safety and performance issues immediately',
      estimatedCost: 200000,
      timeframe: 'Within 24 hours',
      expectedImprovement: 'Restore operational safety and compliance',
      responsibility: 'Chief Safety Officer'
    });
  }

  if (healthMetrics.overall.fitnessScore < 7.5) {
    recommendations.push({
      type: 'SCHEDULED',
      priority: 'HIGH',
      description: 'Comprehensive health inspection and maintenance required',
      estimatedCost: 85000,
      timeframe: 'Within 2 weeks',
      expectedImprovement: 'Improve overall fitness score by 15-20%',
      responsibility: 'Maintenance Team Lead'
    });
  }

  if (performanceMetrics.energy.energyEfficiencyScore < 8.0) {
    recommendations.push({
      type: 'MONITORING',
      priority: 'MEDIUM',
      description: 'Implement energy efficiency monitoring and optimization',
      estimatedCost: 45000,
      timeframe: 'Within 1 month',
      expectedImprovement: 'Reduce energy consumption by 8-12%',
      responsibility: 'Energy Management Team'
    });
  }

  return recommendations;
};

const generateComplianceStatus = (healthMetrics, performanceMetrics) => {
  return {
    safetyStandards: {
      isCompliant: healthMetrics.safety.average >= 8.0,
      standardsChecked: ['IS 16295:2014', 'EN 50128:2011', 'IEC 62267:2009', 'RDSO Guidelines'],
      nonComplianceIssues: healthMetrics.safety.average < 8.0 ? ['Safety score below minimum threshold of 8.0'] : [],
      certificationStatus: healthMetrics.safety.average >= 8.0 ? 'VALID' : 'REQUIRES_REVIEW'
    },
    performanceStandards: {
      isCompliant: healthMetrics.overall.fitnessScore >= 7.0,
      benchmarksChecked: ['Availability > 95%', 'Reliability > 92%', 'Energy Efficiency > 8.0'],
      performanceGaps: healthMetrics.overall.fitnessScore < 7.0 ? ['Overall fitness below industry standard'] : [],
      improvementPlan: healthMetrics.overall.fitnessScore < 7.0 ? 'Comprehensive improvement program required' : 'Continue current maintenance schedule'
    }
  };
};

const generateOperationalContext = (trainset, assessmentDate) => {
  const daysSinceAssessment = (Date.now() - assessmentDate.getTime()) / (1000 * 60 * 60 * 24);
  
  return {
    totalMileage: trainset.currentMileage || (200000 + Math.random() * 300000),
    recentMileage: 7500 + Math.random() * 4000, // last 30 days
    operatingHours: 12000 + Math.random() * 8000,
    routesOperated: ['Aluva-Pettah', 'Pettah-Aluva', 'Aluva-MG Road', 'MG Road-Vytila'],
    averagePassengerLoad: 58 + Math.random() * 27, // %
    recentIncidents: Math.floor(Math.random() * 4),
    lastMaintenanceDate: new Date(assessmentDate.getTime() - Math.random() * 60 * 24 * 60 * 60 * 1000),
    nextScheduledMaintenance: new Date(assessmentDate.getTime() + (30 + Math.random() * 60) * 24 * 60 * 60 * 1000)
  };
};

const generateFinancialMetrics = (trainset, healthMetrics) => {
  const baseMaintenanceCost = 65000;
  const healthImpact = (10 - healthMetrics.overall.fitnessScore) * 8000; // Higher cost for lower health
  
  return {
    maintenanceCostPerMonth: baseMaintenanceCost + healthImpact + (Math.random() * 20000),
    operationalCostPerKm: 38 + Math.random() * 18,
    revenueGenerationCapacity: 110000 + Math.random() * 40000,
    depreciationRate: 7.5 + Math.random() * 3.0,
    residualValue: 12000000 + Math.random() * 8000000,
    costBenefitRatio: 1.6 + Math.random() * 0.6
  };
};

const generateImprovements = (hasHistory) => {
  if (!hasHistory) return [];
  
  return [{
    area: 'Overall Fitness',
    previousScore: 7.2 + Math.random() * 1.5,
    currentScore: 7.8 + Math.random() * 1.8,
    improvementPercentage: 5 + Math.random() * 15,
    contributingFactors: ['Regular maintenance', 'System upgrades', 'Operator training'],
    timeframe: '30-60 days'
  }];
};

const generateHistoricalComparison = () => {
  return {
    overallImprovement: (Math.random() - 0.5) * 20, // -10% to +10%
    trendAnalysis: {
      healthTrend: ['IMPROVING', 'STABLE', 'DECLINING'][Math.floor(Math.random() * 3)],
      performanceTrend: ['IMPROVING', 'STABLE', 'DECLINING'][Math.floor(Math.random() * 3)],
      reliabilityTrend: ['IMPROVING', 'STABLE', 'DECLINING'][Math.floor(Math.random() * 3)]
    },
    keyChanges: ['Enhanced monitoring', 'Improved maintenance schedule', 'System upgrades'],
    seasonalFactors: ['Monsoon impact', 'High passenger load during festivals', 'Temperature effects']
  };
};

const generateWeatherConditions = (assessmentDate) => {
  const conditions = ['Clear', 'Partly Cloudy', 'Cloudy', 'Light Rain', 'Heavy Rain', 'Thunderstorm'];
  return conditions[Math.floor(Math.random() * conditions.length)];
};

const generateSpecialCircumstances = () => {
  const circumstances = [
    ['Post-maintenance inspection'],
    ['After incident investigation'],
    ['Routine quarterly assessment'],
    ['Pre-monsoon preparation'],
    ['Annual compliance audit'],
    []
  ];
  return circumstances[Math.floor(Math.random() * circumstances.length)];
};

const generateFitnessCertificates = (trainset, assessmentDate) => {
  return [{
    certificateId: `CERT_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    certificateNumber: `KMRL-FC-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`,
    issuingAuthority: 'KMRL Engineering Department',
    issueDate: assessmentDate,
    expiryDate: new Date(assessmentDate.getTime() + 365 * 24 * 60 * 60 * 1000), // 1 year
    certificateType: ['SAFETY', 'PERFORMANCE', 'ENVIRONMENTAL', 'OPERATIONAL'][Math.floor(Math.random() * 4)],
    status: 'VALID',
    attachments: ['fitness_certificate.pdf', 'inspection_report.pdf']
  }];
};

// Utility functions
const constrainScore = (score) => Math.max(0, Math.min(10, score));

const calculateHealthGrade = (score) => {
  if (score >= 9.5) return 'A+';
  if (score >= 9.0) return 'A';
  if (score >= 8.5) return 'B+';
  if (score >= 8.0) return 'B';
  if (score >= 7.5) return 'C+';
  if (score >= 7.0) return 'C';
  if (score >= 6.0) return 'D';
  return 'F';
};

const determineHealthStatus = (score) => {
  if (score >= 9.0) return 'EXCELLENT';
  if (score >= 8.0) return 'GOOD';
  if (score >= 7.0) return 'FAIR';
  if (score >= 6.0) return 'POOR';
  return 'CRITICAL';
};

const generateBearingTemperatures = () => [
  { location: 'Front Left Bearing', temperature: 45 + Math.random() * 20, status: Math.random() > 0.9 ? 'WARNING' : 'NORMAL' },
  { location: 'Front Right Bearing', temperature: 47 + Math.random() * 18, status: Math.random() > 0.9 ? 'WARNING' : 'NORMAL' },
  { location: 'Rear Left Bearing', temperature: 46 + Math.random() * 19, status: Math.random() > 0.9 ? 'WARNING' : 'NORMAL' },
  { location: 'Rear Right Bearing', temperature: 48 + Math.random() * 17, status: Math.random() > 0.9 ? 'WARNING' : 'NORMAL' }
];

const generateElectronicsTemperatures = () => [
  { location: 'Main Control Unit', temperature: 35 + Math.random() * 15, status: Math.random() > 0.95 ? 'WARNING' : 'NORMAL' },
  { location: 'Power Converter', temperature: 40 + Math.random() * 20, status: Math.random() > 0.95 ? 'WARNING' : 'NORMAL' },
  { location: 'Traction Inverter', temperature: 38 + Math.random() * 18, status: Math.random() > 0.95 ? 'WARNING' : 'NORMAL' }
];

const generateVoltageReadings = () => [
  { component: '25kV Main Supply', voltage: 24800 + Math.random() * 400, status: 'NORMAL' },
  { component: '750V DC Link', voltage: 745 + Math.random() * 10, status: 'NORMAL' },
  { component: '110V Auxiliary', voltage: 108 + Math.random() * 4, status: 'NORMAL' }
];

const generateCurrentReadings = () => [
  { component: 'Traction Motor 1', current: 180 + Math.random() * 40, status: 'NORMAL' },
  { component: 'Traction Motor 2', current: 185 + Math.random() * 35, status: 'NORMAL' },
  { component: 'Auxiliary Load', current: 25 + Math.random() * 10, status: 'NORMAL' }
];

const generatePowerReadings = () => [
  { component: 'Total Traction Power', power: 850 + Math.random() * 300, efficiency: 0.92 + Math.random() * 0.06 },
  { component: 'Auxiliary Power', power: 45 + Math.random() * 15, efficiency: 0.88 + Math.random() * 0.08 },
  { component: 'HVAC System', power: 120 + Math.random() * 30, efficiency: 0.85 + Math.random() * 0.10 }
];

const generateSummaryStats = async () => {
  const allAssessments = await Fitness.find({}).sort({ 'assessmentDetails.assessmentDate': -1 });
  
  // Get latest assessment for each trainset
  const latestAssessments = new Map();
  allAssessments.forEach(assessment => {
    const trainsetNumber = assessment.trainsetNumber;
    if (!latestAssessments.has(trainsetNumber) || 
        assessment.assessmentDetails.assessmentDate > latestAssessments.get(trainsetNumber).assessmentDetails.assessmentDate) {
      latestAssessments.set(trainsetNumber, assessment);
    }
  });

  const latest = Array.from(latestAssessments.values());
  const averageScore = latest.reduce((sum, a) => sum + a.healthMetrics.overall.fitnessScore, 0) / latest.length;
  
  return {
    averageScore,
    excellent: latest.filter(a => a.healthMetrics.overall.fitnessScore >= 9.0).length,
    good: latest.filter(a => a.healthMetrics.overall.fitnessScore >= 8.0 && a.healthMetrics.overall.fitnessScore < 9.0).length,
    fair: latest.filter(a => a.healthMetrics.overall.fitnessScore >= 7.0 && a.healthMetrics.overall.fitnessScore < 8.0).length,
    needsAttention: latest.filter(a => a.healthMetrics.overall.fitnessScore < 7.0).length,
    criticalIssues: allAssessments.reduce((sum, a) => sum + a.results.criticalIssues.filter(i => i.severity === 'CRITICAL').length, 0),
    totalRecommendations: allAssessments.reduce((sum, a) => sum + a.results.recommendations.length, 0)
  };
};

// Run the script
if (require.main === module) {
  generateSampleFitnessData();
}

module.exports = { generateSampleFitnessData };