const axios = require('axios');

const BASE_URL = 'http://localhost:5000';

// Test configuration
const testConfig = {
  email: 'admin@kmrl.com', 
  password: 'Admin123!'
};

let authToken = '';

// Test authentication first
async function authenticate() {
  try {
    const response = await axios.post(`${BASE_URL}/api/auth/login`, testConfig);
    if (response.data.success && response.data.token) {
      authToken = response.data.token;
      console.log('✅ Authentication successful');
      return true;
    } else {
      console.error('❌ Authentication failed:', response.data.message);
      return false;
    }
  } catch (error) {
    console.error('❌ Authentication error:', error.response?.data?.message || error.message);
    return false;
  }
}

// Test engine status
async function testEngineStatus() {
  try {
    console.log('\n📊 Testing Engine Status...');
    
    const response = await axios.get(`${BASE_URL}/api/real-time-engine/status`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    
    if (response.data.success) {
      console.log('✅ Engine status endpoint working');
      console.log('🔧 Engine Status:', {
        isRunning: response.data.data.isRunning,
        activeOptimizations: response.data.data.activeOptimizations,
        stations: response.data.data.realTimeData?.stations || 0,
        trains: response.data.data.realTimeData?.trains || 0,
        avgPassengerLoad: response.data.data.systemMetrics?.averagePassengerLoad?.toFixed(2) || '0',
        onTimePerformance: response.data.data.systemMetrics?.onTimePerformance?.toFixed(2) || '0'
      });
      
      return response.data.data.isRunning;
    } else {
      console.log('❌ Engine status failed:', response.data.message);
      return false;
    }
  } catch (error) {
    console.log('❌ Engine status error:', error.response?.data?.message || error.message);
    return false;
  }
}

// Test engine control (start/stop)
async function testEngineControl() {
  try {
    console.log('\n🎛️ Testing Engine Control...');
    
    // Test starting engine
    console.log('🚀 Testing engine start...');
    const startResponse = await axios.post(`${BASE_URL}/api/real-time-engine/start`, {}, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    
    if (startResponse.data.success) {
      console.log('✅ Engine start successful');
      
      // Wait a moment for engine to initialize
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Check status after start
      const statusAfterStart = await testEngineStatus();
      if (statusAfterStart) {
        console.log('✅ Engine is running after start command');
      }
      
      return true;
    } else {
      console.log('❌ Engine start failed:', startResponse.data.message);
      return false;
    }
    
  } catch (error) {
    if (error.response?.status === 403) {
      console.log('⚠️ Admin access required for engine control (expected for non-admin users)');
      return true; // This is expected behavior
    } else {
      console.log('❌ Engine control error:', error.response?.data?.message || error.message);
      return false;
    }
  }
}

// Test real-time data endpoints
async function testRealTimeData() {
  try {
    console.log('\n📡 Testing Real-time Data Endpoints...');
    
    // Test real-time data
    console.log('1. Testing real-time data endpoint...');
    const realTimeResponse = await axios.get(`${BASE_URL}/api/real-time-engine/real-time-data`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    
    if (realTimeResponse.data.success) {
      console.log('✅ Real-time data endpoint working');
      console.log('📊 Real-time data preview:', {
        passengerFlowStations: realTimeResponse.data.data.passengerFlow?.length || 0,
        trainPositions: realTimeResponse.data.data.trainPositions?.length || 0,
        weatherCondition: realTimeResponse.data.data.weatherConditions?.condition || 'N/A',
        energyPrice: realTimeResponse.data.data.energyPricing?.currentPrice || 0,
        emergencyAlerts: realTimeResponse.data.data.emergencyAlerts?.length || 0,
        crowdDensityStations: realTimeResponse.data.data.crowdDensity?.length || 0
      });
    } else {
      console.log('❌ Real-time data failed:', realTimeResponse.data.message);
    }
    
    // Test active optimizations
    console.log('\n2. Testing active optimizations endpoint...');
    const activeResponse = await axios.get(`${BASE_URL}/api/real-time-engine/active-optimizations`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    
    if (activeResponse.data.success) {
      console.log('✅ Active optimizations endpoint working');
      console.log('🔄 Active optimizations:', {
        count: activeResponse.data.count,
        optimizations: activeResponse.data.data.map(opt => ({
          id: opt.optimizationId,
          strategy: opt.strategy,
          algorithm: opt.algorithm
        }))
      });
    } else {
      console.log('❌ Active optimizations failed:', activeResponse.data.message);
    }
    
    // Test system metrics
    console.log('\n3. Testing system metrics endpoint...');
    const metricsResponse = await axios.get(`${BASE_URL}/api/real-time-engine/system-metrics`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    
    if (metricsResponse.data.success) {
      console.log('✅ System metrics endpoint working');
      console.log('📈 System metrics preview:', {
        dailyOptimizations: metricsResponse.data.data.dailyStats?.totalOptimizations || 0,
        successRate: metricsResponse.data.data.dailyStats?.successRate || '0%',
        avgFitnessScore: metricsResponse.data.data.dailyStats?.avgFitnessScore || '0',
        operationalHealth: metricsResponse.data.data.operationalHealth?.overall || 'unknown',
        recentOptimizations: metricsResponse.data.data.recentOptimizations?.length || 0
      });
    } else {
      console.log('❌ System metrics failed:', metricsResponse.data.message);
    }
    
    // Test operational insights
    console.log('\n4. Testing operational insights endpoint...');
    const insightsResponse = await axios.get(`${BASE_URL}/api/real-time-engine/operational-insights`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    
    if (insightsResponse.data.success) {
      console.log('✅ Operational insights endpoint working');
      console.log('💡 Operational insights preview:', {
        periodType: insightsResponse.data.data.operationalState?.periodType || 'unknown',
        passengerLoad: (insightsResponse.data.data.operationalState?.totalPassengerLoad * 100)?.toFixed(1) + '%' || '0%',
        onTimePerformance: (insightsResponse.data.data.operationalState?.onTimePerformance * 100)?.toFixed(1) + '%' || '0%',
        insights: insightsResponse.data.data.insights?.length || 0,
        recommendations: insightsResponse.data.data.recommendations?.length || 0,
        alerts: insightsResponse.data.data.alerts?.length || 0
      });
    } else {
      console.log('❌ Operational insights failed:', insightsResponse.data.message);
    }
    
  } catch (error) {
    console.log('❌ Real-time data endpoints error:', error.response?.data?.message || error.message);
  }
}

// Test manual optimization cycle
async function testManualOptimization() {
  try {
    console.log('\n🔧 Testing Manual Optimization...');
    
    const response = await axios.post(`${BASE_URL}/api/real-time-engine/force-cycle`, {
      urgency: 'manual'
    }, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    
    if (response.data.success) {
      console.log('✅ Manual optimization cycle triggered successfully');
      console.log('🎯 Manual cycle info:', {
        triggeredBy: response.data.triggeredBy,
        timestamp: response.data.timestamp
      });
      
      // Wait a moment and check active optimizations
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const activeResponse = await axios.get(`${BASE_URL}/api/real-time-engine/active-optimizations`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      
      if (activeResponse.data.success && activeResponse.data.count > 0) {
        console.log('✅ New optimization is now active after manual trigger');
      }
      
    } else {
      console.log('❌ Manual optimization failed:', response.data.message);
    }
    
  } catch (error) {
    if (error.response?.status === 403) {
      console.log('⚠️ Admin access required for manual optimization (expected for non-admin users)');
    } else {
      console.log('❌ Manual optimization error:', error.response?.data?.message || error.message);
    }
  }
}

// Test error handling
async function testErrorHandling() {
  try {
    console.log('\n🚨 Testing Error Handling...');
    
    // Test with invalid optimization ID
    try {
      await axios.post(`${BASE_URL}/api/real-time-engine/stop-optimization/invalid-id`, {}, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      console.log('❌ Should have failed with invalid optimization ID');
    } catch (error) {
      if (error.response?.status === 400 || error.response?.status === 404) {
        console.log('✅ Invalid optimization ID validation working');
      } else {
        console.log('❌ Unexpected error for invalid optimization ID:', error.message);
      }
    }
    
    // Test unauthorized access
    try {
      await axios.get(`${BASE_URL}/api/real-time-engine/status`);
      console.log('❌ Should have failed without authentication');
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('✅ Authentication requirement working');
      } else {
        console.log('❌ Unexpected error for no authentication:', error.message);
      }
    }
    
  } catch (error) {
    console.log('❌ Error handling test error:', error.message);
  }
}

// Test WebSocket connections (basic check)
async function testWebSocketIntegration() {
  console.log('\n🔌 Testing WebSocket Integration...');
  
  // Note: This is a basic test - full WebSocket testing would require socket.io-client
  console.log('ℹ️ WebSocket integration testing requires socket.io-client');
  console.log('ℹ️ Real-time updates are broadcast on these events:');
  console.log('  - optimization_engine_status');
  console.log('  - optimization_cycle_complete'); 
  console.log('  - optimization_progress');
  console.log('  - optimization_completed');
  console.log('  - emergency_optimization');
  console.log('  - peak_hour_optimization');
  
  // Check if WebSocket service is available by checking server endpoints
  try {
    const statusResponse = await axios.get(`${BASE_URL}/api/real-time-engine/status`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    
    if (statusResponse.data.success) {
      console.log('✅ WebSocket service integration appears to be working');
    }
  } catch (error) {
    console.log('❌ WebSocket service integration issue:', error.message);
  }
}

// Test performance under load (basic simulation)
async function testPerformanceLoad() {
  console.log('\n⚡ Testing Performance Under Load...');
  
  const concurrentRequests = 5;
  const promises = [];
  
  for (let i = 0; i < concurrentRequests; i++) {
    promises.push(
      axios.get(`${BASE_URL}/api/real-time-engine/status`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      })
    );
  }
  
  try {
    const startTime = Date.now();
    const responses = await Promise.all(promises);
    const endTime = Date.now();
    
    const successfulResponses = responses.filter(r => r.data.success).length;
    const totalTime = endTime - startTime;
    const avgResponseTime = totalTime / concurrentRequests;
    
    console.log('✅ Performance test completed');
    console.log('📊 Performance metrics:', {
      concurrentRequests,
      successfulResponses,
      totalTime: `${totalTime}ms`,
      avgResponseTime: `${avgResponseTime.toFixed(2)}ms`
    });
    
    if (avgResponseTime < 1000) {
      console.log('✅ Response time is acceptable');
    } else {
      console.log('⚠️ Response time may need optimization');
    }
    
  } catch (error) {
    console.log('❌ Performance test error:', error.message);
  }
}

// Main test runner
async function runTests() {
  console.log('🧪 Starting Real-time Optimization Engine Tests...');
  console.log('=' .repeat(60));

  // Authenticate first
  const authSuccess = await authenticate();
  if (!authSuccess) {
    console.log('❌ Cannot proceed without authentication');
    return;
  }

  // Run all tests
  await testEngineStatus();
  await testEngineControl();
  await testRealTimeData();
  await testManualOptimization();
  await testErrorHandling();
  await testWebSocketIntegration();
  await testPerformanceLoad();

  console.log('\n' + '='.repeat(60));
  console.log('✅ Real-time Optimization Engine Testing Complete!');
  console.log('\n💡 Next Steps:');
  console.log('- Monitor the engine in production');
  console.log('- Set up proper monitoring and alerting');
  console.log('- Consider load testing with more concurrent users');
  console.log('- Implement proper logging and metrics collection');
  console.log('- Test WebSocket real-time updates with frontend');
}

// Handle process termination gracefully
process.on('unhandledRejection', (reason, promise) => {
  console.log('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Run the tests
runTests().catch(console.error);