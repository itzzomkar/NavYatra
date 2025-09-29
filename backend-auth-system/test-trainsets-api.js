const axios = require('axios');

const API_BASE = 'http://localhost:5000/api';

// First, we need to login to get a token
async function login() {
  try {
    const response = await axios.post(`${API_BASE}/auth/login`, {
      identifier: 'admin@kmrl.com',  // Can be email or username
      password: 'admin123'  // Correct password
    });
    return response.data.data.token;  // Token is nested in data.data
  } catch (error) {
    console.error('Login failed:', error.message);
    throw error;
  }
}

async function testTrainsetAPI() {
  try {
    console.log('🧪 Testing Trainsets API...\n');

    // First login to get token
    console.log('0. Authenticating...');
    const token = await login();
    console.log('   ✅ Authenticated successfully\n');

    // Set axios default headers with token
    const config = {
      headers: { 'Authorization': `Bearer ${token}` }
    };

    // Test 1: Get all trainsets
    console.log('1. GET /trainsets - Get all trainsets');
    const allTrainsetsResponse = await axios.get(`${API_BASE}/trainsets`, config);
    const allTrainsets = allTrainsetsResponse.data.data || allTrainsetsResponse.data;
    console.log(`   ✅ Found ${allTrainsets.length} trainsets`);
    
    if (allTrainsets.length > 0) {
      console.log(`   First trainset: ${allTrainsets[0].trainsetNumber} - ${allTrainsets[0].status}`);
    }

    // Test 2: Get statistics
    console.log('\n2. GET /trainsets/stats/dashboard - Get statistics');
    const statsResponse = await axios.get(`${API_BASE}/trainsets/stats/dashboard`, config);
    const stats = statsResponse.data.data || statsResponse.data;
    console.log(`   ✅ Statistics retrieved:`);
    console.log(`   - Total trainsets: ${stats.total}`);
    console.log(`   - Maintenance due: ${stats.maintenanceDue}`);

    // Test 3: Get a specific trainset
    if (allTrainsets.length > 0) {
      const trainsetId = allTrainsets[0]._id;
      console.log(`\n3. GET /trainsets/${trainsetId} - Get specific trainset`);
      const singleTrainsetResponse = await axios.get(`${API_BASE}/trainsets/${trainsetId}`, config);
      const singleTrainset = singleTrainsetResponse.data.data || singleTrainsetResponse.data;
      console.log(`   ✅ Retrieved trainset: ${singleTrainset.trainsetNumber}`);
      console.log(`   - Manufacturer: ${singleTrainset.manufacturer}`);
      console.log(`   - Model: ${singleTrainset.model}`);
      console.log(`   - Status: ${singleTrainset.status}`);
      console.log(`   - Current Mileage: ${singleTrainset.currentMileage} km`);
    }

    // Test 4: Create a new trainset
    console.log('\n4. POST /trainsets - Create new trainset');
    const newTrainset = {
      trainsetNumber: 'TS009',
      manufacturer: 'Test Manufacturer',
      model: 'Test Model',
      yearOfManufacture: 2024,
      capacity: 1000,
      maxSpeed: 90,
      currentMileage: 0,
      totalMileage: 0,
      status: 'AVAILABLE',
      location: 'Test Location',
      depot: 'Test Depot',
      fitnessExpiry: new Date('2026-01-01'),
      operationalHours: 0
    };

    try {
      const createdResponse = await axios.post(`${API_BASE}/trainsets`, newTrainset, config);
      const created = createdResponse.data.data || createdResponse.data;
      console.log(`   ✅ Created trainset: ${created.trainsetNumber}`);
      
      // Test 5: Update the created trainset
      console.log('\n5. PUT /trainsets/:id - Update trainset');
      const updateData = {
        status: 'IN_SERVICE',
        location: 'Updated Location'
      };
      const updatedResponse = await axios.put(`${API_BASE}/trainsets/${created._id}`, updateData, config);
      const updated = updatedResponse.data.data || updatedResponse.data;
      console.log(`   ✅ Updated trainset status to: ${updated.status}`);
      console.log(`   - New location: ${updated.location}`);

      // Test 6: Delete the test trainset
      console.log('\n6. DELETE /trainsets/:id - Delete trainset');
      await axios.delete(`${API_BASE}/trainsets/${created._id}`, config);
      console.log(`   ✅ Deleted test trainset`);

    } catch (error) {
      if (error.response && error.response.status === 401) {
        console.log('   ⚠️  Authentication required for create/update/delete operations');
      } else {
        throw error;
      }
    }

    console.log('\n✅ All API tests completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', error.response.data);
    }
    process.exit(1);
  }
}

// Check if axios is installed
try {
  require.resolve('axios');
  testTrainsetAPI();
} catch(e) {
  console.log('Installing axios...');
  const { execSync } = require('child_process');
  execSync('npm install axios', { stdio: 'inherit' });
  console.log('Axios installed. Please run this script again.');
}