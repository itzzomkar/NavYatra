require('dotenv').config();
const mongoose = require('mongoose');
const Schedule = require('./models/Schedule');

const testSchedules = async () => {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Check all schedules
    const allSchedules = await Schedule.find({});
    console.log('\n=== ALL SCHEDULES IN DATABASE ===');
    console.log('Total schedules:', allSchedules.length);
    
    allSchedules.forEach((schedule, index) => {
      console.log(`\n${index + 1}. Schedule ${schedule.scheduleNumber}:`);
      console.log('  ID:', schedule._id);
      console.log('  isActive:', schedule.isActive);
      console.log('  status:', schedule.status);
      console.log('  operationalDate:', schedule.operationalDate);
      console.log('  createdAt:', schedule.createdAt);
    });

    // Check active schedules
    const activeSchedules = await Schedule.find({ isActive: true });
    console.log('\n=== ACTIVE SCHEDULES ===');
    console.log('Active schedules:', activeSchedules.length);

    // Check inactive schedules
    const inactiveSchedules = await Schedule.find({ isActive: false });
    console.log('\n=== INACTIVE SCHEDULES ===');
    console.log('Inactive schedules:', inactiveSchedules.length);

    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
    
  } catch (error) {
    console.error('Error:', error);
  }
};

testSchedules();