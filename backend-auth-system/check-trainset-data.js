const axios = require('axios');

async function checkData() {
  try {
    // Login
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      identifier: 'admin@kmrl.com',
      password: 'Password123'
    });
    const token = loginResponse.data.data.token;

    // Get trainsets
    const response = await axios.get('http://localhost:5000/api/trainsets', {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const trainsets = response.data.data;
    console.log(`Found ${trainsets.length} trainsets:\n`);
    
    // Show first 3 trainsets with key fields
    trainsets.slice(0, 3).forEach(t => {
      console.log(`Trainset: ${t.trainsetNumber}`);
      console.log(`  ID: ${t.id}`);
      console.log(`  Manufacturer: ${t.manufacturer}`);
      console.log(`  Model: ${t.model}`);
      console.log(`  Capacity: ${t.capacity}`);
      console.log(`  Location: ${t.location || 'Not set'}`);
      console.log(`  Total Mileage: ${t.totalMileage}`);
      console.log(`  Current Mileage: ${t.currentMileage}`);
      console.log(`  Last Maintenance: ${t.lastMaintenanceDate || 'Not set'}`);
      console.log(`  Next Maintenance: ${t.nextMaintenanceDate || 'Not set'}`);
      console.log(`  Fitness Expiry: ${t.fitnessExpiry || 'Not set'}`);
      console.log(`  Operational Hours: ${t.operationalHours || 0}`);
      console.log('---');
    });

  } catch (error) {
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
  }
}

checkData();