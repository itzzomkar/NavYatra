require('dotenv').config();
const axios = require('axios');

const API_BASE = 'http://localhost:5000';

// Test user credentials (assuming admin user exists)
const TEST_CREDENTIALS = {
  identifier: 'admin@kmrl.com',  // The API expects 'identifier' not 'email'
  password: 'admin123'
};

let authToken = '';

const testAnalytics = async () => {
  try {
    console.log('🔐 Testing analytics endpoints...\n');
    
    // Step 1: Login to get auth token
    console.log('1. Logging in...');
    const loginResponse = await axios.post(`${API_BASE}/api/auth/login`, TEST_CREDENTIALS);
    
    if (loginResponse.data.success) {
      authToken = loginResponse.data.token;
      console.log('✅ Login successful');
    } else {
      throw new Error('Login failed: ' + loginResponse.data.message);
    }

    // Step 2: Test analytics endpoints
    const endpoints = [
      '/api/analytics/dashboard',
      '/api/analytics/optimization',
      '/api/analytics/performance',
      '/api/analytics/utilization',
      '/api/analytics/maintenance'
    ];

    const headers = {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json'
    };

    for (const endpoint of endpoints) {
      console.log(`\n2. Testing ${endpoint}...`);
      
      try {
        const response = await axios.get(`${API_BASE}${endpoint}`, { headers });
        
        if (response.data.success) {
          console.log(`✅ ${endpoint} - Success`);
          
          // Show sample data for dashboard and optimization endpoints
          if (endpoint === '/api/analytics/dashboard') {
            const data = response.data.data;
            console.log(`   - Trainsets: ${data.trainsets?.total || 0}`);
            console.log(`   - Schedules: ${data.schedules?.total || 0}`);
            console.log(`   - Optimizations: ${data.optimizations?.total || 0}`);
            console.log(`   - Recent optimizations: ${data.recent?.length || 0}`);
          } else if (endpoint === '/api/analytics/optimization') {
            const data = response.data.data;
            console.log(`   - Recent optimizations: ${data.recent?.length || 0}`);
            console.log(`   - Statistics: Total=${data.statistics?.total || 0}, Completed=${data.statistics?.completed || 0}`);
            console.log(`   - Average score: ${data.statistics?.averageScore || 0}`);
            console.log(`   - Success rate: ${data.statistics?.successRate || 0}%`);
          }
        } else {
          console.log(`❌ ${endpoint} - Failed: ${response.data.message}`);
        }
      } catch (error) {
        console.log(`❌ ${endpoint} - Error: ${error.response?.data?.message || error.message}`);
      }
    }

    console.log('\n🎯 Analytics endpoints test completed!');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data?.message || error.message);
    
    if (error.response?.data) {
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
    }
  }
};

// Wait for server to be ready, then run tests
setTimeout(() => {
  testAnalytics();
}, 2000);

console.log('⏳ Waiting for server to start...');