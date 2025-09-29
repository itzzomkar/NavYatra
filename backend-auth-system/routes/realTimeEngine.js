const express = require('express');
const router = express.Router();
const {
  startEngine,
  stopEngine,
  getEngineStatus,
  getRealTimeData,
  getActiveOptimizations,
  forceOptimizationCycle,
  stopOptimization,
  getSystemMetrics,
  getOperationalInsights
} = require('../controllers/realTimeEngineController');

const { authenticate } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validation');
const { body, param } = require('express-validator');

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
const validateOptimizationId = [
  param('optimizationId').isString().withMessage('Optimization ID must be a string'),
];

const validateManualCycle = [
  body('strategy').optional().isIn(['peak_hour_optimization', 'off_peak_optimization', 'maintenance_mode', 'emergency_response']).withMessage('Invalid strategy'),
  body('urgency').optional().isIn(['low', 'normal', 'high', 'critical', 'manual']).withMessage('Invalid urgency level'),
];

// Engine Control Routes (Admin only)

/**
 * @route   POST /api/real-time-engine/start
 * @desc    Start the real-time optimization engine
 * @access  Private (Admin only)
 */
router.post('/start',
  authenticate,
  requireAdmin,
  startEngine
);

/**
 * @route   POST /api/real-time-engine/stop
 * @desc    Stop the real-time optimization engine
 * @access  Private (Admin only)
 */
router.post('/stop',
  authenticate,
  requireAdmin,
  stopEngine
);

/**
 * @route   POST /api/real-time-engine/force-cycle
 * @desc    Force manual optimization cycle
 * @access  Private (Admin only)
 */
router.post('/force-cycle',
  authenticate,
  requireAdmin,
  validateManualCycle,
  validateRequest,
  forceOptimizationCycle
);

/**
 * @route   POST /api/real-time-engine/stop-optimization/:optimizationId
 * @desc    Stop specific optimization
 * @access  Private (Admin only)
 */
router.post('/stop-optimization/:optimizationId',
  authenticate,
  requireAdmin,
  validateOptimizationId,
  validateRequest,
  stopOptimization
);

// Status and Monitoring Routes (All authenticated users)

/**
 * @route   GET /api/real-time-engine/status
 * @desc    Get engine status and basic metrics
 * @access  Private
 */
router.get('/status',
  authenticate,
  getEngineStatus
);

/**
 * @route   GET /api/real-time-engine/real-time-data
 * @desc    Get current real-time operational data
 * @access  Private
 */
router.get('/real-time-data',
  authenticate,
  getRealTimeData
);

/**
 * @route   GET /api/real-time-engine/active-optimizations
 * @desc    Get currently active optimizations
 * @access  Private
 */
router.get('/active-optimizations',
  authenticate,
  getActiveOptimizations
);

/**
 * @route   GET /api/real-time-engine/system-metrics
 * @desc    Get comprehensive system performance metrics
 * @access  Private
 */
router.get('/system-metrics',
  authenticate,
  getSystemMetrics
);

/**
 * @route   GET /api/real-time-engine/operational-insights
 * @desc    Get operational insights, recommendations, and alerts
 * @access  Private
 */
router.get('/operational-insights',
  authenticate,
  getOperationalInsights
);

module.exports = router;
