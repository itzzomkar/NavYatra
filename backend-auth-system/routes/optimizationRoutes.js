const express = require('express');
const router = express.Router();
const {
  createOptimization,
  getAllOptimizations,
  getOptimizationById,
  getOptimizationStats,
  deleteOptimization,
  getOptimizationProgress,
  runOptimization,
  getLastOptimization,
  getOptimizationMetrics
} = require('../controllers/optimizationController');
const { authenticate, authorize } = require('../middleware/auth');

// All routes require authentication
router.use(authenticate);

// Get optimization statistics (dashboard)
router.get('/stats', getOptimizationStats);

// Get optimization progress by ID
router.get('/:id/progress', getOptimizationProgress);

// Get all optimizations with filtering and pagination
router.get('/', getAllOptimizations);

// Get optimization by ID
router.get('/:id', getOptimizationById);

// Create new optimization (admin/operator only)
router.post('/', authorize(['admin', 'operator']), createOptimization);

// Delete optimization (admin only)
router.delete('/:id', authorize(['admin']), deleteOptimization);

// Optimization dashboard specific routes
router.post('/run', authorize(['admin', 'operator']), runOptimization);
router.get('/last', getLastOptimization);
router.get('/metrics', getOptimizationMetrics);

module.exports = router;
