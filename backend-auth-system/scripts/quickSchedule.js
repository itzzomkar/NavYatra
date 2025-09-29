const mongoose = require('mongoose');
const Schedule = require('../models/Schedule');
const Trainset = require('../models/Trainset');
require('dotenv').config({ path: '../.env' });

async function createQuickSchedules() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/auth_system_db');
    console.log('📂 Connected to MongoDB');

    // Clear existing schedules
    await Schedule.deleteMany({});
    console.log('🗑️  Cleared existing schedules');

    // Get first trainset
    const trainset = await Trainset.findOne({ status: 'active' });
    if (!trainset) {
      console.log('❌ No active trainset found');
      process.exit(1);
    }

    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Create a few schedules for today and tomorrow
    const schedules = [];
    
    // Schedule 1 - Active now
    const dep1 = new Date();
    dep1.setHours(dep1.getHours() - 1, 0, 0, 0);
    const arr1 = new Date();
    arr1.setHours(arr1.getHours() + 1, 30, 0, 0);
    
    schedules.push({
      scheduleNumber: 'SCH-001',
      trainsetId: trainset._id,
      trainsetNumber: trainset.trainsetNumber,
      route: {
        from: 'Aluva',
        to: 'Petta',
        routeName: 'Aluva - Petta Line'
      },
      departureTime: dep1,
      arrivalTime: arr1,
      stations: [
        {
          name: 'Aluva',
          scheduledArrival: dep1,
          scheduledDeparture: dep1,
          platform: '1'
        },
        {
          name: 'Kalamassery',
          scheduledArrival: new Date(dep1.getTime() + 30 * 60000),
          scheduledDeparture: new Date(dep1.getTime() + 31 * 60000),
          platform: '1'
        },
        {
          name: 'Petta',
          scheduledArrival: arr1,
          scheduledDeparture: arr1,
          platform: '2'
        }
      ],
      frequency: 'DAILY',
      status: 'ACTIVE',
      delay: 5,
      expectedDuration: 90,
      passengerCount: 150,
      averageOccupancy: 50,
      crew: {
        driver: {
          name: 'Rajesh Kumar',
          employeeId: 'EMP001'
        }
      },
      operationalDate: today
    });

    // Schedule 2 - Scheduled for later today
    const dep2 = new Date();
    dep2.setHours(18, 0, 0, 0);
    const arr2 = new Date();
    arr2.setHours(19, 30, 0, 0);
    
    schedules.push({
      scheduleNumber: 'SCH-002',
      trainsetId: trainset._id,
      trainsetNumber: trainset.trainsetNumber,
      route: {
        from: 'Petta',
        to: 'Maharajas',
        routeName: 'Petta - Maharajas Line'
      },
      departureTime: dep2,
      arrivalTime: arr2,
      stations: [
        {
          name: 'Petta',
          scheduledArrival: dep2,
          scheduledDeparture: dep2,
          platform: '1'
        },
        {
          name: 'Edapally',
          scheduledArrival: new Date(dep2.getTime() + 30 * 60000),
          scheduledDeparture: new Date(dep2.getTime() + 31 * 60000),
          platform: '1'
        },
        {
          name: 'Maharajas',
          scheduledArrival: arr2,
          scheduledDeparture: arr2,
          platform: '1'
        }
      ],
      frequency: 'DAILY',
      status: 'SCHEDULED',
      delay: 0,
      expectedDuration: 90,
      passengerCount: 0,
      crew: {
        driver: {
          name: 'Suresh Babu',
          employeeId: 'EMP002'
        }
      },
      operationalDate: today
    });

    // Schedule 3 - Tomorrow morning
    const dep3 = new Date(tomorrow);
    dep3.setHours(8, 0, 0, 0);
    const arr3 = new Date(tomorrow);
    arr3.setHours(9, 30, 0, 0);
    
    schedules.push({
      scheduleNumber: 'SCH-003',
      trainsetId: trainset._id,
      trainsetNumber: trainset.trainsetNumber,
      route: {
        from: 'Aluva',
        to: 'Maharajas',
        routeName: 'Aluva - Maharajas Express'
      },
      departureTime: dep3,
      arrivalTime: arr3,
      stations: [
        {
          name: 'Aluva',
          scheduledArrival: dep3,
          scheduledDeparture: dep3,
          platform: '1'
        },
        {
          name: 'Kalamassery',
          scheduledArrival: new Date(dep3.getTime() + 20 * 60000),
          scheduledDeparture: new Date(dep3.getTime() + 21 * 60000),
          platform: '1'
        },
        {
          name: 'Petta',
          scheduledArrival: new Date(dep3.getTime() + 45 * 60000),
          scheduledDeparture: new Date(dep3.getTime() + 46 * 60000),
          platform: '2'
        },
        {
          name: 'Edapally',
          scheduledArrival: new Date(dep3.getTime() + 60 * 60000),
          scheduledDeparture: new Date(dep3.getTime() + 61 * 60000),
          platform: '1'
        },
        {
          name: 'Maharajas',
          scheduledArrival: arr3,
          scheduledDeparture: arr3,
          platform: '1'
        }
      ],
      frequency: 'DAILY',
      status: 'SCHEDULED',
      delay: 0,
      expectedDuration: 90,
      passengerCount: 0,
      crew: {
        driver: {
          name: 'Mohammed Ali',
          employeeId: 'EMP003'
        },
        coDriver: {
          name: 'Pradeep Nair',
          employeeId: 'EMP004'
        }
      },
      operationalDate: tomorrow
    });

    // Insert all schedules
    const insertedSchedules = await Schedule.insertMany(schedules);
    console.log(`✅ Created ${insertedSchedules.length} schedules`);

    console.log('\n📊 Created schedules:');
    insertedSchedules.forEach(s => {
      console.log(`   ${s.scheduleNumber}: ${s.route.from} to ${s.route.to} - Status: ${s.status}`);
    });

    console.log('\n✨ Quick schedule creation completed!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating schedules:', error.message);
    process.exit(1);
  }
}

createQuickSchedules();