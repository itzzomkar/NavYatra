const mongoose = require('mongoose');
const Schedule = require('../models/Schedule');
const Trainset = require('../models/Trainset');
require('dotenv').config({ path: '../.env' });

const routes = [
  { start: 'Aluva', end: 'Petta', name: 'Aluva - Petta' },
  { start: 'Petta', end: 'Aluva', name: 'Petta - Aluva' },
  { start: 'Aluva', end: 'Maharajas', name: 'Aluva - Maharajas' },
  { start: 'Maharajas', end: 'Aluva', name: 'Maharajas - Aluva' },
  { start: 'Petta', end: 'Maharajas', name: 'Petta - Maharajas' },
  { start: 'Maharajas', end: 'Petta', name: 'Maharajas - Petta' }
];

const stations = {
  'Aluva - Petta': [
    { name: 'Aluva', platform: '1' },
    { name: 'Pulinchodu', platform: '1' },
    { name: 'Companypadi', platform: '1' },
    { name: 'Ambattukavu', platform: '1' },
    { name: 'Muttom', platform: '1' },
    { name: 'Kalamassery', platform: '1' },
    { name: 'Cusat', platform: '1' },
    { name: 'Petta', platform: '2' }
  ],
  'Petta - Aluva': [
    { name: 'Petta', platform: '1' },
    { name: 'Cusat', platform: '2' },
    { name: 'Kalamassery', platform: '2' },
    { name: 'Muttom', platform: '2' },
    { name: 'Ambattukavu', platform: '2' },
    { name: 'Companypadi', platform: '2' },
    { name: 'Pulinchodu', platform: '2' },
    { name: 'Aluva', platform: '2' }
  ],
  'Aluva - Maharajas': [
    { name: 'Aluva', platform: '1' },
    { name: 'Pulinchodu', platform: '1' },
    { name: 'Companypadi', platform: '1' },
    { name: 'Ambattukavu', platform: '1' },
    { name: 'Muttom', platform: '1' },
    { name: 'Kalamassery', platform: '1' },
    { name: 'Cusat', platform: '1' },
    { name: 'Petta', platform: '1' },
    { name: 'Edapally', platform: '1' },
    { name: 'Changampuzha Park', platform: '1' },
    { name: 'Palarivattom', platform: '1' },
    { name: 'JLN Stadium', platform: '1' },
    { name: 'Maharajas', platform: '1' }
  ]
};

const drivers = [
  'Rajesh Kumar',
  'Anoop Menon',
  'Suresh Babu',
  'Mohammed Ali',
  'Pradeep Nair',
  'Vineeth Thomas',
  'Arun Das',
  'Mahesh Pillai'
];

async function seedSchedules() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/auth_system_db');
    console.log('📂 Connected to MongoDB');

    // Clear existing schedules
    await Schedule.deleteMany({});
    console.log('🗑️  Cleared existing schedules');

    // Get available trainsets
    const trainsets = await Trainset.find({ status: 'active' }).limit(6);
    if (trainsets.length === 0) {
      console.log('❌ No active trainsets found. Please seed trainsets first.');
      process.exit(1);
    }

    const schedules = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Generate schedules for the next 7 days
    for (let day = 0; day < 7; day++) {
      const currentDate = new Date(today);
      currentDate.setDate(today.getDate() + day);
      
      // Generate multiple schedules per day
      const schedulesPerDay = 6;
      const startHour = 6; // Start from 6 AM
      
      for (let i = 0; i < schedulesPerDay; i++) {
        const route = routes[i % routes.length];
        const trainset = trainsets[i % trainsets.length];
        
        // Set departure time
        const departureTime = new Date(currentDate);
        departureTime.setHours(startHour + (i * 2), Math.floor(Math.random() * 60), 0, 0);
        
        // Set arrival time (1.5 to 2 hours later)
        const arrivalTime = new Date(departureTime);
        arrivalTime.setMinutes(arrivalTime.getMinutes() + 90 + Math.floor(Math.random() * 30));
        
        // Determine status based on time
        let status = 'scheduled';
        let delay = 0;
        let actualDelay = undefined;
        
        const now = new Date();
        if (departureTime < now && arrivalTime < now) {
          status = 'completed';
          actualDelay = Math.floor(Math.random() * 10); // 0-10 min delay
        } else if (departureTime < now && arrivalTime > now) {
          status = 'active';
          delay = Math.random() > 0.7 ? Math.floor(Math.random() * 15) : 0; // 30% chance of delay
          if (delay > 0) {
            status = 'delayed';
            actualDelay = delay;
          }
        } else if (day === 0 && Math.random() > 0.9) {
          // 10% chance of cancelled for today's future schedules
          status = 'cancelled';
        }
        
        // Create station times
        const stationList = stations[route.name] || stations['Aluva - Petta'];
        const timeBetweenStations = Math.floor((arrivalTime - departureTime) / stationList.length);
        
        const stationsWithTimes = stationList.map((station, index) => {
          const stationArrival = new Date(departureTime);
          stationArrival.setMinutes(stationArrival.getMinutes() + (index * timeBetweenStations / 60000));
          
          const stationDeparture = new Date(stationArrival);
          stationDeparture.setMinutes(stationDeparture.getMinutes() + (index === 0 || index === stationList.length - 1 ? 0 : 1));
          
          return {
            ...station,
            arrivalTime: stationArrival.toISOString(),
            departureTime: stationDeparture.toISOString()
          };
        });
        
        schedules.push({
          scheduleNumber: `SCH-${String(day * schedulesPerDay + i + 1).padStart(3, '0')}`,
          trainset: trainset._id,
          route: route,
          departureTime: departureTime,
          arrivalTime: arrivalTime,
          scheduledDepartureTime: departureTime,
          scheduledArrivalTime: arrivalTime,
          stations: stationsWithTimes,
          status: status,
          delay: delay,
          actualDelay: actualDelay,
          occupancy: {
            current: Math.floor(Math.random() * 300),
            capacity: 300,
            percentage: Math.floor(Math.random() * 100)
          },
          crew: {
            driver: drivers[Math.floor(Math.random() * drivers.length)],
            coDriver: Math.random() > 0.5 ? drivers[Math.floor(Math.random() * drivers.length)] : undefined
          }
        });
      }
    }

    // Insert all schedules
    const insertedSchedules = await Schedule.insertMany(schedules);
    console.log(`✅ Created ${insertedSchedules.length} schedules`);

    // Show status distribution
    const statusCounts = {};
    insertedSchedules.forEach(s => {
      statusCounts[s.status] = (statusCounts[s.status] || 0) + 1;
    });
    
    console.log('\n📊 Schedule Status Distribution:');
    Object.entries(statusCounts).forEach(([status, count]) => {
      console.log(`   ${status}: ${count}`);
    });

    console.log('\n✨ Schedule seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding schedules:', error);
    process.exit(1);
  }
}

seedSchedules();