const mongoose = require('mongoose');

const trainsetSchema = new mongoose.Schema({
  trainsetNumber: {
    type: String,
    required: [true, 'Trainset number is required'],
    unique: true,
    trim: true,
    uppercase: true,
  },
  manufacturer: {
    type: String,
    required: [true, 'Manufacturer is required'],
    trim: true,
  },
  model: {
    type: String,
    required: [true, 'Model is required'],
    trim: true,
  },
  yearOfManufacture: {
    type: Number,
    required: [true, 'Year of manufacture is required'],
    min: [1990, 'Year must be 1990 or later'],
    max: [new Date().getFullYear(), 'Year cannot be in the future'],
  },
  capacity: {
    type: Number,
    required: [true, 'Capacity is required'],
    min: [1, 'Capacity must be at least 1'],
  },
  maxSpeed: {
    type: Number,
    required: [true, 'Max speed is required'],
    min: [1, 'Max speed must be at least 1'],
  },
  currentMileage: {
    type: Number,
    default: 0,
    min: [0, 'Mileage cannot be negative'],
  },
  totalMileage: {
    type: Number,
    default: 0,
    min: [0, 'Total mileage cannot be negative'],
  },
  status: {
    type: String,
    enum: ['AVAILABLE', 'IN_SERVICE', 'MAINTENANCE', 'CLEANING', 'OUT_OF_ORDER', 'DECOMMISSIONED'],
    default: 'AVAILABLE',
  },
  location: {
    type: String,
    trim: true,
  },
  depot: {
    type: String,
    required: [true, 'Depot is required'],
    trim: true,
  },
  lastMaintenanceDate: {
    type: Date,
  },
  nextMaintenanceDate: {
    type: Date,
  },
  lastCleaningDate: {
    type: Date,
  },
  nextCleaningDate: {
    type: Date,
  },
  fitnessExpiry: {
    type: Date,
  },
  operationalHours: {
    type: Number,
    default: 0,
    min: [0, 'Operational hours cannot be negative'],
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  notes: {
    type: String,
    trim: true,
  },
  specifications: {
    length: { type: Number },
    width: { type: Number },
    height: { type: Number },
    weight: { type: Number },
    engineType: { type: String },
    fuelType: { type: String },
    seatingCapacity: { type: Number },
    standingCapacity: { type: Number },
  },
  performance: {
    averageSpeed: { type: Number, default: 0 },
    fuelEfficiency: { type: Number, default: 0 },
    reliabilityScore: { type: Number, default: 100, min: 0, max: 100 },
    utilizationRate: { type: Number, default: 0, min: 0, max: 100 },
  },
  maintenanceHistory: [{
    date: { type: Date, required: true },
    type: { type: String, required: true },
    description: { type: String },
    cost: { type: Number },
    performedBy: { type: String },
    nextDue: { type: Date },
  }],
  incidents: [{
    date: { type: Date, required: true },
    type: { type: String, required: true },
    description: { type: String },
    severity: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] },
    resolved: { type: Boolean, default: false },
    resolvedDate: { type: Date },
  }],
}, {
  timestamps: true,
});

// Indexes for better query performance
trainsetSchema.index({ trainsetNumber: 1 });
trainsetSchema.index({ status: 1 });
trainsetSchema.index({ depot: 1 });
trainsetSchema.index({ isActive: 1 });

// Virtual for age
trainsetSchema.virtual('age').get(function() {
  return new Date().getFullYear() - this.yearOfManufacture;
});

// Virtual for maintenance due
trainsetSchema.virtual('maintenanceDue').get(function() {
  if (!this.nextMaintenanceDate) return false;
  return new Date() > new Date(this.nextMaintenanceDate);
});

// Virtual for fitness validity
trainsetSchema.virtual('fitnessValid').get(function() {
  if (!this.fitnessExpiry) return false;
  return new Date() < new Date(this.fitnessExpiry);
});

// Instance method to update status
trainsetSchema.methods.updateStatus = async function(newStatus) {
  this.status = newStatus;
  return await this.save();
};

// Instance method to add maintenance record
trainsetSchema.methods.addMaintenanceRecord = async function(record) {
  this.maintenanceHistory.push(record);
  this.lastMaintenanceDate = record.date;
  if (record.nextDue) {
    this.nextMaintenanceDate = record.nextDue;
  }
  return await this.save();
};

// Instance method to update mileage
trainsetSchema.methods.updateMileage = async function(distance) {
  this.currentMileage += distance;
  this.totalMileage += distance;
  return await this.save();
};

// Static method to get available trainsets
trainsetSchema.statics.getAvailable = function() {
  return this.find({ status: 'AVAILABLE', isActive: true });
};

// Static method to get trainsets due for maintenance
trainsetSchema.statics.getDueForMaintenance = function() {
  return this.find({
    nextMaintenanceDate: { $lte: new Date() },
    isActive: true
  });
};

// Static method to get statistics
trainsetSchema.statics.getStatistics = async function() {
  const stats = await this.aggregate([
    {
      $match: { isActive: true }
    },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        avgMileage: { $avg: '$totalMileage' },
        avgAge: { $avg: { $subtract: [new Date().getFullYear(), '$yearOfManufacture'] } }
      }
    }
  ]);

  const total = await this.countDocuments({ isActive: true });
  const maintenanceDue = await this.countDocuments({
    nextMaintenanceDate: { $lte: new Date() },
    isActive: true
  });

  return {
    total,
    maintenanceDue,
    byStatus: stats
  };
};

const Trainset = mongoose.model('Trainset', trainsetSchema);

module.exports = Trainset;