/**
 * Comprehensive Dashboard Management Routes
 * 
 * Full-featured REST API for KMRL dashboard management including:
 * - Dashboard creation, customization, and management
 * - Widget management and configuration
 * - Data aggregation from all systems
 * - Real-time dashboard updates
 * - Multi-role dashboard access control
 * - Analytics and performance monitoring
 */

import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { Server } from 'socket.io';
import {
  dashboardEngine,
  createSampleDashboardData,
  DASHBOARD_CONFIG,
  Dashboard,
  DashboardWidget,
  DashboardMetrics
} from '../utils/dashboardEngine';

const router = Router();
const prisma = new PrismaClient();

// WebSocket instance (will be set by the server)
let io: Server;

export const setSocketIO = (socketIO: Server) => {
  io = socketIO;
};

// Emit dashboard updates to connected clients
const emitDashboardUpdate = (data: any, event: string = 'dashboard:updated') => {
  if (io) {
    io.to('dashboards').emit(event, {
      ...data,
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * GET /api/dashboards - Get all dashboards
 */
router.get('/', async (req, res) => {
  try {
    const { 
      userId, 
      role, 
      tags, 
      search,
      page = '1',
      limit = '20',
      sortBy = 'updatedAt',
      sortOrder = 'desc'
    } = req.query;

    console.log('📊 Fetching dashboards...');
    
    let dashboards = dashboardEngine.getDashboards(
      userId as string, 
      role as string
    );

    // Apply search filter
    if (search) {
      const searchTerm = String(search).toLowerCase();
      dashboards = dashboards.filter(d => 
        d.name.toLowerCase().includes(searchTerm) ||
        d.description?.toLowerCase().includes(searchTerm) ||
        d.tags.some(tag => tag.toLowerCase().includes(searchTerm))
      );
    }

    // Apply tag filter
    if (tags) {
      const tagArray = String(tags).split(',');
      dashboards = dashboards.filter(d =>
        tagArray.some(tag => d.tags.includes(tag))
      );
    }

    // Apply sorting
    dashboards.sort((a, b) => {
      let aValue: any, bValue: any;
      
      if (sortBy === 'name') {
        aValue = a.name;
        bValue = b.name;
      } else if (sortBy === 'updatedAt' || sortBy === 'createdAt') {
        aValue = a[sortBy as keyof Dashboard];
        bValue = b[sortBy as keyof Dashboard];
      } else {
        aValue = a.updatedAt;
        bValue = b.updatedAt;
      }
      
      if (typeof aValue === 'string') {
        return sortOrder === 'desc' 
          ? bValue.localeCompare(aValue)
          : aValue.localeCompare(bValue);
      } else {
        return sortOrder === 'desc'
          ? new Date(bValue).getTime() - new Date(aValue).getTime()
          : new Date(aValue).getTime() - new Date(bValue).getTime();
      }
    });

    // Apply pagination
    const pageNum = Math.max(1, parseInt(page as string));
    const pageSize = Math.min(100, Math.max(1, parseInt(limit as string)));
    const skip = (pageNum - 1) * pageSize;
    const paginatedDashboards = dashboards.slice(skip, skip + pageSize);

    return res.json({
      success: true,
      message: 'Dashboards retrieved successfully',
      data: {
        dashboards: paginatedDashboards,
        summary: {
          total: dashboards.length,
          public: dashboards.filter(d => d.isPublic).length,
          private: dashboards.filter(d => !d.isPublic).length,
          default: dashboards.filter(d => d.isDefault).length
        },
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(dashboards.length / pageSize) || 1,
          totalItems: dashboards.length,
          itemsPerPage: pageSize,
          hasNextPage: pageNum * pageSize < dashboards.length,
          hasPreviousPage: pageNum > 1
        }
      }
    });
  } catch (error) {
    console.error('Error fetching dashboards:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboards',
      error: { code: 'DASHBOARD_FETCH_ERROR', message: String(error) }
    });
  }
});

/**
 * GET /api/dashboards/:id - Get specific dashboard with widgets and data
 */
router.get('/:id', async (req, res) => {
  try {
    const dashboard = dashboardEngine.getDashboardById(req.params.id);
    
    if (!dashboard) {
      return res.status(404).json({
        success: false,
        message: 'Dashboard not found'
      });
    }

    // Get widget data for all widgets
    const widgetsWithData = await Promise.all(
      dashboard.widgets.map(async (widget) => {
        try {
          const data = await dashboardEngine.getWidgetData(widget);
          return {
            ...widget,
            data
          };
        } catch (error) {
          console.warn(`Failed to get data for widget ${widget.id}:`, error);
          return {
            ...widget,
            data: null,
            error: 'Data unavailable'
          };
        }
      })
    );

    return res.json({
      success: true,
      message: 'Dashboard retrieved successfully',
      data: {
        ...dashboard,
        widgets: widgetsWithData
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard',
      error: { code: 'DASHBOARD_DETAIL_ERROR', message: String(error) }
    });
  }
});

/**
 * POST /api/dashboards - Create new dashboard
 */
router.post('/', async (req, res) => {
  try {
    const { name, description, userId, role, theme, layout, isPublic, tags } = req.body;
    
    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Dashboard name is required'
      });
    }

    console.log('📊 Creating new dashboard:', name);
    
    const dashboardData = {
      name,
      description,
      userId: userId || 'unknown',
      role: role || 'VIEWER',
      theme: theme || 'LIGHT',
      layout: layout || {
        columns: 4,
        rows: 3,
        gap: 16,
        padding: 20,
        responsive: true
      },
      isPublic: Boolean(isPublic),
      tags: Array.isArray(tags) ? tags : []
    };

    const newDashboard = await dashboardEngine.createDashboard(dashboardData);
    
    // Emit dashboard creation event
    emitDashboardUpdate({ 
      dashboard: {
        id: newDashboard.id,
        name: newDashboard.name,
        userId: newDashboard.userId
      },
      action: 'created'
    }, 'dashboard:created');

    return res.status(201).json({
      success: true,
      message: 'Dashboard created successfully',
      data: newDashboard
    });
  } catch (error) {
    console.error('Error creating dashboard:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create dashboard',
      error: { code: 'DASHBOARD_CREATE_ERROR', message: String(error) }
    });
  }
});

