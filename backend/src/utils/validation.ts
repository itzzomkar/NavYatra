import Joi from 'joi';
import { Request, Response, NextFunction } from 'express';
import { ValidationError } from '../middleware/errorHandler';

// Custom validation patterns
const patterns = {
  // Train set ID pattern (e.g., TS001, TS002)
  trainsetId: /^TS[0-9]{3}$/,
  // Job card pattern (e.g., JC-2024-001)
  jobCard: /^JC-\d{4}-\d{3}$/,
  // Fitness certificate pattern (e.g., FC-2024-001)
  fitnessCertificate: /^FC-\d{4}-\d{3}$/,
  // Schedule ID pattern
  scheduleId: /^SCH-\d{4}-\d{6}$/,
  // Phone number (Indian format)
  phoneNumber: /^\+91[6-9]\d{9}$/,
  // WhatsApp number
  whatsappNumber: /^\+[1-9]\d{1,14}$/,
  // UUID v4
  uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  // Time format (24-hour HH:MM)
  time24: /^(?:[01]\d|2[0-3]):[0-5]\d$/,
  // Date format (YYYY-MM-DD)
  date: /^\d{4}-\d{2}-\d{2}$/,
  // Coordinate (latitude/longitude)
  coordinate: /^-?\d+(\.\d+)?$/
};

// Common validation schemas
export const commonSchemas = {
  // Pagination
  pagination: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
    sort: Joi.string().valid('asc', 'desc').default('asc'),
    sortBy: Joi.string().optional()
  }),

  // Date range
  dateRange: Joi.object({
    startDate: Joi.string().pattern(patterns.date).required(),
    endDate: Joi.string().pattern(patterns.date).required()
  }).custom((value, helpers) => {
    const { startDate, endDate } = value;
    if (new Date(startDate) >= new Date(endDate)) {
      return helpers.error('dateRange.invalid');
    }
    return value;
  }),

  // Train set ID
  trainsetId: Joi.string().pattern(patterns.trainsetId).required().messages({
    'string.pattern.base': 'Train set ID must be in format TS### (e.g., TS001)'
  }),

  // Coordinates for stabling geometry
  coordinates: Joi.object({
    latitude: Joi.number().min(-90).max(90).required(),
    longitude: Joi.number().min(-180).max(180).required()
  }),

  // Priority levels
  priority: Joi.string().valid('LOW', 'MEDIUM', 'HIGH', 'CRITICAL').required(),

  // Status values
  status: Joi.string().valid('ACTIVE', 'INACTIVE', 'MAINTENANCE', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED').required(),

  // User roles
  userRole: Joi.string().valid('ADMIN', 'SUPERVISOR', 'OPERATOR', 'MAINTENANCE', 'VIEWER').required(),

  // Optimization constraints
  optimizationConstraints: Joi.object({
    maxMileageDeviation: Joi.number().min(0).max(1000).default(100),
    prioritizeBranding: Joi.boolean().default(true),
    energyEfficiencyWeight: Joi.number().min(0).max(1).default(0.3),
    maintenanceWindowHours: Joi.number().min(1).max(24).default(8),
    maxConcurrentMaintenance: Joi.number().min(1).max(10).default(3)
  })
};

// Train set validation schemas
export const trainsetSchemas = {
  create: Joi.object({
    id: commonSchemas.trainsetId,
    name: Joi.string().min(1).max(100).required(),
    model: Joi.string().min(1).max(50).required(),
    manufacturer: Joi.string().min(1).max(50).required(),
    yearOfManufacture: Joi.number().integer().min(1990).max(new Date().getFullYear()).required(),
    totalMileage: Joi.number().min(0).default(0),
    lastMaintenanceDate: Joi.date().optional(),
    fitnessExpiryDate: Joi.date().min('now').required(),
    maxCapacity: Joi.number().integer().min(100).max(2000).required(),
    energyEfficiency: Joi.number().min(0).max(100).default(85),
    status: commonSchemas.status,
    stablePosition: Joi.object({
      track: Joi.string().required(),
      position: Joi.number().integer().min(1).required(),
      coordinates: commonSchemas.coordinates.optional()
    }).optional()
  }),

  update: Joi.object({
    name: Joi.string().min(1).max(100).optional(),
    totalMileage: Joi.number().min(0).optional(),
    lastMaintenanceDate: Joi.date().optional(),
    fitnessExpiryDate: Joi.date().min('now').optional(),
    energyEfficiency: Joi.number().min(0).max(100).optional(),
    status: commonSchemas.status.optional(),
    stablePosition: Joi.object({
      track: Joi.string().required(),
      position: Joi.number().integer().min(1).required(),
      coordinates: commonSchemas.coordinates.optional()
    }).optional()
  }),

  query: Joi.object({
    status: Joi.string().valid('ACTIVE', 'INACTIVE', 'MAINTENANCE').optional(),
    minMileage: Joi.number().min(0).optional(),
    maxMileage: Joi.number().min(0).optional(),
    fitnessExpiring: Joi.boolean().optional(),
    manufacturer: Joi.string().optional(),
    ...commonSchemas.pagination
  })
};

