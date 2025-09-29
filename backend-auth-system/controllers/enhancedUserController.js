const User = require('../models/User');
const { validationResult } = require('express-validator');

// Get user settings and preferences
const getUserSettings = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('settings preferences profile');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    const settings = {
      theme: user.settings?.theme || 'light',
      language: user.settings?.language || 'en',
      timezone: user.settings?.timezone || 'Asia/Kolkata',
      notifications: {
        email: user.settings?.notifications?.email ?? true,
        push: user.settings?.notifications?.push ?? true,
        sms: user.settings?.notifications?.sms ?? false,
        critical: user.settings?.notifications?.critical ?? true,
        maintenance: user.settings?.notifications?.maintenance ?? true,
        optimization: user.settings?.notifications?.optimization ?? false
      },
      dashboard: {
        defaultView: user.settings?.dashboard?.defaultView || 'overview',
        refreshInterval: user.settings?.dashboard?.refreshInterval || 30000,
        showWelcome: user.settings?.dashboard?.showWelcome ?? true,
        compactMode: user.settings?.dashboard?.compactMode ?? false
      },
      reports: {
        defaultFormat: user.settings?.reports?.defaultFormat || 'pdf',
        autoSchedule: user.settings?.reports?.autoSchedule ?? false,
        includeCharts: user.settings?.reports?.includeCharts ?? true
      }
    };
    
    res.json({
      success: true,
      data: {
        settings,
        profile: user.profile,
        lastUpdated: user.updatedAt
      }
    });
    
  } catch (error) {
    console.error('Get user settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user settings',
      error: error.message
    });
  }
};

// Update user settings
const updateUserSettings = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }
    
    const { settings } = req.body;
    
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Update settings
    user.settings = {
      ...user.settings,
      ...settings
    };
    
    await user.save();
    
    res.json({
      success: true,
      message: 'Settings updated successfully',
      data: {
        settings: user.settings,
        updatedAt: user.updatedAt
      }
    });
    
  } catch (error) {
    console.error('Update user settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update settings',
      error: error.message
    });
  }
};

// Update user profile
const updateUserProfile = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }
    
    const { firstName, lastName, phone, department, designation, avatar } = req.body;
    
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Update user fields
    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    
    // Update profile
    user.profile = {
      ...user.profile,
      ...(phone && { phone }),
      ...(department && { department }),
      ...(designation && { designation }),
      ...(avatar && { avatar })
    };
    
    await user.save();
    
    const userResponse = user.toJSON();
    
    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user: userResponse
      }
    });
    
  } catch (error) {
    console.error('Update user profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile',
      error: error.message
    });
  }
};

// Change password
const changePassword = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }
    
    const { currentPassword, newPassword } = req.body;
    
    const user = await User.findById(req.user.id).select('+password');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Verify current password
    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }
    
    // Update password
    user.password = newPassword;
    await user.save();
    
    res.json({
      success: true,
      message: 'Password changed successfully'
    });
    
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to change password',
      error: error.message
    });
  }
};

// Get user activity log
const getUserActivity = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    
    // Mock activity data (in production, this would come from an activity log collection)
    const activities = [
      {
        id: 'act_1',
        type: 'optimization_run',
        description: 'Ran schedule optimization',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
        details: { trainsets: 25, duration: '1.8s' },
        status: 'success'
      },
      {
        id: 'act_2',
        type: 'report_generated',
        description: 'Generated fleet summary report',
        timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000),
        details: { format: 'PDF', size: '2.4MB' },
        status: 'success'
      },
      {
        id: 'act_3',
        type: 'profile_updated',
        description: 'Updated profile information',
        timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
        details: { fields: ['phone', 'department'] },
        status: 'success'
      },
      {
        id: 'act_4',
        type: 'trainset_maintenance',
        description: 'Scheduled maintenance for KMRL-005',
        timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        details: { trainsetId: 'KMRL-005', type: 'routine' },
        status: 'success'
      },
      {
        id: 'act_5',
        type: 'login',
        description: 'Logged into dashboard',
        timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        details: { ip: '192.168.1.100', browser: 'Chrome' },
        status: 'success'
      }
    ];
    
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedActivities = activities.slice(startIndex, endIndex);
    
    res.json({
      success: true,
      data: paginatedActivities,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: activities.length,
        pages: Math.ceil(activities.length / limit)
      }
    });
    
  } catch (error) {
    console.error('Get user activity error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user activity',
      error: error.message
    });
  }
};