/**
 * PUT /api/dashboards/:id - Update dashboard
 */
router.put('/:id', async (req, res) => {
  try {
    const { name, description, theme, layout, isPublic, tags } = req.body;
    
    const updates = {
      ...(name && { name }),
      ...(description !== undefined && { description }),
      ...(theme && { theme }),
      ...(layout && { layout }),
      ...(isPublic !== undefined && { isPublic: Boolean(isPublic) }),
      ...(tags && { tags: Array.isArray(tags) ? tags : [] })
    };

    const updatedDashboard = dashboardEngine.updateDashboard(req.params.id, updates);
    
    if (!updatedDashboard) {
      return res.status(404).json({
        success: false,
        message: 'Dashboard not found'
      });
    }

    // Emit dashboard update event
    emitDashboardUpdate({ 
      dashboard: {
        id: updatedDashboard.id,
        name: updatedDashboard.name
      },
      updates,
      action: 'updated'
    }, 'dashboard:updated');

    return res.json({
      success: true,
      message: 'Dashboard updated successfully',
      data: updatedDashboard
    });
  } catch (error) {
    console.error('Error updating dashboard:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update dashboard',
      error: { code: 'DASHBOARD_UPDATE_ERROR', message: String(error) }
    });
  }
});

/**
 * DELETE /api/dashboards/:id - Delete dashboard
 */
