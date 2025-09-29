const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const {
  getDashboard,
  getOptimization,
  getPerformance,
  getUtilization,
  getMaintenance
} = require('../controllers/analyticsController');

// All analytics routes require authentication
router.use(authenticate);

// Dashboard analytics - combines all key metrics for the main dashboard
router.get('/dashboard', getDashboard);

// Optimization-specific analytics
router.get('/optimization', getOptimization);

// Performance analytics - detailed performance metrics
router.get('/performance', getPerformance);

// Utilization analytics - trainset utilization data
router.get('/utilization', getUtilization);

// Maintenance analytics
router.get('/maintenance', getMaintenance);

module.exports = router;