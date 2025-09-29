const mongoose = require('mongoose');

const scheduleSchema = new mongoose.Schema({
  scheduleNumber: {
    type: String,
    required: [true, 'Schedule number is required'],
    unique: true,
    trim: true,
    uppercase: true,
  },
  trainsetId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Trainset',
    required: [true, 'Trainset is required'],
  },
  trainsetNumber: {
    type: String,
    required: [true, 'Trainset number is required'],
  },
  route: {
    from: {
      type: String,
      required: [true, 'Starting station is required'],
      trim: true,
    },
    to: {
      type: String,
      required: [true, 'Ending station is required'],
      trim: true,
    },
    routeName: {
      type: String,
      required: true,
      trim: true,
    }
  },
  departureTime: {
    type: Date,
    required: [true, 'Departure time is required'],
  },
  arrivalTime: {
    type: Date,
    required: [true, 'Arrival time is required'],
  },
  actualDepartureTime: {
    type: Date,
  },
  actualArrivalTime: {
    type: Date,
  },
  stations: [{
    name: {
      type: String,
      required: true,
      trim: true,
    },
    scheduledArrival: {
      type: Date,
      required: true,
    },
    scheduledDeparture: {
      type: Date,
      required: true,
    },
    actualArrival: Date,
    actualDeparture: Date,
    platform: String,
    stopDuration: {
      type: Number, // in seconds
      default: 30,
    }
  }],
  frequency: {
    type: String,
    enum: ['DAILY', 'WEEKDAYS', 'WEEKENDS', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY', 'ONE_TIME'],
    default: 'DAILY',
  },
  status: {
    type: String,
    enum: ['SCHEDULED', 'ACTIVE', 'COMPLETED', 'DELAYED', 'CANCELLED', 'SUSPENDED'],
    default: 'SCHEDULED',
  },
  delay: {
    type: Number, // in minutes
    default: 0,
  },
  delayReason: {
    type: String,
    trim: true,
  },
  expectedDuration: {
    type: Number, // in minutes
    required: true,
  },
  actualDuration: {
    type: Number, // in minutes
  },
  passengerCount: {
    type: Number,
    default: 0,
  },
  peakOccupancy: {
    type: Number, // percentage
    min: 0,
    max: 150,
  },
  averageOccupancy: {
    type: Number, // percentage
    min: 0,
    max: 150,
  },
  crew: {
    driver: {
      name: String,
      employeeId: String,
    },
    coDriver: {
      name: String,
      employeeId: String,
    },
    guards: [{
      name: String,
      employeeId: String,
    }]
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  notes: {
    type: String,
    trim: true,
  },
  operationalDate: {
    type: Date,
    required: true,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  lastModifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }
}, {
  timestamps: true,
});

// Indexes for better query performance
scheduleSchema.index({ scheduleNumber: 1 });
scheduleSchema.index({ trainsetId: 1 });
scheduleSchema.index({ status: 1 });
scheduleSchema.index({ operationalDate: 1 });
scheduleSchema.index({ 'route.from': 1, 'route.to': 1 });

// Virtual for route display
scheduleSchema.virtual('routeDisplay').get(function() {
  return `${this.route.from} - ${this.route.to}`;
});

// Virtual for duration calculation
scheduleSchema.virtual('duration').get(function() {
  if (this.actualArrivalTime && this.actualDepartureTime) {
    return Math.round((this.actualArrivalTime - this.actualDepartureTime) / (1000 * 60));
  }
  return Math.round((this.arrivalTime - this.departureTime) / (1000 * 60));
});

// Virtual for on-time performance
scheduleSchema.virtual('onTimePerformance').get(function() {
  if (this.delay === 0) return 'ON_TIME';
  if (this.delay > 0 && this.delay <= 5) return 'SLIGHTLY_DELAYED';
  if (this.delay > 5 && this.delay <= 15) return 'DELAYED';
  return 'SEVERELY_DELAYED';
});

// Method to update status based on current time
scheduleSchema.methods.updateStatus = async function() {
  const now = new Date();
  
  if (this.status === 'CANCELLED' || this.status === 'SUSPENDED') {
    return this;
  }
  
  if (now < this.departureTime) {
    this.status = 'SCHEDULED';
  } else if (now >= this.departureTime && now <= this.arrivalTime) {
    this.status = 'ACTIVE';
  } else if (now > this.arrivalTime) {
    this.status = 'COMPLETED';
  }
  
  return await this.save();
};

// Method to calculate delay
scheduleSchema.methods.calculateDelay = function() {
  if (this.actualDepartureTime && this.departureTime) {
    const delayMs = this.actualDepartureTime - this.departureTime;
    this.delay = Math.max(0, Math.round(delayMs / (1000 * 60)));
  }
  return this.delay;
};

// Static method to get today's schedules
scheduleSchema.statics.getTodaySchedules = function() {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  
  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);
  
  return this.find({
    operationalDate: {
      $gte: startOfDay,
      $lte: endOfDay
    },
    isActive: true
  }).populate('trainsetId');
};

// Static method to get upcoming schedules
scheduleSchema.statics.getUpcomingSchedules = function(hours = 2) {
  const now = new Date();
  const futureTime = new Date(now.getTime() + hours * 60 * 60 * 1000);
  
  return this.find({
    departureTime: {
      $gte: now,
      $lte: futureTime
    },
    status: 'SCHEDULED',
    isActive: true
  }).populate('trainsetId').sort({ departureTime: 1 });
};

// Static method to get delayed schedules
scheduleSchema.statics.getDelayedSchedules = function() {
  return this.find({
    status: 'DELAYED',
    isActive: true
  }).populate('trainsetId');
};

const Schedule = mongoose.model('Schedule', scheduleSchema);

module.exports = Schedule;