const mongoose = require('mongoose');
const Schedule = require('./models/Schedule');
const Trainset = require('./models/Trainset');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/kmrl-auth', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

// KMRL Metro stations
const stations = {
  blueLine: [
    'Aluva', 'Pulinchodu', 'Companypadi', 'Ambattukavu', 'Muttom', 
    'Kalamassery', 'CUSAT', 'Pathadipalam', 'Edapally', 'Changampuzha Park',
    'Palarivattom', 'JLN Stadium', 'Kaloor', 'Town Hall', 'MG Road',
    'Maharajas', 'Ernakulam South', 'Kadavanthra', 'Elamkulam', 'Vyttila',
    'Thaikoodam', 'Pettah'
  ]
};

async function seedSchedules() {
  try {
    console.log('🚀 Starting schedule seeding...\n');
    
    // Clear existing schedules
    await Schedule.deleteMany({});
    console.log('✅ Cleared existing schedules\n');
    
    // Get available trainsets
    const trainsets = await Trainset.find({ 
      status: { $in: ['AVAILABLE', 'IN_SERVICE'] },
      isActive: true 
    });
    
    if (trainsets.length === 0) {
      console.log('❌ No available trainsets found. Please seed trainsets first.');
      return;
    }
    
    console.log(`Found ${trainsets.length} available trainsets\n`);
    
    const schedules = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Generate schedules for next 7 days
    for (let day = 0; day < 7; day++) {
      const scheduleDate = new Date(today);
      scheduleDate.setDate(scheduleDate.getDate() + day);
      
      // Morning schedules (6 AM to 12 PM)
      schedules.push(...generateDaySchedules(scheduleDate, 'morning', trainsets));
      
      // Afternoon schedules (12 PM to 6 PM)
      schedules.push(...generateDaySchedules(scheduleDate, 'afternoon', trainsets));
      
      // Evening schedules (6 PM to 10 PM)
      schedules.push(...generateDaySchedules(scheduleDate, 'evening', trainsets));
    }
    
    // Save all schedules
    let savedCount = 0;
    for (const scheduleData of schedules) {
      try {
        const schedule = new Schedule(scheduleData);
        await schedule.save();
        savedCount++;
        console.log(`✅ Created schedule: ${schedule.scheduleNumber} - ${schedule.route.routeName}`);
      } catch (error) {
        console.error(`❌ Failed to create schedule: ${error.message}`);
      }
    }
    
    console.log(`\n✅ Successfully created ${savedCount} schedules!`);
    
    // Display statistics
    const stats = await Schedule.aggregate([
      { $group: { 
        _id: '$status', 
        count: { $sum: 1 } 
      }}
    ]);
    
    console.log('\n📊 Schedule Statistics:');
    stats.forEach(stat => {
      console.log(`   ${stat._id}: ${stat.count}`);
    });
    
  } catch (error) {
    console.error('❌ Error seeding schedules:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔒 Database connection closed');
  }
}

