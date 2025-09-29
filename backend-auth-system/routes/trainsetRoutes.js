const express = require('express');
const { authenticate, requireAdmin } = require('../middleware/auth');
const {
  getAllTrainsets,
  getTrainsetById,
  createTrainset,
  updateTrainset,
  updateTrainsetStatus,
  deleteTrainset,
  getTrainsetStats,
  addMaintenanceRecord,
  updateMileage,
  getMaintenanceDue
} = require('../controllers/trainsetController');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Public routes (for authenticated users)
router.get('/', getAllTrainsets);
router.get('/stats/dashboard', getTrainsetStats);
router.get('/maintenance/due', getMaintenanceDue);
router.get('/:id', getTrainsetById);

// Protected routes (require specific permissions)
router.post('/', createTrainset);
router.put('/:id', updateTrainset);
router.patch('/:id/status', updateTrainsetStatus);
router.delete('/:id', deleteTrainset);

// Maintenance related routes
router.post('/:id/maintenance', addMaintenanceRecord);
router.patch('/:id/mileage', updateMileage);

module.exports = router;