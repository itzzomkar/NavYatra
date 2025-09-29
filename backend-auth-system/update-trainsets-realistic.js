const mongoose = require('mongoose');
const Trainset = require('./models/Trainset');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/kmrl-auth', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

async function updateTrainsetsWithRealisticData() {
  try {
    console.log('Starting realistic trainset data update...\n');
    
    // Get current date
    const now = new Date();
    const currentDate = now.toISOString().split('T')[0];
    
    // Define realistic scenarios for each trainset
    const trainsetUpdates = [
      {
        trainsetNumber: 'TS-009',
        updates: {
          status: 'AVAILABLE',
          lastMaintenanceDate: new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000), // 15 days ago
          nextMaintenanceDate: new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000), // 15 days from now
          fitnessExpiry: new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000), // 6 months from now
          lastCleaningDate: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000), // Yesterday
          currentMileage: 125000,
          totalMileage: 125000,
          operationalHours: 8500,
          location: 'Aluva Depot'
        }
      },
      {
        trainsetNumber: 'TS001',
        updates: {
          status: 'IN_SERVICE',
          lastMaintenanceDate: new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000), // 20 days ago
          nextMaintenanceDate: new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000), // 10 days from now
          fitnessExpiry: new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000), // 3 months from now
          lastCleaningDate: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
          currentMileage: 145000,
          totalMileage: 145000,
          operationalHours: 9200,
          location: 'On Route - Blue Line'
        }
      },
      {
        trainsetNumber: 'TS002',
        updates: {
          status: 'MAINTENANCE',
          lastMaintenanceDate: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
          nextMaintenanceDate: new Date(now), // Due today (that's why in maintenance)
          fitnessExpiry: new Date(now.getTime() + 120 * 24 * 60 * 60 * 1000), // 4 months from now
          lastCleaningDate: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
          currentMileage: 168000,
          totalMileage: 168000,
          operationalHours: 10500,
          location: 'Muttom Depot - Maintenance Bay 2'
        }
      },
      {
        trainsetNumber: 'TS003',
        updates: {
          status: 'OUT_OF_ORDER',
          lastMaintenanceDate: new Date(now.getTime() - 45 * 24 * 60 * 60 * 1000), // 45 days ago
          nextMaintenanceDate: new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000), // Overdue by 15 days
          fitnessExpiry: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000), // Expired 5 days ago
          lastCleaningDate: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
          currentMileage: 195000,
          totalMileage: 195000,
          operationalHours: 12000,
          location: 'Muttom Depot - Repair Section',
          notes: 'Fitness certificate expired. Awaiting renewal and major overhaul.'
        }
      },
      {
        trainsetNumber: 'TS004',
        updates: {
          status: 'AVAILABLE',
          lastMaintenanceDate: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
          nextMaintenanceDate: new Date(now.getTime() + 25 * 24 * 60 * 60 * 1000), // 25 days from now
          fitnessExpiry: new Date(now.getTime() + 200 * 24 * 60 * 60 * 1000), // 200 days from now
          lastCleaningDate: new Date(now.getTime() - 6 * 60 * 60 * 1000), // 6 hours ago
          currentMileage: 110000,
          totalMileage: 110000,
          operationalHours: 7800,
          location: 'Pettah Station - Platform 1'
        }
      },
      {
        trainsetNumber: 'TS005',
        updates: {
          status: 'IN_SERVICE',
          lastMaintenanceDate: new Date(now.getTime() - 12 * 24 * 60 * 60 * 1000), // 12 days ago
          nextMaintenanceDate: new Date(now.getTime() + 18 * 24 * 60 * 60 * 1000), // 18 days from now
          fitnessExpiry: new Date(now.getTime() + 150 * 24 * 60 * 60 * 1000), // 5 months from now
          lastCleaningDate: new Date(now), // Today
          currentMileage: 132000,
          totalMileage: 132000,
          operationalHours: 8900,
          location: 'On Route - Aluva to Pettah'
        }
      },
      {
        trainsetNumber: 'TS006',
        updates: {
          status: 'CLEANING',
          lastMaintenanceDate: new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000), // 8 days ago
          nextMaintenanceDate: new Date(now.getTime() + 22 * 24 * 60 * 60 * 1000), // 22 days from now
          fitnessExpiry: new Date(now.getTime() + 45 * 24 * 60 * 60 * 1000), // 45 days from now
          lastCleaningDate: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000), // 3 days ago (due for cleaning)
          currentMileage: 155000,
          totalMileage: 155000,
          operationalHours: 9800,
          location: 'Aluva Depot - Cleaning Bay'
        }
      },
      {
        trainsetNumber: 'TS007',
        updates: {
          status: 'AVAILABLE',
          lastMaintenanceDate: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
          nextMaintenanceDate: new Date(now.getTime() + 27 * 24 * 60 * 60 * 1000), // 27 days from now
          fitnessExpiry: new Date(now.getTime() + 210 * 24 * 60 * 60 * 1000), // 7 months from now
          lastCleaningDate: new Date(now.getTime() - 12 * 60 * 60 * 1000), // 12 hours ago
          currentMileage: 98000,
          totalMileage: 98000,
          operationalHours: 6500,
          location: 'Edappally Station - Reserve Track'
        }
      }
    ];

    // Update each trainset
    for (const trainsetData of trainsetUpdates) {
      const result = await Trainset.findOneAndUpdate(
        { trainsetNumber: trainsetData.trainsetNumber },
        { 
          $set: {
            ...trainsetData.updates,
            lastUpdated: now
          }
        },
        { new: true }
      );

      if (result) {
        console.log(`✅ Updated ${trainsetData.trainsetNumber}:`);
        console.log(`   Status: ${result.status}`);
        console.log(`   Location: ${result.location || 'Not specified'}`);
        console.log(`   Last Maintenance: ${result.lastMaintenanceDate ? result.lastMaintenanceDate.toLocaleDateString() : 'Not set'}`);
        console.log(`   Next Maintenance: ${result.nextMaintenanceDate ? result.nextMaintenanceDate.toLocaleDateString() : 'Not set'}`);
        console.log(`   Fitness Expiry: ${result.fitnessExpiry ? result.fitnessExpiry.toLocaleDateString() : 'Not set'}`);
        console.log(`   Total Mileage: ${result.totalMileage || 0} km`);
        console.log(`   Operational Hours: ${result.operationalHours || 0} hrs`);
        if (result.notes) {
          console.log(`   Notes: ${result.notes}`);
        }
        console.log('');
      } else {
        console.log(`⚠️  Trainset ${trainsetData.trainsetNumber} not found`);
      }
    }

    // Show summary of statuses
    console.log('\n=== STATUS SUMMARY ===');
    const allTrainsets = await Trainset.find({});
    const statusCount = {};
    
    allTrainsets.forEach(train => {
      statusCount[train.status] = (statusCount[train.status] || 0) + 1;
    });

    Object.entries(statusCount).forEach(([status, count]) => {
      console.log(`${status}: ${count} trainset(s)`);
    });

    console.log('\n=== ALERTS & WARNINGS ===');
    
    // Check for overdue maintenance
    const overdueMaintenanceTrains = allTrainsets.filter(train => 
      train.nextMaintenanceDate && new Date(train.nextMaintenanceDate) < now
    );
    
    if (overdueMaintenanceTrains.length > 0) {
      console.log('🔴 Overdue Maintenance:');
      overdueMaintenanceTrains.forEach(train => {
        const daysOverdue = Math.floor((now - new Date(train.nextMaintenanceDate)) / (1000 * 60 * 60 * 24));
        console.log(`   - ${train.trainsetNumber}: ${daysOverdue} days overdue`);
      });
    }

    // Check for expired fitness certificates
    const expiredFitnessTrains = allTrainsets.filter(train => 
      train.fitnessExpiry && new Date(train.fitnessExpiry) < now
    );
    
    if (expiredFitnessTrains.length > 0) {
      console.log('🔴 Expired Fitness Certificates:');
      expiredFitnessTrains.forEach(train => {
        const daysExpired = Math.floor((now - new Date(train.fitnessExpiry)) / (1000 * 60 * 60 * 24));
        console.log(`   - ${train.trainsetNumber}: Expired ${daysExpired} days ago`);
      });
    }

    // Check for upcoming maintenance (within 7 days)
    const upcomingMaintenanceTrains = allTrainsets.filter(train => {
      if (!train.nextMaintenanceDate) return false;
      const nextMaint = new Date(train.nextMaintenanceDate);
      const daysUntil = Math.floor((nextMaint - now) / (1000 * 60 * 60 * 24));
      return daysUntil >= 0 && daysUntil <= 7;
    });
    
    if (upcomingMaintenanceTrains.length > 0) {
      console.log('🟡 Upcoming Maintenance (within 7 days):');
      upcomingMaintenanceTrains.forEach(train => {
        const daysUntil = Math.floor((new Date(train.nextMaintenanceDate) - now) / (1000 * 60 * 60 * 24));
        console.log(`   - ${train.trainsetNumber}: ${daysUntil} days until maintenance`);
      });
    }

    // Check for trains needing cleaning (last cleaned > 2 days ago)
    const needsCleaningTrains = allTrainsets.filter(train => {
      if (!train.lastCleaningDate) return true;
      const daysSinceCleaning = Math.floor((now - new Date(train.lastCleaningDate)) / (1000 * 60 * 60 * 24));
      return daysSinceCleaning > 2 && train.status !== 'CLEANING';
    });
    
    if (needsCleaningTrains.length > 0) {
      console.log('🟡 Needs Cleaning:');
      needsCleaningTrains.forEach(train => {
        const daysSince = train.lastCleaningDate ? 
          Math.floor((now - new Date(train.lastCleaningDate)) / (1000 * 60 * 60 * 24)) : 
          'Never cleaned';
        console.log(`   - ${train.trainsetNumber}: ${daysSince} days since last cleaning`);
      });
    }

    console.log('\n✅ All trainsets updated with realistic current data!');
    console.log(`Current date/time: ${now.toLocaleString()}`);

  } catch (error) {
    console.error('Error updating trainsets:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\nDatabase connection closed.');
  }
}

// Run the update
updateTrainsetsWithRealisticData();