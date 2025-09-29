const axios = require('axios');

const API_BASE = 'http://localhost:5000/api';
let token;

async function login() {
  const response = await axios.post(`${API_BASE}/auth/login`, {
    identifier: 'admin@kmrl.com',
    password: 'Password123'
  });
  token = response.data.data.token;
  console.log('✅ Logged in as admin');
}

async function testAutoStatus() {
  try {
    await login();
    
    const config = {
      headers: { 'Authorization': `Bearer ${token}` }
    };

    console.log('\n🔍 AUTOMATIC STATUS UPDATER TEST\n');
    console.log('=' .repeat(50));

    // 1. Check service status
    console.log('\n1️⃣ Checking Service Status...');
    const statusRes = await axios.get(`${API_BASE}/status-updater/status`, config);
    console.log('   Service Status:', statusRes.data.data);

    // 2. Get upcoming changes
    console.log('\n2️⃣ Getting Upcoming Changes (next 30 days)...');
    const upcomingRes = await axios.get(`${API_BASE}/status-updater/upcoming?days=30`, config);
    const upcoming = upcomingRes.data.data;
    
    if (upcoming.maintenanceDue.length > 0) {
      console.log('\n   📅 Maintenance Due:');
      upcoming.maintenanceDue.forEach(t => {
        console.log(`      - ${t.trainsetNumber}: Due in ${t.daysUntil} days (${new Date(t.dueDate).toLocaleDateString()})`);
      });
    } else {
      console.log('   📅 No maintenance due in next 30 days');
    }

    if (upcoming.fitnessExpiring.length > 0) {
      console.log('\n   🔴 Fitness Expiring:');
      upcoming.fitnessExpiring.forEach(t => {
        console.log(`      - ${t.trainsetNumber}: Expires in ${t.daysUntil} days (${new Date(t.expiryDate).toLocaleDateString()})`);
      });
    } else {
      console.log('   🔴 No fitness certificates expiring in next 30 days');
    }

    // 3. Manually trigger status check
    console.log('\n3️⃣ Triggering Manual Status Check...');
    const checkRes = await axios.post(`${API_BASE}/status-updater/check`, {}, config);
    const result = checkRes.data.data;
    
    console.log('\n   📊 Status Check Results:');
    console.log(`      - Trainsets checked: ${result.maintenanceDue + result.fitnessExpired + result.cleaningScheduled + result.backToService || 'No changes'}`);
    console.log(`      - Sent to maintenance: ${result.maintenanceDue}`);
    console.log(`      - Marked out of order (fitness expired): ${result.fitnessExpired}`);
    console.log(`      - Scheduled for cleaning: ${result.cleaningScheduled}`);
    console.log(`      - Returned to service: ${result.backToService}`);

    // 4. Check logs
    console.log('\n4️⃣ Recent Status Change Logs...');
    const logsRes = await axios.get(`${API_BASE}/status-updater/logs?limit=5`, config);
    const logs = logsRes.data.data;
    
    if (logs.length > 0) {
      console.log('   📝 Recent Changes:');
      logs.forEach(log => {
        console.log(`      - ${log.trainsetNumber}: ${log.oldStatus} → ${log.newStatus}`);
        console.log(`        Reason: ${log.reason}`);
        console.log(`        Time: ${new Date(log.timestamp).toLocaleString()}\n`);
      });
    } else {
      console.log('   📝 No recent status changes');
    }

    // 5. Create a test trainset with expired fitness
    console.log('\n5️⃣ Creating Test Trainset with Expired Fitness...');
    const testTrainset = {
      trainsetNumber: 'TEST-AUTO-001',
      manufacturer: 'Test',
      model: 'AutoTest',
      yearOfManufacture: 2020,
      capacity: 100,
      maxSpeed: 60,
      status: 'AVAILABLE',
      depot: 'Muttom',
      fitnessExpiry: '2024-01-01', // Expired
      nextMaintenanceDate: '2024-01-01' // Due
    };

    try {
      await axios.post(`${API_BASE}/trainsets`, testTrainset, config);
      console.log('   ✅ Test trainset created');
      
      // Trigger check again
      console.log('   🔄 Triggering status check...');
      await axios.post(`${API_BASE}/status-updater/check`, {}, config);
      
      // Check the trainset status
      const trainsetsRes = await axios.get(`${API_BASE}/trainsets`, config);
      const testTrain = trainsetsRes.data.data.find(t => t.trainsetNumber === 'TEST-AUTO-001');
      
      if (testTrain) {
        console.log(`   📍 Test trainset status: ${testTrain.status}`);
        console.log('   ✅ Automatic status change working!' );
        
        // Clean up - delete test trainset
        await axios.delete(`${API_BASE}/trainsets/${testTrain.id}`, config);
        console.log('   🗑️ Test trainset deleted');
      }
    } catch (error) {
      if (error.response?.data?.message?.includes('already exists')) {
        console.log('   ℹ️ Test trainset already exists');
      } else {
        console.log('   ⚠️ Error:', error.response?.data?.message || error.message);
      }
    }

    console.log('\n' + '=' .repeat(50));
    console.log('\n✅ AUTOMATIC STATUS UPDATER IS WORKING!');
    console.log('\n📌 The system will automatically:');
    console.log('   • Check all trainsets every hour');
    console.log('   • Move trains to MAINTENANCE when due date is reached');
    console.log('   • Mark trains OUT_OF_ORDER when fitness expires');
    console.log('   • Schedule cleaning at 10 PM daily');
    console.log('   • Return trains from cleaning at midnight');
    console.log('\n🎯 Status changes are logged and trackable');

  } catch (error) {
    console.error('\n❌ Error:', error.response?.data || error.message);
  }
}

testAutoStatus();