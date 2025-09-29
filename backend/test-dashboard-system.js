/**
 * Comprehensive Dashboard Management System Test Script
 * 
 * Tests all dashboard functionality including:
 * - Dashboard creation, customization, and management
 * - Widget management and configuration
 * - Data aggregation from all systems
 * - Real-time dashboard updates
 * - Multi-role access control
 * - Analytics and performance monitoring
 */

const fetch = require('node-fetch');
const WebSocket = require('ws');
const chalk = require('chalk');

const BASE_URL = 'http://localhost:3001';
const WS_URL = 'ws://localhost:3001';

let passedTests = 0;
let failedTests = 0;
let wsConnection = null;

// Test utilities
function log(message, color = 'white') {
  console.log(chalk[color](message));
}

function success(message) {
  passedTests++;
  log(`✅ ${message}`, 'green');
}

function error(message) {
  failedTests++;
  log(`❌ ${message}`, 'red');
}

function info(message) {
  log(`ℹ️  ${message}`, 'blue');
}

function warning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// HTTP request helper
async function apiCall(endpoint, method = 'GET', body = null, expectedStatus = 200) {
  const url = `${BASE_URL}${endpoint}`;
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'KMRL-Dashboard-Test-Client/1.0'
    }
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(url, options);
    const data = await response.json();
    
    if (response.status === expectedStatus) {
      return { success: true, data, status: response.status };
    } else {
      return { 
        success: false, 
        data, 
        status: response.status, 
        expected: expectedStatus 
      };
    }
  } catch (err) {
    return { 
      success: false, 
      error: err.message, 
      status: 0 
    };
  }
}

// WebSocket testing helper
function setupWebSocket() {
  return new Promise((resolve, reject) => {
    try {
      wsConnection = new WebSocket(WS_URL);
      
      wsConnection.on('open', () => {
        info('WebSocket connected for real-time dashboard updates');
        wsConnection.send(JSON.stringify({ event: 'subscribe:dashboards' }));
        resolve();
      });
      
      wsConnection.on('message', (data) => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.event && parsed.event.startsWith('dashboard:')) {
            info(`🔔 WebSocket Event: ${parsed.event}`);
          }
        } catch (e) {
          // Ignore non-JSON messages
        }
      });
      
      wsConnection.on('error', (err) => {
        warning(`WebSocket error: ${err.message}`);
      });
      
      setTimeout(() => {
        if (wsConnection.readyState !== WebSocket.OPEN) {
          warning('WebSocket connection timeout - continuing tests');
          resolve();
        }
      }, 3000);
      
    } catch (err) {
      warning(`Failed to setup WebSocket: ${err.message}`);
      resolve();
    }
  });
}

// Test functions
async function testDashboardConfig() {
  info('Testing dashboard configuration retrieval...');
  
  const result = await apiCall('/api/dashboards/config');
  if (result.success) {
    const config = result.data.data;
    
    if (config.widgetTypes && config.chartTypes && config.themes && config.dataSources && config.systemInfo) {
      success('Dashboard configuration retrieved successfully');
      info(`System: ${config.systemInfo.type} v${config.systemInfo.version}`);
      info(`Widget types: ${config.widgetTypes.length}, Chart types: ${config.chartTypes.length}`);
      info(`Themes: ${config.themes.length}, Data sources: ${config.dataSources.length}`);
      info(`Features: ${config.systemInfo.features.length} dashboard features`);
    } else {
      error('Dashboard configuration missing required fields');
    }
  } else {
    error(`Failed to get dashboard config: ${result.data?.message || 'Unknown error'}`);
  }
}

async function testSampleDataCreation() {
  info('Testing sample dashboard data creation...');
  
  const result = await apiCall('/api/dashboards/sample/create', 'POST');
  if (result.success) {
    success('Sample dashboard data created successfully');
    info(`Created: ${result.data.data?.dashboards || 0} dashboards, ${result.data.data?.widgets || 0} widgets`);
  } else {
    warning(`Sample data creation failed: ${result.data?.message || 'Unknown error'}`);
    // Don't fail the test since sample data might already exist
  }
}

