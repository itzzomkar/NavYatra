const axios = require('axios');

const API_BASE = 'http://localhost:5000/api';

// First, we need to login to get a token
async function login() {
  try {
    const response = await axios.post(`${API_BASE}/auth/login`, {
      identifier: 'admin@kmrl.com',
      password: 'admin123'
    });
    return response.data.data.token;
  } catch (error) {
    console.error('Login failed:', error.message);
    throw error;
  }
}

async function testSchedulesAPI() {
  try {
    console.log('🧪 Testing Schedules API...\n');

    // First login to get token
    console.log('0. Authenticating...');
    const token = await login();
    console.log('   ✅ Authenticated successfully\n');

    // Set axios default headers with token
    const config = {
      headers: { 'Authorization': `Bearer ${token}` }
    };

    // Test 1: Get all schedules
    console.log('1. GET /schedules - Get all schedules');
    const allSchedulesResponse = await axios.get(`${API_BASE}/schedules`, config);
    const allSchedules = allSchedulesResponse.data.data || allSchedulesResponse.data;
    console.log(`   ✅ Found ${allSchedules.length} schedules`);
    
    if (allSchedules.length > 0) {
      console.log(`   First schedule: ${allSchedules[0].scheduleNumber} - ${allSchedules[0].status}`);
      console.log(`   Route: ${allSchedules[0].route?.source} → ${allSchedules[0].route?.destination}`);
    }

    // Test 2: Get schedules by date
    console.log('\n2. GET /schedules?date=today - Get today\'s schedules');
    const todayResponse = await axios.get(`${API_BASE}/schedules?date=today`, config);
    const todaySchedules = todayResponse.data.data || todayResponse.data;
    console.log(`   ✅ Found ${todaySchedules.length} schedules for today`);

    // Test 3: Get schedules by status
    console.log('\n3. GET /schedules?status=SCHEDULED - Get scheduled schedules');
    const scheduledResponse = await axios.get(`${API_BASE}/schedules?status=SCHEDULED`, config);
    const scheduledSchedules = scheduledResponse.data.data || scheduledResponse.data;
    console.log(`   ✅ Found ${scheduledSchedules.length} scheduled schedules`);

    // Test 4: Get specific schedule
    if (allSchedules.length > 0) {
      const scheduleId = allSchedules[0]._id;
      console.log(`\n4. GET /schedules/${scheduleId} - Get specific schedule`);
      const singleScheduleResponse = await axios.get(`${API_BASE}/schedules/${scheduleId}`, config);
      const singleSchedule = singleScheduleResponse.data.data || singleScheduleResponse.data;
      console.log(`   ✅ Retrieved schedule: ${singleSchedule.scheduleNumber}`);
      console.log(`   - Status: ${singleSchedule.status}`);
      console.log(`   - Operational Date: ${singleSchedule.operationalDate}`);
      console.log(`   - Shift: ${singleSchedule.shiftType}`);
    }

    // Test 5: Get schedule analytics
    console.log('\n5. GET /schedules/analytics/dashboard - Get schedule analytics');
    try {
      const analyticsResponse = await axios.get(`${API_BASE}/schedules/analytics/dashboard`, config);
      const analytics = analyticsResponse.data.data || analyticsResponse.data;
      console.log(`   ✅ Analytics retrieved successfully`);
      console.log(`   - Total schedules: ${analytics.total || 'N/A'}`);
      console.log(`   - Active schedules: ${analytics.active || 'N/A'}`);
    } catch (error) {
      console.log(`   ⚠️  Analytics endpoint not available: ${error.response?.status}`);
    }

    console.log('\n✅ All schedule API tests completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', error.response.data);
    }
    process.exit(1);
  }
}

testSchedulesAPI();