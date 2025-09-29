const mongoose = require('mongoose');
const statusUpdater = require('./services/statusUpdater');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/kmrl-auth', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

async function testStatusUpdater() {
  try {
    console.log('🚀 Testing Status Updater Service\n');
    console.log('='.repeat(50));
    
    // Check service status
    const status = statusUpdater.getStatus();
    console.log('\n📊 Service Status:');
    console.log(`   Running: ${status.isRunning}`);
    console.log(`   Last Run: ${status.lastRun ? new Date(status.lastRun).toLocaleString() : 'Never'}`);
    console.log(`   Logs Count: ${status.logsCount}`);
    
    // Get upcoming changes
    console.log('\n📅 Upcoming Changes (next 7 days):');
    const upcoming = await statusUpdater.getUpcomingChanges(7);
    
    if (upcoming.maintenanceDue.length > 0) {
      console.log('\n   🔧 Maintenance Due:');
      upcoming.maintenanceDue.forEach(item => {
        console.log(`      - ${item.trainsetNumber}: in ${item.daysUntil} days (${new Date(item.dueDate).toLocaleDateString()})`);
      });
    }
    
    if (upcoming.fitnessExpiring.length > 0) {
      console.log('\n   📋 Fitness Expiring:');
      upcoming.fitnessExpiring.forEach(item => {
        console.log(`      - ${item.trainsetNumber}: in ${item.daysUntil} days (${new Date(item.expiryDate).toLocaleDateString()})`);
      });
    }
    
    // Trigger manual update
    console.log('\n\n🔄 Triggering Manual Status Check...');
    console.log('='.repeat(50));
    
    const updateResult = await statusUpdater.checkAndUpdateStatuses();
    
    console.log('\n📊 Update Summary:');
    console.log(`   Maintenance Due: ${updateResult.maintenanceDue} trains`);
    console.log(`   Fitness Expired: ${updateResult.fitnessExpired} trains`);
    console.log(`   Cleaning Scheduled: ${updateResult.cleaningScheduled} trains`);
    console.log(`   Returned to Service: ${updateResult.backToService} trains`);
    
    if (updateResult.errors.length > 0) {
      console.log(`   ⚠️ Errors: ${updateResult.errors.length}`);
      updateResult.errors.forEach(err => {
        console.log(`      - ${err.trainset}: ${err.error}`);
      });
    }
    
    // Show recent logs
    const recentLogs = statusUpdater.getRecentLogs(10);
    if (recentLogs.length > 0) {
      console.log('\n📝 Recent Status Changes:');
      recentLogs.forEach(log => {
        console.log(`   ${new Date(log.timestamp).toLocaleTimeString()} - ${log.trainsetNumber}: ${log.oldStatus} → ${log.newStatus} (${log.reason})`);
      });
    }
    
    console.log('\n✅ Status updater test complete!');
    
  } catch (error) {
    console.error('❌ Error testing status updater:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\nDatabase connection closed.');
  }
}

testStatusUpdater();