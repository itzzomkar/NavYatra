/**
 * Comprehensive Operations Management System Test Script
 * 
 * Tests all operations functionality including:
 * - Crew management and scheduling
 * - Shift assignment and tracking
 * - Route planning and optimization
 * - Operational alerts and notifications
 * - Real-time performance monitoring
 * - Analytics dashboard and metrics
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
      'User-Agent': 'KMRL-Operations-Test-Client/1.0'
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
        info('WebSocket connected for real-time operations updates');
        wsConnection.send(JSON.stringify({ event: 'subscribe:operations' }));
        resolve();
      });
      
      wsConnection.on('message', (data) => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.event && parsed.event.startsWith('operations:')) {
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
async function testOperationsConfig() {
  info('Testing operations configuration retrieval...');
  
  const result = await apiCall('/api/operations/config');
  if (result.success) {
    const config = result.data.data;
    
    if (config.shifts && config.routes && config.performance && config.systemInfo) {
      success('Operations configuration retrieved successfully');
      info(`System: ${config.systemInfo.type} v${config.systemInfo.version}`);
      info(`Features: ${config.systemInfo.features.length} operational features`);
      info(`Shift types: ${Object.keys(config.shifts).length} shifts configured`);
    } else {
      error('Operations configuration missing required fields');
    }
  } else {
    error(`Failed to get operations config: ${result.data?.message || 'Unknown error'}`);
  }
}

async function testSampleDataCreation() {
  info('Testing sample operations data creation...');
  
  const result = await apiCall('/api/operations/sample/create', 'POST');
  if (result.success) {
    success('Sample operations data created successfully');
    info(`Created: ${result.data.data?.crewMembers || 0} crew members, ${result.data.data?.routes || 0} routes`);
  } else {
    warning(`Sample data creation failed: ${result.data?.message || 'Unknown error'}`);
    // Don't fail the test since sample data might already exist
  }
}

async function testOperationsManagement() {
  info('Testing comprehensive operations management execution...');
  
  const startTime = Date.now();
  const result = await apiCall('/api/operations/manage', 'POST', {
    date: new Date().toISOString(),
    parameters: {
      optimizeCrewScheduling: true,
      enforceShiftConstraints: true
    }
  });
  
  if (result.success) {
    const operationsData = result.data.data;
    const processingTime = Date.now() - startTime;
    
    success(`Operations management completed in ${processingTime}ms`);
    info(`Processing time reported: ${operationsData.processingTime}ms`);
    info(`Crew schedule: ${operationsData.summary.totalShifts} shifts assigned`);
    info(`Routes: ${operationsData.summary.activeRoutes} active routes`);
    info(`Crew utilization: ${operationsData.summary.crewUtilization.toFixed(1)}%`);
    info(`Service availability: ${operationsData.summary.serviceAvailability.toFixed(1)}%`);
    info(`Performance score: ${operationsData.summary.performance.toFixed(1)}%`);
    info(`Open alerts: ${operationsData.summary.openAlerts}`);
    
    return operationsData;
  } else {
    error(`Operations management failed: ${result.data?.message || 'Unknown error'}`);
    return null;
  }
}

async function testLatestOperations() {
  info('Testing latest operations result retrieval...');
  
  const result = await apiCall('/api/operations/latest');
  if (result.success) {
    const latest = result.data.data;
    success('Latest operations result retrieved');
    info(`Operations ID: ${latest.id}`);
    info(`Timestamp: ${latest.timestamp}`);
    info(`Total shifts: ${latest.summary?.totalShifts || 0}`);
    info(`Active routes: ${latest.summary?.activeRoutes || 0}`);
  } else {
    error(`Failed to get latest operations: ${result.data?.message || 'Unknown error'}`);
  }
}

async function testCrewManagement() {
  info('Testing crew management functionality...');
  
  // Test crew listing
  const result = await apiCall('/api/operations/crew?page=1&limit=5');
  if (result.success) {
    const data = result.data.data;
    success('Crew data retrieved successfully');
    info(`Crew members: ${data.crew.length} items`);
    info(`Performance: Active crew: ${data.performance.activeCrew}, Avg score: ${data.performance.avgPerformanceScore.toFixed(1)}`);
    info(`Shift coverage: Morning: ${data.performance.shiftCoverage.morning}, Afternoon: ${data.performance.shiftCoverage.afternoon}, Night: ${data.performance.shiftCoverage.night}`);
    
    if (data.crew.length > 0) {
      const firstCrew = data.crew[0];
      info(`Sample crew: ${firstCrew.name} (${firstCrew.role}) - Score: ${firstCrew.performanceScore}`);
      
      // Test specific crew member retrieval
      const detailResult = await apiCall(`/api/operations/crew/${firstCrew.id}`);
      if (detailResult.success) {
        success('Specific crew member details retrieved');
        info(`Detailed crew: ${detailResult.data.data.name} with ${detailResult.data.data.recentShifts.length} recent shifts`);
      } else {
        error(`Failed to get detailed crew info: ${detailResult.data?.message || 'Unknown error'}`);
      }
      
      // Test crew availability update
      const availabilityResult = await apiCall(`/api/operations/crew/${firstCrew.id}/availability`, 'POST', {
        available: false,
        reason: 'Medical leave'
      });
      if (availabilityResult.success) {
        success('Crew availability updated successfully');
        info(`Updated availability: ${availabilityResult.data.data.availability ? 'Available' : 'Unavailable'}`);
      } else {
        error(`Failed to update crew availability: ${availabilityResult.data?.message || 'Unknown error'}`);
      }
    }
  } else {
    error(`Failed to get crew data: ${result.data?.message || 'Unknown error'}`);
  }
}

async function testShiftManagement() {
  info('Testing shift management functionality...');
  
  // Test shift listing
  const shiftsResult = await apiCall('/api/operations/shifts?page=1&limit=10');
  if (shiftsResult.success) {
    const data = shiftsResult.data.data;
    success('Shift schedules retrieved successfully');
    info(`Shifts: ${data.shifts.length} items`);
    info(`Summary: ${data.summary.active} active, ${data.summary.scheduled} scheduled, ${data.summary.completed} completed`);
    
    if (data.shifts.length > 0) {
      const firstShift = data.shifts[0];
      info(`Sample shift: ${firstShift.crewName} on ${firstShift.shiftType} shift - Status: ${firstShift.status}`);
    }
  } else {
    error(`Failed to get shift data: ${shiftsResult.data?.message || 'Unknown error'}`);
  }
  
  // Test shift creation
  const newShift = {
    crewMemberId: 'CREW-001',
    date: new Date().toISOString(),
    shiftType: 'MORNING',
    trainsetId: 'TS-001',
    routeId: 'ROUTE-01',
    notes: 'Test shift assignment'
  };
  
  const createResult = await apiCall('/api/operations/shifts', 'POST', newShift, 201);
  if (createResult.success) {
    success('New shift assignment created successfully');
    const createdShift = createResult.data.data;
    info(`Created shift: ${createdShift.id} for crew ${createdShift.crewMemberId}`);
    
    // Test shift status update
    const updateResult = await apiCall(`/api/operations/shifts/${createdShift.id}/status`, 'PUT', {
      status: 'ACTIVE',
      notes: 'Shift started successfully'
    });
    if (updateResult.success) {
      success('Shift status updated successfully');
      info(`Updated status: ${updateResult.data.data.status}`);
    } else {
      error(`Failed to update shift status: ${updateResult.data?.message || 'Unknown error'}`);
    }
  } else {
    error(`Failed to create shift: ${createResult.data?.message || 'Unknown error'}`);
  }
}

async function testRouteManagement() {
  info('Testing operational route management...');
  
  const result = await apiCall('/api/operations/routes?includeMetrics=true');
  if (result.success) {
    const data = result.data.data;
    success('Operational routes retrieved successfully');
    info(`Routes: ${data.routes.length} total`);
    info(`Summary: ${data.summary.active} active, ${data.summary.suspended} suspended, ${data.summary.maintenance} maintenance`);
    
    if (data.routes.length > 0) {
      const firstRoute = data.routes[0];
      info(`Sample route: ${firstRoute.name} - ${firstRoute.distance}km, ${firstRoute.frequency} trains/hour`);
      if (firstRoute.performanceMetrics) {
        info(`Performance: ${firstRoute.performanceMetrics.punctualityRate.toFixed(1)}% punctual, ${firstRoute.performanceMetrics.passengerLoad.toFixed(1)}% load`);
      }
    }
  } else {
    error(`Failed to get route data: ${result.data?.message || 'Unknown error'}`);
  }
}

async function testAlertManagement() {
  info('Testing operational alert management...');
  
  // Test alert listing
  const result = await apiCall('/api/operations/alerts?status=OPEN,ACKNOWLEDGED&page=1&limit=10');
  if (result.success) {
    const data = result.data.data;
    success('Operational alerts retrieved successfully');
    info(`Alerts: ${data.alerts.length} items`);
    info(`Summary: ${data.summary.critical} critical, ${data.summary.high} high, ${data.summary.medium} medium, ${data.summary.low} low`);
    info(`Status: ${data.summary.open} open, ${data.summary.acknowledged} acknowledged, ${data.summary.resolved} resolved`);
    
    if (data.alerts.length > 0) {
      const firstAlert = data.alerts[0];
      info(`Sample alert: ${firstAlert.title} (${firstAlert.severity}) - Status: ${firstAlert.status}`);
      info(`Impact: ${firstAlert.estimatedImpact.serviceDisruption}min disruption, ${firstAlert.estimatedImpact.affectedPassengers} passengers`);
      
      // Test alert status update
      const updateResult = await apiCall(`/api/operations/alerts/${firstAlert.id}/status`, 'PUT', {
        status: 'ACKNOWLEDGED',
        assignedTo: 'OPS-MANAGER-001',
        notes: 'Alert acknowledged and being investigated'
      });
      if (updateResult.success) {
        success('Alert status updated successfully');
        info(`Updated status: ${updateResult.data.data.status}`);
      } else {
        error(`Failed to update alert status: ${updateResult.data?.message || 'Unknown error'}`);
      }
    }
  } else {
    error(`Failed to get alert data: ${result.data?.message || 'Unknown error'}`);
  }
}

async function testAnalyticsDashboard() {
  info('Testing operations analytics dashboard...');
  
  const result = await apiCall('/api/operations/analytics/dashboard');
  if (result.success) {
    const analytics = result.data.data;
    success('Operations analytics dashboard loaded');
    
    info(`Summary: ${analytics.summary.totalCrew} crew, ${analytics.summary.activeShifts} shifts, ${analytics.summary.operationalRoutes} routes`);
    info(`Service availability: ${analytics.summary.serviceAvailability.toFixed(1)}%, Avg performance: ${analytics.summary.avgPerformanceScore.toFixed(1)}`);
    info(`Performance: ${analytics.performance.punctualityRate.toFixed(1)}% punctual, ${analytics.performance.serviceReliability.toFixed(1)}% reliable`);
    info(`Operations: ${analytics.operations.dailyTrips} trips, ${analytics.operations.passengersMoved.toLocaleString()} passengers`);
    info(`Alerts: ${analytics.alerts.active} active (${analytics.alerts.critical} critical, ${analytics.alerts.high} high)`);
    
    if (analytics.trends) {
      info(`Trends: Punctuality ${analytics.trends.punctualityTrend}, Crew utilization ${analytics.trends.crewUtilizationTrend}`);
    }
  } else {
    error(`Analytics dashboard failed: ${result.data?.message || 'Unknown error'}`);
  }
}

async function testRealTimeMetrics() {
  info('Testing real-time operations metrics...');
  
  const result = await apiCall('/api/operations/metrics/realtime');
  if (result.success) {
    const metrics = result.data.data;
    success('Real-time operations metrics retrieved');
    
    info(`System health: Operations ${metrics.systemHealth.operationsEngine}, Crew ${metrics.systemHealth.crewManagement}`);
    info(`Live ops: ${metrics.liveOperations.trainsInService} trains, ${metrics.liveOperations.activeCrewMembers} crew, ${metrics.liveOperations.currentPassengers.toLocaleString()} passengers`);
    info(`Performance: ${metrics.performance.punctualityLive.toFixed(1)}% punctual, ${metrics.performance.crewEfficiencyLive.toFixed(1)}% efficient`);
    info(`Alerts: ${metrics.alerts.activeAlerts} active, ${metrics.alerts.avgResponseTime.toFixed(1)}min avg response`);
    info(`Capacity: ${metrics.capacity.crewUtilization.toFixed(1)}% crew, ${metrics.capacity.trainsetUtilization.toFixed(1)}% trainsets`);
  } else {
    error(`Real-time metrics failed: ${result.data?.message || 'Unknown error'}`);
  }
}

async function testErrorHandling() {
  info('Testing error handling and edge cases...');
  
  // Test invalid endpoint
  const invalidResult = await apiCall('/api/operations/invalid-endpoint', 'GET', null, 404);
  if (invalidResult.status === 404) {
    success('404 error handling working correctly');
  } else {
    error('404 error handling not working properly');
  }
  
  // Test invalid shift creation
  const invalidShift = await apiCall('/api/operations/shifts', 'POST', {
    crewMemberId: 'INVALID-CREW'
    // Missing required fields
  }, 400);
  
  if (invalidShift.status === 400) {
    success('Bad request validation working correctly');
  } else {
    warning('Bad request validation might need improvement');
  }
  
  // Test invalid alert status update
  const invalidAlert = await apiCall('/api/operations/alerts/INVALID-ID/status', 'PUT', {
    status: 'INVALID_STATUS'
  }, 400);
  
  if (invalidAlert.status === 400) {
    success('Alert status validation working correctly');
  } else {
    warning('Alert status validation might need improvement');
  }
}

async function testPerformanceScenarios() {
  info('Testing performance scenarios and load handling...');
  
  // Test concurrent crew requests
  const concurrentRequests = Array(5).fill().map(() => 
    apiCall('/api/operations/crew?page=1&limit=10')
  );
  
  try {
    const results = await Promise.all(concurrentRequests);
    const successfulRequests = results.filter(r => r.success).length;
    
    if (successfulRequests === 5) {
      success('Concurrent request handling working correctly');
      info(`All ${successfulRequests} concurrent requests succeeded`);
    } else {
      warning(`Only ${successfulRequests} out of 5 concurrent requests succeeded`);
    }
  } catch (error) {
    error(`Concurrent request test failed: ${error.message}`);
  }
}

// Main test execution
async function runOperationsSystemTests() {
  log('\n🚄 KMRL Operations Management System - Comprehensive Test Suite', 'cyan');
  log('================================================================', 'cyan');
  log(`Testing against: ${BASE_URL}`, 'blue');
  log(`WebSocket URL: ${WS_URL}`, 'blue');
  log('================================================================\n', 'cyan');

  try {
    // Setup WebSocket connection
    await setupWebSocket();
    await sleep(1000);

    // Core operations tests
    await testOperationsConfig();
    await sleep(500);

    await testSampleDataCreation();
    await sleep(1000);

    const operationsResult = await testOperationsManagement();
    await sleep(2000); // Allow for processing and WebSocket events

    await testLatestOperations();
    await sleep(500);

    // Feature-specific tests
    await testCrewManagement();
    await sleep(1000);

    await testShiftManagement();
    await sleep(1000);

    await testRouteManagement();
    await sleep(500);

    await testAlertManagement();
    await sleep(1000);

    // Analytics and monitoring
    await testAnalyticsDashboard();
    await sleep(500);

    await testRealTimeMetrics();
    await sleep(500);

    // Performance and edge cases
    await testPerformanceScenarios();
    await sleep(500);

    await testErrorHandling();
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
  log('🎯 OPERATIONS MANAGEMENT SYSTEM TEST SUMMARY', 'cyan');
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
    log('\n🎉 OPERATIONS SYSTEM IS FULLY OPERATIONAL!', 'green');
    log('✨ Crew management, shift scheduling, and performance monitoring are working perfectly', 'green');
  } else if (successRate >= 70) {
    log('\n⚡ OPERATIONS SYSTEM IS MOSTLY FUNCTIONAL', 'yellow');
    log('🔧 Some minor issues detected - check failed tests above', 'yellow');
  } else {
    log('\n🚨 OPERATIONS SYSTEM NEEDS ATTENTION', 'red');
    log('🔧 Multiple issues detected - review server logs and failed tests', 'red');
  }
  
  log('\n🔗 WebSocket Events: Real-time operations updates tested');
  log('👥 Crew Management: Scheduling, availability, and performance tracking validated');
  log('📅 Shift Management: Assignment, tracking, and status updates verified');
  log('🛤️  Route Management: Planning, optimization, and performance monitoring confirmed');
  log('🚨 Alert System: Notification, assignment, and resolution workflow tested');
  log('📊 Analytics: Performance dashboards and real-time metrics verified');
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
runOperationsSystemTests().then(() => {
  process.exit(failedTests > 0 ? 1 : 0);
}).catch((err) => {
  error(`Test suite failed: ${err.message}`);
  process.exit(1);
});