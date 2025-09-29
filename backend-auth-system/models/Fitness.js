const mongoose = require('mongoose');

// KMRL Fitness Tracking Schema - Comprehensive Health & Performance Management
const fitnessSchema = new mongoose.Schema({
  // Basic Identification
  fitnessId: {
    type: String,
    required: true,
    unique: true,
    default: function() {
      return `FIT_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
  },
  
  // Trainset Reference
  trainsetId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Trainset',
    required: true
  },
  trainsetNumber: {
    type: String,
    required: true
  },
  
  // Fitness Assessment Details
  assessmentType: {
    type: String,
    enum: [
      'COMPREHENSIVE_HEALTH_CHECK',
      'PERFORMANCE_ANALYSIS',
      'SAFETY_INSPECTION',
      'ENERGY_EFFICIENCY_AUDIT',
      'PREVENTIVE_MAINTENANCE_REVIEW',
      'INCIDENT_INVESTIGATION',
      'ROUTINE_MONITORING',
      'COMPLIANCE_AUDIT'
    ],
    required: true
  },
  
  // Health Metrics
  healthMetrics: {
    overall: {
      fitnessScore: { type: Number, min: 0, max: 10, required: true },
      healthGrade: { type: String, enum: ['A+', 'A', 'B+', 'B', 'C+', 'C', 'D', 'F'], required: true },
      status: { type: String, enum: ['EXCELLENT', 'GOOD', 'FAIR', 'POOR', 'CRITICAL'], required: true },
      reliability: { type: Number, min: 0, max: 100, required: true }, // %
      availability: { type: Number, min: 0, max: 100, required: true } // %
    },
    
    mechanical: {
      engineHealth: { type: Number, min: 0, max: 10, required: true },
      brakeSystem: { type: Number, min: 0, max: 10, required: true },
      suspension: { type: Number, min: 0, max: 10, required: true },
      wheelCondition: { type: Number, min: 0, max: 10, required: true },
      doorMechanism: { type: Number, min: 0, max: 10, required: true },
      couplingSystem: { type: Number, min: 0, max: 10, required: true },
      airCompressor: { type: Number, min: 0, max: 10, required: true },
      auxiliarySystems: { type: Number, min: 0, max: 10, required: true }
    },
    
    electrical: {
      powerSystem: { type: Number, min: 0, max: 10, required: true },
      tractionMotors: { type: Number, min: 0, max: 10, required: true },
      controlSystems: { type: Number, min: 0, max: 10, required: true },
      lightingSystems: { type: Number, min: 0, max: 10, required: true },
      batteryHealth: { type: Number, min: 0, max: 10, required: true },
      chargingSystem: { type: Number, min: 0, max: 10, required: true },
      emergencySystems: { type: Number, min: 0, max: 10, required: true }
    },
    
    comfort: {
      airConditioning: { type: Number, min: 0, max: 10, required: true },
      seatingCondition: { type: Number, min: 0, max: 10, required: true },
      flooringCondition: { type: Number, min: 0, max: 10, required: true },
      windowsCondition: { type: Number, min: 0, max: 10, required: true },
      cleanlinessScore: { type: Number, min: 0, max: 10, required: true },
      noiseLevel: { type: Number, min: 0, max: 10, required: true }, // inverted score (lower noise = higher score)
      vibrationLevel: { type: Number, min: 0, max: 10, required: true } // inverted score
    },
    
    safety: {
      emergencyBrakes: { type: Number, min: 0, max: 10, required: true },
      fireSuppressionSystem: { type: Number, min: 0, max: 10, required: true },
      emergencyExits: { type: Number, min: 0, max: 10, required: true },
      communicationSystems: { type: Number, min: 0, max: 10, required: true },
      signagingClarity: { type: Number, min: 0, max: 10, required: true },
      cctvSystems: { type: Number, min: 0, max: 10, required: true },
      accessibilityFeatures: { type: Number, min: 0, max: 10, required: true }
    }
  },
  
  // Performance Metrics
  performanceMetrics: {
    operational: {
      onTimePerformance: { type: Number, min: 0, max: 100, required: true }, // %
      serviceReliability: { type: Number, min: 0, max: 100, required: true }, // %
      passengerCapacityUtilization: { type: Number, min: 0, max: 100, required: true }, // %
      averageSpeed: { type: Number, min: 0, max: 120, required: true }, // km/h
      accelerationPerformance: { type: Number, min: 0, max: 10, required: true },
      brakingEfficiency: { type: Number, min: 0, max: 10, required: true }
    },
    
    energy: {
      energyEfficiencyScore: { type: Number, min: 0, max: 10, required: true },
      powerConsumptionPerKm: { type: Number, required: true }, // kWh/km
      regenerativeBrakingEfficiency: { type: Number, min: 0, max: 100, required: true }, // %
      idlePowerConsumption: { type: Number, required: true }, // kWh
      peakPowerDemand: { type: Number, required: true }, // kW
      powerFactorEfficiency: { type: Number, min: 0, max: 1, required: true }
    },
    
    maintenance: {
      maintenanceCompliance: { type: Number, min: 0, max: 100, required: true }, // %
      breakdownFrequency: { type: Number, required: true }, // incidents per month
      meanTimeBetweenFailures: { type: Number, required: true }, // hours
      meanTimeToRepair: { type: Number, required: true }, // hours
      sparesAvailability: { type: Number, min: 0, max: 100, required: true }, // %
      predictiveMaintenanceScore: { type: Number, min: 0, max: 10, required: true }
    }
  },
  
  // IoT Sensor Data Integration
  sensorData: {
    vibration: {
      frontTruck: { x: Number, y: Number, z: Number, severity: String },
      rearTruck: { x: Number, y: Number, z: Number, severity: String },
      carBody: { x: Number, y: Number, z: Number, severity: String }
    },
    
    temperature: {
      motors: [{ location: String, temperature: Number, status: String }],
      brakes: [{ location: String, temperature: Number, status: String }],
      bearings: [{ location: String, temperature: Number, status: String }],
      electronics: [{ location: String, temperature: Number, status: String }]
    },
    
    acoustic: {
      wheelNoise: { level: Number, frequency: Number, analysis: String },
      motorNoise: { level: Number, frequency: Number, analysis: String },
      brakingNoise: { level: Number, frequency: Number, analysis: String }
    },
    
    electrical: {
      voltageReadings: [{ component: String, voltage: Number, status: String }],
      currentReadings: [{ component: String, current: Number, status: String }],
      powerReadings: [{ component: String, power: Number, efficiency: Number }]
    }
  },
  
  // Environmental Performance
  environmentalImpact: {
    carbonFootprint: { type: Number, required: true }, // kg CO2 per km
    energySource: { type: String, enum: ['RENEWABLE', 'MIXED', 'CONVENTIONAL'], required: true },
    noiseEmission: { type: Number, required: true }, // dB average
    recyclingScore: { type: Number, min: 0, max: 10, required: true },
    wasteGeneration: { type: Number, required: true }, // kg per month
    ecoFriendlinessRating: { type: Number, min: 0, max: 10, required: true }
  },
  
  // Passenger Experience Metrics
  passengerExperience: {
    comfortRating: { type: Number, min: 0, max: 10, required: true },
    accessibilityScore: { type: Number, min: 0, max: 10, required: true },
    informationSystemsQuality: { type: Number, min: 0, max: 10, required: true },
    crowdManagementEffectiveness: { type: Number, min: 0, max: 10, required: true },
    emergencyPreparedness: { type: Number, min: 0, max: 10, required: true },
    passengerSatisfactionSurvey: {
      overallSatisfaction: { type: Number, min: 1, max: 5 },
      comfortLevel: { type: Number, min: 1, max: 5 },
      cleanlinessRating: { type: Number, min: 1, max: 5 },
      timelinessRating: { type: Number, min: 1, max: 5 },
      safetyPerception: { type: Number, min: 1, max: 5 },
      totalResponses: { type: Number, default: 0 }
    }
  },
  
  // Assessment Results
  results: {
    criticalIssues: [{
      category: { type: String, enum: ['SAFETY', 'MECHANICAL', 'ELECTRICAL', 'COMFORT', 'PERFORMANCE'] },
      severity: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] },
      description: { type: String, required: true },
      location: String,
      detectedDate: { type: Date, default: Date.now },
      estimatedRepairTime: Number, // hours
      estimatedCost: Number, // INR
      riskLevel: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] }
    }],
    
    recommendations: [{
      type: { type: String, enum: ['IMMEDIATE', 'SCHEDULED', 'MONITORING', 'UPGRADE'] },
      priority: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] },
      description: { type: String, required: true },
      estimatedCost: Number, // INR
      timeframe: String,
      expectedImprovement: String,
      responsibility: String
    }],
    
    improvements: [{
      area: { type: String, required: true },
      previousScore: { type: Number, required: true },
      currentScore: { type: Number, required: true },
      improvementPercentage: { type: Number, required: true },
      contributingFactors: [String],
      timeframe: String
    }],
    
    compliance: {
      safetyStandards: {
        isCompliant: { type: Boolean, required: true },
        standardsChecked: [String],
        nonComplianceIssues: [String],
        certificationStatus: { type: String, enum: ['VALID', 'EXPIRED', 'PENDING', 'REJECTED'] }
      },
      
      performanceStandards: {
        isCompliant: { type: Boolean, required: true },
        benchmarksChecked: [String],
        performanceGaps: [String],
        improvementPlan: String
      }
    }
  },
  
  // Historical Comparison
  historicalComparison: {
    previousAssessmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Fitness' },
    overallImprovement: { type: Number }, // percentage
    trendAnalysis: {
      healthTrend: { type: String, enum: ['IMPROVING', 'STABLE', 'DECLINING'] },
      performanceTrend: { type: String, enum: ['IMPROVING', 'STABLE', 'DECLINING'] },
      reliabilityTrend: { type: String, enum: ['IMPROVING', 'STABLE', 'DECLINING'] }
    },
    keyChanges: [String],
    seasonalFactors: [String]
  },
  
  // Assessment Metadata
  assessmentDetails: {
    inspectorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    inspectorName: { type: String, required: true },
    inspectorCertification: { type: String, required: true },
    assessmentDate: { type: Date, default: Date.now },
    assessmentDuration: { type: Number, required: true }, // minutes
    assessmentLocation: { type: String, required: true },
    weatherConditions: { type: String },
    trafficConditions: { type: String },
    specialCircumstances: [String]
  },
  
  // Operational Context
  operationalContext: {
    totalMileage: { type: Number, required: true },
    recentMileage: { type: Number, required: true }, // last 30 days
    operatingHours: { type: Number, required: true },
    routesOperated: [String],
    averagePassengerLoad: { type: Number, required: true }, // %
    recentIncidents: { type: Number, required: true },
    lastMaintenanceDate: { type: Date, required: true },
    nextScheduledMaintenance: { type: Date, required: true }
  },
  
  // AI Analysis Integration
  aiAnalysis: {
    predictiveInsights: [{
      category: String,
      prediction: String,
      confidence: { type: Number, min: 0, max: 1 },
      timeframe: String,
      recommendedAction: String
    }],
    
    anomalyDetection: [{
      parameter: String,
      anomalyType: String,
      severity: String,
      confidence: { type: Number, min: 0, max: 1 },
      detectedAt: { type: Date, default: Date.now }
    }],
    
    patternAnalysis: {
      performancePattern: String,
      maintenancePattern: String,
      failurePattern: String,
      optimizationOpportunities: [String]
    },
    
    benchmarkComparison: {
      fleetAverage: Number,
      industryBenchmark: Number,
      rankInFleet: Number,
      percentileRanking: Number
    }
  },
  
  // Real-time Monitoring Status
  realTimeStatus: {
    isMonitored: { type: Boolean, default: false },
    lastDataUpdate: { type: Date },
    dataQuality: { type: String, enum: ['EXCELLENT', 'GOOD', 'FAIR', 'POOR'] },
    connectedSensors: { type: Number, default: 0 },
    alertsActive: { type: Number, default: 0 },
    monitoringFrequency: { type: String, enum: ['REAL_TIME', 'HOURLY', 'DAILY', 'WEEKLY'] }
  },
  
  // Fitness Certificate Information
  certificates: [{
    certificateId: String,
    certificateNumber: String,
    issuingAuthority: String,
    issueDate: Date,
    expiryDate: Date,
    certificateType: { type: String, enum: ['SAFETY', 'PERFORMANCE', 'ENVIRONMENTAL', 'OPERATIONAL'] },
    status: { type: String, enum: ['VALID', 'EXPIRED', 'PENDING', 'REJECTED'] },
    attachments: [String]
  }],
  
  // Financial Impact
  financialMetrics: {
    maintenanceCostPerMonth: { type: Number, required: true },
    operationalCostPerKm: { type: Number, required: true },
    revenueGenerationCapacity: { type: Number, required: true },
    depreciationRate: { type: Number, required: true },
    residualValue: { type: Number, required: true },
    costBenefitRatio: { type: Number, required: true }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for efficient querying
fitnessSchema.index({ trainsetId: 1, assessmentDate: -1 });
fitnessSchema.index({ 'healthMetrics.overall.fitnessScore': -1 });
fitnessSchema.index({ 'healthMetrics.overall.status': 1 });
fitnessSchema.index({ trainsetNumber: 1 });
fitnessSchema.index({ assessmentType: 1 });
fitnessSchema.index({ 'assessmentDetails.assessmentDate': -1 });

// Virtual for overall health status
fitnessSchema.virtual('overallHealthStatus').get(function() {
  const score = this.healthMetrics.overall.fitnessScore;
  if (score >= 9) return 'EXCELLENT';
  if (score >= 8) return 'VERY_GOOD';
  if (score >= 7) return 'GOOD';
  if (score >= 6) return 'FAIR';
  if (score >= 5) return 'POOR';
  return 'CRITICAL';
});

// Virtual for fitness grade calculation
fitnessSchema.virtual('computedGrade').get(function() {
  const score = this.healthMetrics.overall.fitnessScore;
  if (score >= 9.5) return 'A+';
  if (score >= 9.0) return 'A';
  if (score >= 8.5) return 'B+';
  if (score >= 8.0) return 'B';
  if (score >= 7.5) return 'C+';
  if (score >= 7.0) return 'C';
  if (score >= 6.0) return 'D';
  return 'F';
});

// Virtual for days until next assessment
fitnessSchema.virtual('daysUntilNextAssessment').get(function() {
  if (!this.operationalContext.nextScheduledMaintenance) return null;
  const today = new Date();
  const nextDate = new Date(this.operationalContext.nextScheduledMaintenance);
  const diffTime = nextDate.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Methods
fitnessSchema.methods.calculateOverallFitnessScore = function() {
  const mechanical = Object.values(this.healthMetrics.mechanical).reduce((sum, val) => sum + val, 0) / Object.keys(this.healthMetrics.mechanical).length;
  const electrical = Object.values(this.healthMetrics.electrical).reduce((sum, val) => sum + val, 0) / Object.keys(this.healthMetrics.electrical).length;
  const comfort = Object.values(this.healthMetrics.comfort).reduce((sum, val) => sum + val, 0) / Object.keys(this.healthMetrics.comfort).length;
  const safety = Object.values(this.healthMetrics.safety).reduce((sum, val) => sum + val, 0) / Object.keys(this.healthMetrics.safety).length;
  
  // Weighted average (safety has highest weight)
  return (mechanical * 0.25 + electrical * 0.25 + comfort * 0.2 + safety * 0.3);
};

fitnessSchema.methods.getCriticalIssuesCount = function() {
  return this.results.criticalIssues.filter(issue => issue.severity === 'CRITICAL').length;
};

fitnessSchema.methods.getHighPriorityRecommendations = function() {
  return this.results.recommendations.filter(rec => rec.priority === 'HIGH' || rec.priority === 'CRITICAL');
};

fitnessSchema.methods.getComplianceStatus = function() {
  const safetyCompliant = this.results.compliance.safetyStandards.isCompliant;
  const performanceCompliant = this.results.compliance.performanceStandards.isCompliant;
  return safetyCompliant && performanceCompliant ? 'COMPLIANT' : 'NON_COMPLIANT';
};

// Static methods
fitnessSchema.statics.getFleetAverageScore = async function() {
  const result = await this.aggregate([
    { $group: { _id: null, averageScore: { $avg: '$healthMetrics.overall.fitnessScore' } } }
  ]);
  return result[0]?.averageScore || 0;
};

fitnessSchema.statics.getTrainsetsNeedingAttention = async function() {
  return await this.find({
    $or: [
      { 'healthMetrics.overall.fitnessScore': { $lt: 6 } },
      { 'healthMetrics.overall.status': { $in: ['POOR', 'CRITICAL'] } },
      { 'results.criticalIssues.severity': 'CRITICAL' }
    ]
  }).populate('trainsetId');
};

fitnessSchema.statics.getPerformanceTrends = async function(days = 30) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  
  return await this.aggregate([
    { $match: { 'assessmentDetails.assessmentDate': { $gte: date } } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$assessmentDetails.assessmentDate' } },
        averageFitnessScore: { $avg: '$healthMetrics.overall.fitnessScore' },
        averageReliability: { $avg: '$healthMetrics.overall.reliability' },
        assessmentCount: { $sum: 1 }
      }
    },
    { $sort: { '_id': 1 } }
  ]);
};

module.exports = mongoose.model('Fitness', fitnessSchema);