// Get user notifications
const getUserNotifications = async (req, res) => {
  try {
    const { unread = false, limit = 50 } = req.query;
    
    // Mock notifications (in production, this would come from a notifications collection)
    let notifications = [
      {
        id: 'notif_1',
        type: 'system',
        title: 'System Maintenance Scheduled',
        message: 'Scheduled system maintenance on Sunday 2:00 AM - 4:00 AM',
        timestamp: new Date(Date.now() - 30 * 60 * 1000),
        read: false,
        priority: 'medium',
        category: 'system'
      },
      {
        id: 'notif_2',
        type: 'optimization',
        title: 'Optimization Complete',
        message: 'Schedule optimization completed with 15% energy savings',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
        read: true,
        priority: 'low',
        category: 'optimization'
      },
      {
        id: 'notif_3',
        type: 'alert',
        title: 'Maintenance Alert',
        message: 'KMRL-012 requires immediate brake inspection',
        timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000),
        read: false,
        priority: 'high',
        category: 'maintenance'
      },
      {
        id: 'notif_4',
        type: 'report',
        title: 'Weekly Report Ready',
        message: 'Your scheduled weekly fleet report is ready for download',
        timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
        read: true,
        priority: 'low',
        category: 'reports'
      }
    ];
    
    if (unread === 'true') {
      notifications = notifications.filter(n => !n.read);
    }
    
    notifications = notifications.slice(0, parseInt(limit));
    
    res.json({
      success: true,
      data: notifications,
      meta: {
        total: notifications.length,
        unread: notifications.filter(n => !n.read).length
      }
    });
    
  } catch (error) {
    console.error('Get user notifications error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notifications',
      error: error.message
    });
  }
};

// Mark notification as read
const markNotificationRead = async (req, res) => {
  try {
    const { notificationId } = req.params;
    
    // In production, this would update the notification in the database
    // For now, just return success
    
    res.json({
      success: true,
      message: 'Notification marked as read',
      data: {
        notificationId,
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
};

// Get user dashboard preferences
const getDashboardPreferences = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    const preferences = {
      defaultView: user.settings?.dashboard?.defaultView || 'overview',
      theme: user.settings?.theme || 'light',
      refreshInterval: user.settings?.dashboard?.refreshInterval || 30000,
      widgetLayout: user.settings?.dashboard?.widgetLayout || {},
      compactMode: user.settings?.dashboard?.compactMode || false,
      showWelcome: user.settings?.dashboard?.showWelcome ?? true,
      pinnedCharts: user.settings?.dashboard?.pinnedCharts || [],
      notifications: user.settings?.notifications || {
        email: true,
        push: true,
        sms: false
      }
    };
    
    res.json({
      success: true,
      data: preferences
    });
    
  } catch (error) {
    console.error('Get dashboard preferences error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard preferences',
      error: error.message
    });
  }
};

// Update dashboard preferences
const updateDashboardPreferences = async (req, res) => {
  try {
    const { preferences } = req.body;
    
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Update dashboard preferences
    user.settings = {
      ...user.settings,
      dashboard: {
        ...user.settings?.dashboard,
        ...preferences
      }
    };
    
    await user.save();
    
    res.json({
      success: true,
      message: 'Dashboard preferences updated successfully',
      data: {
        preferences: user.settings.dashboard,
        updatedAt: user.updatedAt
      }
    });
    
  } catch (error) {
    console.error('Update dashboard preferences error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update dashboard preferences',
      error: error.message
    });
  }
};

// Export user data
const exportUserData = async (req, res) => {
  try {
    const { format = 'json' } = req.query;
    
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    const userData = {
      profile: {
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        ...user.profile
      },
      settings: user.settings,
      accountInfo: {
        createdAt: user.createdAt,
        lastLogin: user.lastLogin,
        isActive: user.isActive
      },
      exportedAt: new Date()
    };
    
    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="user-data-${user.username}-${Date.now()}.json"`);
      res.send(JSON.stringify(userData, null, 2));
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid format. Only JSON is currently supported.'
      });
    }
    
  } catch (error) {
    console.error('Export user data error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export user data',
      error: error.message
    });
  }
};

module.exports = {
  getUserSettings,
  updateUserSettings,
  updateUserProfile,
  changePassword,
  getUserActivity,
  getUserNotifications,
  markNotificationRead,
  getDashboardPreferences,
  updateDashboardPreferences,
  exportUserData
};