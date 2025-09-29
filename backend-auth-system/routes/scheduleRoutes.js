const express = require('express');
const router = express.Router();
const {
  getAllSchedules,
  getScheduleById,
  createSchedule,
  updateSchedule,
  updateScheduleStatus,
  deleteSchedule,
  getScheduleStats
} = require('../controllers/scheduleController');
const { authenticate, authorize } = require('../middleware/auth');

// All routes require authentication
router.use(authenticate);

// Get schedule statistics (dashboard)
router.get('/stats', getScheduleStats);

// Get all schedules
router.get('/', getAllSchedules);

// Get schedule by ID
router.get('/:id', getScheduleById);

// Create new schedule (admin/operator only)
router.post('/', authorize(['admin', 'operator']), createSchedule);

// Update schedule (admin/operator only)
router.put('/:id', authorize(['admin', 'operator']), updateSchedule);

// Update schedule status (admin/operator only)
router.patch('/:id/status', authorize(['admin', 'operator']), updateScheduleStatus);

// Delete schedule (admin only)
router.delete('/:id', authorize(['admin']), deleteSchedule);

module.exports = router;