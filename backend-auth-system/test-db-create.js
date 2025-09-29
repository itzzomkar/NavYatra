const mongoose = require('mongoose');
const Trainset = require('./models/Trainset');
require('dotenv').config();

async function testDirectCreate() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/kmrl-auth', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Connected to database\n');
    
    // Create test trainset data
    const testData = {
      trainsetNumber: `TS-NEW-${Date.now().toString().slice(-6)}`,
      manufacturer: 'Alstom',
      model: 'Metropolis',
      yearOfManufacture: 2024,
      capacity: 975,
      maxSpeed: 80,
      depot: 'Muttom',
      currentMileage: 0,
      totalMileage: 0,
      status: 'AVAILABLE',
      location: 'Muttom Depot',
      operationalHours: 0,
      fitnessExpiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
      lastMaintenanceDate: new Date(),
      nextMaintenanceDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
    };
    
    console.log('Creating trainset with data:');
    console.log(JSON.stringify(testData, null, 2));
    console.log();
    
    // Create trainset in database
    const newTrainset = new Trainset(testData);
    const savedTrainset = await newTrainset.save();
    
    console.log('✅ Trainset created successfully!');
    console.log('   ID:', savedTrainset._id);
    console.log('   Number:', savedTrainset.trainsetNumber);
    console.log('   Status:', savedTrainset.status);
    console.log();
    
    // Verify by fetching
    console.log('Verifying trainset exists...');
    const found = await Trainset.findOne({ trainsetNumber: savedTrainset.trainsetNumber });
    
    if (found) {
      console.log('✅ Trainset verified in database');
      console.log('   Manufacturer:', found.manufacturer);
      console.log('   Model:', found.model);
      console.log('   Location:', found.location);
    } else {
      console.log('❌ Trainset not found in database');
    }
    
    // Count total trainsets
    const count = await Trainset.countDocuments();
    console.log(`\nTotal trainsets in database: ${count}`);
    
  } catch (error) {
    console.error('\n❌ Error creating trainset:');
    console.error('   Type:', error.name);
    console.error('   Message:', error.message);
    
    if (error.errors) {
      console.error('\nValidation errors:');
      Object.keys(error.errors).forEach(field => {
        console.error(`   ${field}: ${error.errors[field].message}`);
      });
    }
    
    if (error.code === 11000) {
      console.error('\nDuplicate key error - trainset number already exists');
    }
  } finally {
    await mongoose.connection.close();
    console.log('\nDatabase connection closed');
  }
}

testDirectCreate();