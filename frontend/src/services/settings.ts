import { api } from './api';

export interface SystemSettings {
  general: {
    systemName: string;
    timezone: string;
    language: string;
    dateFormat: string;
    theme: 'light' | 'dark' | 'auto';
    debugMode: boolean;
    systemVersion: string;
    maintenanceMode: boolean;
    autoBackup: boolean;
    backupInterval: number; // hours
    logLevel: 'error' | 'warn' | 'info' | 'debug';
  };
  optimization: {
    defaultMaxIterations: number;
    defaultTimeLimit: number;
    fitnessThreshold: number;
    autoOptimization: boolean;
    optimizationInterval: number; // hours
    optimizationStrategy: 'balanced' | 'performance' | 'efficiency';
    parallelProcessing: boolean;
    maxConcurrentJobs: number;
    resourceAllocation: number; // percentage
    enablePredictiveAnalysis: boolean;
    alertThreshold: number;
  };
  notifications: {
    emailNotifications: boolean;
    pushNotifications: boolean;
    smsNotifications: boolean;
    maintenanceAlerts: boolean;
    optimizationComplete: boolean;
    lowFitnessAlerts: boolean;
    systemUpdates: boolean;
    emergencyAlerts: boolean;
    scheduleReminders: boolean;
    performanceReports: boolean;
    digestFrequency: 'daily' | 'weekly' | 'monthly';
    quietHoursStart: string;
    quietHoursEnd: string;
  };
  security: {
    sessionTimeout: number; // minutes
    maxLoginAttempts: number;
    lockoutDuration: number; // minutes
    passwordPolicy: {
      minLength: number;
      requireUppercase: boolean;
      requireNumbers: boolean;
      requireSpecialChars: boolean;
      passwordExpiry: number; // days
      preventReuse: number; // last N passwords
    };
    twoFactorAuth: boolean;
    ipWhitelist: string[];
    auditLogging: boolean;
    encryptionLevel: 'standard' | 'enhanced';
    autoLogout: boolean;
  };
  api: {
    rateLimit: number; // requests per minute
    timeout: number; // seconds
    retryAttempts: number;
    enableLogging: boolean;
    enableCaching: boolean;
    cacheExpiry: number; // minutes
    corsEnabled: boolean;
    allowedOrigins: string[];
    webhookEndpoints: string[];
    apiVersioning: boolean;
    compressionEnabled: boolean;
  };
}

// Default settings configuration
export const DEFAULT_SETTINGS: SystemSettings = {
  general: {
    systemName: 'KMRL Train Induction System',
    timezone: 'Asia/Kolkata',
    language: 'en',
    dateFormat: 'DD/MM/YYYY',
    theme: 'light',
    debugMode: false,
    systemVersion: '2.1.0',
    maintenanceMode: false,
    autoBackup: true,
    backupInterval: 24,
    logLevel: 'info',
  },
  optimization: {
    defaultMaxIterations: 1000,
    defaultTimeLimit: 300,
    fitnessThreshold: 5.0,
    autoOptimization: false,
    optimizationInterval: 24,
    optimizationStrategy: 'balanced',
    parallelProcessing: true,
    maxConcurrentJobs: 4,
    resourceAllocation: 80,
    enablePredictiveAnalysis: true,
    alertThreshold: 7.5,
  },
  notifications: {
    emailNotifications: true,
    pushNotifications: true,
    smsNotifications: false,
    maintenanceAlerts: true,
    optimizationComplete: true,
    lowFitnessAlerts: true,
    systemUpdates: true,
    emergencyAlerts: true,
    scheduleReminders: true,
    performanceReports: true,
    digestFrequency: 'weekly',
    quietHoursStart: '22:00',
    quietHoursEnd: '06:00',
  },
  security: {
    sessionTimeout: 60,
    maxLoginAttempts: 5,
    lockoutDuration: 15,
    passwordPolicy: {
      minLength: 8,
      requireUppercase: true,
      requireNumbers: true,
      requireSpecialChars: true,
      passwordExpiry: 90,
      preventReuse: 5,
    },
    twoFactorAuth: false,
    ipWhitelist: [],
    auditLogging: true,
    encryptionLevel: 'standard',
    autoLogout: true,
  },
  api: {
    rateLimit: 100,
    timeout: 30,
    retryAttempts: 3,
    enableLogging: true,
    enableCaching: true,
    cacheExpiry: 15,
    corsEnabled: true,
    allowedOrigins: ['https://kmrl.kerala.gov.in'],
    webhookEndpoints: [],
    apiVersioning: true,
    compressionEnabled: true,
  },
};

