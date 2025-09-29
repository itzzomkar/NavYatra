const Optimization = require('../models/Optimization');
const Trainset = require('../models/Trainset');
const Schedule = require('../models/Schedule');

// Get dashboard analytics
const getDashboard = async (req, res) => {
  try {
    const [
      trainsetStats,
      scheduleStats,
      optimizationStats,
      recentOptimizations
    ] = await Promise.all([
      getTrainsetAnalytics(),
      getScheduleAnalytics(),
      getOptimizationAnalytics(),
      Optimization.getRecentOptimizations(5)
    ]);

    res.json({
      success: true,
      data: {
        trainsets: trainsetStats,
        schedules: scheduleStats,
        optimizations: optimizationStats,
        recent: recentOptimizations.map(opt => ({
          id: opt._id.toString(),
          optimizationId: opt.optimizationId,
          name: opt.name || null,
          description: opt.description || null,
          status: opt.execution.status,
          fitnessScore: opt.results?.fitnessScore || null,
          trainsetCount: opt.inputData.trainsetCount,
          createdAt: opt.createdAt,
          duration: opt.execution.duration,
          createdBy: opt.createdBy?.username || 'System'
        }))
      }
    });
  } catch (error) {
    console.error('Dashboard analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard analytics',
      error: error.message
    });
  }
};

// Get optimization analytics
const getOptimization = async (req, res) => {
  try {
    const [
      recentOptimizations,
      stats,
      successRate,
      trendsData
    ] = await Promise.all([
      Optimization.getRecentOptimizations(20),
      Optimization.getOptimizationStats(),
      Optimization.getSuccessRate(),
      getOptimizationTrends()
    ]);

    const statsData = stats[0] || {
      total: 0,
      completed: 0,
      running: 0,
      failed: 0,
      avgFitnessScore: 0,
      avgDuration: 0,
      totalTrainsetsOptimized: 0
    };

    const successRateData = successRate[0] || { successRate: 0 };

    res.json({
      success: true,
      data: {
        recent: recentOptimizations.map(opt => ({
          id: opt._id.toString(),
          optimizationId: opt.optimizationId,
          name: opt.name || null,
          description: opt.description || null,
          status: opt.execution.status,
          fitnessScore: opt.results?.fitnessScore || null,
          trainsetIds: opt.inputData.trainsetIds.map(t => t.trainsetNumber || t._id.toString()),
          trainsetCount: opt.inputData.trainsetCount,
          createdAt: opt.createdAt,
          duration: opt.execution.duration / 1000, // convert to seconds
          configuration: {
            algorithm: opt.parameters.algorithm,
            maxIterations: opt.parameters.maxIterations,
            shift: opt.inputData.shift,
            scheduleDate: opt.inputData.scheduleDate
          },
          results: opt.results || null,
          errorMessage: opt.execution.errorMessage || null
        })),
        statistics: {
          total: statsData.total,
          completed: statsData.completed,
          running: statsData.running,
          pending: statsData.total - statsData.completed - statsData.running - statsData.failed,
          failed: statsData.failed,
          averageScore: Number((statsData.avgFitnessScore || 0).toFixed(2)),
          averageDuration: Math.round((statsData.avgDuration || 0) / 1000), // seconds
          successRate: Number(successRateData.successRate.toFixed(1)),
          totalTrainsets: statsData.totalTrainsetsOptimized || 0
        },
        trends: trendsData
      }
    });
  } catch (error) {
    console.error('Optimization analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch optimization analytics',
      error: error.message
    });
  }
};

// Get performance analytics
const getPerformance = async (req, res) => {
  try {
    const [
      optimizations,
      schedules,
      trainsets
    ] = await Promise.all([
      Optimization.find({ isArchived: false })
        .populate('inputData.trainsetIds', 'trainsetNumber')
        .sort({ createdAt: -1 })
        .limit(100),
      Schedule.find({ isActive: true })
        .populate('trainsetId', 'trainsetNumber')
        .sort({ createdAt: -1 })
        .limit(50),
      Trainset.find().select('trainsetNumber status totalMileage currentMileage')
    ]);

    // Calculate performance metrics
    const completedOptimizations = optimizations.filter(opt => opt.execution.status === 'COMPLETED');
    const averageScore = completedOptimizations.length > 0 
      ? completedOptimizations.reduce((sum, opt) => sum + (opt.results?.fitnessScore || 0), 0) / completedOptimizations.length
      : 0;

    const availableTrainsets = trainsets.filter(t => t.status === 'AVAILABLE' || t.status === 'IN_SERVICE');
    const availabilityRate = trainsets.length > 0 ? (availableTrainsets.length / trainsets.length) * 100 : 0;

    const inMaintenanceTrainsets = trainsets.filter(t => t.status === 'MAINTENANCE').length;
    
    // Calculate average utilization (mileage-based)
    const averageUtilization = trainsets.length > 0 
      ? trainsets.reduce((sum, t) => sum + (t.currentMileage || 0), 0) / trainsets.length
      : 0;

    res.json({
      success: true,
      data: {
        optimization: {
          results: completedOptimizations.map(opt => ({
            id: opt._id.toString(),
            score: opt.results?.fitnessScore || 0,
            date: opt.createdAt,
            trainsetCount: opt.inputData.trainsetCount
          })),
          averageScore: Number(averageScore.toFixed(2))
        },
        schedules: schedules.map(s => ({
          id: s._id.toString(),
          createdAt: s.createdAt,
          status: s.status,
          trainsetId: s.trainsetId?.trainsetNumber || s.trainsetNumber
        })),
        summary: {
          availabilityRate: Number(availabilityRate.toFixed(1)),
          inMaintenanceTrainsets,
          totalOptimizations: optimizations.length,
          completedOptimizations: completedOptimizations.length
        },
        utilization: {
          averagePerTrainset: Math.round(averageUtilization)
        }
      }
    });
  } catch (error) {
    console.error('Performance analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch performance analytics',
      error: error.message
    });
  }
};

