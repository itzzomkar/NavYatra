require('dotenv').config();
const mongoose = require('mongoose');
const Schedule = require('./models/Schedule');
const Trainset = require('./models/Trainset');

const testApiFilter = async () => {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Test the exact same logic as getAllSchedules
    const filter = { isActive: true };  // This is our fix
    
    console.log('\n=== TESTING API FILTER LOGIC ===');
    console.log('Filter being used:', JSON.stringify(filter, null, 2));
    
    // Test without any additional filters (default case)
    const schedules = await Schedule.find(filter)
      .populate('trainsetId', 'trainsetNumber manufacturer model status')
      .sort({ departureTime: 1 });
      
    const total = await Schedule.countDocuments(filter);
    
    console.log('\nAPI Results:');
    console.log('Found schedules:', schedules.length);
    console.log('Total count:', total);
    
    if (schedules.length > 0) {
      console.log('\nFirst few schedules:');
      schedules.slice(0, 3).forEach((schedule, index) => {
        console.log(`${index + 1}. ${schedule.scheduleNumber}:`);
        console.log('   isActive:', schedule.isActive);
        console.log('   status:', schedule.status);
        console.log('   trainsetId:', schedule.trainsetId?._id || 'null');
        console.log('   operationalDate:', schedule.operationalDate);
      });
    }
    
    // Test formatted response like in controller
    const formattedSchedules = schedules.map(schedule => {
      const obj = schedule.toObject();
      obj.id = obj._id.toString();
      if (obj.route && obj.route.from && obj.route.to) {
        obj.routeDisplay = `${obj.route.from} - ${obj.route.to}`;
      }
      return obj;
    });
    
    console.log('\nFormatted response sample:');
    if (formattedSchedules.length > 0) {
      console.log('First schedule formatted:');
      const first = formattedSchedules[0];
      console.log('  id:', first.id);
      console.log('  scheduleNumber:', first.scheduleNumber);
      console.log('  routeDisplay:', first.routeDisplay);
      console.log('  isActive:', first.isActive);
    }

    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
    
  } catch (error) {
    console.error('Error:', error);
  }
};

testApiFilter();