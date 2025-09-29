const express = require('express');
const router = express.Router();
const {
  initializeAIService,
  getAIServiceStatus,
  getAIAlgorithmRecommendation,
  generateAIPredictions,
  detectOptimizationAnomalies,
  updateAIModels,
  getPatternInsights,
  getModelPerformance,
  triggerModelRetraining,
  getOperationalRecommendations
} = require('../controllers/aiServiceController');

const { authenticate } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validation');
const { body, query } = require('express-validator');

// Admin role check middleware
const requireAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({
      success: false,
      message: 'Admin access required'
    });
  }
};

// Validation middleware
const validateOperationalContext = [
  body('totalPassengerLoad').optional().isFloat({ min: 0, max: 1 }).withMessage('Total passenger load must be between 0 and 1'),
  body('systemCapacityUtilization').optional().isFloat({ min: 0, max: 1 }).withMessage('System capacity utilization must be between 0 and 1'),
  body('onTimePerformance').optional().isFloat({ min: 0, max: 1 }).withMessage('On-time performance must be between 0 and 1'),
  body('energyEfficiency').optional().isFloat({ min: 0, max: 1 }).withMessage('Energy efficiency must be between 0 and 1'),
  body('activeTrains').optional().isInt({ min: 1, max: 50 }).withMessage('Active trains must be between 1 and 50'),
  body('weatherImpact').optional().isIn(['none', 'minimal', 'low', 'moderate', 'severe']).withMessage('Invalid weather impact'),
  body('energyPrice').optional().isFloat({ min: 0 }).withMessage('Energy price must be positive'),
];

const validateOptimizationResult = [
  body('fitnessScore').isFloat({ min: 0, max: 10 }).withMessage('Fitness score must be between 0 and 10'),
  body('improvementPercentage').isFloat({ min: -100, max: 100 }).withMessage('Improvement percentage must be between -100 and 100'),
  body('metrics').optional().isObject().withMessage('Metrics must be an object'),
];

const validateModelUpdate = [
  body('optimizationResult').isObject().withMessage('Optimization result is required'),
  body('operationalContext').isObject().withMessage('Operational context is required'),
];

const validateTrainingType = [
  body('type').optional().isIn(['incremental', 'full']).withMessage('Training type must be incremental or full'),
];

const validatePatternType = [
  query('type').optional().isIn(['all', 'peak_hours', 'seasonal', 'weather', 'anomaly']).withMessage('Invalid pattern type'),
];

// AI Service Control Routes (Admin only)

/**
 * @route   POST /api/ai-service/initialize
 * @desc    Initialize AI optimization service
 * @access  Private (Admin only)
 */
router.post('/initialize',
  authenticate,
  requireAdmin,
  initializeAIService
);

/**
 * @route   POST /api/ai-service/retrain
 * @desc    Trigger manual model retraining
 * @access  Private (Admin only)
 */
router.post('/retrain',
  authenticate,
  requireAdmin,
  validateTrainingType,
  validateRequest,
  triggerModelRetraining
);

/**
 * @route   POST /api/ai-service/update-models
 * @desc    Update AI models with new optimization result
 * @access  Private (Admin only)
 */
router.post('/update-models',
  authenticate,
  requireAdmin,
  validateModelUpdate,
  validateRequest,
  updateAIModels
);

// AI Service Query Routes (All authenticated users)

/**
 * @route   GET /api/ai-service/status
 * @desc    Get AI service status and metrics
 * @access  Private
 */
router.get('/status',
  authenticate,
  getAIServiceStatus
);

/**
 * @route   POST /api/ai-service/algorithm-recommendation
 * @desc    Get AI-powered algorithm recommendation
 * @access  Private
 */
router.post('/algorithm-recommendation',
  authenticate,
  validateOperationalContext,
  validateRequest,
  getAIAlgorithmRecommendation
);

/**
 * @route   POST /api/ai-service/predictions
 * @desc    Generate AI predictions for operational context
 * @access  Private
 */
router.post('/predictions',
  authenticate,
  validateOperationalContext,
  validateRequest,
  generateAIPredictions
);

/**
 * @route   POST /api/ai-service/detect-anomalies
 * @desc    Detect anomalies in optimization results
 * @access  Private
 */
router.post('/detect-anomalies',
  authenticate,
  validateOptimizationResult,
  validateRequest,
  detectOptimizationAnomalies
);

/**
 * @route   POST /api/ai-service/recommendations
 * @desc    Get AI recommendations for operational improvements
 * @access  Private
 */
router.post('/recommendations',
  authenticate,
  validateOperationalContext,
  validateRequest,
  getOperationalRecommendations
);

/**
 * @route   GET /api/ai-service/patterns
 * @desc    Get pattern recognition insights
 * @access  Private
 */
router.get('/patterns',
  authenticate,
  validatePatternType,
  validateRequest,
  getPatternInsights
);

/**
 * @route   GET /api/ai-service/model-performance
 * @desc    Get model performance metrics
 * @access  Private
 */
router.get('/model-performance',
  authenticate,
  getModelPerformance
);

module.exports = router;
