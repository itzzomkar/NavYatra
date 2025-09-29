const axios = require('axios');

const API_BASE = 'http://localhost:5000/api';

async function testUpdateTrainset() {
  try {
    console.log('🧪 Testing Trainset Update with All Fields...\n');

    // Step 1: Login
    console.log('1. Authenticating...');
    const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
      identifier: 'admin@kmrl.com',
      password: 'Password123'
    });
    const token = loginResponse.data.data.token;
    console.log('   ✅ Authenticated\n');

    // Set auth header
    const config = {
      headers: { 'Authorization': `Bearer ${token}` }
    };

    // Step 2: Get first trainset
    console.log('2. Getting first trainset...');
    const trainsetsResponse = await axios.get(`${API_BASE}/trainsets`, config);
    const trainsets = trainsetsResponse.data.data;
    
    if (trainsets.length === 0) {
      console.log('   ❌ No trainsets found');
      return;
    }
    
    const trainset = trainsets[0];
    console.log(`   ✅ Found trainset: ${trainset.trainsetNumber}\n`);

    // Step 3: Update with all fields
    console.log('3. Updating trainset with all fields...');
    const updateData = {
      trainsetNumber: trainset.trainsetNumber,
      manufacturer: 'Siemens',
      model: 'Metro Updated',
      yearOfManufacture: 2023,
      capacity: 1200,
      maxSpeed: 90,
      currentMileage: 5000,
      totalMileage: 15000,
      status: 'IN_SERVICE',
      location: 'Ernakulam Station',
      depot: 'Aluva',
      lastMaintenanceDate: '2024-08-15',
      nextMaintenanceDate: '2024-10-15',
      fitnessExpiry: '2025-12-31',
      operationalHours: 250
    };

    const updateResponse = await axios.put(
      `${API_BASE}/trainsets/${trainset.id}`,
      updateData,
      config
    );

    console.log('   ✅ Update successful\n');

    // Step 4: Verify the update
    console.log('4. Verifying updated data...');
    const verifyResponse = await axios.get(`${API_BASE}/trainsets/${trainset.id}`, config);
    const updatedTrainset = verifyResponse.data.data;

    console.log('   Updated trainset data:');
    console.log(`   - Manufacturer: ${updatedTrainset.manufacturer}`);
    console.log(`   - Model: ${updatedTrainset.model}`);
    console.log(`   - Capacity: ${updatedTrainset.capacity}`);
    console.log(`   - Location: ${updatedTrainset.location}`);
    console.log(`   - Current Mileage: ${updatedTrainset.currentMileage}`);
    console.log(`   - Total Mileage: ${updatedTrainset.totalMileage}`);
    console.log(`   - Operational Hours: ${updatedTrainset.operationalHours}`);
    console.log(`   - Last Maintenance: ${updatedTrainset.lastMaintenanceDate}`);
    console.log(`   - Next Maintenance: ${updatedTrainset.nextMaintenanceDate}`);
    console.log(`   - Fitness Expiry: ${updatedTrainset.fitnessExpiry}`);

    console.log('\n✅ All fields updated successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', error.response.data);
    }
  }
}

// Run the test
testUpdateTrainset();