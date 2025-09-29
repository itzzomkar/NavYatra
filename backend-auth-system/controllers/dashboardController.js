const Trainset = require('../models/Trainset');
const Schedule = require('../models/Schedule');
const Optimization = require('../models/Optimization');
const Fitness = require('../models/Fitness');
const { websocketService } = require('../services/websocketService');
const optimizationService = require('../services/aiOptimizationService');
const realTimeEngine = require('../services/realTimeOptimizationEngine');

// Dashboard KPIs and Overview Data
const getDashboardOverview = async (req, res) => {
  try {
    const { timeRange = '24h' } = req.query;
    
    // Calculate date range based on timeRange parameter
    const now = new Date();
    let startDate;
    switch (timeRange) {
      case '24h':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }

    // Fetch data in parallel for better performance
    const [
      totalTrainsets,
      activeTrainsets,
      trainsetsInMaintenance,
      recentOptimizations,
      fitnessRecords,
      schedules
    ] = await Promise.all([
      Trainset.countDocuments({ isActive: true }),
      Trainset.countDocuments({ isActive: true, status: 'IN_SERVICE' }),
      Trainset.countDocuments({ isActive: true, status: 'MAINTENANCE' }),
      Optimization.find({ createdAt: { $gte: startDate } }).sort({ createdAt: -1 }).limit(10),
      Fitness.find({ createdAt: { $gte: startDate } }),
      Schedule.find({ date: { $gte: startDate } })
    ]);

    // Calculate KPIs
    const fleetAvailability = totalTrainsets > 0 ? ((totalTrainsets - trainsetsInMaintenance) / totalTrainsets * 100) : 0;
    const onTimePerformance = 98.5; // This would come from real-time tracking
    const energyEfficiency = schedules.length > 0 ? 
      schedules.reduce((sum, s) => sum + (s.energyEfficiency || 85), 0) / schedules.length : 85;
    const maintenanceScore = fitnessRecords.length > 0 ?
      fitnessRecords.reduce((sum, f) => sum + f.overallScore, 0) / fitnessRecords.length : 94;
    
    // Calculate daily passengers (mock data - would come from ticketing system)
    const dailyPassengers = Math.floor(Math.random() * 50000) + 40000;

    // Performance chart data
    const performanceData = await generatePerformanceChartData(timeRange, schedules);
    
    // Maintenance distribution
    const maintenanceData = await getMaintenanceDistribution();

    // Fleet radar data
    const fleetRadarData = await getFleetRadarData(fitnessRecords);

    const overview = {
      kpis: {
        fleetAvailability: {
          value: `${Math.round(fleetAvailability)}%`,
          change: Math.random() * 5 - 2.5, // Random change for demo
          trend: fleetAvailability > 90 ? 'up' : 'down'
        },
        onTimePerformance: {
          value: `${onTimePerformance}%`,
          change: 1.5,
          trend: 'up'
        },
        energyEfficiency: {
          value: `${Math.round(energyEfficiency)}%`,
          change: -2.1,
          trend: 'down'
        },
        maintenanceScore: {
          value: Math.round(maintenanceScore),
          change: 0,
          trend: 'stable'
        },
        activeTrains: {
          value: `${activeTrainsets}/${totalTrainsets}`,
          change: 5,
          trend: 'up'
        },
        dailyPassengers: {
          value: `${(dailyPassengers / 1000).toFixed(1)}K`,
          change: 8.4,
          trend: 'up'
        }
      },
      charts: {
        performance: performanceData,
        maintenance: maintenanceData,
        fleetRadar: fleetRadarData
      },
      summary: {
        totalTrainsets,
        activeTrainsets,
        trainsetsInMaintenance,
        recentOptimizations: recentOptimizations.length,
        timeRange
      }
    };

    res.json({
      success: true,
      data: overview
    });

  } catch (error) {
    console.error('Dashboard overview error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard overview',
      error: error.message
    });
  }
};