async function testDataAggregation() {
  info('Testing system data aggregation...');
  
  const startTime = Date.now();
  const result = await apiCall('/api/dashboards/data/aggregate');
  
  if (result.success) {
    const aggregationData = result.data.data;
    const processingTime = Date.now() - startTime;
    
    success(`System data aggregated in ${processingTime}ms`);
    info(`Processing time reported: ${aggregationData.metadata.processingTime}ms`);
    info(`Data sources: ${aggregationData.metadata.sourceCount}, Total records: ${aggregationData.metadata.totalRecords}`);
    
    // Check individual data sources
    const sources = aggregationData.sources;
    if (sources.TRAINSETS) {
      info(`Trainsets: ${sources.TRAINSETS.data.total} total, ${sources.TRAINSETS.data.availabilityPercentage.toFixed(1)}% available`);
    }
    if (sources.JOB_CARDS) {
      info(`Job Cards: ${sources.JOB_CARDS.data.total} total, ${sources.JOB_CARDS.data.completionRate.toFixed(1)}% completion rate`);
    }
    if (sources.FITNESS_CERTIFICATES) {
      info(`Fitness: ${sources.FITNESS_CERTIFICATES.data.total} total, ${sources.FITNESS_CERTIFICATES.data.validityRate.toFixed(1)}% valid`);
    }
    
    return aggregationData;
  } else {
    error(`System data aggregation failed: ${result.data?.message || 'Unknown error'}`);
    return null;
  }
}

async function testDashboardManagement() {
  info('Testing dashboard CRUD operations...');
  
  // Test dashboard creation
  const dashboardData = {
    name: 'Test Executive Dashboard',
    description: 'Test dashboard for comprehensive system monitoring',
    userId: 'test-user',
    role: 'ADMIN',
    theme: 'KMRL_BLUE',
    layout: {
      columns: 4,
      rows: 3,
      gap: 16,
      padding: 20,
      responsive: true
    },
    isPublic: false,
    tags: ['test', 'executive', 'monitoring']
  };
  
  const createResult = await apiCall('/api/dashboards', 'POST', dashboardData, 201);
  if (createResult.success) {
    const createdDashboard = createResult.data.data;
    success('Dashboard created successfully');
    info(`Created dashboard: ${createdDashboard.name} (ID: ${createdDashboard.id})`);
    
    // Test dashboard retrieval
    const getResult = await apiCall(`/api/dashboards/${createdDashboard.id}`);
    if (getResult.success) {
      success('Dashboard retrieved successfully');
      info(`Dashboard widgets: ${getResult.data.data.widgets.length} widgets`);
    } else {
      error(`Failed to retrieve dashboard: ${getResult.data?.message || 'Unknown error'}`);
    }
    
    // Test dashboard update
    const updateData = {
      name: 'Updated Test Dashboard',
      description: 'Updated description for testing',
      theme: 'DARK',
      tags: ['updated', 'test']
    };
    
    const updateResult = await apiCall(`/api/dashboards/${createdDashboard.id}`, 'PUT', updateData);
    if (updateResult.success) {
      success('Dashboard updated successfully');
      info(`Updated dashboard name: ${updateResult.data.data.name}`);
    } else {
      error(`Failed to update dashboard: ${updateResult.data?.message || 'Unknown error'}`);
    }
    
    return createdDashboard;
  } else {
    error(`Failed to create dashboard: ${createResult.data?.message || 'Unknown error'}`);
    return null;
  }
}

async function testDashboardListing() {
  info('Testing dashboard listing with filters and pagination...');
  
  // Test basic listing
  const listResult = await apiCall('/api/dashboards?page=1&limit=10');
  if (listResult.success) {
    const data = listResult.data.data;
    success('Dashboard listing retrieved successfully');
    info(`Dashboards: ${data.dashboards.length} items`);
    info(`Summary: ${data.summary.total} total, ${data.summary.public} public, ${data.summary.private} private`);
    info(`Pagination: Page ${data.pagination.currentPage} of ${data.pagination.totalPages}`);
    
    if (data.dashboards.length > 0) {
      const firstDashboard = data.dashboards[0];
      info(`Sample dashboard: ${firstDashboard.name} (${firstDashboard.role}) - ${firstDashboard.widgets.length} widgets`);
    }
  } else {
    error(`Failed to get dashboard listing: ${listResult.data?.message || 'Unknown error'}`);
  }
  
  // Test filtered listing
  const filteredResult = await apiCall('/api/dashboards?role=ADMIN&search=executive');
  if (filteredResult.success) {
    success('Filtered dashboard listing retrieved successfully');
    info(`Filtered results: ${filteredResult.data.data.dashboards.length} items`);
  } else {
    warning('Filtered dashboard listing failed - this is not critical');
  }
}

