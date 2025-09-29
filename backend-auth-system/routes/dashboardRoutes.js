const express = require('express');
const router = express.Router();
const {
  getDashboardOverview,
  optimizeSchedule,
  handleAIInsight,
  getActiveAlerts,
  getFleetStatus,
  handleTrainAction,
  configureAI
} = require('../controllers/dashboardController');
const { authenticate, authorize } = require('../middleware/auth');

// All routes require authentication
router.use(authenticate);

// Dashboard Overview and KPIs
router.get('/overview', getDashboardOverview);

// Fleet Status and Management
router.get('/fleet/status', getFleetStatus);

// Alerts and Notifications
router.get('/alerts', getActiveAlerts);

// Schedule Optimization
router.post('/optimize/schedule', authorize(['admin', 'operator']), optimizeSchedule);

// AI Insights and Actions
router.post('/ai/insight', authorize(['admin', 'operator']), handleAIInsight);

// AI Configuration
router.post('/ai/configure', authorize(['admin']), configureAI);

// Train Actions (for modal buttons)
router.post('/train/:trainId/action', authorize(['admin', 'operator']), handleTrainAction);

// Time range data endpoints
router.get('/performance/:timeRange', async (req, res) => {
  try {
    const { timeRange } = req.params;
    
    if (!['24h', '7d', '30d'].includes(timeRange)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid time range. Must be 24h, 7d, or 30d'
      });
    }
    
    // This would typically fetch performance data for the specified time range
    // For now, returning mock data
    const performanceData = {
      fleetUtilization: Math.floor(Math.random() * 40) + 60,
      energyEfficiency: Math.floor(Math.random() * 30) + 70,
      onTimePerformance: Math.floor(Math.random() * 10) + 90,
      passengerSatisfaction: (Math.random() * 1 + 4).toFixed(1),
      timeRange: timeRange,
      lastUpdated: new Date()
    };
    
    res.json({
      success: true,
      data: performanceData
    });
    
  } catch (error) {
    console.error('Get performance data error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch performance data',
      error: error.message
    });
  }
});

// Dark mode toggle endpoint
router.post('/theme/toggle', async (req, res) => {
  try {
    const { isDarkMode } = req.body;
    
    // In a real app, this would save user preferences
    // For now, just acknowledge the change
    
    res.json({
      success: true,
      message: 'Theme preference updated',
      data: {
        isDarkMode,
        updatedAt: new Date()
      }
    });
    
  } catch (error) {
    console.error('Theme toggle error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update theme preference',
      error: error.message
    });
  }
});

// Notification management
router.get('/notifications', async (req, res) => {
  try {
    const { unreadOnly = false, limit = 20 } = req.query;
    
    // Mock notification data
    const notifications = [
      {
        id: 'notif_1',
        type: 'optimization',
        title: 'Schedule Optimization Complete',
        message: 'Energy savings of 15% achieved through route optimization',
        timestamp: new Date(Date.now() - 3600000),
        read: false,
        priority: 'medium'
      },
      {
        id: 'notif_2',
        type: 'maintenance',
        title: 'Maintenance Alert',
        message: 'Train TS005 requires brake inspection within 2 days',
        timestamp: new Date(Date.now() - 7200000),
        read: false,
        priority: 'high'
      },
      {
        id: 'notif_3',
        type: 'system',
        title: 'AI Insights Available',
        message: 'New predictive maintenance recommendations are ready',
        timestamp: new Date(Date.now() - 10800000),
        read: true,
        priority: 'low'
      }
    ].filter(n => !unreadOnly || !n.read)
     .slice(0, parseInt(limit));
    
    res.json({
      success: true,
      data: notifications,
      meta: {
        total: notifications.length,
        unread: notifications.filter(n => !n.read).length
      }
    });
    
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notifications',
      error: error.message
    });
  }
});

// Mark notification as read
router.patch('/notifications/:id/read', async (req, res) => {
  try {
    const { id } = req.params;
    
    // In a real app, this would update the database
    // For now, just acknowledge the action
    
    res.json({
      success: true,
      message: 'Notification marked as read',
      data: {
        id,
        read: true,
        readAt: new Date()
      }
    });
    
  } catch (error) {
    console.error('Mark notification read error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark notification as read',
      error: error.message
    });
  }
});

// Clear all notifications
router.delete('/notifications/clear', async (req, res) => {
  try {
    // In a real app, this would clear user's notifications from database
    // For now, just acknowledge the action
    
    res.json({
      success: true,
      message: 'All notifications cleared',
      data: {
        clearedAt: new Date(),
        count: 0
      }
    });
    
  } catch (error) {
    console.error('Clear notifications error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clear notifications',
      error: error.message
    });
  }
});

// Navigation tab data
router.get('/tabs/:tabName', async (req, res) => {
  try {
    const { tabName } = req.params;
    
    let tabData;
    
    switch (tabName) {
      case 'overview':
        tabData = await getDashboardOverviewData();
        break;
      case 'fleet':
        tabData = await getFleetTabData();
        break;
      case 'optimization':
        tabData = await getOptimizationTabData();
        break;
      case 'analytics':
        tabData = await getAnalyticsTabData();
        break;
      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid tab name'
        });
    }
    
    res.json({
      success: true,
      data: tabData
    });
    
  } catch (error) {
    console.error('Get tab data error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch tab data',
      error: error.message
    });
  }
});

// Helper functions for tab data
async function getDashboardOverviewData() {
  return {
    type: 'overview',
    widgets: ['kpis', 'alerts', 'performance_chart', 'maintenance_chart', 'fleet_radar'],
    refreshInterval: 30000, // 30 seconds
    lastUpdated: new Date()
  };
}

async function getFleetTabData() {
  return {
    type: 'fleet',
    widgets: ['fleet_status', 'train_locations', 'maintenance_schedule'],
    filters: ['status', 'location', 'depot'],
    actions: ['view_details', 'schedule_maintenance', 'update_status'],
    refreshInterval: 10000, // 10 seconds
    lastUpdated: new Date()
  };
}

async function getOptimizationTabData() {
  return {
    type: 'optimization',
    widgets: ['optimization_history', 'energy_savings', 'schedule_efficiency'],
    actions: ['run_optimization', 'view_recommendations', 'apply_suggestions'],
    algorithms: ['GENETIC_ALGORITHM', 'SIMULATED_ANNEALING', 'PARTICLE_SWARM'],
    refreshInterval: 60000, // 1 minute
    lastUpdated: new Date()
  };
}

async function getAnalyticsTabData() {
  return {
    type: 'analytics',
    widgets: ['performance_trends', 'energy_analytics', 'passenger_analytics', 'maintenance_analytics'],
    timeRanges: ['24h', '7d', '30d', '90d', '1y'],
    exportFormats: ['pdf', 'excel', 'csv'],
    refreshInterval: 120000, // 2 minutes
    lastUpdated: new Date()
  };
}

module.exports = router;