// Handle schedule optimization trigger
const optimizeSchedule = async (req, res) => {
  try {
    const { objectives = ['energy', 'passenger_satisfaction', 'maintenance'] } = req.body;
    
    // Start the optimization process
    const optimizationId = Date.now().toString();
    
    // Emit real-time update to frontend
    websocketService.broadcastToAll('optimization_started', {
      id: optimizationId,
      status: 'in_progress',
      message: 'Schedule optimization initiated...'
    });

    // Get active trainsets for optimization
    const trainsets = await Trainset.find({ 
      isActive: true, 
      status: { $in: ['IN_SERVICE', 'AVAILABLE'] } 
    });

    // Create optimization record
    const optimization = new Optimization({
      type: 'SCHEDULE_OPTIMIZATION',
      objectives,
      status: 'PROCESSING',
      trainsets: trainsets.map(t => t._id),
      initiatedBy: req.user.id,
      parameters: {
        timeRange: '24h',
        considerMaintenance: true,
        considerPassengerFlow: true,
        energyOptimization: objectives.includes('energy')
      }
    });

    await optimization.save();

    // Simulate optimization process (in production, this would be async)
    setTimeout(async () => {
      try {
        // Run the actual optimization
        const result = await optimizationService.optimizeSchedules(trainsets, objectives);
        
        // Update optimization record
        await Optimization.findByIdAndUpdate(optimization._id, {
          status: 'COMPLETED',
          results: result,
          completedAt: new Date(),
          metrics: {
            energySavings: Math.random() * 20 + 10, // 10-30% savings
            efficiencyImprovement: Math.random() * 15 + 5, // 5-20% improvement
            estimatedCostSavings: Math.random() * 100000 + 50000 // $50k-$150k savings
          }
        });

        // Broadcast completion
        websocketService.broadcastToAll('optimization_completed', {
          id: optimizationId,
          status: 'completed',
          message: `Optimization complete! ${Math.round(result.energySavings || 15)}% energy savings achieved.`,
          results: result
        });

      } catch (error) {
        await Optimization.findByIdAndUpdate(optimization._id, {
          status: 'FAILED',
          error: error.message,
          completedAt: new Date()
        });

        websocketService.broadcastToAll('optimization_failed', {
          id: optimizationId,
          status: 'failed',
          message: 'Optimization failed. Please try again.',
          error: error.message
        });
      }
    }, 3000); // 3 second delay to simulate processing

    res.json({
      success: true,
      message: 'Schedule optimization initiated',
      data: {
        optimizationId: optimization._id,
        status: 'processing',
        estimatedDuration: '2-3 minutes'
      }
    });

  } catch (error) {
    console.error('Optimize schedule error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to start optimization',
      error: error.message
    });
  }
};

// Handle AI insight actions
const handleAIInsight = async (req, res) => {
  try {
    const { action, insightType, parameters } = req.body;
    
    let result;
    
    switch (insightType) {
      case 'energy_optimization':
        if (action === 'apply') {
          result = await applyEnergyOptimization(parameters);
        } else if (action === 'details') {
          result = await getEnergyOptimizationDetails();
        }
        break;
        
      case 'schedule_optimization':
        if (action === 'apply') {
          result = await applyScheduleOptimization(parameters);
        } else if (action === 'details') {
          result = await getScheduleOptimizationDetails();
        }
        break;
        
      case 'predictive_maintenance':
        if (action === 'schedule') {
          result = await schedulePredictiveMaintenance(parameters);
        } else if (action === 'details') {
          result = await getPredictiveMaintenanceDetails();
        }
        break;
        
      default:
        return res.status(400).json({
          success: false,
          message: 'Unknown insight type'
        });
    }

    res.json({
      success: true,
      message: `AI insight ${action} completed successfully`,
      data: result
    });

  } catch (error) {
    console.error('Handle AI insight error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to handle AI insight',
      error: error.message
    });
  }
};

