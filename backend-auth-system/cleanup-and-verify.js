const mongoose = require('mongoose');
const Trainset = require('./models/Trainset');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/kmrl-auth', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

async function cleanupAndVerify() {
  try {
    console.log('Starting cleanup and verification...\n');
    
    // Remove test trainsets
    const testTrainsets = ['TS008', 'TS009', 'TEST-AUTO-001'];
    
    for (const trainsetNumber of testTrainsets) {
      const result = await Trainset.findOneAndDelete({ trainsetNumber });
      if (result) {
        console.log(`✅ Removed test trainset: ${trainsetNumber}`);
      }
    }
    
    console.log('\n=== CURRENT TRAINSET STATUS ===\n');
    
    // Get all trainsets
    const trainsets = await Trainset.find({}).sort({ trainsetNumber: 1 });
    
    // Group by status
    const statusGroups = {};
    trainsets.forEach(train => {
      if (!statusGroups[train.status]) {
        statusGroups[train.status] = [];
      }
      statusGroups[train.status].push({
        number: train.trainsetNumber,
        location: train.location,
        mileage: train.totalMileage,
        fitnessExpiry: train.fitnessExpiry,
        nextMaintenance: train.nextMaintenanceDate
      });
    });
    
    // Display each status group
    const statusColors = {
      'AVAILABLE': '🟢',
      'IN_SERVICE': '🔵',
      'MAINTENANCE': '🟡',
      'CLEANING': '🧹',
      'OUT_OF_ORDER': '🔴',
      'DECOMMISSIONED': '⚫'
    };
    
    Object.keys(statusGroups).forEach(status => {
      console.log(`${statusColors[status] || '⚪'} ${status}: (${statusGroups[status].length} trains)`);
      console.log('─'.repeat(50));
      
      statusGroups[status].forEach(train => {
        console.log(`  ${train.number}:`);
        console.log(`    📍 Location: ${train.location || 'Not specified'}`);
        console.log(`    🚂 Mileage: ${train.mileage || 0} km`);
        
        if (train.fitnessExpiry) {
          const fitnessDate = new Date(train.fitnessExpiry);
          const now = new Date();
          const daysRemaining = Math.floor((fitnessDate - now) / (1000 * 60 * 60 * 24));
          
          if (daysRemaining < 0) {
            console.log(`    ⚠️  Fitness: EXPIRED (${Math.abs(daysRemaining)} days ago)`);
          } else if (daysRemaining < 30) {
            console.log(`    ⚠️  Fitness: Expires in ${daysRemaining} days`);
          } else {
            console.log(`    ✅ Fitness: Valid (${daysRemaining} days remaining)`);
          }
        }
        
        if (train.nextMaintenance) {
          const maintDate = new Date(train.nextMaintenance);
          const now = new Date();
          const daysUntil = Math.floor((maintDate - now) / (1000 * 60 * 60 * 24));
          
          if (daysUntil < 0) {
            console.log(`    🔧 Maintenance: OVERDUE (${Math.abs(daysUntil)} days)`);
          } else if (daysUntil === 0) {
            console.log(`    🔧 Maintenance: Due TODAY`);
          } else if (daysUntil <= 7) {
            console.log(`    🔧 Maintenance: Due in ${daysUntil} days`);
          } else {
            console.log(`    🔧 Maintenance: Scheduled in ${daysUntil} days`);
          }
        }
        console.log('');
      });
    });
    
    // Summary statistics
    console.log('\n=== FLEET STATISTICS ===\n');
    
    const totalTrains = trainsets.length;
    const availableTrains = statusGroups['AVAILABLE'] ? statusGroups['AVAILABLE'].length : 0;
    const inServiceTrains = statusGroups['IN_SERVICE'] ? statusGroups['IN_SERVICE'].length : 0;
    const operationalTrains = availableTrains + inServiceTrains;
    const operationalPercentage = ((operationalTrains / totalTrains) * 100).toFixed(1);
    
    console.log(`Total Fleet Size: ${totalTrains} trains`);
    console.log(`Operational: ${operationalTrains} trains (${operationalPercentage}%)`);
    console.log(`  - Available: ${availableTrains}`);
    console.log(`  - In Service: ${inServiceTrains}`);
    
    if (statusGroups['MAINTENANCE']) {
      console.log(`Under Maintenance: ${statusGroups['MAINTENANCE'].length}`);
    }
    if (statusGroups['CLEANING']) {
      console.log(`Being Cleaned: ${statusGroups['CLEANING'].length}`);
    }
    if (statusGroups['OUT_OF_ORDER']) {
      console.log(`Out of Order: ${statusGroups['OUT_OF_ORDER'].length}`);
    }
    
    // Calculate average mileage
    const totalMileage = trainsets.reduce((sum, train) => sum + (train.totalMileage || 0), 0);
    const avgMileage = Math.round(totalMileage / totalTrains);
    console.log(`\nAverage Mileage: ${avgMileage.toLocaleString()} km`);
    
    // Check critical issues
    console.log('\n=== CRITICAL ALERTS ===\n');
    
    const now = new Date();
    let criticalCount = 0;
    
    trainsets.forEach(train => {
      // Check for expired fitness certificates
      if (train.fitnessExpiry && new Date(train.fitnessExpiry) < now) {
        console.log(`🔴 ${train.trainsetNumber}: Fitness certificate EXPIRED`);
        criticalCount++;
      }
      
      // Check for overdue maintenance (more than 7 days)
      if (train.nextMaintenanceDate) {
        const daysOverdue = Math.floor((now - new Date(train.nextMaintenanceDate)) / (1000 * 60 * 60 * 24));
        if (daysOverdue > 7) {
          console.log(`🔴 ${train.trainsetNumber}: Maintenance overdue by ${daysOverdue} days`);
          criticalCount++;
        }
      }
    });
    
    if (criticalCount === 0) {
      console.log('✅ No critical issues found');
    }
    
    console.log('\n✅ Cleanup and verification complete!');
    
  } catch (error) {
    console.error('Error during cleanup and verification:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\nDatabase connection closed.');
  }
}

cleanupAndVerify();