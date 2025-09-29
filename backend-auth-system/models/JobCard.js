const mongoose = require('mongoose');

const jobCardSchema = new mongoose.Schema({
  jobCardNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  trainsetId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Trainset',
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  category: {
    type: String,
    required: true,
    enum: [
      'PREVENTIVE_MAINTENANCE',
      'CORRECTIVE_MAINTENANCE',
      'INSPECTION',
      'REPAIR',
      'CLEANING',
      'SAFETY_CHECK',
      'ELECTRICAL',
      'MECHANICAL',
      'BRAKE_SYSTEM',
      'DOOR_SYSTEM',
      'HVAC',
      'COMMUNICATION',
      'SIGNALING',
      'OTHER'
    ]
  },
  priority: {
    type: String,
    required: true,
    enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
    default: 'MEDIUM'
  },
  status: {
    type: String,
    required: true,
    enum: ['OPEN', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED', 'CANCELLED'],
    default: 'OPEN'
  },
  assignedTo: {
    type: String,
    trim: true
  },
  department: {
    type: String,
    required: true,
    enum: ['MAINTENANCE', 'ELECTRICAL', 'MECHANICAL', 'CLEANING', 'INSPECTION', 'SAFETY']
  },
  estimatedDuration: {
    type: Number, // in minutes
    required: true
  },
  actualDuration: {
    type: Number // in minutes
  },
  createdDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  dueDate: {
    type: Date,
    required: true
  },
  startedDate: {
    type: Date
  },
  completedDate: {
    type: Date
  },
  workDetails: {
    workPerformed: {
      type: String
    },
    partsUsed: [{
      partNumber: String,
      partName: String,
      quantity: Number,
      cost: Number
    }],
    toolsUsed: [{
      toolName: String,
      toolId: String
    }],
    materialsUsed: [{
      materialName: String,
      quantity: Number,
      unit: String,
      cost: Number
    }]
  },
  qualityCheck: {
    performed: {
      type: Boolean,
      default: false
    },
    performedBy: String,
    performedDate: Date,
    status: {
      type: String,
      enum: ['PASS', 'FAIL', 'CONDITIONAL_PASS'],
      default: 'PASS'
    },
    remarks: String
  },
  safety: {
    safetyProtocolsFollowed: {
      type: Boolean,
      default: true
    },
    safetyOfficerApproval: {
      type: Boolean,
      default: false
    },
    safetyRemarks: String,
    lotoApplied: { // Lock Out Tag Out
      type: Boolean,
      default: false
    }
  },
  location: {
    depot: {
      type: String,
      required: true
    },
    bay: String,
    platform: String,
    coordinates: {
      latitude: Number,
      longitude: Number
    }
  },
  followUpRequired: {
    type: Boolean,
    default: false
  },
  followUpDate: Date,
  relatedJobCards: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'JobCard'
  }],
  cost: {
    laborCost: {
      type: Number,
      default: 0
    },
    materialCost: {
      type: Number,
      default: 0
    },
    totalCost: {
      type: Number,
      default: 0
    }
  },
  comments: [{
    comment: String,
    commentedBy: String,
    commentDate: {
      type: Date,
      default: Date.now
    }
  }],
  attachments: [{
    filename: String,
    originalName: String,
    path: String,
    size: Number,
    uploadedBy: String,
    uploadedDate: {
      type: Date,
      default: Date.now
    }
  }],
  approval: {
    supervisorApproval: {
      approved: {
        type: Boolean,
        default: false
      },
      approvedBy: String,
      approvedDate: Date,
      remarks: String
    },
    engineerApproval: {
      approved: {
        type: Boolean,
        default: false
      },
      approvedBy: String,
      approvedDate: Date,
      remarks: String
    }
  },
  revision: {
    revisionNumber: {
      type: Number,
      default: 1
    },
    revisionHistory: [{
      revisionNumber: Number,
      changedBy: String,
      changedDate: {
        type: Date,
        default: Date.now
      },
      changeDescription: String,
      previousValues: mongoose.Schema.Types.Mixed
    }]
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: String,
    required: true
  },
  updatedBy: {
    type: String,
    required: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for job card age
jobCardSchema.virtual('ageInDays').get(function() {
  return Math.ceil((new Date() - this.createdDate) / (1000 * 60 * 60 * 24));
});

// Virtual for overdue status
jobCardSchema.virtual('isOverdue').get(function() {
  return new Date() > this.dueDate && this.status !== 'COMPLETED';
});

// Virtual for completion percentage (for in-progress jobs)
jobCardSchema.virtual('completionPercentage').get(function() {
  if (this.status === 'COMPLETED') return 100;
  if (this.status === 'IN_PROGRESS' && this.estimatedDuration && this.actualDuration) {
    return Math.min((this.actualDuration / this.estimatedDuration) * 100, 100);
  }
  if (this.status === 'OPEN') return 0;
  return 0;
});

// Indexes for better performance
jobCardSchema.index({ trainsetId: 1 });
jobCardSchema.index({ status: 1 });
jobCardSchema.index({ priority: 1 });
jobCardSchema.index({ dueDate: 1 });
jobCardSchema.index({ category: 1 });
jobCardSchema.index({ department: 1 });
jobCardSchema.index({ createdDate: -1 });
jobCardSchema.index({ jobCardNumber: 1 }, { unique: true });

// Compound indexes
jobCardSchema.index({ trainsetId: 1, status: 1 });
jobCardSchema.index({ status: 1, priority: 1 });
jobCardSchema.index({ dueDate: 1, status: 1 });

// Pre-save middleware to calculate total cost
jobCardSchema.pre('save', function(next) {
  if (this.cost) {
    this.cost.totalCost = (this.cost.laborCost || 0) + (this.cost.materialCost || 0);
  }
  
  // Auto-generate job card number if not provided
  if (!this.jobCardNumber) {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    this.jobCardNumber = `JC${timestamp}${random}`;
  }
  
  next();
});

// Pre-save middleware to handle status changes
jobCardSchema.pre('save', function(next) {
  if (this.isModified('status')) {
    switch (this.status) {
      case 'IN_PROGRESS':
        if (!this.startedDate) {
          this.startedDate = new Date();
        }
        break;
      case 'COMPLETED':
        if (!this.completedDate) {
          this.completedDate = new Date();
        }
        if (this.startedDate && !this.actualDuration) {
          this.actualDuration = Math.ceil((this.completedDate - this.startedDate) / (1000 * 60));
        }
        break;
    }
  }
  next();
});

// Static methods
jobCardSchema.statics.findByTrainset = function(trainsetId) {
  return this.find({ trainsetId: trainsetId, isActive: true });
};

jobCardSchema.statics.findOverdue = function() {
  return this.find({
    dueDate: { $lt: new Date() },
    status: { $in: ['OPEN', 'IN_PROGRESS'] },
    isActive: true
  });
};

jobCardSchema.statics.findByPriority = function(priority) {
  return this.find({ priority: priority, isActive: true });
};

jobCardSchema.statics.findPendingApproval = function() {
  return this.find({
    status: 'COMPLETED',
    $or: [
      { 'approval.supervisorApproval.approved': false },
      { 'approval.engineerApproval.approved': false }
    ],
    isActive: true
  });
};

// Instance methods
jobCardSchema.methods.markCompleted = function(completedBy) {
  this.status = 'COMPLETED';
  this.completedDate = new Date();
  this.updatedBy = completedBy;
  
  if (this.startedDate) {
    this.actualDuration = Math.ceil((this.completedDate - this.startedDate) / (1000 * 60));
  }
  
  return this.save();
};

jobCardSchema.methods.addComment = function(comment, commentedBy) {
  this.comments.push({
    comment: comment,
    commentedBy: commentedBy,
    commentDate: new Date()
  });
  return this.save();
};

jobCardSchema.methods.updateProgress = function(progressData, updatedBy) {
  if (progressData.status) {
    this.status = progressData.status;
  }
  
  if (progressData.workDetails) {
    this.workDetails = { ...this.workDetails, ...progressData.workDetails };
  }
  
  this.updatedBy = updatedBy;
  
  return this.save();
};

const JobCard = mongoose.model('JobCard', jobCardSchema);

module.exports = JobCard;