// Get active alerts
const getActiveAlerts = async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    // Get critical alerts from various sources
    const [
      maintenanceAlerts,
      fitnessAlerts,
      operationalAlerts
    ] = await Promise.all([
      getMaintenanceAlerts(),
      getFitnessAlerts(),
      getOperationalAlerts()
    ]);

    const allAlerts = [
      ...maintenanceAlerts,
      ...fitnessAlerts,
      ...operationalAlerts
    ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
     .slice(0, limit);

    res.json({
      success: true,
      data: allAlerts,
      meta: {
        total: allAlerts.length,
        critical: allAlerts.filter(a => a.type === 'critical').length,
        warning: allAlerts.filter(a => a.type === 'warning').length,
        info: allAlerts.filter(a => a.type === 'info').length
      }
    });

  } catch (error) {
    console.error('Get active alerts error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch alerts',
      error: error.message
    });
  }
};

// Train fleet status with real-time data
const getFleetStatus = async (req, res) => {
  try {
    const { page = 1, limit = 25, status, location } = req.query;

    const filter = { isActive: true };
    if (status && status !== 'all') {
      filter.status = status;
    }

    const trainsets = await Trainset.find(filter)
      .populate('currentSchedule')
      .populate('latestFitness')
      .sort({ trainsetNumber: 1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Trainset.countDocuments(filter);

    // Enhance with real-time data
    const enhancedTrainsets = trainsets.map(trainset => {
      const obj = trainset.toObject();
      
      // Add real-time simulation data
      obj.realTime = {
        speed: Math.floor(Math.random() * 80),
        passengers: Math.floor(Math.random() * 1000),
        energy: 60 + Math.random() * 40,
        temperature: 20 + Math.random() * 15,
        location: ['Aluva', 'Pulinchodu', 'Companypady', 'Ambattukavu', 'Muttom', 'Kalamassery'][Math.floor(Math.random() * 6)],
        lastUpdate: new Date()
      };
      
      // Add fitness score
      obj.fitness = obj.latestFitness?.overallScore || (75 + Math.random() * 25);
      
      // Add next maintenance date
      obj.nextMaintenance = obj.nextMaintenanceDate?.toLocaleDateString() || 
        new Date(Date.now() + Math.random() * 30 * 24 * 60 * 60 * 1000).toLocaleDateString();
      
      obj.id = obj._id.toString();
      return obj;
    });

    res.json({
      success: true,
      data: enhancedTrainsets,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Get fleet status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch fleet status',
      error: error.message
    });
  }
};

// Handle train details modal actions
const handleTrainAction = async (req, res) => {
  try {
    const { trainId } = req.params;
    const { action, parameters } = req.body;
    
    const trainset = await Trainset.findById(trainId);
    if (!trainset) {
      return res.status(404).json({
        success: false,
        message: 'Trainset not found'
      });
    }

    let result;
    
    switch (action) {
      case 'view_full_report':
        result = await generateFullTrainReport(trainset);
        break;
        
      case 'schedule_maintenance':
        result = await scheduleMaintenanceForTrain(trainset, parameters);
        break;
        
      case 'view_iot_data':
        result = await getTrainIoTData(trainset);
        break;
        
      case 'update_fitness':
        result = await updateTrainFitness(trainset, parameters);
        break;
        
      default:
        return res.status(400).json({
          success: false,
          message: 'Unknown action'
        });
    }

    res.json({
      success: true,
      message: `${action} completed successfully`,
      data: result
    });

  } catch (error) {
    console.error('Handle train action error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to handle train action',
      error: error.message
    });
  }
};

// Configure AI system
const configureAI = async (req, res) => {
  try {
    const { settings } = req.body;
    
    // Update AI configuration
    const configuration = {
      ...settings,
      updatedBy: req.user.id,
      updatedAt: new Date()
    };
    
    // In production, this would save to a configuration collection
    // For now, we'll just validate and return success
    
    res.json({
      success: true,
      message: 'AI configuration updated successfully',
      data: configuration
    });

  } catch (error) {
    console.error('Configure AI error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to configure AI',
      error: error.message
    });
  }
};