// Schedule validation schemas
export const scheduleSchemas = {
  create: Joi.object({
    trainsetId: commonSchemas.trainsetId,
    routeId: Joi.string().required(),
    startTime: Joi.string().pattern(patterns.time24).required(),
    endTime: Joi.string().pattern(patterns.time24).required(),
    date: Joi.string().pattern(patterns.date).required(),
    priority: commonSchemas.priority,
    estimatedMileage: Joi.number().min(0).required(),
    energyConsumption: Joi.number().min(0).optional(),
    passengerLoad: Joi.number().min(0).max(100).optional()
  }).custom((value, helpers) => {
    const { startTime, endTime } = value;
    if (startTime >= endTime) {
      return helpers.error('schedule.timeRange');
    }
    return value;
  }),

  update: Joi.object({
    routeId: Joi.string().optional(),
    startTime: Joi.string().pattern(patterns.time24).optional(),
    endTime: Joi.string().pattern(patterns.time24).optional(),
    date: Joi.string().pattern(patterns.date).optional(),
    priority: commonSchemas.priority.optional(),
    estimatedMileage: Joi.number().min(0).optional(),
    energyConsumption: Joi.number().min(0).optional(),
    passengerLoad: Joi.number().min(0).max(100).optional(),
    status: commonSchemas.status.optional()
  }),

  optimize: Joi.object({
    date: Joi.string().pattern(patterns.date).required(),
    trainsetIds: Joi.array().items(commonSchemas.trainsetId).min(1).max(25).required(),
    constraints: commonSchemas.optimizationConstraints.optional(),
    algorithm: Joi.string().valid('genetic', 'simulated_annealing', 'linear_programming', 'hybrid').default('hybrid')
  })
};

// Fitness certificate validation schemas
export const fitnessSchemas = {
  create: Joi.object({
    trainsetId: commonSchemas.trainsetId,
    certificateNumber: Joi.string().pattern(patterns.fitnessCertificate).required(),
    issueDate: Joi.string().pattern(patterns.date).required(),
    expiryDate: Joi.string().pattern(patterns.date).required(),
    issuingAuthority: Joi.string().min(1).max(100).required(),
    fitnessScore: Joi.number().min(0).max(10).required(),
    testResults: Joi.object({
      brakeSystem: Joi.number().min(0).max(10).required(),
      propulsionSystem: Joi.number().min(0).max(10).required(),
      safetySystem: Joi.number().min(0).max(10).required(),
      structuralIntegrity: Joi.number().min(0).max(10).required(),
      electricalSystem: Joi.number().min(0).max(10).required()
    }).required(),
    remarks: Joi.string().max(500).optional()
  }).custom((value, helpers) => {
    const { issueDate, expiryDate } = value;
    if (new Date(issueDate) >= new Date(expiryDate)) {
      return helpers.error('fitness.dateRange');
    }
    return value;
  }),

  update: Joi.object({
    fitnessScore: Joi.number().min(0).max(10).optional(),
    testResults: Joi.object({
      brakeSystem: Joi.number().min(0).max(10).optional(),
      propulsionSystem: Joi.number().min(0).max(10).optional(),
      safetySystem: Joi.number().min(0).max(10).optional(),
      structuralIntegrity: Joi.number().min(0).max(10).optional(),
      electricalSystem: Joi.number().min(0).max(10).optional()
    }).optional(),
    remarks: Joi.string().max(500).optional()
  })
};

