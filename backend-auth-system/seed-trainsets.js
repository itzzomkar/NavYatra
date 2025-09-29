require('dotenv').config();
const mongoose = require('mongoose');
const Trainset = require('./models/Trainset');

const sampleTrainsets = [
  {
    trainsetNumber: 'TS001',
    manufacturer: 'Alstom',
    model: 'Metropolis',
    yearOfManufacture: 2017,
    capacity: 975,
    maxSpeed: 80,
    currentMileage: 125000,
    totalMileage: 125000,
    status: 'AVAILABLE',
    location: 'Aluva Station',
    depot: 'Muttom',
    lastMaintenanceDate: new Date('2024-08-15'),
    nextMaintenanceDate: new Date('2024-09-15'),
    lastCleaningDate: new Date('2024-09-10'),
    nextCleaningDate: new Date('2024-09-17'),
    fitnessExpiry: new Date('2025-03-31'),
    operationalHours: 8500,
    specifications: {
      length: 65,
      width: 2.9,
      height: 3.8,
      weight: 180000,
      engineType: 'Electric',
      fuelType: 'Electric',
      seatingCapacity: 300,
      standingCapacity: 675
    },
    performance: {
      averageSpeed: 45,
      fuelEfficiency: 4.5,
      reliabilityScore: 95,
      utilizationRate: 82
    },
    maintenanceHistory: [
      {
        date: new Date('2024-08-15'),
        type: 'Scheduled Maintenance',
        description: 'Quarterly inspection and service',
        cost: 45000,
        performedBy: 'KMRL Maintenance Team',
        nextDue: new Date('2024-09-15')
      }
    ]
  },
  {
    trainsetNumber: 'TS002',
    manufacturer: 'Alstom',
    model: 'Metropolis',
    yearOfManufacture: 2017,
    capacity: 975,
    maxSpeed: 80,
    currentMileage: 130000,
    totalMileage: 130000,
    status: 'IN_SERVICE',
    location: 'Edapally Station',
    depot: 'Muttom',
    lastMaintenanceDate: new Date('2024-08-20'),
    nextMaintenanceDate: new Date('2024-09-20'),
    fitnessExpiry: new Date('2025-03-31'),
    operationalHours: 8750,
    specifications: {
      length: 65,
      width: 2.9,
      height: 3.8,
      weight: 180000,
      engineType: 'Electric',
      fuelType: 'Electric',
      seatingCapacity: 300,
      standingCapacity: 675
    },
    performance: {
      averageSpeed: 44,
      fuelEfficiency: 4.4,
      reliabilityScore: 94,
      utilizationRate: 85
    }
  },
  {
    trainsetNumber: 'TS003',
    manufacturer: 'Alstom',
    model: 'Metropolis',
    yearOfManufacture: 2018,
    capacity: 975,
    maxSpeed: 80,
    currentMileage: 115000,
    totalMileage: 115000,
    status: 'MAINTENANCE',
    location: 'Muttom Depot',
    depot: 'Muttom',
    lastMaintenanceDate: new Date('2024-09-10'),
    nextMaintenanceDate: new Date('2024-09-25'),
    fitnessExpiry: new Date('2025-04-30'),
    operationalHours: 7800,
    notes: 'Under scheduled maintenance - brake system inspection',
    specifications: {
      length: 65,
      width: 2.9,
      height: 3.8,
      weight: 180000,
      engineType: 'Electric',
      fuelType: 'Electric',
      seatingCapacity: 300,
      standingCapacity: 675
    },
    performance: {
      averageSpeed: 46,
      fuelEfficiency: 4.6,
      reliabilityScore: 96,
      utilizationRate: 78
    }
  },
  {
    trainsetNumber: 'TS004',
    manufacturer: 'Alstom',
    model: 'Metropolis',
    yearOfManufacture: 2018,
    capacity: 975,
    maxSpeed: 80,
    currentMileage: 110000,
    totalMileage: 110000,
    status: 'AVAILABLE',
    location: 'Palarivattom Station',
    depot: 'Muttom',
    lastMaintenanceDate: new Date('2024-08-25'),
    nextMaintenanceDate: new Date('2024-09-25'),
    fitnessExpiry: new Date('2025-04-30'),
    operationalHours: 7500,
    specifications: {
      length: 65,
      width: 2.9,
      height: 3.8,
      weight: 180000,
      engineType: 'Electric',
      fuelType: 'Electric',
      seatingCapacity: 300,
      standingCapacity: 675
    },
    performance: {
      averageSpeed: 45,
      fuelEfficiency: 4.5,
      reliabilityScore: 97,
      utilizationRate: 80
    }
  },
  {
    trainsetNumber: 'TS005',
    manufacturer: 'Alstom',
    model: 'Metropolis',
    yearOfManufacture: 2019,
    capacity: 975,
    maxSpeed: 80,
    currentMileage: 95000,
    totalMileage: 95000,
    status: 'IN_SERVICE',
    location: 'MG Road Station',
    depot: 'Muttom',
    lastMaintenanceDate: new Date('2024-09-01'),
    nextMaintenanceDate: new Date('2024-10-01'),
    fitnessExpiry: new Date('2025-05-31'),
    operationalHours: 6500,
    specifications: {
      length: 65,
      width: 2.9,
      height: 3.8,
      weight: 180000,
      engineType: 'Electric',
      fuelType: 'Electric',
      seatingCapacity: 300,
      standingCapacity: 675
    },
    performance: {
      averageSpeed: 47,
      fuelEfficiency: 4.7,
      reliabilityScore: 98,
      utilizationRate: 88
    }
  },
  {
    trainsetNumber: 'TS006',
    manufacturer: 'Alstom',
    model: 'Metropolis',
    yearOfManufacture: 2019,
    capacity: 975,
    maxSpeed: 80,
    currentMileage: 92000,
    totalMileage: 92000,
    status: 'CLEANING',
    location: 'Muttom Depot',
    depot: 'Muttom',
    lastMaintenanceDate: new Date('2024-09-05'),
    nextMaintenanceDate: new Date('2024-10-05'),
    lastCleaningDate: new Date('2024-09-13'),
    nextCleaningDate: new Date('2024-09-14'),
    fitnessExpiry: new Date('2025-05-31'),
    operationalHours: 6300,
    notes: 'Daily cleaning and sanitization',
    specifications: {
      length: 65,
      width: 2.9,
      height: 3.8,
      weight: 180000,
      engineType: 'Electric',
      fuelType: 'Electric',
      seatingCapacity: 300,
      standingCapacity: 675
    },
    performance: {
      averageSpeed: 46,
      fuelEfficiency: 4.6,
      reliabilityScore: 97,
      utilizationRate: 83
    }
  },
  {
    trainsetNumber: 'TS007',
    manufacturer: 'BEML',
    model: 'Metro Coach',
    yearOfManufacture: 2020,
    capacity: 1000,
    maxSpeed: 85,
    currentMileage: 75000,
    totalMileage: 75000,
    status: 'AVAILABLE',
    location: 'Kalamassery Station',
    depot: 'Muttom',
    lastMaintenanceDate: new Date('2024-08-30'),
    nextMaintenanceDate: new Date('2024-09-30'),
    fitnessExpiry: new Date('2025-06-30'),
    operationalHours: 5200,
    specifications: {
      length: 68,
      width: 3.0,
      height: 3.9,
      weight: 185000,
      engineType: 'Electric',
      fuelType: 'Electric',
      seatingCapacity: 310,
      standingCapacity: 690
    },
    performance: {
      averageSpeed: 48,
      fuelEfficiency: 4.8,
      reliabilityScore: 99,
      utilizationRate: 79
    }
  },
  {
    trainsetNumber: 'TS008',
    manufacturer: 'BEML',
    model: 'Metro Coach',
    yearOfManufacture: 2020,
    capacity: 1000,
    maxSpeed: 85,
    currentMileage: 72000,
    totalMileage: 72000,
    status: 'IN_SERVICE',
    location: 'Ernakulam South Station',
    depot: 'Muttom',
    lastMaintenanceDate: new Date('2024-09-02'),
    nextMaintenanceDate: new Date('2024-10-02'),
    fitnessExpiry: new Date('2025-06-30'),
    operationalHours: 5000,
    specifications: {
      length: 68,
      width: 3.0,
      height: 3.9,
      weight: 185000,
      engineType: 'Electric',
      fuelType: 'Electric',
      seatingCapacity: 310,
      standingCapacity: 690
    },
    performance: {
      averageSpeed: 47,
      fuelEfficiency: 4.7,
      reliabilityScore: 98,
      utilizationRate: 86
    }
  }
];

async function seedTrainsets() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Clear existing trainsets
    await Trainset.deleteMany({});
    console.log('🗑️  Cleared existing trainsets');

    // Insert sample trainsets
    const trainsets = await Trainset.insertMany(sampleTrainsets);
    console.log(`✅ Created ${trainsets.length} sample trainsets`);

    // Display summary
    const stats = await Trainset.getStatistics();
    console.log('\n📊 Trainsets Summary:');
    console.log(`   Total: ${stats.total}`);
    console.log(`   Maintenance Due: ${stats.maintenanceDue}`);
    console.log('\n   Status Distribution:');
    stats.byStatus.forEach(s => {
      console.log(`   - ${s._id}: ${s.count} trainsets`);
    });

    await mongoose.disconnect();
    console.log('\n✅ Seeding complete!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

seedTrainsets();