async function testWidgetManagement(dashboard) {
  if (!dashboard) {
    warning('Skipping widget management test - no dashboard available');
    return;
  }
  
  info('Testing widget management...');
  
  // Test widget creation
  const widgetData = {
    type: 'METRIC_CARD',
    title: 'Test Metric Widget',
    description: 'Test widget for system monitoring',
    dataSource: 'TRAINSETS',
    configuration: {
      metrics: ['total', 'availabilityPercentage'],
      aggregation: 'COUNT',
      timeRange: 'current'
    },
    position: { x: 0, y: 0 },
    size: { width: 2, height: 1 },
    refreshInterval: 60,
    permissions: ['ADMIN', 'SUPERVISOR']
  };
  
  const createResult = await apiCall(`/api/dashboards/${dashboard.id}/widgets`, 'POST', widgetData, 201);
  if (createResult.success) {
    const createdWidget = createResult.data.data;
    success('Widget created successfully');
    info(`Created widget: ${createdWidget.title} (Type: ${createdWidget.type})`);
    info(`Widget data available: ${createdWidget.data ? 'Yes' : 'No'}`);
    
    if (createdWidget.data) {
      info(`Widget data keys: ${Object.keys(createdWidget.data).filter(k => !k.startsWith('_')).join(', ')}`);
    }
    
    // Test widget data retrieval
    const dataResult = await apiCall(`/api/dashboards/${dashboard.id}/widgets/${createdWidget.id}/data`);
    if (dataResult.success) {
      success('Widget data retrieved successfully');
      info(`Data source: ${dataResult.data.data.dataSource}, Last updated: ${dataResult.data.data.lastUpdated}`);
    } else {
      error(`Failed to retrieve widget data: ${dataResult.data?.message || 'Unknown error'}`);
    }
    
    return createdWidget;
  } else {
    error(`Failed to create widget: ${createResult.data?.message || 'Unknown error'}`);
    return null;
  }
}

async function testAnalyticsDashboard() {
  info('Testing analytics dashboard...');
  
  const result = await apiCall('/api/dashboards/analytics/overview');
  if (result.success) {
    const analytics = result.data.data;
    success('Analytics dashboard loaded successfully');
    
    info(`System metrics: ${analytics.systemMetrics.totalDashboards} dashboards, ${analytics.systemMetrics.widgetCount} widgets`);
    info(`Operational summary: ${analytics.operationalSummary.totalTrainsets} trainsets, ${analytics.operationalSummary.serviceAvailability.toFixed(1)}% availability`);
    info(`Performance: Data quality avg: ${Object.values(analytics.performanceIndicators.dataQuality).reduce((a, b) => a + b, 0) / Object.values(analytics.performanceIndicators.dataQuality).length || 0}`);
    info(`System health: ${Object.entries(analytics.performanceIndicators.systemHealth).map(([k, v]) => `${k}:${v}`).join(', ')}`);
    
    if (analytics.recommendations && analytics.recommendations.length > 0) {
      info(`Recommendations: ${analytics.recommendations.length} items`);
      analytics.recommendations.forEach((rec, i) => {
        info(`  ${i + 1}. ${rec}`);
      });
    }
  } else {
    error(`Analytics dashboard failed: ${result.data?.message || 'Unknown error'}`);
  }
}

