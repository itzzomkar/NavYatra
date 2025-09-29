const mongoose = require('mongoose');
const Optimization = require('../models/Optimization');
const User = require('../models/User');
const Trainset = require('../models/Trainset');

async function createSampleOptimizations() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/auth_system_db');
    console.log('Connected to MongoDB');

    // Get first user and trainsets
    const user = await User.findOne();
    const trainsets = await Trainset.find().limit(5);

    if (!user) {
      console.error('No user found. Please create a user first.');
      return;
    }

    if (trainsets.length === 0) {
      console.error('No trainsets found. Please create trainsets first.');
      return;
    }

    // Clear existing optimizations
    await Optimization.deleteMany({});
    console.log('Cleared existing optimizations');

    const sampleOptimizations = [];
    const algorithms = ['GENETIC_ALGORITHM', 'SIMULATED_ANNEALING', 'PARTICLE_SWARM', 'TABU_SEARCH'];
    const shifts = ['MORNING', 'AFTERNOON', 'EVENING'];
    const statuses = ['COMPLETED', 'RUNNING', 'PENDING', 'FAILED'];

    for (let i = 0; i < 20; i++) {
      const daysAgo = Math.floor(Math.random() * 30); // Random date in last 30 days
      const createdAt = new Date();
      createdAt.setDate(createdAt.getDate() - daysAgo);

      const scheduleDate = new Date(createdAt);
      scheduleDate.setDate(scheduleDate.getDate() + Math.floor(Math.random() * 7)); // Future schedule date

      const algorithm = algorithms[Math.floor(Math.random() * algorithms.length)];
      const shift = shifts[Math.floor(Math.random() * shifts.length)];
      const status = i < 15 ? 'COMPLETED' : statuses[Math.floor(Math.random() * statuses.length)];

      const selectedTrainsets = trainsets.slice(0, Math.floor(Math.random() * 4) + 2); // 2-5 trainsets

      // Generate human-readable names
      const algorithmNames = {
        'GENETIC_ALGORITHM': 'Genetic AI',
        'SIMULATED_ANNEALING': 'Smart Annealing',
        'PARTICLE_SWARM': 'Swarm Intelligence',
        'TABU_SEARCH': 'Tabu Search'
      };
      
      const shiftNames = {
        'MORNING': 'Morning Rush',
        'AFTERNOON': 'Afternoon Peak',
        'EVENING': 'Evening Service'
      };
      
      const purposes = [
        'Energy Efficiency',
        'Passenger Comfort',
        'Maintenance Optimization',
        'Cost Reduction',
        'Schedule Optimization',
        'Peak Hour Management',
        'Service Reliability',
        'Route Optimization'
      ];
      
      const purpose = purposes[i % purposes.length];
      const readableName = `${shiftNames[shift]} ${purpose} - ${algorithmNames[algorithm]}`;
      const shortId = `${shift.slice(0,3).toUpperCase()}-${String(i + 1).padStart(3, '0')}`;
      
      const optimization = {
        optimizationId: shortId,
        name: readableName,
        description: `Automated ${purpose.toLowerCase()} using ${algorithmNames[algorithm]} for ${shiftNames[shift].toLowerCase()} operations with ${selectedTrainsets.length} trainsets.`,
        parameters: {
          algorithm: algorithm,
          maxIterations: 500 + Math.floor(Math.random() * 1000),
          populationSize: 30 + Math.floor(Math.random() * 40),
          mutationRate: 0.05 + Math.random() * 0.15,
          crossoverRate: 0.6 + Math.random() * 0.3,
          convergenceThreshold: 0.0001 + Math.random() * 0.001
        },
        inputData: {
          trainsetIds: selectedTrainsets.map(t => t._id),
          trainsetCount: selectedTrainsets.length,
          scheduleDate: scheduleDate,
          shift: shift
        },
        constraints: {
          minTurnaroundTime: 10 + Math.floor(Math.random() * 20),
          maxDailyOperatingHours: 16 + Math.floor(Math.random() * 4),
          minPlatformDwellTime: 25 + Math.floor(Math.random() * 15),
          fitnessComplianceRequired: Math.random() > 0.2,
          mandatoryMaintenanceWindow: Math.random() > 0.1,
          maxCrewDutyHours: 7 + Math.floor(Math.random() * 3),
          minCrewRestPeriod: 6 + Math.floor(Math.random() * 4),
          platformCapacity: 3 + Math.floor(Math.random() * 3),
          depotCapacity: 8 + Math.floor(Math.random() * 5)
        },
        objectives: {
          fitnessCompliance: 0.2 + Math.random() * 0.1,
          maintenanceScheduling: 0.15 + Math.random() * 0.1,
          mileageBalancing: 0.1 + Math.random() * 0.1,
          energyEfficiency: 0.1 + Math.random() * 0.1,
          passengerComfort: 0.1 + Math.random() * 0.1,
          operationalCost: 0.05 + Math.random() * 0.1
        },
        execution: {
          status: status,
          startTime: createdAt,
          endTime: status === 'COMPLETED' ? new Date(createdAt.getTime() + (30 + Math.random() * 300) * 1000) : null,
          duration: status === 'COMPLETED' ? (30 + Math.random() * 300) * 1000 : null,
          iterations: status === 'COMPLETED' ? Math.floor(100 + Math.random() * 400) : null,
          convergence: status === 'COMPLETED' ? Math.random() * 0.001 : null,
          progress: status === 'COMPLETED' ? 100 : (status === 'RUNNING' ? Math.floor(Math.random() * 80) + 10 : 0)
        },
        createdBy: user._id,
        createdAt: createdAt,
        updatedAt: createdAt
      };

      // Add results for completed optimizations
      if (status === 'COMPLETED') {
        const fitnessScore = 6 + Math.random() * 3; // 6-9 range
        optimization.results = {
          fitnessScore: fitnessScore,
          improvementPercentage: Math.random() * 40 + 10, // 10-50%
          scheduleCount: selectedTrainsets.length * (2 + Math.floor(Math.random() * 3)),
          generatedSchedules: selectedTrainsets.map((trainset, idx) => ({
            trainsetId: trainset._id,
            route: {
              from: idx % 2 === 0 ? 'Aluva' : 'Petta',
              to: idx % 2 === 0 ? 'Petta' : 'Aluva',
              routeName: `Route-${idx + 1}`
            },
            departureTime: new Date(scheduleDate.getTime() + (shift === 'MORNING' ? 6 : shift === 'AFTERNOON' ? 14 : 18) * 3600000 + idx * 1800000),
            arrivalTime: new Date(scheduleDate.getTime() + (shift === 'MORNING' ? 6 : shift === 'AFTERNOON' ? 14 : 18) * 3600000 + idx * 1800000 + 2400000),
            expectedDuration: 40 + Math.floor(Math.random() * 20),
            platforms: [`P${Math.floor(Math.random() * 4) + 1}`, `P${Math.floor(Math.random() * 4) + 1}`],
            crew: {
              driver: `Driver-${Math.floor(Math.random() * 20) + 1}`,
              coDriver: `Co-Driver-${Math.floor(Math.random() * 20) + 1}`
            }
          })),
          metrics: {
            totalDistance: selectedTrainsets.length * (25 + Math.random() * 15), // km
            energyConsumption: selectedTrainsets.length * (15 + Math.random() * 10), // kWh
            passengerCapacity: selectedTrainsets.length * 300,
            averageUtilization: 70 + Math.random() * 25, // %
            maintenanceCompliance: 85 + Math.random() * 15, // %
            constraintViolations: Math.floor(Math.random() * 3)
          }
        };
      }

      // Add some failed optimizations with error messages
      if (status === 'FAILED') {
        const errors = [
          'Insufficient trainset availability',
          'Constraint violation in crew scheduling',
          'Platform capacity exceeded',
          'Convergence timeout reached'
        ];
        optimization.execution.errorMessage = errors[Math.floor(Math.random() * errors.length)];
      }

      sampleOptimizations.push(optimization);
    }

    // Insert sample optimizations
    await Optimization.insertMany(sampleOptimizations);
    console.log(`Created ${sampleOptimizations.length} sample optimizations`);

    // Display summary
    const stats = await Optimization.getOptimizationStats();
    console.log('Optimization Statistics:', stats[0]);

    console.log('Sample optimizations created successfully!');
    process.exit(0);

  } catch (error) {
    console.error('Error creating sample optimizations:', error);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  createSampleOptimizations();
}

module.exports = createSampleOptimizations;