// Settings validation rules
const VALIDATION_RULES = {
  general: {
    systemName: { min: 1, max: 100, required: true },
    timezone: { required: true },
    language: { required: true },
    dateFormat: { required: true },
    currency: { required: true },
  },
  optimization: {
    defaultMaxIterations: { min: 100, max: 10000, required: true },
    defaultTimeLimit: { min: 60, max: 3600, required: true },
    optimizationInterval: { min: 1, max: 168, required: true },
    fitnessThreshold: { min: 1, max: 10, required: true },
  },
  security: {
    sessionTimeout: { min: 5, max: 480, required: true },
    loginAttempts: { min: 1, max: 10, required: true },
    passwordPolicy: {
      minLength: { min: 6, max: 50, required: true },
    },
  },
  api: {
    rateLimit: { min: 10, max: 1000, required: true },
    timeout: { min: 5, max: 300, required: true },
    retryAttempts: { min: 0, max: 10, required: true },
  },
};

class SettingsService {
  private readonly STORAGE_KEY = 'kmrl_system_settings';
  private readonly STORAGE_VERSION_KEY = 'kmrl_settings_version';
  private readonly CURRENT_VERSION = '1.0';

  // Get settings from localStorage or API
  async getSettings(): Promise<SystemSettings> {
    try {
      // Try to fetch from API first
      const response = await api.get('/api/settings');
      if (response.success && response.data) {
        const settings = this.migrateSettings(response.data);
        this.saveToStorage(settings);
        return settings;
      }
    } catch (error) {
      console.warn('Failed to fetch settings from API, using local storage:', error);
    }

    // Fallback to localStorage
    return this.getFromStorage();
  }

  // Save settings to both API and localStorage
  async saveSettings(settings: SystemSettings): Promise<SystemSettings> {
    // Validate settings before saving
    const validationResult = this.validateSettings(settings);
    if (!validationResult.isValid) {
      throw new Error(`Invalid settings: ${validationResult.errors.join(', ')}`);
    }

    try {
      // Try to save to API first
      const response = await api.post('/api/settings', settings);
      if (response.success) {
        this.saveToStorage(settings);
        this.applySettings(settings);
        return settings;
      }
    } catch (error) {
      console.warn('Failed to save settings to API, saving locally:', error);
    }

    // Fallback to localStorage only
    this.saveToStorage(settings);
    this.applySettings(settings);
    return settings;
  }

  // Reset settings to defaults
  async resetSettings(): Promise<SystemSettings> {
    try {
      // Try to reset on API
      const response = await api.post('/api/settings/reset');
      if (response.success) {
        this.saveToStorage(DEFAULT_SETTINGS);
        this.applySettings(DEFAULT_SETTINGS);
        return DEFAULT_SETTINGS;
      }
    } catch (error) {
      console.warn('Failed to reset settings on API, resetting locally:', error);
    }

    // Fallback to local reset
    this.saveToStorage(DEFAULT_SETTINGS);
    this.applySettings(DEFAULT_SETTINGS);
    return DEFAULT_SETTINGS;
  }