router.delete('/:id', async (req, res) => {
  try {
    const success = dashboardEngine.deleteDashboard(req.params.id);
    
    if (!success) {
      return res.status(404).json({
        success: false,
        message: 'Dashboard not found'
      });
    }

    // Emit dashboard deletion event
    emitDashboardUpdate({ 
      dashboardId: req.params.id,
      action: 'deleted'
    }, 'dashboard:deleted');

    return res.json({
      success: true,
      message: 'Dashboard deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting dashboard:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete dashboard',
      error: { code: 'DASHBOARD_DELETE_ERROR', message: String(error) }
    });
  }
});

/**
 * POST /api/dashboards/:id/widgets - Add widget to dashboard
 */
router.post('/:id/widgets', async (req, res) => {
  try {
    const { type, title, description, dataSource, configuration, position, size, refreshInterval, permissions } = req.body;
    
    if (!type || !title || !dataSource) {
      return res.status(400).json({
        success: false,
        message: 'Widget type, title, and dataSource are required'
      });
    }

    const dashboard = dashboardEngine.getDashboardById(req.params.id);
    if (!dashboard) {
      return res.status(404).json({
        success: false,
        message: 'Dashboard not found'
      });
    }

    console.log('🔧 Adding widget to dashboard:', title);
    
    const widgetData = {
      dashboardId: req.params.id,
      type,
      title,
      description,
      dataSource,
      configuration: configuration || {},
      position: position || { x: 0, y: 0 },
      size: size || { width: 1, height: 1 },
      refreshInterval: refreshInterval || DASHBOARD_CONFIG.refreshIntervals.NORMAL,
      permissions: Array.isArray(permissions) ? permissions : ['ADMIN']
    };

    const newWidget = await dashboardEngine.createWidget(widgetData);
    
    // Get widget data
    const widgetWithData = {
      ...newWidget,
      data: await dashboardEngine.getWidgetData(newWidget)
    };

    // Emit widget creation event
    emitDashboardUpdate({ 
      dashboardId: req.params.id,
      widget: {
        id: newWidget.id,
        title: newWidget.title,
        type: newWidget.type
      },
      action: 'widget_added'
    }, 'dashboard:widget_added');

    return res.status(201).json({
      success: true,
      message: 'Widget added successfully',
      data: widgetWithData
    });
  } catch (error) {
    console.error('Error adding widget:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add widget',
      error: { code: 'WIDGET_CREATE_ERROR', message: String(error) }
    });
  }
});

/**
 * GET /api/dashboards/:id/widgets/:widgetId/data - Get widget data
 */
router.get('/:id/widgets/:widgetId/data', async (req, res) => {
  try {
    const dashboard = dashboardEngine.getDashboardById(req.params.id);
    if (!dashboard) {
      return res.status(404).json({
        success: false,
        message: 'Dashboard not found'
      });
    }

    const widget = dashboard.widgets.find(w => w.id === req.params.widgetId);
    if (!widget) {
      return res.status(404).json({
        success: false,
        message: 'Widget not found'
      });
    }

    const data = await dashboardEngine.getWidgetData(widget);
    
    return res.json({
      success: true,
      message: 'Widget data retrieved successfully',
      data: {
        widgetId: widget.id,
        dataSource: widget.dataSource,
        lastUpdated: data._timestamp,
        data
      }
    });
  } catch (error) {
    console.error('Error fetching widget data:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch widget data',
      error: { code: 'WIDGET_DATA_ERROR', message: String(error) }
    });
  }
});

/**
 * GET /api/dashboards/data/aggregate - Get aggregated system data
 */
router.get('/data/aggregate', async (req, res) => {
  try {
    console.log('🔄 Aggregating system data...');
    const startTime = Date.now();
    
    const aggregatedData = await dashboardEngine.aggregateSystemData();
    const processingTime = Date.now() - startTime;
    
    // Convert Map to Object for JSON response
    const dataObject: Record<string, any> = {};
    aggregatedData.forEach((value, key) => {
      dataObject[key] = value;
    });

    console.log(`✅ Data aggregation completed in ${processingTime}ms`);
    console.log(`📊 Sources: ${Object.keys(dataObject).length}, Records: ${Object.values(dataObject).reduce((sum: number, data: any) => sum + (data.metadata?.recordCount || 0), 0)}`);

    return res.json({
      success: true,
      message: 'System data aggregated successfully',
      data: {
        sources: dataObject,
        metadata: {
          processingTime,
          sourceCount: Object.keys(dataObject).length,
          totalRecords: Object.values(dataObject).reduce((sum: number, data: any) => sum + (data.metadata?.recordCount || 0), 0),
          aggregatedAt: new Date().toISOString()
        }
      }
    });
  } catch (error) {
    console.error('Error aggregating data:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to aggregate system data',
      error: { code: 'DATA_AGGREGATION_ERROR', message: String(error) }
    });
  }
});