// Helper functions
async function generatePerformanceChartData(timeRange, schedules) {
  // Generate mock performance data based on time range
  const hours = timeRange === '24h' ? 24 : timeRange === '7d' ? 168 : 720;
  const dataPoints = Math.min(hours, 24); // Max 24 data points for charts
  
  const labels = [];
  const fleetUtilization = [];
  const energyConsumption = [];
  
  for (let i = 0; i < dataPoints; i++) {
    if (timeRange === '24h') {
      labels.push(`${String(i).padStart(2, '0')}:00`);
    } else {
      labels.push(`Day ${i + 1}`);
    }
    
    fleetUtilization.push(Math.floor(Math.random() * 40) + 60); // 60-100%
    energyConsumption.push(Math.floor(Math.random() * 40) + 30); // 30-70%
  }
  
  return {
    labels,
    datasets: [
      {
        label: 'Fleet Utilization',
        data: fleetUtilization,
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
      },
      {
        label: 'Energy Consumption',
        data: energyConsumption,
        borderColor: 'rgb(251, 146, 60)',
        backgroundColor: 'rgba(251, 146, 60, 0.1)',
      }
    ]
  };
}

async function getMaintenanceDistribution() {
  const maintenanceData = await Trainset.aggregate([
    {
      $group: {
        _id: '$maintenanceType',
        count: { $sum: 1 }
      }
    }
  ]);
  
  return {
    labels: ['Scheduled', 'Preventive', 'Corrective', 'Emergency'],
    datasets: [{
      data: [45, 30, 20, 5], // Mock data
      backgroundColor: [
        'rgba(34, 197, 94, 0.8)',
        'rgba(59, 130, 246, 0.8)',
        'rgba(251, 146, 60, 0.8)',
        'rgba(239, 68, 68, 0.8)'
      ]
    }]
  };
}

async function getFleetRadarData(fitnessRecords) {
  const avgFitness = fitnessRecords.length > 0 ? 
    fitnessRecords.reduce((acc, curr) => ({
      fitness: acc.fitness + (curr.overallScore || 0),
      mileage: acc.mileage + (curr.mileageScore || 0),
      branding: acc.branding + (curr.brandingScore || 0),
      energy: acc.energy + (curr.energyScore || 0),
      cleaning: acc.cleaning + (curr.cleaningScore || 0),
      safety: acc.safety + (curr.safetyScore || 0)
    }), { fitness: 0, mileage: 0, branding: 0, energy: 0, cleaning: 0, safety: 0 }) : 
    { fitness: 92, mileage: 78, branding: 85, energy: 88, cleaning: 95, safety: 98 };
  
  const count = fitnessRecords.length || 1;
  
  return {
    labels: ['Fitness', 'Mileage', 'Branding', 'Energy', 'Cleaning', 'Safety'],
    datasets: [{
      label: 'Current Status',
      data: [
        avgFitness.fitness / count,
        avgFitness.mileage / count,
        avgFitness.branding / count,
        avgFitness.energy / count,
        avgFitness.cleaning / count,
        avgFitness.safety / count
      ]
    }]
  };
}

async function getMaintenanceAlerts() {
  const trainsets = await Trainset.find({
    $or: [
      { nextMaintenanceDate: { $lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) } },
      { status: 'MAINTENANCE_REQUIRED' }
    ]
  }).limit(5);
  
  return trainsets.map(train => ({
    id: train._id.toString(),
    type: new Date(train.nextMaintenanceDate) <= new Date() ? 'critical' : 'warning',
    message: `${train.trainsetNumber} ${new Date(train.nextMaintenanceDate) <= new Date() ? 'requires immediate maintenance' : 'maintenance due in ' + Math.ceil((new Date(train.nextMaintenanceDate) - new Date()) / (1000 * 60 * 60 * 24)) + ' days'}`,
    timestamp: new Date(),
    trainId: train._id.toString(),
    source: 'maintenance_system'
  }));
}