// Get utilization analytics
const getUtilization = async (req, res) => {
  try {
    const trainsets = await Trainset.find().select('trainsetNumber currentMileage totalMileage operationalHours');
    
    const utilizationData = {
      daily: getDailyUtilization(),
      mileage: {
        byTrainset: trainsets.map(t => ({
          trainsetId: t.trainsetNumber,
          _sum: {
            distance: t.currentMileage || 0
          }
        }))
      }
    };

    res.json({
      success: true,
      data: utilizationData
    });
  } catch (error) {
    console.error('Utilization analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch utilization analytics',
      error: error.message
    });
  }
};

// Get maintenance analytics
const getMaintenance = async (req, res) => {
  try {
    const trainsets = await Trainset.find().select('status lastMaintenanceDate nextMaintenanceDate');
    
    const maintenanceData = {
      thisMonth: trainsets.filter(t => {
        if (!t.lastMaintenanceDate) return false;
        const lastMonth = new Date();
        lastMonth.setMonth(lastMonth.getMonth() - 1);
        return new Date(t.lastMaintenanceDate) >= lastMonth;
      }).length,
      byType: [
        { type: 'Preventive', _count: Math.floor(trainsets.length * 0.6) },
        { type: 'Corrective', _count: Math.floor(trainsets.length * 0.3) },
        { type: 'Emergency', _count: Math.floor(trainsets.length * 0.1) }
      ]
    };

    res.json({
      success: true,
      data: maintenanceData
    });
  } catch (error) {
    console.error('Maintenance analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch maintenance analytics',
      error: error.message
    });
  }
};

// Helper functions
async function getTrainsetAnalytics() {
  const trainsets = await Trainset.find();
  const statusBreakdown = trainsets.reduce((acc, trainset) => {
    const status = trainset.status || 'UNKNOWN';
    const existing = acc.find(s => s.status === status);
    if (existing) {
      existing._count++;
    } else {
      acc.push({ status, _count: 1 });
    }
    return acc;
  }, []);

  const availableCount = trainsets.filter(t => t.status === 'AVAILABLE' || t.status === 'IN_SERVICE').length;
  const availabilityRate = trainsets.length > 0 ? (availableCount / trainsets.length) * 100 : 0;

  return {
    total: trainsets.length,
    statusBreakdown,
    availabilityRate: Number(availabilityRate.toFixed(1))
  };
}

async function getScheduleAnalytics() {
  const schedules = await Schedule.find({ isActive: true });
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const todaySchedules = schedules.filter(s => {
    const opDate = new Date(s.operationalDate);
    return opDate >= today && opDate < tomorrow;
  });

  return {
    total: schedules.length,
    today: todaySchedules.length,
    active: schedules.filter(s => s.status === 'ACTIVE').length,
    completed: schedules.filter(s => s.status === 'COMPLETED').length
  };
}

async function getOptimizationAnalytics() {
  const optimizations = await Optimization.find({ isArchived: false });
  const completed = optimizations.filter(opt => opt.execution.status === 'COMPLETED');
  const avgScore = completed.length > 0 
    ? completed.reduce((sum, opt) => sum + (opt.results?.fitnessScore || 0), 0) / completed.length 
    : 0;

  return {
    total: optimizations.length,
    completed: completed.length,
    running: optimizations.filter(opt => opt.execution.status === 'RUNNING').length,
    pending: optimizations.filter(opt => opt.execution.status === 'PENDING').length,
    failed: optimizations.filter(opt => opt.execution.status === 'FAILED').length,
    averageScore: Number(avgScore.toFixed(2)),
    optimizationRuns: optimizations.length // For compatibility
  };
}

async function getOptimizationTrends() {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const optimizations = await Optimization.find({
    createdAt: { $gte: thirtyDaysAgo },
    isArchived: false
  }).sort({ createdAt: 1 });

  // Group by date
  const trendsData = [];
  const dateMap = new Map();

  optimizations.forEach(opt => {
    const date = opt.createdAt.toISOString().split('T')[0];
    if (!dateMap.has(date)) {
      dateMap.set(date, {
        date,
        count: 0,
        totalScore: 0,
        completedCount: 0
      });
    }
    
    const dayData = dateMap.get(date);
    dayData.count++;
    
    if (opt.execution.status === 'COMPLETED' && opt.results?.fitnessScore) {
      dayData.totalScore += opt.results.fitnessScore;
      dayData.completedCount++;
    }
  });

  dateMap.forEach((dayData, date) => {
    trendsData.push({
      date,
      _avg: {
        score: dayData.completedCount > 0 ? dayData.totalScore / dayData.completedCount : 0
      }
    });
  });

  return trendsData;
}

function getDailyUtilization() {
  // Mock daily utilization data for the last 7 days
  const dailyData = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    dailyData.push({
      day: date.toISOString().split('T')[0],
      total_distance: Math.floor(Math.random() * 500) + 200 // 200-700 km per day
    });
  }
  return dailyData;
}

module.exports = {
  getDashboard,
  getOptimization,
  getPerformance,
  getUtilization,
  getMaintenance
};