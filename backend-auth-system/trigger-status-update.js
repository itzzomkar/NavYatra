const axios = require('axios');

async function triggerStatusUpdate() {
  try {
    // Login as admin
    console.log('Logging in as admin...');
    const loginResponse = await axios.post('http://localhost:3000/api/auth/login', {
      identifier: 'admin@kmrl.com',
      password: 'admin123'
    });
    
    const token = loginResponse.data.data.token;
    console.log('✅ Logged in successfully\n');
    
    // Trigger manual status update
    console.log('Triggering manual status update...');
    const triggerResponse = await axios.post(
      'http://localhost:3000/api/admin/status-updater/trigger',
      {},
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );
    
    console.log('✅ Status update triggered successfully\n');
    console.log('Update Results:');
    console.log('================');
    console.log(JSON.stringify(triggerResponse.data, null, 2));
    
    // Get current trainset statuses
    console.log('\n\nCurrent Trainset Statuses:');
    console.log('==========================');
    
    const trainsetsResponse = await axios.get('http://localhost:3000/api/trainsets', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    const trainsets = trainsetsResponse.data;
    
    // Group by status
    const statusGroups = {};
    trainsets.forEach(train => {
      if (!statusGroups[train.status]) {
        statusGroups[train.status] = [];
      }
      statusGroups[train.status].push(train.trainsetNumber);
    });
    
    // Display grouped statuses
    Object.keys(statusGroups).forEach(status => {
      console.log(`\n${status}: (${statusGroups[status].length} trains)`);
      statusGroups[status].forEach(trainNumber => {
        console.log(`  - ${trainNumber}`);
      });
    });
    
    // Check for alerts
    console.log('\n\nAlerts & Warnings:');
    console.log('==================');
    
    const now = new Date();
    let alertCount = 0;
    
    trainsets.forEach(train => {
      // Check for overdue maintenance
      if (train.nextMaintenanceDate && new Date(train.nextMaintenanceDate) < now) {
        const daysOverdue = Math.floor((now - new Date(train.nextMaintenanceDate)) / (1000 * 60 * 60 * 24));
        console.log(`🔴 ${train.trainsetNumber}: Maintenance overdue by ${daysOverdue} days`);
        alertCount++;
      }
      
      // Check for expired fitness
      if (train.fitnessExpiry && new Date(train.fitnessExpiry) < now) {
        const daysExpired = Math.floor((now - new Date(train.fitnessExpiry)) / (1000 * 60 * 60 * 24));
        console.log(`🔴 ${train.trainsetNumber}: Fitness expired ${daysExpired} days ago`);
        alertCount++;
      }
      
      // Check for upcoming maintenance (within 7 days)
      if (train.nextMaintenanceDate) {
        const nextMaint = new Date(train.nextMaintenanceDate);
        const daysUntil = Math.floor((nextMaint - now) / (1000 * 60 * 60 * 24));
        if (daysUntil >= 0 && daysUntil <= 7) {
          console.log(`🟡 ${train.trainsetNumber}: Maintenance due in ${daysUntil} days`);
          alertCount++;
        }
      }
    });
    
    if (alertCount === 0) {
      console.log('✅ No immediate alerts');
    }
    
  } catch (error) {
    console.error('Error:', error.response ? error.response.data : error.message);
  }
}

triggerStatusUpdate();