function generateDaySchedules(date, period, trainsets) {
  const schedules = [];
  const routes = [
    { from: 'Aluva', to: 'Pettah', stops: 22, duration: 53 },
    { from: 'Pettah', to: 'Aluva', stops: 22, duration: 53 },
    { from: 'Aluva', to: 'MG Road', stops: 15, duration: 35 },
    { from: 'MG Road', to: 'Aluva', stops: 15, duration: 35 },
    { from: 'Pettah', to: 'Maharajas', stops: 7, duration: 18 },
    { from: 'Maharajas', to: 'Pettah', stops: 7, duration: 18 },
    { from: 'Edapally', to: 'Pettah', stops: 13, duration: 30 },
    { from: 'Pettah', to: 'Edapally', stops: 13, duration: 30 }
  ];
  
  let startHour;
  let frequency; // minutes between trains
  
  switch(period) {
    case 'morning':
      startHour = 6;
      frequency = 10; // Peak hours - every 10 minutes
      break;
    case 'afternoon':
      startHour = 12;
      frequency = 15; // Off-peak - every 15 minutes
      break;
    case 'evening':
      startHour = 18;
      frequency = 10; // Peak hours - every 10 minutes
      break;
  }
  
  const scheduleCount = Math.floor((6 * 60) / frequency); // 6 hours per period
  
  for (let i = 0; i < scheduleCount && i < routes.length; i++) {
    const route = routes[i % routes.length];
    const trainset = trainsets[i % trainsets.length];
    
    const departureTime = new Date(date);
    departureTime.setHours(startHour, i * frequency, 0, 0);
    
    const arrivalTime = new Date(departureTime);
    arrivalTime.setMinutes(arrivalTime.getMinutes() + route.duration);
    
    // Randomly assign status based on time
    let status = 'SCHEDULED';
    const now = new Date();
    
    if (departureTime < now && arrivalTime < now) {
      // Past schedules
      const random = Math.random();
      if (random > 0.9) {
        status = 'CANCELLED';
      } else if (random > 0.8) {
        status = 'DELAYED';
      } else {
        status = 'COMPLETED';
      }
    } else if (departureTime < now && arrivalTime > now) {
      // Currently running
      status = Math.random() > 0.2 ? 'ACTIVE' : 'DELAYED';
    }
    
    // Generate stations based on route
    const stationList = generateStations(route.from, route.to, departureTime, route.duration, route.stops);
    
    const scheduleNumber = `SCH-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}-${String(i + 1).padStart(3, '0')}-${period.charAt(0).toUpperCase()}`;
    
    schedules.push({
      scheduleNumber,
      trainsetId: trainset._id,
      trainsetNumber: trainset.trainsetNumber,
      route: {
        from: route.from,
        to: route.to,
        routeName: `${route.from} - ${route.to}`
      },
      departureTime,
      arrivalTime,
      actualDepartureTime: status !== 'SCHEDULED' ? new Date(departureTime.getTime() + (Math.random() * 5 * 60000)) : undefined,
      actualArrivalTime: status === 'COMPLETED' ? new Date(arrivalTime.getTime() + (Math.random() * 5 * 60000)) : undefined,
      stations: stationList,
      frequency: date.getDay() === 0 ? 'SUNDAY' : date.getDay() === 6 ? 'SATURDAY' : 'WEEKDAYS',
      status,
      delay: status === 'DELAYED' ? Math.floor(Math.random() * 15) + 1 : 0,
      delayReason: status === 'DELAYED' ? ['Technical Issue', 'Heavy Rain', 'Signal Failure', 'Track Maintenance'][Math.floor(Math.random() * 4)] : undefined,
      expectedDuration: route.duration,
      actualDuration: status === 'COMPLETED' ? route.duration + Math.floor(Math.random() * 10) - 5 : undefined,
      passengerCount: status === 'COMPLETED' ? Math.floor(Math.random() * 800) + 400 : status === 'ACTIVE' ? Math.floor(Math.random() * 600) + 300 : 0,
      peakOccupancy: status !== 'SCHEDULED' && status !== 'CANCELLED' ? Math.floor(Math.random() * 50) + 60 : undefined,
      averageOccupancy: status !== 'SCHEDULED' && status !== 'CANCELLED' ? Math.floor(Math.random() * 30) + 40 : undefined,
      operationalDate: date,
      isActive: true
    });
  }
  
  return schedules;
}

function generateStations(from, to, departureTime, totalDuration, stopCount) {
  const fromIndex = stations.blueLine.indexOf(from);
  const toIndex = stations.blueLine.indexOf(to);
  
  let stationList = [];
  if (fromIndex < toIndex) {
    stationList = stations.blueLine.slice(fromIndex, toIndex + 1);
  } else {
    stationList = stations.blueLine.slice(toIndex, fromIndex + 1).reverse();
  }
  
  const timePerStop = totalDuration / (stationList.length - 1);
  
  return stationList.map((station, index) => {
    const arrivalTime = new Date(departureTime);
    arrivalTime.setMinutes(arrivalTime.getMinutes() + Math.floor(timePerStop * index));
    
    const stationDepartureTime = new Date(arrivalTime);
    if (index < stationList.length - 1) {
      stationDepartureTime.setSeconds(stationDepartureTime.getSeconds() + 30); // 30 second stop
    }
    
    return {
      name: station,
      scheduledArrival: arrivalTime,
      scheduledDeparture: stationDepartureTime,
      platform: index === 0 || index === stationList.length - 1 ? '1' : Math.random() > 0.5 ? '1' : '2',
      stopDuration: index === 0 || index === stationList.length - 1 ? 60 : 30
    };
  });
}

// Run the seeding
seedSchedules();