/**
 * GET /api/dashboards/analytics/overview - Get dashboard analytics overview
 */
router.get('/analytics/overview', async (req, res) => {
  try {
    console.log('📈 Generating dashboard analytics overview...');
    
    const metrics = await dashboardEngine.getDashboardMetrics();
    const aggregatedData = await dashboardEngine.aggregateSystemData();
    
    // Calculate cross-system insights
    const trainsetData = aggregatedData.get('TRAINSETS');
    const jobCardData = aggregatedData.get('JOB_CARDS');
    const fitnessData = aggregatedData.get('FITNESS_CERTIFICATES');
    const optimizationData = aggregatedData.get('OPTIMIZATION');
    const operationsData = aggregatedData.get('OPERATIONS');
    
    const overview = {
      systemMetrics: metrics,
      operationalSummary: {
        totalTrainsets: trainsetData?.data.total || 0,
        serviceAvailability: trainsetData?.data.availabilityPercentage || 0,
        maintenanceBacklog: jobCardData?.data.pending || 0,
        fitnessCompliance: fitnessData?.data.validityRate || 0,
        operationalEfficiency: operationsData?.data.punctuality || 0
      },
      performanceIndicators: {
        systemHealth: metrics.systemHealth,
        dataQuality: {
          trainsets: trainsetData?.metadata.quality || 0,
          jobCards: jobCardData?.metadata.quality || 0,
          fitness: fitnessData?.metadata.quality || 0,
          optimization: optimizationData?.metadata.quality || 0,
          operations: operationsData?.metadata.quality || 0
        },
        responseTime: {
          trainsets: trainsetData?.metadata.latency || 0,
          jobCards: jobCardData?.metadata.latency || 0,
          fitness: fitnessData?.metadata.latency || 0,
          optimization: optimizationData?.metadata.latency || 0,
          operations: operationsData?.metadata.latency || 0
        }
      },
      trends: {
        dashboardUsage: 'INCREASING',
        dataVolume: 'STABLE',
        systemLoad: 'NORMAL',
        userEngagement: 'HIGH'
      },
      recommendations: [
        trainsetData?.data.availabilityPercentage < 80 ? 'Improve trainset availability to meet service targets' : null,
        jobCardData?.data.pending > 10 ? 'Address maintenance backlog to prevent service disruptions' : null,
        fitnessData?.data.validityRate < 95 ? 'Review fitness certificate renewal processes' : null
      ].filter(Boolean)
    };

    return res.json({
      success: true,
      message: 'Dashboard analytics overview retrieved',
      data: overview
    });
  } catch (error) {
    console.error('Error generating analytics overview:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate analytics overview',
      error: { code: 'ANALYTICS_ERROR', message: String(error) }
    });
  }
});

/**
 * GET /api/dashboards/metrics/realtime - Get real-time dashboard metrics
 */
