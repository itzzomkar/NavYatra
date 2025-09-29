const mongoose = require('mongoose');

const optimizationSchema = new mongoose.Schema({
  // Basic Information
  optimizationId: {
    type: String,
    unique: true,
    required: true,
    default: function() {
      return `OPT-${Date.now().toString().slice(-8)}`;
    }
  },
  
  name: {
    type: String,
    required: true,
    default: 'Untitled Optimization'
  },
  
  description: {
    type: String,
    default: 'No description provided'
  },
  
  // Configuration
  parameters: {
    algorithm: {
      type: String,
      enum: ['GENETIC_ALGORITHM', 'SIMULATED_ANNEALING', 'PARTICLE_SWARM', 'TABU_SEARCH', 'GENETIC', 'SIMULATED_ANNEALING', 'LOCAL_SEARCH', 'HYBRID'],
      default: 'GENETIC_ALGORITHM'
    },
    maxIterations: { type: Number, default: 1000 },
    populationSize: { type: Number, default: 50 },
    mutationRate: { type: Number, default: 0.1 },
    crossoverRate: { type: Number, default: 0.8 },
    convergenceThreshold: { type: Number, default: 0.001 }
  },
  
  // Input Data
  inputData: {
    trainsetIds: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Trainset'
    }],
    trainsetCount: { type: Number, required: true },
    scheduleDate: { type: Date, required: true },
    shift: {
      type: String,
      enum: ['MORNING', 'AFTERNOON', 'EVENING', 'day_time', 'night_time', 'peak_hours', 'off_peak'],
      required: true
    }
  },
  
  // Constraints
  constraints: {
    minTurnaroundTime: { type: Number, default: 15 }, // minutes
    maxDailyOperatingHours: { type: Number, default: 18 },
    minPlatformDwellTime: { type: Number, default: 30 }, // seconds
    fitnessComplianceRequired: { type: Boolean, default: true },
    mandatoryMaintenanceWindow: { type: Boolean, default: true },
    maxCrewDutyHours: { type: Number, default: 8 },
    minCrewRestPeriod: { type: Number, default: 8 },
    platformCapacity: { type: Number, default: 4 },
    depotCapacity: { type: Number, default: 10 }
  },
  
  // Objectives & Weights
  objectives: {
    fitnessCompliance: { type: Number, min: 0, max: 1, default: 0.25 },
    maintenanceScheduling: { type: Number, min: 0, max: 1, default: 0.20 },
    mileageBalancing: { type: Number, min: 0, max: 1, default: 0.15 },
    energyEfficiency: { type: Number, min: 0, max: 1, default: 0.15 },
    passengerComfort: { type: Number, min: 0, max: 1, default: 0.15 },
    operationalCost: { type: Number, min: 0, max: 1, default: 0.10 }
  },
  
  // Results
  results: {
    fitnessScore: { type: Number, min: 0, max: 10 }, // Overall fitness score
    improvementPercentage: { type: Number }, // % improvement over baseline
    scheduleCount: { type: Number }, // Number of schedules generated
    generatedSchedules: [{
      trainsetId: { type: mongoose.Schema.Types.ObjectId, ref: 'Trainset' },
      route: {
        from: String,
        to: String,
        routeName: String
      },
      departureTime: Date,
      arrivalTime: Date,
      expectedDuration: Number, // minutes
      platforms: [String],
      crew: {
        driver: String,
        coDriver: String
      }
    }],
    metrics: {
      totalDistance: { type: Number }, // km
      energyConsumption: { type: Number }, // kWh
      passengerCapacity: { type: Number },
      averageUtilization: { type: Number }, // %
      maintenanceCompliance: { type: Number }, // %
      constraintViolations: { type: Number, default: 0 }
    }
  },
  
  // Execution Details
  execution: {
    status: {
      type: String,
      enum: ['PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'IN_PROGRESS', 'CANCELLED'],
      default: 'PENDING'
    },
    startTime: { type: Date },
    endTime: { type: Date },
    duration: { type: Number }, // milliseconds
    iterations: { type: Number }, // actual iterations run
    convergence: { type: Number }, // final convergence value
    errorMessage: { type: String }, // if failed
    progress: { type: Number, min: 0, max: 100, default: 0 }
  },
  
  // Audit Trail
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false // Allow system-initiated optimizations
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  
  // Metadata
  tags: [String],
  notes: String,
  isArchived: { type: Boolean, default: false },
  version: { type: String, default: '1.0' }
});

// Indexes for performance
optimizationSchema.index({ optimizationId: 1 });
optimizationSchema.index({ createdAt: -1 });
optimizationSchema.index({ 'execution.status': 1 });
optimizationSchema.index({ 'inputData.scheduleDate': 1 });
optimizationSchema.index({ createdBy: 1 });

// Virtual for formatted duration
optimizationSchema.virtual('formattedDuration').get(function() {
  if (!this.execution.duration) return null;
  
  const seconds = Math.floor(this.execution.duration / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
});

// Static method to get recent optimizations
optimizationSchema.statics.getRecentOptimizations = function(limit = 10) {
  return this.find({ isArchived: false })
    .populate('createdBy', 'username email')
    .populate('inputData.trainsetIds', 'trainsetNumber manufacturer model')
    .sort({ createdAt: -1 })
    .limit(limit);
};

// Static method to get optimization statistics
optimizationSchema.statics.getOptimizationStats = function() {
  return this.aggregate([
    { $match: { isArchived: false } },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        completed: {
          $sum: {
            $cond: [{ $eq: ['$execution.status', 'COMPLETED'] }, 1, 0]
          }
        },
        running: {
          $sum: {
            $cond: [{ $eq: ['$execution.status', 'RUNNING'] }, 1, 0]
          }
        },
        failed: {
          $sum: {
            $cond: [{ $eq: ['$execution.status', 'FAILED'] }, 1, 0]
          }
        },
        avgFitnessScore: { $avg: '$results.fitnessScore' },
        avgDuration: { $avg: '$execution.duration' },
        totalTrainsetsOptimized: { $sum: '$inputData.trainsetCount' }
      }
    }
  ]);
};

// Method to calculate success rate
optimizationSchema.statics.getSuccessRate = function() {
  return this.aggregate([
    { $match: { isArchived: false } },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        completed: {
          $sum: {
            $cond: [{ $eq: ['$execution.status', 'COMPLETED'] }, 1, 0]
          }
        }
      }
    },
    {
      $project: {
        successRate: {
          $cond: [
            { $eq: ['$total', 0] },
            0,
            { $multiply: [{ $divide: ['$completed', '$total'] }, 100] }
          ]
        }
      }
    }
  ]);
};

// Pre-save middleware to update timestamps
optimizationSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Pre-save middleware to calculate duration
optimizationSchema.pre('save', function(next) {
  if (this.execution.startTime && this.execution.endTime) {
    this.execution.duration = this.execution.endTime - this.execution.startTime;
  }
  next();
});

const Optimization = mongoose.model('Optimization', optimizationSchema);

module.exports = Optimization;