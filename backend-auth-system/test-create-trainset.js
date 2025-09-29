const axios = require('axios');

async function testCreateTrainset() {
  const API_URL = 'http://localhost:3000/api';
  
  try {
    // First, create a test user or use existing admin
    console.log('1. Creating/logging in user...\n');
    
    // Try to login with existing user first
    let token;
    try {
      const loginResponse = await axios.post(`${API_URL}/auth/login`, {
        identifier: 'admin@kmrl.com',
        password: 'admin123'
      });
      token = loginResponse.data.data.token;
      console.log('✅ Logged in as admin\n');
    } catch (error) {
      // If login fails, try to create a new user
      console.log('Admin login failed, creating test user...');
      
      try {
        const signupResponse = await axios.post(`${API_URL}/auth/signup`, {
          username: 'testuser',
          email: 'test@kmrl.com',
          password: 'Test123!',
          firstName: 'Test',
          lastName: 'User'
        });
        token = signupResponse.data.data.token;
        console.log('✅ Created and logged in as test user\n');
      } catch (signupError) {
        // If user exists, try to login
        const loginResponse = await axios.post(`${API_URL}/auth/login`, {
          identifier: 'test@kmrl.com',
          password: 'Test123!'
        });
        token = loginResponse.data.data.token;
        console.log('✅ Logged in as test user\n');
      }
    }
    
    // Test data for new trainset
    const newTrainset = {
      trainsetNumber: `TS-TEST-${Date.now()}`,
      manufacturer: 'Alstom',
      model: 'Metropolis',
      yearOfManufacture: 2023,
      capacity: 975,
      maxSpeed: 80,
      depot: 'Muttom',
      currentMileage: 0,
      totalMileage: 0,
      status: 'AVAILABLE',
      location: 'Muttom Depot',
      operationalHours: 0
    };
    
    console.log('2. Creating trainset with data:');
    console.log(JSON.stringify(newTrainset, null, 2));
    console.log();
    
    // Try to create trainset
    const createResponse = await axios.post(
      `${API_URL}/trainsets`,
      newTrainset,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('3. Create Response:');
    console.log('   Status:', createResponse.status);
    console.log('   Success:', createResponse.data.success);
    if (createResponse.data.data) {
      console.log('   Created Trainset ID:', createResponse.data.data._id);
      console.log('   Trainset Number:', createResponse.data.data.trainsetNumber);
    }
    console.log('\n✅ Trainset created successfully!');
    
    // Verify by fetching all trainsets
    console.log('\n4. Verifying by fetching all trainsets...');
    const getResponse = await axios.get(`${API_URL}/trainsets`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    const createdTrainset = getResponse.data.data.find(t => 
      t.trainsetNumber === newTrainset.trainsetNumber
    );
    
    if (createdTrainset) {
      console.log('✅ Trainset found in database!');
      console.log('   Status:', createdTrainset.status);
      console.log('   Location:', createdTrainset.location);
    } else {
      console.log('⚠️ Trainset not found in list');
    }
    
  } catch (error) {
    console.error('\n❌ Error occurred:');
    console.error('   Message:', error.message);
    
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Response:', JSON.stringify(error.response.data, null, 2));
      
      // Check for validation errors
      if (error.response.data.errors) {
        console.error('\n   Validation Errors:');
        error.response.data.errors.forEach(err => {
          console.error(`   - ${err.field || err.path}: ${err.message || err.msg}`);
        });
      }
    } else if (error.request) {
      console.error('   No response received from server');
      console.error('   Is the backend server running on port 3000?');
    }
  }
}

// Run the test
console.log('🚀 Testing Trainset Creation API\n');
console.log('=' .repeat(50));
console.log();

testCreateTrainset();