router.get('/metrics/realtime', async (req, res) => {
  try {
    const metrics = await dashboardEngine.getDashboardMetrics();
    const aggregatedData = await dashboardEngine.aggregateSystemData();
    
    const realtimeMetrics = {
      systemStatus: {
        overallHealth: Object.values(metrics.systemHealth).every(status => status === 'HEALTHY') ? 'HEALTHY' : 'WARNING',
        systemHealth: metrics.systemHealth,
        lastUpdate: new Date().toISOString()
      },
      dashboardMetrics: {
        totalDashboards: metrics.totalDashboards,
        activeUsers: metrics.activeUsers,
        widgetCount: metrics.widgetCount,
        dataRefreshRate: metrics.dataRefreshRate
      },
      liveData: {
        trainsetsAvailable: aggregatedData.get('TRAINSETS')?.data.available || 0,
        activeJobs: aggregatedData.get('JOB_CARDS')?.data.inProgress || 0,
        validFitnessCerts: aggregatedData.get('FITNESS_CERTIFICATES')?.data.valid || 0,
        optimizationsToday: 3, // Mock
        currentAlerts: aggregatedData.get('ALERTS')?.data.open || 0
      },
      performance: {
        avgDataLatency: Array.from(aggregatedData.values())
          .reduce((sum, data) => sum + data.metadata.latency, 0) / aggregatedData.size || 0,
        avgDataQuality: Array.from(aggregatedData.values())
          .reduce((sum, data) => sum + data.metadata.quality, 0) / aggregatedData.size || 0,
        systemLoad: 78.5, // Mock
        memoryUsage: 65.2 // Mock
      },
      timestamp: new Date().toISOString()
    };

    return res.json({
      success: true,
      message: 'Real-time dashboard metrics retrieved',
      data: realtimeMetrics
    });
  } catch (error) {
    console.error('Error getting real-time metrics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get real-time metrics',
      error: { code: 'REALTIME_METRICS_ERROR', message: String(error) }
    });
  }
});

/**
 * GET /api/dashboards/config - Get dashboard configuration options
 */
router.get('/config', async (req, res) => {
  try {
    const config = {
      widgetTypes: Object.keys(DASHBOARD_CONFIG.widgetTypes).map(key => ({
        key,
        name: key.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase()),
        description: getWidgetTypeDescription(key)
      })),
      chartTypes: Object.keys(DASHBOARD_CONFIG.chartTypes).map(key => ({
        key,
        name: key.toLowerCase().replace(/\b\w/g, l => l.toUpperCase()),
        description: getChartTypeDescription(key)
      })),
      themes: Object.keys(DASHBOARD_CONFIG.themes).map(key => ({
        key,
        name: key.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase()),
        description: getThemeDescription(key)
      })),
      dataSources: Object.keys(DASHBOARD_CONFIG.dataSources).map(key => ({
        key,
        name: key.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase()),
        description: getDataSourceDescription(key)
      })),
      refreshIntervals: Object.entries(DASHBOARD_CONFIG.refreshIntervals).map(([key, value]) => ({
        key,
        name: key.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase()),
        seconds: value,
        description: getRefreshIntervalDescription(key, value)
      })),
      roles: Object.keys(DASHBOARD_CONFIG.roles).map(key => ({
        key,
        name: key.toLowerCase().replace(/\b\w/g, l => l.toUpperCase()),
        description: getRoleDescription(key)
      })),
      systemInfo: {
        version: '1.0.0',
        type: 'Comprehensive Dashboard Management System',
        features: [
          'Multi-role dashboard access control',
          'Real-time data aggregation',
          'Customizable widget layouts',
          'Cross-system analytics',
          'Live performance monitoring',
          'Interactive data visualization',
          'Automated alert management',
          'Responsive dashboard themes'
        ]
      }
    };
    
    return res.json({
      success: true,
      message: 'Dashboard configuration retrieved',
      data: config
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get dashboard configuration',
      error: { code: 'CONFIG_ERROR', message: String(error) }
    });
  }
});

/**
 * POST /api/dashboards/sample/create - Create sample dashboard data
 */
router.post('/sample/create', async (req, res) => {
  try {
    console.log('🎲 Creating sample dashboard data...');
    
    const result = await createSampleDashboardData();
    
    if (result.success) {
      return res.json({
        success: true,
        message: 'Sample dashboard data created',
        data: result.data
      });
    } else {
      return res.status(500).json({
        success: false,
        message: 'Failed to create sample dashboard data',
        error: result.error
      });
    }
  } catch (error) {
    console.error('Error creating sample dashboard data:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create sample dashboard data',
      error: { code: 'SAMPLE_CREATE_ERROR', message: String(error) }
    });
  }
});

