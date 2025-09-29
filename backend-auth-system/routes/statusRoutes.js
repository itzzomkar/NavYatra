const express = require('express');
const { authenticate, requireAdmin } = require('../middleware/auth');
const statusUpdater = require('../services/statusUpdater');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Get service status
router.get('/status', (req, res) => {
  try {
    const status = statusUpdater.getStatus();
    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get status',
      error: error.message
    });
  }
});

// Get upcoming changes (next 7 days by default)
router.get('/upcoming', async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 7;
    const upcoming = await statusUpdater.getUpcomingChanges(days);
    
    res.json({
      success: true,
      data: upcoming
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get upcoming changes',
      error: error.message
    });
  }
});

// Get recent logs
router.get('/logs', (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const logs = statusUpdater.getRecentLogs(limit);
    
    res.json({
      success: true,
      data: logs
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get logs',
      error: error.message
    });
  }
});

// Admin only routes
router.use(requireAdmin);

// Manually trigger status check (admin only)
router.post('/check', async (req, res) => {
  try {
    console.log('Manual status check triggered by admin');
    const result = await statusUpdater.checkAndUpdateStatuses();
    
    res.json({
      success: true,
      message: 'Status check completed',
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to run status check',
      error: error.message
    });
  }
});

// Start the service (admin only)
router.post('/start', (req, res) => {
  try {
    statusUpdater.start();
    res.json({
      success: true,
      message: 'Status updater service started'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to start service',
      error: error.message
    });
  }
});

// Stop the service (admin only)
router.post('/stop', (req, res) => {
  try {
    statusUpdater.stop();
    res.json({
      success: true,
      message: 'Status updater service stopped'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to stop service',
      error: error.message
    });
  }
});

module.exports = router;