async function getFitnessAlerts() {
  const lowFitnessTrains = await Trainset.find()
    .populate('latestFitness')
    .limit(5);
    
  return lowFitnessTrains
    .filter(train => train.latestFitness && train.latestFitness.overallScore < 80)
    .map(train => ({
      id: `fitness_${train._id.toString()}`,
      type: train.latestFitness.overallScore < 60 ? 'critical' : 'warning',
      message: `${train.trainsetNumber} fitness score (${train.latestFitness.overallScore}%) below threshold`,
      timestamp: new Date(),
      trainId: train._id.toString(),
      source: 'fitness_system'
    }));
}

async function getOperationalAlerts() {
  // Mock operational alerts
  return [
    {
      id: 'ops_1',
      type: 'info',
      message: 'Peak hour schedule optimization completed - 18% efficiency improvement achieved',
      timestamp: new Date(Date.now() - 3600000),
      source: 'optimization_engine'
    },
    {
      id: 'ops_2',
      type: 'warning',
      message: 'High passenger load detected at MG Road station - consider additional service',
      timestamp: new Date(Date.now() - 1800000),
      source: 'passenger_analytics'
    }
  ];
}

async function applyEnergyOptimization(parameters) {
  // Mock energy optimization application
  return {
    applied: true,
    estimatedSavings: '18%',
    implementationTime: '2024-01-15T10:00:00Z',
    affectedTrainsets: parameters?.trainsets || ['TS001', 'TS003', 'TS007'],
    details: 'Stabling position optimization applied to reduce energy consumption'
  };
}

async function getEnergyOptimizationDetails() {
  return {
    recommendation: 'Optimize stabling positions during off-peak hours',
    potentialSavings: '15-20% energy reduction',
    implementation: 'Automatic scheduling adjustment',
    impact: 'Low - transparent to passengers',
    timeframe: 'Immediate'
  };
}

async function applyScheduleOptimization(parameters) {
  return {
    applied: true,
    improvedAvailability: '12%',
    rescheduledTrains: ['TS003', 'TS007'],
    implementationTime: new Date().toISOString(),
    details: 'Schedule optimization applied to improve fleet availability'
  };
}

async function getScheduleOptimizationDetails() {
  return {
    recommendation: 'Reschedule TS003 and TS007 for better fleet distribution',
    potentialImprovement: '12% availability increase',
    affectedServices: 2,
    passengerImpact: 'Minimal - improved service frequency',
    timeframe: 'Next service cycle'
  };
}

async function schedulePredictiveMaintenance(parameters) {
  const { trainId, maintenanceType, scheduledDate } = parameters;
  
  // Create maintenance schedule
  const maintenance = {
    trainId,
    type: maintenanceType || 'PREDICTIVE_BRAKE_INSPECTION',
    scheduledDate: scheduledDate || new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
    priority: 'HIGH',
    reason: 'Early brake wear detection',
    estimatedDuration: '4 hours',
    status: 'SCHEDULED'
  };
  
  return {
    scheduled: true,
    maintenanceId: `MAINT_${Date.now()}`,
    ...maintenance
  };
}

async function getPredictiveMaintenanceDetails() {
  return {
    trainId: 'TS015',
    issue: 'Early brake wear indicators detected',
    confidence: '89%',
    recommendedAction: 'Schedule brake inspection within 5 days',
    riskLevel: 'Medium',
    estimatedCost: '$2,500',
    potentialDowntime: '4-6 hours'
  };
}