/**
 * POST /api/dashboards/data/refresh - Trigger data refresh
 */
router.post('/data/refresh', async (req, res) => {
  try {
    console.log('🔄 Triggering system data refresh...');
    const startTime = Date.now();
    
    // Force refresh by clearing cache and re-aggregating
    const aggregatedData = await dashboardEngine.aggregateSystemData();
    const processingTime = Date.now() - startTime;
    
    // Emit data refresh event to all connected dashboards
    emitDashboardUpdate({ 
      processingTime,
      sourcesUpdated: aggregatedData.size,
      refreshedAt: new Date().toISOString()
    }, 'dashboard:data_refreshed');

    return res.json({
      success: true,
      message: 'Data refresh completed successfully',
      data: {
        processingTime,
        sourcesUpdated: aggregatedData.size,
        refreshedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error refreshing data:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to refresh data',
      error: { code: 'DATA_REFRESH_ERROR', message: String(error) }
    });
  }
});

// Helper functions for configuration descriptions
function getWidgetTypeDescription(type: string): string {
  const descriptions: Record<string, string> = {
    'METRIC_CARD': 'Display key performance indicators and metrics',
    'CHART': 'Visualize data with various chart types',
    'TABLE': 'Show detailed data in tabular format',
    'ALERT_LIST': 'Display system alerts and notifications',
    'STATUS_BOARD': 'Show real-time status information',
    'MAP': 'Geographic or network visualization',
    'GAUGE': 'Display progress or performance gauges',
    'TIMELINE': 'Show events and activities over time'
  };
  return descriptions[type] || 'Custom widget type';
}

function getChartTypeDescription(type: string): string {
  const descriptions: Record<string, string> = {
    'LINE': 'Show trends over time',
    'BAR': 'Compare values across categories',
    'PIE': 'Show proportional data',
    'AREA': 'Display cumulative data over time',
    'SCATTER': 'Show correlation between variables',
    'DONUT': 'Enhanced pie chart with central space',
    'HEATMAP': 'Show data density and patterns'
  };
  return descriptions[type] || 'Custom chart type';
}

function getThemeDescription(theme: string): string {
  const descriptions: Record<string, string> = {
    'LIGHT': 'Clean, bright interface',
    'DARK': 'Dark theme for low-light environments',
    'AUTO': 'Automatically switch based on system preference',
    'KMRL_BLUE': 'Official KMRL corporate theme'
  };
  return descriptions[theme] || 'Custom theme';
}

function getDataSourceDescription(source: string): string {
  const descriptions: Record<string, string> = {
    'TRAINSETS': 'Trainset status, availability, and fleet data',
    'JOB_CARDS': 'Maintenance jobs and work orders',
    'FITNESS_CERTIFICATES': 'Trainset fitness and compliance data',
    'OPTIMIZATION': 'AI optimization results and analytics',
    'OPERATIONS': 'Operational performance and crew data',
    'ALERTS': 'System alerts and notifications',
    'ANALYTICS': 'Cross-system analytics and insights'
  };
  return descriptions[source] || 'Custom data source';
}

function getRefreshIntervalDescription(key: string, seconds: number): string {
  if (seconds === 0) return 'Manual refresh only';
  if (seconds < 60) return `Updates every ${seconds} seconds`;
  const minutes = Math.floor(seconds / 60);
  return `Updates every ${minutes} minute${minutes > 1 ? 's' : ''}`;
}

function getRoleDescription(role: string): string {
  const descriptions: Record<string, string> = {
    'ADMIN': 'Full system access and management',
    'SUPERVISOR': 'Operational oversight and reporting',
    'OPERATOR': 'Day-to-day operational access',
    'VIEWER': 'Read-only access to dashboards'
  };
  return descriptions[role] || 'Custom role';
}

export default router;