// Job card validation schemas
export const jobCardSchemas = {
  create: Joi.object({
    trainsetId: commonSchemas.trainsetId,
    jobCardNumber: Joi.string().pattern(patterns.jobCard).required(),
    workType: Joi.string().valid(
      'ROUTINE_MAINTENANCE', 
      'BRAKE_MAINTENANCE', 
      'ENGINE_MAINTENANCE', 
      'ELECTRICAL_MAINTENANCE', 
      'STRUCTURAL_REPAIR', 
      'SAFETY_INSPECTION',
      'EMERGENCY_REPAIR'
    ).required(),
    priority: commonSchemas.priority,
    description: Joi.string().min(10).max(1000).required(),
    estimatedHours: Joi.number().min(0.5).max(72).required(),
    scheduledDate: Joi.string().pattern(patterns.date).required(),
    assignedTechnician: Joi.string().min(1).max(100).optional(),
    requiredParts: Joi.array().items(
      Joi.object({
        partNumber: Joi.string().required(),
        partName: Joi.string().required(),
        quantity: Joi.number().integer().min(1).required(),
        cost: Joi.number().min(0).optional()
      })
    ).optional(),
    safetyRequirements: Joi.array().items(Joi.string()).optional()
  }),

  update: Joi.object({
    workType: Joi.string().valid(
      'ROUTINE_MAINTENANCE', 
      'BRAKE_MAINTENANCE', 
      'ENGINE_MAINTENANCE', 
      'ELECTRICAL_MAINTENANCE', 
      'STRUCTURAL_REPAIR', 
      'SAFETY_INSPECTION',
      'EMERGENCY_REPAIR'
    ).optional(),
    priority: commonSchemas.priority.optional(),
    description: Joi.string().min(10).max(1000).optional(),
    estimatedHours: Joi.number().min(0.5).max(72).optional(),
    actualHours: Joi.number().min(0).max(72).optional(),
    scheduledDate: Joi.string().pattern(patterns.date).optional(),
    completedDate: Joi.string().pattern(patterns.date).optional(),
    assignedTechnician: Joi.string().min(1).max(100).optional(),
    status: Joi.string().valid('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED').optional(),
    workNotes: Joi.string().max(2000).optional(),
    qualityCheckPassed: Joi.boolean().optional(),
    cost: Joi.number().min(0).optional()
  })
};

// User validation schemas
export const userSchemas = {
  register: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(8).max(50).pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/).required().messages({
      'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
    }),
    firstName: Joi.string().min(1).max(50).required(),
    lastName: Joi.string().min(1).max(50).required(),
    role: commonSchemas.userRole,
    phoneNumber: Joi.string().pattern(patterns.phoneNumber).optional(),
    department: Joi.string().valid('OPERATIONS', 'MAINTENANCE', 'ADMINISTRATION', 'SAFETY', 'IT').required()
  }),

  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required()
  }),

  updateProfile: Joi.object({
    firstName: Joi.string().min(1).max(50).optional(),
    lastName: Joi.string().min(1).max(50).optional(),
    phoneNumber: Joi.string().pattern(patterns.phoneNumber).optional(),
    department: Joi.string().valid('OPERATIONS', 'MAINTENANCE', 'ADMINISTRATION', 'SAFETY', 'IT').optional()
  }),

  changePassword: Joi.object({
    currentPassword: Joi.string().required(),
    newPassword: Joi.string().min(8).max(50).pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/).required(),
    confirmPassword: Joi.string().valid(Joi.ref('newPassword')).required().messages({
      'any.only': 'Password confirmation does not match'
    })
  })
};

// What-If simulator validation schemas
export const whatIfSchemas = {
  scenario: Joi.object({
    name: Joi.string().min(1).max(100).required(),
    description: Joi.string().max(500).optional(),
    modifications: Joi.object({
      trainsetChanges: Joi.array().items(
        Joi.object({
          trainsetId: commonSchemas.trainsetId,
          changes: Joi.object({
            status: commonSchemas.status.optional(),
            maintenanceRequired: Joi.boolean().optional(),
            fitnessScore: Joi.number().min(0).max(10).optional(),
            availabilityHours: Joi.number().min(0).max(24).optional()
          })
        })
      ).optional(),
      constraintChanges: commonSchemas.optimizationConstraints.optional(),
      emergencyScenarios: Joi.array().items(
        Joi.string().valid('TRAINSET_BREAKDOWN', 'TRACK_CLOSURE', 'SEVERE_WEATHER', 'STAFF_SHORTAGE', 'POWER_OUTAGE')
      ).optional()
    }).required(),
    simulationParameters: Joi.object({
      duration: Joi.number().integer().min(1).max(7).default(1), // days
      iterations: Joi.number().integer().min(1).max(100).default(10),
      confidenceLevel: Joi.number().min(0.8).max(0.99).default(0.95)
    }).optional()
  })
};