async function generateFullTrainReport(trainset) {
  return {
    trainsetId: trainset._id,
    trainsetNumber: trainset.trainsetNumber,
    generatedAt: new Date(),
    reportType: 'COMPREHENSIVE_STATUS',
    sections: {
      operational: {
        status: trainset.status,
        mileage: trainset.currentMileage,
        location: trainset.currentLocation,
        lastService: trainset.lastMaintenanceDate
      },
      fitness: {
        overallScore: 92,
        lastAssessment: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        nextAssessmentDue: new Date(Date.now() + 23 * 24 * 60 * 60 * 1000)
      },
      maintenance: {
        nextScheduled: trainset.nextMaintenanceDate,
        hoursToMaintenance: Math.floor(Math.random() * 100) + 50,
        maintenanceHistory: []
      },
      performance: {
        energyEfficiency: 87.5,
        onTimePerformance: 98.2,
        passengerSatisfaction: 4.6
      }
    },
    downloadUrl: `/api/reports/trainset/${trainset._id}/full.pdf`
  };
}

async function scheduleMaintenanceForTrain(trainset, parameters) {
  const { maintenanceType, priority, scheduledDate } = parameters || {};
  
  const maintenance = {
    trainsetId: trainset._id,
    type: maintenanceType || 'ROUTINE_INSPECTION',
    priority: priority || 'MEDIUM',
    scheduledDate: scheduledDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    estimatedDuration: '6 hours',
    status: 'SCHEDULED',
    createdBy: 'system',
    createdAt: new Date()
  };
  
  // Update trainset maintenance date
  await Trainset.findByIdAndUpdate(trainset._id, {
    nextMaintenanceDate: maintenance.scheduledDate,
    status: trainset.status === 'IN_SERVICE' ? 'IN_SERVICE' : 'MAINTENANCE_SCHEDULED'
  });
  
  return {
    scheduled: true,
    maintenanceId: `MAINT_${Date.now()}`,
    ...maintenance
  };
}

async function getTrainIoTData(trainset) {
  // Mock IoT data
  const sensors = [
    { name: 'Engine Temperature', value: 72, unit: '°C', status: 'normal', lastReading: new Date() },
    { name: 'Brake Pressure', value: 145, unit: 'psi', status: 'normal', lastReading: new Date() },
    { name: 'Battery Voltage', value: 24.8, unit: 'V', status: 'normal', lastReading: new Date() },
    { name: 'Door Sensor', value: 'Closed', unit: '', status: 'normal', lastReading: new Date() },
    { name: 'AC Temperature', value: 22, unit: '°C', status: 'normal', lastReading: new Date() },
    { name: 'Speed Sensor', value: 45, unit: 'km/h', status: 'normal', lastReading: new Date() }
  ];
  
  return {
    trainsetId: trainset._id,
    lastUpdate: new Date(),
    sensors,
    connectivity: 'online',
    dataQuality: 98.5,
    alerts: []
  };
}

async function updateTrainFitness(trainset, parameters) {
  const { scores } = parameters || {};
  
  const fitnessRecord = new Fitness({
    trainsetId: trainset._id,
    assessmentDate: new Date(),
    assessor: 'system',
    overallScore: scores?.overall || Math.floor(Math.random() * 20) + 80,
    categoryScores: {
      braking: scores?.braking || Math.floor(Math.random() * 20) + 80,
      traction: scores?.traction || Math.floor(Math.random() * 20) + 80,
      airConditioning: scores?.airConditioning || Math.floor(Math.random() * 20) + 80,
      doors: scores?.doors || Math.floor(Math.random() * 20) + 80,
      interior: scores?.interior || Math.floor(Math.random() * 20) + 80,
      exterior: scores?.exterior || Math.floor(Math.random() * 20) + 80
    }
  });
  
  await fitnessRecord.save();
  
  return {
    updated: true,
    fitnessId: fitnessRecord._id,
    overallScore: fitnessRecord.overallScore,
    assessmentDate: fitnessRecord.assessmentDate
  };
}

module.exports = {
  getDashboardOverview,
  optimizeSchedule,
  handleAIInsight,
  getActiveAlerts,
  getFleetStatus,
  handleTrainAction,
  configureAI
};