  // Get settings from localStorage
  private getFromStorage(): SystemSettings {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const settings = JSON.parse(stored);
        return this.migrateSettings(settings);
      }
    } catch (error) {
      console.error('Error loading settings from storage:', error);
    }

    // Return defaults if no stored settings or error
    this.saveToStorage(DEFAULT_SETTINGS);
    return DEFAULT_SETTINGS;
  }

  // Save settings to localStorage
  private saveToStorage(settings: SystemSettings): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(settings));
      localStorage.setItem(this.STORAGE_VERSION_KEY, this.CURRENT_VERSION);
    } catch (error) {
      console.error('Error saving settings to storage:', error);
    }
  }

  // Migrate settings from older versions
  private migrateSettings(settings: any): SystemSettings {
    // Check if migration is needed
    const version = localStorage.getItem(this.STORAGE_VERSION_KEY);
    if (version === this.CURRENT_VERSION) {
      return { ...DEFAULT_SETTINGS, ...settings };
    }

    console.log('Migrating settings to version', this.CURRENT_VERSION);
    
    // Perform migration by merging with defaults
    const migrated = this.deepMerge(DEFAULT_SETTINGS, settings);
    
    // Save migrated settings
    this.saveToStorage(migrated);
    
    return migrated;
  }

  // Deep merge settings objects
  private deepMerge(target: any, source: any): any {
    const result = { ...target };
    
    for (const key in source) {
      if (source.hasOwnProperty(key)) {
        if (typeof source[key] === 'object' && source[key] !== null && !Array.isArray(source[key])) {
          result[key] = this.deepMerge(target[key] || {}, source[key]);
        } else {
          result[key] = source[key];
        }
      }
    }
    
    return result;
  }

  // Validate settings
  validateSettings(settings: SystemSettings): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate general settings
    if (!settings.general.systemName || settings.general.systemName.length < 1) {
      errors.push('System name is required');
    }
    if (settings.general.systemName && settings.general.systemName.length > 100) {
      errors.push('System name must be less than 100 characters');
    }

    // Validate optimization settings
    if (settings.optimization.defaultMaxIterations < 100 || settings.optimization.defaultMaxIterations > 10000) {
      errors.push('Max iterations must be between 100 and 10000');
    }
    if (settings.optimization.defaultTimeLimit < 60 || settings.optimization.defaultTimeLimit > 3600) {
      errors.push('Time limit must be between 60 and 3600 seconds');
    }
    if (settings.optimization.fitnessThreshold < 1 || settings.optimization.fitnessThreshold > 10) {
      errors.push('Fitness threshold must be between 1 and 10');
    }
    if (settings.optimization.optimizationInterval < 1 || settings.optimization.optimizationInterval > 168) {
      errors.push('Optimization interval must be between 1 and 168 hours');
    }

    // Validate security settings
    if (settings.security.sessionTimeout < 5 || settings.security.sessionTimeout > 480) {
      errors.push('Session timeout must be between 5 and 480 minutes');
    }
    if (settings.security.maxLoginAttempts < 1 || settings.security.maxLoginAttempts > 10) {
      errors.push('Max login attempts must be between 1 and 10');
    }
    if (settings.security.passwordPolicy.minLength < 6 || settings.security.passwordPolicy.minLength > 50) {
      errors.push('Password minimum length must be between 6 and 50 characters');
    }

    // Validate API settings
    if (settings.api.rateLimit < 10 || settings.api.rateLimit > 1000) {
      errors.push('Rate limit must be between 10 and 1000 requests per minute');
    }
    if (settings.api.timeout < 5 || settings.api.timeout > 300) {
      errors.push('API timeout must be between 5 and 300 seconds');
    }
    if (settings.api.retryAttempts < 0 || settings.api.retryAttempts > 10) {
      errors.push('Retry attempts must be between 0 and 10');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  // Apply settings to the application
  private applySettings(settings: SystemSettings): void {
    try {
      // Apply timezone
      if (settings.general.timezone) {
        // Note: In a real app, you might want to use a library like date-fns-tz
        console.log('Applied timezone:', settings.general.timezone);
      }

      // Apply language
      if (settings.general.language) {
        document.documentElement.lang = settings.general.language;
        console.log('Applied language:', settings.general.language);
      }

      // Apply theme/styling based on settings
      document.documentElement.setAttribute('data-date-format', settings.general.dateFormat);
      
      // Store settings globally for other components to access
      (window as any).__KMRL_SETTINGS__ = settings;
      
      // Dispatch custom event for other components to listen to
      window.dispatchEvent(new CustomEvent('settings-updated', { detail: settings }));
      
      console.log('Settings applied successfully');
    } catch (error) {
      console.error('Error applying settings:', error);
    }
  }

  // Get current applied settings (for other components to use)
  getCurrentSettings(): SystemSettings {
    return (window as any).__KMRL_SETTINGS__ || this.getFromStorage();
  }

  // Format date according to current settings
  formatDate(date: Date): string {
    const settings = this.getCurrentSettings();
    const format = settings.general.dateFormat;
    
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear().toString();
    
    switch (format) {
      case 'MM/DD/YYYY':
        return `${month}/${day}/${year}`;
      case 'YYYY-MM-DD':
        return `${year}-${month}-${day}`;
      case 'DD/MM/YYYY':
      default:
        return `${day}/${month}/${year}`;
    }
  }

  // Get timezone list for dropdown
  getTimezones(): Array<{ value: string; label: string }> {
    return [
      { value: 'Asia/Kolkata', label: 'Asia/Kolkata (IST)' },
      { value: 'UTC', label: 'UTC' },
      { value: 'America/New_York', label: 'America/New_York (EST)' },
      { value: 'America/Chicago', label: 'America/Chicago (CST)' },
      { value: 'America/Denver', label: 'America/Denver (MST)' },
      { value: 'America/Los_Angeles', label: 'America/Los_Angeles (PST)' },
      { value: 'Europe/London', label: 'Europe/London (GMT)' },
      { value: 'Europe/Paris', label: 'Europe/Paris (CET)' },
      { value: 'Asia/Tokyo', label: 'Asia/Tokyo (JST)' },
      { value: 'Asia/Shanghai', label: 'Asia/Shanghai (CST)' },
    ];
  }

  // Get language list for dropdown
  getLanguages(): Array<{ value: string; label: string }> {
    return [
      { value: 'en', label: 'English' },
      { value: 'hi', label: 'हिंदी (Hindi)' },
      { value: 'ml', label: 'മലയാളം (Malayalam)' },
      { value: 'ta', label: 'தமிழ் (Tamil)' },
      { value: 'kn', label: 'ಕನ್ನಡ (Kannada)' },
    ];
  }

  // Get date format options
  getDateFormats(): Array<{ value: string; label: string; example: string }> {
    const now = new Date();
    return [
      { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY', example: this.formatDateExample(now, 'DD/MM/YYYY') },
      { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY', example: this.formatDateExample(now, 'MM/DD/YYYY') },
      { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD', example: this.formatDateExample(now, 'YYYY-MM-DD') },
    ];
  }

  private formatDateExample(date: Date, format: string): string {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear().toString();
    
    switch (format) {
      case 'MM/DD/YYYY':
        return `${month}/${day}/${year}`;
      case 'YYYY-MM-DD':
        return `${year}-${month}-${day}`;
      case 'DD/MM/YYYY':
      default:
        return `${day}/${month}/${year}`;
    }
  }
}

export const settingsService = new SettingsService();
export default settingsService;