// Analytics validation schemas
export const analyticsSchemas = {
  performance: Joi.object({
    ...commonSchemas.dateRange,
    metrics: Joi.array().items(
      Joi.string().valid(
        'punctuality',
        'availability',
        'energy_efficiency',
        'maintenance_cost',
        'passenger_satisfaction',
        'revenue'
      )
    ).min(1).required(),
    trainsetIds: Joi.array().items(commonSchemas.trainsetId).optional(),
    aggregation: Joi.string().valid('daily', 'weekly', 'monthly').default('daily')
  }),

  optimization: Joi.object({
    ...commonSchemas.dateRange,
    algorithm: Joi.string().valid('genetic', 'simulated_annealing', 'linear_programming', 'hybrid').optional(),
    performanceOnly: Joi.boolean().default(false)
  })
};

// Notification validation schemas
export const notificationSchemas = {
  whatsapp: Joi.object({
    recipients: Joi.array().items(
      Joi.object({
        phoneNumber: Joi.string().pattern(patterns.whatsappNumber).required(),
        name: Joi.string().min(1).max(50).optional()
      })
    ).min(1).max(50).required(),
    templateId: Joi.string().required(),
    parameters: Joi.array().items(Joi.string()).optional(),
    priority: Joi.string().valid('LOW', 'MEDIUM', 'HIGH').default('MEDIUM'),
    scheduledTime: Joi.date().greater('now').optional()
  }),

  email: Joi.object({
    recipients: Joi.array().items(Joi.string().email()).min(1).max(100).required(),
    subject: Joi.string().min(1).max(200).required(),
    body: Joi.string().min(1).max(10000).required(),
    priority: Joi.string().valid('LOW', 'MEDIUM', 'HIGH').default('MEDIUM'),
    scheduledTime: Joi.date().greater('now').optional()
  })
};

// Validation middleware factory
export const validate = (schema: Joi.ObjectSchema, property: 'body' | 'query' | 'params' = 'body') => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error, value } = schema.validate(req[property], { 
      abortEarly: false,
      stripUnknown: true,
      convert: true
    });

    if (error) {
      const errorMessage = error.details.map(detail => detail.message).join('; ');
      throw new ValidationError(errorMessage, 'VALIDATION_FAILED');
    }

    // Replace the original data with validated and transformed data
    req[property] = value;
    next();
  };
};

// Custom validation functions
export const customValidators = {
  // Check if date is a working day
  isWorkingDay: (date: string): boolean => {
    const day = new Date(date).getDay();
    return day >= 1 && day <= 5; // Monday to Friday
  },

  // Check if time is within operational hours
  isOperationalHours: (time: string): boolean => {
    const [hours] = time.split(':').map(Number);
    return hours >= 5 && hours <= 23; // 5 AM to 11 PM
  },

  // Validate trainset capacity based on route
  validateCapacityForRoute: (capacity: number, routeType: string): boolean => {
    const minCapacities = {
      'EXPRESS': 800,
      'LOCAL': 400,
      'PEAK_HOUR': 1000
    };
    return capacity >= (minCapacities[routeType as keyof typeof minCapacities] || 400);
  },

  // Check maintenance scheduling conflicts
  checkMaintenanceConflict: (trainsetId: string, scheduledDate: string, estimatedHours: number): Promise<boolean> => {
    // This would check against existing maintenance schedules
    // Implementation would query the database
    return Promise.resolve(false);
  }
};

// Error message customization
export const customMessages = {
  'dateRange.invalid': 'Start date must be before end date',
  'schedule.timeRange': 'Start time must be before end time',
  'fitness.dateRange': 'Issue date must be before expiry date',
  'trainset.capacity': 'Trainset capacity is insufficient for the selected route type'
};

export default {
  commonSchemas,
  trainsetSchemas,
  scheduleSchemas,
  fitnessSchemas,
  jobCardSchemas,
  userSchemas,
  whatIfSchemas,
  analyticsSchemas,
  notificationSchemas,
  validate,
  customValidators,
  patterns
};