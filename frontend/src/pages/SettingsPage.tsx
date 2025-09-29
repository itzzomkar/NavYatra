import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  CogIcon,
  BellIcon,
  ShieldCheckIcon,
  GlobeAltIcon,
  UserIcon,
  KeyIcon,
  DocumentTextIcon,
  TrashIcon,
  CheckIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

import { useAuth } from '@/hooks/useAuth';
import Card from '@/components/ui/Card';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import settingsService, { SystemSettings } from '@/services/settings';

const SettingsPage: React.FC = () => {
  const { user, hasPermission } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('general');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Fetch current settings
  const { data: settings, isLoading, error } = useQuery({
    queryKey: ['settings'],
    queryFn: () => settingsService.getSettings(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });

  const [formData, setFormData] = useState<SystemSettings | null>(null);

  // Update settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: async (updatedSettings: SystemSettings) => {
      return await settingsService.saveSettings(updatedSettings);
    },
    onSuccess: (savedSettings) => {
      queryClient.setQueryData(['settings'], savedSettings);
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      setFormData(savedSettings);
      setHasUnsavedChanges(false);
      toast.success('Settings updated successfully!');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update settings: ${error.message}`);
      console.error('Settings update error:', error);
    },
  });

  // Reset to defaults mutation
  const resetSettingsMutation = useMutation({
    mutationFn: async () => {
      return await settingsService.resetSettings();
    },
    onSuccess: (defaultSettings) => {
      queryClient.setQueryData(['settings'], defaultSettings);
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      setFormData(defaultSettings);
      setHasUnsavedChanges(false);
      toast.success('Settings reset to defaults successfully!');
    },
    onError: (error: Error) => {
      toast.error(`Failed to reset settings: ${error.message}`);
      console.error('Settings reset error:', error);
    },
  });

  // Initialize form data when settings are loaded
  useEffect(() => {
    if (settings) {
      setFormData(settings);
    }
  }, [settings]);

  // Auto-save draft to localStorage on changes
  useEffect(() => {
    if (formData && hasUnsavedChanges) {
      const timer = setTimeout(() => {
        localStorage.setItem('kmrl_settings_draft', JSON.stringify(formData));
        console.log('Draft saved to localStorage');
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [formData, hasUnsavedChanges]);

  // Show error state if settings failed to load
  if (error) {
    return (
      <div className="text-center py-12">
        <XMarkIcon className="h-12 w-12 mx-auto text-red-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900">Failed to Load Settings</h3>
        <p className="text-gray-500 mb-4">There was an error loading the system settings.</p>
        <button
          onClick={() => window.location.reload()}
          className="btn-primary"
        >
          Retry
        </button>
      </div>
    );
  }

  const handleInputChange = (section: keyof SystemSettings, field: string, value: any) => {
    if (!formData) return;
    
    const newFormData = {
      ...formData,
      [section]: {
        ...formData[section],
        [field]: value,
      },
    };
    setFormData(newFormData);
    setHasUnsavedChanges(true);
  };

  const handleNestedInputChange = (section: keyof SystemSettings, nestedField: string, field: string, value: any) => {
    if (!formData) return;
    
    const newFormData = {
      ...formData,
      [section]: {
        ...formData[section],
        [nestedField]: {
          ...(formData[section] as any)[nestedField],
          [field]: value,
        },
      },
    };
    setFormData(newFormData);
    setHasUnsavedChanges(true);
  };

  const handleSave = () => {
    if (!formData) {
      toast.error('No settings to save');
      return;
    }

    // Validate settings before saving
    const validation = settingsService.validateSettings(formData);
    if (!validation.isValid) {
      toast.error(`Validation failed: ${validation.errors.join(', ')}`);
      return;
    }

    updateSettingsMutation.mutate(formData);
  };

  const handleReset = () => {
    const confirmed = window.confirm(
      'Are you sure you want to reset all settings to defaults?\n\n' +
      'This will revert all your customizations and cannot be undone.'
    );
    
    if (confirmed) {
      resetSettingsMutation.mutate();
    }
  };


  const tabs = [
    { id: 'general', name: 'General', icon: CogIcon },
    { id: 'optimization', name: 'Optimization', icon: ShieldCheckIcon },
    { id: 'notifications', name: 'Notifications', icon: BellIcon },
    { id: 'security', name: 'Security', icon: KeyIcon },
    { id: 'api', name: 'API & Integrations', icon: GlobeAltIcon },
  ];

  if (isLoading || !formData) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
        <span className="ml-4 text-gray-600">
          {isLoading ? 'Loading settings...' : 'Initializing...'}
        </span>
      </div>
    );
  }

  if (!hasPermission('settings:read')) {
    return (
      <div className="text-center py-12">
        <ShieldCheckIcon className="h-12 w-12 mx-auto text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900">Access Denied</h3>
        <p className="text-gray-500">You don't have permission to view system settings.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-600 mt-2">
            Configure system preferences and behavior
          </p>
        </motion.div>

        {hasPermission('settings:update') && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="flex items-center space-x-3"
          >
            <button
              onClick={handleReset}
              disabled={resetSettingsMutation.isPending}
              className="btn btn-outline flex items-center px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50"
            >
              <TrashIcon className="h-4 w-4 mr-2" />
              {resetSettingsMutation.isPending ? 'Resetting...' : 'Reset to Defaults'}
            </button>
            
            <button
              onClick={handleSave}
              disabled={!hasUnsavedChanges || updateSettingsMutation.isPending}
              className="btn btn-primary flex items-center px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {updateSettingsMutation.isPending ? (
                <LoadingSpinner size="sm" className="mr-2" />
              ) : (
                <CheckIcon className="h-4 w-4 mr-2" />
              )}
              {updateSettingsMutation.isPending ? 'Saving...' : 'Save Changes'}
            </button>
          </motion.div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar Navigation */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Card>
            <nav className="space-y-2">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                      activeTab === tab.id
                        ? 'bg-kmrl-100 text-kmrl-700'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="h-5 w-5 mr-3" />
                    {tab.name}
                  </button>
                );
              })}
            </nav>
          </Card>
        </motion.div>

        {/* Settings Content */}
        <div className="lg:col-span-3">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card>
              {/* General Settings */}
              {activeTab === 'general' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-gray-900">General Settings</h3>
                    <div className="text-sm text-gray-500">
                      Current time: {new Date().toLocaleString()}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="form-label">System Name</label>
                      <input
                        type="text"
                        value={formData?.general?.systemName || ''}
                        onChange={(e) => handleInputChange('general', 'systemName', e.target.value)}
                        className="form-input"
                        placeholder="Enter system name"
                        disabled={!hasPermission('settings:update')}
                      />
                      <p className="text-xs text-gray-500 mt-1">Display name for the system</p>
                    </div>
                    
                    <div>
                      <label className="form-label">System Version</label>
                      <input
                        type="text"
                        value={formData?.general?.systemVersion || ''}
                        onChange={(e) => handleInputChange('general', 'systemVersion', e.target.value)}
                        className="form-input"
                        placeholder="2.1.0"
                        disabled={!hasPermission('settings:update')}
                      />
                      <p className="text-xs text-gray-500 mt-1">Current system version</p>
                    </div>
                    
                    <div>
                      <label className="form-label">Timezone</label>
                      <select
                        value={formData?.general?.timezone || ''}
                        onChange={(e) => handleInputChange('general', 'timezone', e.target.value)}
                        className="form-input"
                        disabled={!hasPermission('settings:update')}
                      >
                        {settingsService.getTimezones().map((tz) => (
                          <option key={tz.value} value={tz.value}>
                            {tz.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label className="form-label">Language</label>
                      <select
                        value={formData?.general?.language || ''}
                        onChange={(e) => handleInputChange('general', 'language', e.target.value)}
                        className="form-input"
                        disabled={!hasPermission('settings:update')}
                      >
                        {settingsService.getLanguages().map((lang) => (
                          <option key={lang.value} value={lang.value}>
                            {lang.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label className="form-label">Date Format</label>
                      <select
                        value={formData?.general?.dateFormat || ''}
                        onChange={(e) => handleInputChange('general', 'dateFormat', e.target.value)}
                        className="form-input"
                        disabled={!hasPermission('settings:update')}
                      >
                        {settingsService.getDateFormats().map((format) => (
                          <option key={format.value} value={format.value}>
                            {format.label} (e.g., {format.example})
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label className="form-label">Theme</label>
                      <select
                        value={formData?.general?.theme || 'light'}
                        onChange={(e) => handleInputChange('general', 'theme', e.target.value)}
                        className="form-input"
                        disabled={!hasPermission('settings:update')}
                      >
                        <option value="light">Light</option>
                        <option value="dark">Dark</option>
                        <option value="auto">Auto (System)</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="form-label">Log Level</label>
                      <select
                        value={formData?.general?.logLevel || 'info'}
                        onChange={(e) => handleInputChange('general', 'logLevel', e.target.value)}
                        className="form-input"
                        disabled={!hasPermission('settings:update')}
                      >
                        <option value="error">Error Only</option>
                        <option value="warn">Warning & Above</option>
                        <option value="info">Info & Above</option>
                        <option value="debug">Debug (All)</option>
                      </select>
                      <p className="text-xs text-gray-500 mt-1">System logging verbosity</p>
                    </div>
                    
                    <div>
                      <label className="form-label">Auto Backup Interval (hours)</label>
                      <input
                        type="number"
                        value={formData?.general?.backupInterval || 24}
                        onChange={(e) => handleInputChange('general', 'backupInterval', parseInt(e.target.value))}
                        className="form-input"
                        min="1"
                        max="168"
                        disabled={!hasPermission('settings:update')}
                      />
                      <p className="text-xs text-gray-500 mt-1">Automatic backup frequency</p>
                    </div>
                  </div>
                  
                  <div className="border-t pt-4 mt-6">
                    <h4 className="text-md font-medium text-gray-900 mb-3">System Toggles</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData?.general?.debugMode || false}
                          onChange={(e) => handleInputChange('general', 'debugMode', e.target.checked)}
                          className="form-checkbox"
                          disabled={!hasPermission('settings:update')}
                        />
                        <span className="ml-2 text-sm text-gray-900">Enable Debug Mode</span>
                      </label>
                      
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData?.general?.maintenanceMode || false}
                          onChange={(e) => handleInputChange('general', 'maintenanceMode', e.target.checked)}
                          className="form-checkbox"
                          disabled={!hasPermission('settings:update')}
                        />
                        <span className="ml-2 text-sm text-gray-900">Maintenance Mode</span>
                      </label>
                      
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData?.general?.autoBackup || false}
                          onChange={(e) => handleInputChange('general', 'autoBackup', e.target.checked)}
                          className="form-checkbox"
                          disabled={!hasPermission('settings:update')}
                        />
                        <span className="ml-2 text-sm text-gray-900">Enable Auto Backup</span>
                      </label>
                    </div>
                  </div>
                  
                  {/* Settings Preview */}
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="text-sm font-medium text-blue-900 mb-3">Settings Preview</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-blue-700 font-medium">System:</span>
                        <span className="ml-2 text-blue-600">{formData?.general?.systemName || 'Not set'}</span>
                      </div>
                      <div>
                        <span className="text-blue-700 font-medium">Timezone:</span>
                        <span className="ml-2 text-blue-600">{formData?.general?.timezone || 'Not set'}</span>
                      </div>
                      <div>
                        <span className="text-blue-700 font-medium">Language:</span>
                        <span className="ml-2 text-blue-600">
                          {settingsService.getLanguages().find(l => l.value === formData?.general?.language)?.label || 'Not set'}
                        </span>
                      </div>
                      <div>
                        <span className="text-blue-700 font-medium">Date Format:</span>
                        <span className="ml-2 text-blue-600">
                          {formData?.general?.dateFormat || 'Not set'} 
                          {formData?.general?.dateFormat && (
                            <span className="text-blue-500">
                              ({settingsService.formatDate(new Date())})
                            </span>
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Optimization Settings */}
              {activeTab === 'optimization' && (
                <div className="space-y-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Optimization Settings</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="form-label">Optimization Strategy</label>
                      <select
                        value={formData?.optimization?.optimizationStrategy || 'balanced'}
                        onChange={(e) => handleInputChange('optimization', 'optimizationStrategy', e.target.value)}
                        className="form-input"
                        disabled={!hasPermission('settings:update')}
                      >
                        <option value="balanced">Balanced</option>
                        <option value="performance">Performance-Focused</option>
                        <option value="efficiency">Efficiency-Focused</option>
                      </select>
                      <p className="text-xs text-gray-500 mt-1">Primary optimization approach</p>
                    </div>
                    
                    <div>
                      <label className="form-label">Max Concurrent Jobs</label>
                      <input
                        type="number"
                        value={formData?.optimization?.maxConcurrentJobs || 4}
                        onChange={(e) => handleInputChange('optimization', 'maxConcurrentJobs', parseInt(e.target.value))}
                        className="form-input"
                        min="1"
                        max="16"
                        disabled={!hasPermission('settings:update')}
                      />
                      <p className="text-xs text-gray-500 mt-1">Parallel processing limit</p>
                    </div>
                    
                    <div>
                      <label className="form-label">Default Max Iterations</label>
                      <input
                        type="number"
                        value={formData?.optimization?.defaultMaxIterations || 1000}
                        onChange={(e) => handleInputChange('optimization', 'defaultMaxIterations', parseInt(e.target.value))}
                        className="form-input"
                        min="100"
                        max="10000"
                        disabled={!hasPermission('settings:update')}
                      />
                      <p className="text-xs text-gray-500 mt-1">Algorithm iteration limit</p>
                    </div>
                    
                    <div>
                      <label className="form-label">Default Time Limit (seconds)</label>
                      <input
                        type="number"
                        value={formData?.optimization?.defaultTimeLimit || 300}
                        onChange={(e) => handleInputChange('optimization', 'defaultTimeLimit', parseInt(e.target.value))}
                        className="form-input"
                        min="60"
                        max="3600"
                        disabled={!hasPermission('settings:update')}
                      />
                      <p className="text-xs text-gray-500 mt-1">Maximum runtime per job</p>
                    </div>
                    
                    <div>
                      <label className="form-label">Fitness Threshold</label>
                      <input
                        type="number"
                        step="0.1"
                        value={formData?.optimization?.fitnessThreshold || 5.0}
                        onChange={(e) => handleInputChange('optimization', 'fitnessThreshold', parseFloat(e.target.value))}
                        className="form-input"
                        min="1"
                        max="10"
                        disabled={!hasPermission('settings:update')}
                      />
                      <p className="text-xs text-gray-500 mt-1">Acceptable fitness score</p>
                    </div>
                    
                    <div>
                      <label className="form-label">Alert Threshold</label>
                      <input
                        type="number"
                        step="0.1"
                        value={formData?.optimization?.alertThreshold || 7.5}
                        onChange={(e) => handleInputChange('optimization', 'alertThreshold', parseFloat(e.target.value))}
                        className="form-input"
                        min="5"
                        max="15"
                        disabled={!hasPermission('settings:update')}
                      />
                      <p className="text-xs text-gray-500 mt-1">Trigger alerts above this score</p>
                    </div>
                    
                    <div>
                      <label className="form-label">Resource Allocation (%)</label>
                      <input
                        type="number"
                        value={formData?.optimization?.resourceAllocation || 80}
                        onChange={(e) => handleInputChange('optimization', 'resourceAllocation', parseInt(e.target.value))}
                        className="form-input"
                        min="10"
                        max="100"
                        disabled={!hasPermission('settings:update')}
                      />
                      <p className="text-xs text-gray-500 mt-1">System resource usage limit</p>
                    </div>
                    
                    <div>
                      <label className="form-label">Auto-Optimization Interval (hours)</label>
                      <input
                        type="number"
                        value={formData?.optimization?.optimizationInterval || 24}
                        onChange={(e) => handleInputChange('optimization', 'optimizationInterval', parseInt(e.target.value))}
                        className="form-input"
                        min="1"
                        max="168"
                        disabled={!hasPermission('settings:update')}
                      />
                      <p className="text-xs text-gray-500 mt-1">Automatic optimization frequency</p>
                    </div>
                  </div>
                  
                  <div className="border-t pt-4 mt-6">
                    <h4 className="text-md font-medium text-gray-900 mb-3">Optimization Features</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData?.optimization?.autoOptimization || false}
                          onChange={(e) => handleInputChange('optimization', 'autoOptimization', e.target.checked)}
                          className="form-checkbox"
                          disabled={!hasPermission('settings:update')}
                        />
                        <span className="ml-2 text-sm text-gray-900">Enable Auto-Optimization</span>
                      </label>
                      
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData?.optimization?.parallelProcessing || false}
                          onChange={(e) => handleInputChange('optimization', 'parallelProcessing', e.target.checked)}
                          className="form-checkbox"
                          disabled={!hasPermission('settings:update')}
                        />
                        <span className="ml-2 text-sm text-gray-900">Parallel Processing</span>
                      </label>
                      
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData?.optimization?.enablePredictiveAnalysis || false}
                          onChange={(e) => handleInputChange('optimization', 'enablePredictiveAnalysis', e.target.checked)}
                          className="form-checkbox"
                          disabled={!hasPermission('settings:update')}
                        />
                        <span className="ml-2 text-sm text-gray-900">Predictive Analysis</span>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* Notification Settings */}
              {activeTab === 'notifications' && (
                <div className="space-y-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Notification Settings</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="text-md font-medium text-gray-900 mb-3">Notification Channels</h4>
                      <div className="space-y-3">
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={formData?.notifications?.emailNotifications || false}
                            onChange={(e) => handleInputChange('notifications', 'emailNotifications', e.target.checked)}
                            className="form-checkbox"
                            disabled={!hasPermission('settings:update')}
                          />
                          <span className="ml-2 text-sm text-gray-900">Email Notifications</span>
                        </label>
                        
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={formData?.notifications?.pushNotifications || false}
                            onChange={(e) => handleInputChange('notifications', 'pushNotifications', e.target.checked)}
                            className="form-checkbox"
                            disabled={!hasPermission('settings:update')}
                          />
                          <span className="ml-2 text-sm text-gray-900">Browser Push Notifications</span>
                        </label>
                        
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={formData?.notifications?.smsNotifications || false}
                            onChange={(e) => handleInputChange('notifications', 'smsNotifications', e.target.checked)}
                            className="form-checkbox"
                            disabled={!hasPermission('settings:update')}
                          />
                          <span className="ml-2 text-sm text-gray-900">SMS Notifications</span>
                        </label>
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="text-md font-medium text-gray-900 mb-3">Notification Schedule</h4>
                      <div className="space-y-3">
                        <div>
                          <label className="form-label">Digest Frequency</label>
                          <select
                            value={formData?.notifications?.digestFrequency || 'weekly'}
                            onChange={(e) => handleInputChange('notifications', 'digestFrequency', e.target.value)}
                            className="form-input"
                            disabled={!hasPermission('settings:update')}
                          >
                            <option value="daily">Daily Summary</option>
                            <option value="weekly">Weekly Summary</option>
                            <option value="monthly">Monthly Summary</option>
                          </select>
                        </div>
                        
                        <div>
                          <label className="form-label">Quiet Hours Start</label>
                          <input
                            type="time"
                            value={formData?.notifications?.quietHoursStart || '22:00'}
                            onChange={(e) => handleInputChange('notifications', 'quietHoursStart', e.target.value)}
                            className="form-input"
                            disabled={!hasPermission('settings:update')}
                          />
                        </div>
                        
                        <div>
                          <label className="form-label">Quiet Hours End</label>
                          <input
                            type="time"
                            value={formData?.notifications?.quietHoursEnd || '06:00'}
                            onChange={(e) => handleInputChange('notifications', 'quietHoursEnd', e.target.value)}
                            className="form-input"
                            disabled={!hasPermission('settings:update')}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="border-t pt-4 mt-6">
                    <h4 className="text-md font-medium text-gray-900 mb-3">Alert Types</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData?.notifications?.emergencyAlerts || false}
                          onChange={(e) => handleInputChange('notifications', 'emergencyAlerts', e.target.checked)}
                          className="form-checkbox"
                          disabled={!hasPermission('settings:update')}
                        />
                        <span className="ml-2 text-sm text-gray-900">Emergency Alerts</span>
                      </label>
                      
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData?.notifications?.maintenanceAlerts || false}
                          onChange={(e) => handleInputChange('notifications', 'maintenanceAlerts', e.target.checked)}
                          className="form-checkbox"
                          disabled={!hasPermission('settings:update')}
                        />
                        <span className="ml-2 text-sm text-gray-900">Maintenance Alerts</span>
                      </label>
                      
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData?.notifications?.optimizationComplete || false}
                          onChange={(e) => handleInputChange('notifications', 'optimizationComplete', e.target.checked)}
                          className="form-checkbox"
                          disabled={!hasPermission('settings:update')}
                        />
                        <span className="ml-2 text-sm text-gray-900">Optimization Complete</span>
                      </label>
                      
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData?.notifications?.lowFitnessAlerts || false}
                          onChange={(e) => handleInputChange('notifications', 'lowFitnessAlerts', e.target.checked)}
                          className="form-checkbox"
                          disabled={!hasPermission('settings:update')}
                        />
                        <span className="ml-2 text-sm text-gray-900">Low Fitness Score Alerts</span>
                      </label>
                      
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData?.notifications?.systemUpdates || false}
                          onChange={(e) => handleInputChange('notifications', 'systemUpdates', e.target.checked)}
                          className="form-checkbox"
                          disabled={!hasPermission('settings:update')}
                        />
                        <span className="ml-2 text-sm text-gray-900">System Updates</span>
                      </label>
                      
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData?.notifications?.scheduleReminders || false}
                          onChange={(e) => handleInputChange('notifications', 'scheduleReminders', e.target.checked)}
                          className="form-checkbox"
                          disabled={!hasPermission('settings:update')}
                        />
                        <span className="ml-2 text-sm text-gray-900">Schedule Reminders</span>
                      </label>
                      
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData?.notifications?.performanceReports || false}
                          onChange={(e) => handleInputChange('notifications', 'performanceReports', e.target.checked)}
                          className="form-checkbox"
                          disabled={!hasPermission('settings:update')}
                        />
                        <span className="ml-2 text-sm text-gray-900">Performance Reports</span>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* Security Settings */}
              {activeTab === 'security' && (
                <div className="space-y-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Security Settings</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="form-label">Session Timeout (minutes)</label>
                      <input
                        type="number"
                        value={formData.security?.sessionTimeout || 0}
                        onChange={(e) => handleInputChange('security', 'sessionTimeout', parseInt(e.target.value))}
                        className="form-input"
                        min="5"
                        max="480"
                        disabled={!hasPermission('settings:update')}
                      />
                    </div>
                    
                    <div>
                      <label className="form-label">Max Login Attempts</label>
                      <input
                        type="number"
                        value={formData?.security?.maxLoginAttempts || 0}
                        onChange={(e) => handleInputChange('security', 'maxLoginAttempts', parseInt(e.target.value))}
                        className="form-input"
                        min="1"
                        max="10"
                        disabled={!hasPermission('settings:update')}
                      />
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="text-sm font-medium text-gray-900 mb-3">Password Policy</h4>
                    <div className="space-y-2">
                      <div>
                        <label className="form-label">Minimum Length</label>
                        <input
                          type="number"
                          value={formData.security?.passwordPolicy?.minLength || 0}
                          onChange={(e) => handleNestedInputChange('security', 'passwordPolicy', 'minLength', parseInt(e.target.value))}
                          className="form-input"
                          min="6"
                          max="50"
                          disabled={!hasPermission('settings:update')}
                        />
                      </div>
                      
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.security?.passwordPolicy?.requireUppercase || false}
                          onChange={(e) => handleNestedInputChange('security', 'passwordPolicy', 'requireUppercase', e.target.checked)}
                          className="form-checkbox"
                          disabled={!hasPermission('settings:update')}
                        />
                        <span className="ml-2 text-sm text-gray-900">Require uppercase letters</span>
                      </label>
                      
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.security?.passwordPolicy?.requireNumbers || false}
                          onChange={(e) => handleNestedInputChange('security', 'passwordPolicy', 'requireNumbers', e.target.checked)}
                          className="form-checkbox"
                          disabled={!hasPermission('settings:update')}
                        />
                        <span className="ml-2 text-sm text-gray-900">Require numbers</span>
                      </label>
                      
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.security?.passwordPolicy?.requireSpecialChars || false}
                          onChange={(e) => handleNestedInputChange('security', 'passwordPolicy', 'requireSpecialChars', e.target.checked)}
                          className="form-checkbox"
                          disabled={!hasPermission('settings:update')}
                        />
                        <span className="ml-2 text-sm text-gray-900">Require special characters</span>
                      </label>
                    </div>
                  </div>
                  
                  <div>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.security?.twoFactorAuth || false}
                        onChange={(e) => handleInputChange('security', 'twoFactorAuth', e.target.checked)}
                        className="form-checkbox"
                        disabled={!hasPermission('settings:update')}
                      />
                      <span className="ml-2 text-sm text-gray-900">Enable Two-Factor Authentication</span>
                    </label>
                  </div>
                </div>
              )}

              {/* API Settings */}
              {activeTab === 'api' && (
                <div className="space-y-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">API & Integration Settings</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="form-label">Rate Limit (requests/minute)</label>
                      <input
                        type="number"
                        value={formData.api?.rateLimit || 0}
                        onChange={(e) => handleInputChange('api', 'rateLimit', parseInt(e.target.value))}
                        className="form-input"
                        min="10"
                        max="1000"
                        disabled={!hasPermission('settings:update')}
                      />
                    </div>
                    
                    <div>
                      <label className="form-label">Request Timeout (seconds)</label>
                      <input
                        type="number"
                        value={formData.api?.timeout || 0}
                        onChange={(e) => handleInputChange('api', 'timeout', parseInt(e.target.value))}
                        className="form-input"
                        min="5"
                        max="300"
                        disabled={!hasPermission('settings:update')}
                      />
                    </div>
                    
                    <div>
                      <label className="form-label">Retry Attempts</label>
                      <input
                        type="number"
                        value={formData.api?.retryAttempts || 0}
                        onChange={(e) => handleInputChange('api', 'retryAttempts', parseInt(e.target.value))}
                        className="form-input"
                        min="0"
                        max="10"
                        disabled={!hasPermission('settings:update')}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.api?.enableLogging || false}
                        onChange={(e) => handleInputChange('api', 'enableLogging', e.target.checked)}
                        className="form-checkbox"
                        disabled={!hasPermission('settings:update')}
                      />
                      <span className="ml-2 text-sm text-gray-900">Enable API request logging</span>
                    </label>
                  </div>
                </div>
              )}
            </Card>
          </motion.div>
        </div>
      </div>

      {/* Unsaved Changes Warning */}
      {hasUnsavedChanges && (
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed bottom-4 right-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4 shadow-lg"
        >
          <div className="flex items-center space-x-2">
            <XMarkIcon className="h-5 w-5 text-yellow-600" />
            <span className="text-sm text-yellow-800">You have unsaved changes</span>
            <button
              onClick={handleSave}
              className="inline-flex items-center px-3 py-1.5 text-xs bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 transition-all duration-200 ml-2"
            >
              Save Now
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default SettingsPage;
