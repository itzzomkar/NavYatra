const axios = require('axios');

async function testSchedulesAPI() {
  try {
    // Test without any filters (should return all)
    console.log('1. Testing schedules API without filters...');
    const response1 = await axios.get('http://localhost:5000/api/schedules', {
      headers: {
        'Authorization': 'Bearer dummy'  // Will fail auth but show us the path
      }
    }).catch(err => {
      console.log('   Auth failed as expected, trying with params...');
    });
    
    // Test with all dates
    console.log('\n2. Testing with date=all parameter...');
    const response2 = await axios.get('http://localhost:5000/api/schedules?date=all', {
      headers: {
        'Authorization': 'Bearer dummy'
      }
    }).catch(err => {
      console.log('   Status:', err.response?.status);
      console.log('   Message:', err.response?.data?.message);
    });
    
    // Direct database query to compare
    const mongoose = require('mongoose');
    const Schedule = require('./models/Schedule');
    
    await mongoose.connect('mongodb://localhost:27017/auth_system_db');
    
    console.log('\n3. Direct database query:');
    const dbSchedules = await Schedule.find({}).select('scheduleNumber status operationalDate isActive');
    console.log('   Found in DB:', dbSchedules.length, 'schedules');
    dbSchedules.forEach(s => {
      console.log(`   - ${s.scheduleNumber}: ${s.status}, Date: ${s.operationalDate?.toISOString().split('T')[0]}`);
    });
    
    mongoose.disconnect();
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testSchedulesAPI();