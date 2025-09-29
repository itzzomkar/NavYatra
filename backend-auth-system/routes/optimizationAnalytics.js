const express = require('express');
const router = express.Router();
const {
  getOptimizationDashboard,
  getOptimizationPerformanceDetails,
  getCostBenefitAnalysis,
  getResourceUtilizationAnalytics,
  getPredictiveAnalytics,
  exportOptimizationReport
} = require('../controllers/optimizationAnalyticsController');

const { authenticate } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validation');
const { body, query, param } = require('express-validator');

// Validation middleware
const validatePeriod = [
  query('period').optional().isIn(['7d', '30d', '90d', '1y']).withMessage('Period must be 7d, 30d, 90d, or 1y'),
];

const validateAlgorithm = [
  query('algorithm').optional().isIn(['all', 'GENETIC', 'SIMULATED_ANNEALING', 'LOCAL_SEARCH', 'HYBRID']).withMessage('Invalid algorithm'),
];

const validateGroupBy = [
  query('groupBy').optional().isIn(['algorithm', 'shift', 'trainsetCount']).withMessage('Invalid groupBy parameter'),
];

const validatePredictiveType = [
  query('type').optional().isIn(['performance', 'cost', 'energy', 'demand']).withMessage('Invalid prediction type'),
  query('horizon').optional().isIn(['7d', '14d', '30d', '90d']).withMessage('Invalid prediction horizon'),
];

const validateExportFormat = [
  query('format').optional().isIn(['json', 'csv', 'pdf']).withMessage('Invalid export format'),
  query('includeDetails').optional().isBoolean().withMessage('includeDetails must be boolean'),
];

const validateOptimizationId = [
  param('id').isMongoId().withMessage('Invalid optimization ID'),
];

// Routes

/**
 * @route   GET /api/optimizations/analytics/dashboard
 * @desc    Get comprehensive optimization dashboard analytics
 * @access  Private
 */
router.get('/dashboard', 
  authenticate, 
  validatePeriod,
  validateAlgorithm,
  validateRequest,
  getOptimizationDashboard
);

/**
 * @route   GET /api/optimizations/analytics/performance/:id
 * @desc    Get detailed performance metrics for specific optimization
 * @access  Private
 */
router.get('/performance/:id',
  authenticate,
  validateOptimizationId,
  validateRequest,
  getOptimizationPerformanceDetails
);

/**
 * @route   GET /api/optimizations/analytics/cost-benefit
 * @desc    Get cost-benefit analysis
 * @access  Private
 */
router.get('/cost-benefit',
  authenticate,
  validatePeriod,
  validateGroupBy,
  validateRequest,
  getCostBenefitAnalysis
);

/**
 * @route   GET /api/optimizations/analytics/resource-utilization
 * @desc    Get resource utilization analytics
 * @access  Private
 */
router.get('/resource-utilization',
  authenticate,
  validatePeriod,
  validateRequest,
  getResourceUtilizationAnalytics
);

/**
 * @route   GET /api/optimizations/analytics/predictive
 * @desc    Get predictive analytics and recommendations
 * @access  Private
 */
router.get('/predictive',
  authenticate,
  validatePredictiveType,
  validateRequest,
  getPredictiveAnalytics
);

/**
 * @route   GET /api/optimizations/analytics/export
 * @desc    Export optimization report
 * @access  Private
 */
router.get('/export',
  authenticate,
  validatePeriod,
  validateExportFormat,
  validateRequest,
  exportOptimizationReport
);

module.exports = router;