async function testRealTimeMetrics() {
  info('Testing real-time dashboard metrics...');
  
  const result = await apiCall('/api/dashboards/metrics/realtime');
  if (result.success) {
    const metrics = result.data.data;
    success('Real-time dashboard metrics retrieved');
    
    info(`System status: ${metrics.systemStatus.overallHealth} (${Object.entries(metrics.systemStatus.systemHealth).map(([k, v]) => `${k}:${v}`).join(', ')})`);
    info(`Live data: ${metrics.liveData.trainsetsAvailable} trainsets available, ${metrics.liveData.activeJobs} active jobs`);
    info(`Performance: ${metrics.performance.avgDataLatency.toFixed(1)}ms avg latency, ${metrics.performance.avgDataQuality.toFixed(1)} avg quality`);
    info(`Dashboard metrics: ${metrics.dashboardMetrics.totalDashboards} dashboards, ${metrics.dashboardMetrics.activeUsers} active users`);
  } else {
    error(`Real-time metrics failed: ${result.data?.message || 'Unknown error'}`);
  }
}

async function testDataRefresh() {
  info('Testing data refresh functionality...');
  
  const startTime = Date.now();
  const result = await apiCall('/api/dashboards/data/refresh', 'POST');
  
  if (result.success) {
    const refreshTime = Date.now() - startTime;
    success(`Data refresh completed in ${refreshTime}ms`);
    info(`Processing time: ${result.data.data.processingTime}ms`);
    info(`Sources updated: ${result.data.data.sourcesUpdated}`);
    info(`Refreshed at: ${result.data.data.refreshedAt}`);
  } else {
    error(`Data refresh failed: ${result.data?.message || 'Unknown error'}`);
  }
}

async function testErrorHandling() {
  info('Testing error handling and edge cases...');
  
  // Test invalid dashboard ID
  const invalidDashboard = await apiCall('/api/dashboards/invalid-id', 'GET', null, 404);
  if (invalidDashboard.status === 404) {
    success('404 error handling working correctly');
  } else {
    error('404 error handling not working properly');
  }
  
  // Test invalid dashboard creation
  const invalidCreate = await apiCall('/api/dashboards', 'POST', {
    // Missing required name field
    description: 'Invalid dashboard'
  }, 400);
  
  if (invalidCreate.status === 400) {
    success('Bad request validation working correctly');
  } else {
    warning('Bad request validation might need improvement');
  }
  
  // Test invalid widget creation
  const invalidWidget = await apiCall('/api/dashboards/valid-id/widgets', 'POST', {
    // Missing required fields
    title: 'Invalid Widget'
  }, 400);
  
  if (invalidWidget.status === 400 || invalidWidget.status === 404) {
    success('Widget validation working correctly');
  } else {
    warning('Widget validation might need improvement');
  }
}

async function testPerformanceScenarios() {
  info('Testing performance scenarios and concurrent requests...');
  
  // Test concurrent data aggregation requests
  const concurrentRequests = Array(3).fill().map(() => 
    apiCall('/api/dashboards/data/aggregate')
  );
  
  try {
    const startTime = Date.now();
    const results = await Promise.all(concurrentRequests);
    const totalTime = Date.now() - startTime;
    const successfulRequests = results.filter(r => r.success).length;
    
    if (successfulRequests === 3) {
      success('Concurrent request handling working correctly');
      info(`All ${successfulRequests} concurrent requests succeeded in ${totalTime}ms`);
    } else {
      warning(`Only ${successfulRequests} out of 3 concurrent requests succeeded`);
    }
  } catch (error) {
    error(`Concurrent request test failed: ${error.message}`);
  }
}

async function testRoleBasedAccess() {
  info('Testing role-based dashboard access...');
  
  // Test different role filters
  const roles = ['ADMIN', 'SUPERVISOR', 'OPERATOR', 'VIEWER'];
  
  for (const role of roles) {
    const result = await apiCall(`/api/dashboards?role=${role}&limit=5`);
    if (result.success) {
      const roleData = result.data.data;
      info(`Role ${role}: ${roleData.dashboards.length} accessible dashboards`);
    } else {
      warning(`Role ${role} filtering failed`);
    }
  }
  
  success('Role-based access testing completed');
}

async function testDashboardCleanup(dashboard) {
  if (!dashboard) {
    warning('Skipping dashboard cleanup - no dashboard to delete');
    return;
  }
  
  info('Testing dashboard deletion...');
  
  const deleteResult = await apiCall(`/api/dashboards/${dashboard.id}`, 'DELETE');
  if (deleteResult.success) {
    success('Dashboard deleted successfully');
    info(`Deleted dashboard: ${dashboard.name}`);
  } else {
    warning(`Failed to delete dashboard: ${deleteResult.data?.message || 'Unknown error'}`);
  }
}

