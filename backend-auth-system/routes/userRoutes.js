const express = require('express');
const { 
  getProfile, 
  updateProfile, 
  updateEmail, 
  deleteAccount, 
  getAllUsers 
} = require('../controllers/userController');
const {
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
} = require('../controllers/enhancedUserController');
const { validateUpdateProfile, validateUpdateEmail } = require('../middleware/validation');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// @route   GET /api/user/profile
// @desc    Get current user profile
// @access  Private
router.get('/profile', getProfile);

// @route   PUT /api/user/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', validateUpdateProfile, updateProfile);

// @route   PUT /api/user/email
// @desc    Update user email
// @access  Private
router.put('/email', validateUpdateEmail, updateEmail);

// @route   DELETE /api/user/account
// @desc    Delete user account
// @access  Private
router.delete('/account', deleteAccount);

// Enhanced user management routes
router.get('/settings', getUserSettings);
router.put('/settings', updateUserSettings);
router.put('/profile-enhanced', updateUserProfile);
router.put('/password', changePassword);
router.get('/activity', getUserActivity);
router.get('/notifications', getUserNotifications);
router.patch('/notifications/:notificationId/read', markNotificationRead);
router.get('/dashboard/preferences', getDashboardPreferences);
router.put('/dashboard/preferences', updateDashboardPreferences);
router.get('/export', exportUserData);

// Admin only routes
// @route   GET /api/user/all
// @desc    Get all users (admin only)
// @access  Private (Admin)
router.get('/all', requireAdmin, getAllUsers);

module.exports = router;