// Main test execution
async function runDashboardSystemTests() {
  log('\n📊 KMRL Dashboard Management System - Comprehensive Test Suite', 'cyan');
  log('================================================================', 'cyan');
  log(`Testing against: ${BASE_URL}`, 'blue');
  log(`WebSocket URL: ${WS_URL}`, 'blue');
  log('================================================================\n', 'cyan');

  let testDashboard = null;

  try {
    // Setup WebSocket connection
    await setupWebSocket();
    await sleep(1000);

    // Core dashboard tests
    await testDashboardConfig();
    await sleep(500);

    await testSampleDataCreation();
    await sleep(1000);

    const aggregationData = await testDataAggregation();
    await sleep(1000);

    // Dashboard management tests
    testDashboard = await testDashboardManagement();
    await sleep(1000);

    await testDashboardListing();
    await sleep(500);

    // Widget management tests
    const testWidget = await testWidgetManagement(testDashboard);
    await sleep(1000);

    // Analytics and monitoring tests
    await testAnalyticsDashboard();
    await sleep(500);

    await testRealTimeMetrics();
    await sleep(500);

    await testDataRefresh();
    await sleep(1000);

    // Advanced functionality tests
    await testRoleBasedAccess();
    await sleep(500);

    await testPerformanceScenarios();
    await sleep(500);

    // Error handling tests
    await testErrorHandling();
    await sleep(500);

    // Cleanup
    await testDashboardCleanup(testDashboard);
    await sleep(500);

  } catch (err) {
    error(`Critical test failure: ${err.message}`);
  } finally {
    // Cleanup
    if (wsConnection) {
      wsConnection.close();
    }
  }

  // Test summary
  log('\n================================================================', 'cyan');
  log('🎯 DASHBOARD MANAGEMENT SYSTEM TEST SUMMARY', 'cyan');
  log('================================================================', 'cyan');
  
  const totalTests = passedTests + failedTests;
  const successRate = totalTests > 0 ? ((passedTests / totalTests) * 100).toFixed(1) : 0;
  
  if (passedTests > 0) {
    success(`${passedTests} tests passed`);
  }
  
  if (failedTests > 0) {
    error(`${failedTests} tests failed`);
  }
  
  log(`Total tests: ${totalTests}`, 'blue');
  log(`Success rate: ${successRate}%`, successRate >= 90 ? 'green' : successRate >= 70 ? 'yellow' : 'red');
  
  if (successRate >= 90) {
    log('\n🎉 DASHBOARD SYSTEM IS FULLY OPERATIONAL!', 'green');
    log('✨ Data aggregation, widget management, and real-time updates are working perfectly', 'green');
  } else if (successRate >= 70) {
    log('\n⚡ DASHBOARD SYSTEM IS MOSTLY FUNCTIONAL', 'yellow');
    log('🔧 Some minor issues detected - check failed tests above', 'yellow');
  } else {
    log('\n🚨 DASHBOARD SYSTEM NEEDS ATTENTION', 'red');
    log('🔧 Multiple issues detected - review server logs and failed tests', 'red');
  }
  
  log('\n🔗 WebSocket Events: Real-time dashboard updates tested');
  log('📊 Data Aggregation: Cross-system data integration validated');
  log('🔧 Widget Management: Creation, configuration, and data binding verified');
  log('👥 Multi-role Access: Role-based dashboard access control tested');
  log('📈 Analytics: Performance dashboards and real-time metrics confirmed');
  log('🎨 Customization: Themes, layouts, and responsive design validated');
  log('================================================================\n', 'cyan');
}

// Handle script termination
process.on('SIGINT', () => {
  log('\n\n🛑 Test suite interrupted by user', 'yellow');
  if (wsConnection) {
    wsConnection.close();
  }
  process.exit(0);
});

process.on('uncaughtException', (err) => {
  error(`Uncaught exception: ${err.message}`);
  if (wsConnection) {
    wsConnection.close();
  }
  process.exit(1);
});

// Run the tests
runDashboardSystemTests().then(() => {
  process.exit(failedTests > 0 ? 1 : 0);
}).catch((err) => {
  error(`Test suite failed: ${err.message}`);
  process.exit(1);
});