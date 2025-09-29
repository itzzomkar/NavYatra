const mongoose = require('mongoose');
const Optimization = require('./models/Optimization');
const Trainset = require('./models/Trainset');
const Schedule = require('./models/Schedule');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/kmrl-auth', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

// KMRL operational scenarios for optimization testing
const optimizationScenarios = [
  {
    name: 'Peak Hour Traffic Optimization',
    description: 'Optimize schedules for morning and evening peak hours',
    parameters: {
      algorithm: 'GENETIC_ALGORITHM',
      maxIterations: 500,
      populationSize: 30,
      mutationRate: 0.15,
      crossoverRate: 0.85,
      convergenceThreshold: 0.001
    },
    constraints: {
      minTurnaroundTime: 10,
      maxDailyOperatingHours: 18,
      minPlatformDwellTime: 25,
      fitnessComplianceRequired: true,
      mandatoryMaintenanceWindow: true,
      maxCrewDutyHours: 8,
      minCrewRestPeriod: 8,
      platformCapacity: 4,
      depotCapacity: 12
    },
    objectives: {
      fitnessCompliance: 0.20,
      maintenanceScheduling: 0.15,
      mileageBalancing: 0.20,
      energyEfficiency: 0.20,
      passengerComfort: 0.20,
      operationalCost: 0.05
    },
    shift: 'MORNING',
    expectedResults: {
      fitnessScore: 8.2,
      improvementPercentage: 18.5,
      energyReduction: 12.3,
      costSavings: 15000
    }
  },
  {
    name: 'Energy Efficiency Optimization',
    description: 'Focus on reducing energy consumption and improving efficiency',
    parameters: {
      algorithm: 'SIMULATED_ANNEALING',
      maxIterations: 800,
      populationSize: 40,
      mutationRate: 0.12,
      crossoverRate: 0.80,
      convergenceThreshold: 0.0005
    },
    constraints: {
      minTurnaroundTime: 15,
      maxDailyOperatingHours: 16,
      minPlatformDwellTime: 30,
      fitnessComplianceRequired: true,
      mandatoryMaintenanceWindow: true,
      maxCrewDutyHours: 7,
      minCrewRestPeriod: 9,
      platformCapacity: 4,
      depotCapacity: 10
    },
    objectives: {
      fitnessCompliance: 0.15,
      maintenanceScheduling: 0.15,
      mileageBalancing: 0.15,
      energyEfficiency: 0.35,
      passengerComfort: 0.15,
      operationalCost: 0.05
    },
    shift: 'AFTERNOON',
    expectedResults: {
      fitnessScore: 7.8,
      improvementPercentage: 22.1,
      energyReduction: 25.7,
      costSavings: 28000
    }
  },
  {
    name: 'Maintenance Window Optimization',
    description: 'Optimize schedules considering maintenance requirements',
    parameters: {
      algorithm: 'PARTICLE_SWARM',
      maxIterations: 600,
      populationSize: 35,
      mutationRate: 0.10,
      crossoverRate: 0.75,
      convergenceThreshold: 0.002
    },
    constraints: {
      minTurnaroundTime: 20,
      maxDailyOperatingHours: 14,
      minPlatformDwellTime: 35,
      fitnessComplianceRequired: true,
      mandatoryMaintenanceWindow: true,
      maxCrewDutyHours: 6,
      minCrewRestPeriod: 10,
      platformCapacity: 3,
      depotCapacity: 8
    },
    objectives: {
      fitnessCompliance: 0.25,
      maintenanceScheduling: 0.30,
      mileageBalancing: 0.20,
      energyEfficiency: 0.10,
      passengerComfort: 0.10,
      operationalCost: 0.05
    },
    shift: 'EVENING',
    expectedResults: {
      fitnessScore: 8.5,
      improvementPercentage: 16.3,
      energyReduction: 8.2,
      costSavings: 12000
    }
  },
  {
    name: 'Weekend Service Optimization',
    description: 'Optimize schedules for weekend operations with reduced demand',
    parameters: {
      algorithm: 'TABU_SEARCH',
      maxIterations: 400,
      populationSize: 25,
      mutationRate: 0.08,
      crossoverRate: 0.70,
      convergenceThreshold: 0.003
    },
    constraints: {
      minTurnaroundTime: 12,
      maxDailyOperatingHours: 15,
      minPlatformDwellTime: 28,
      fitnessComplianceRequired: false,
      mandatoryMaintenanceWindow: false,
      maxCrewDutyHours: 8,
      minCrewRestPeriod: 8,
      platformCapacity: 4,
      depotCapacity: 10
    },
    objectives: {
      fitnessCompliance: 0.10,
      maintenanceScheduling: 0.20,
      mileageBalancing: 0.25,
      energyEfficiency: 0.20,
      passengerComfort: 0.15,
      operationalCost: 0.10
    },
    shift: 'MORNING',
    expectedResults: {
      fitnessScore: 7.2,
      improvementPercentage: 14.8,
      energyReduction: 18.5,
      costSavings: 22000
    }
  },
  {
    name: 'Cost Reduction Optimization',
    description: 'Focus on minimizing operational costs while maintaining service quality',
    parameters: {
      algorithm: 'GENETIC_ALGORITHM',
      maxIterations: 700,
      populationSize: 45,
      mutationRate: 0.13,
      crossoverRate: 0.88,
      convergenceThreshold: 0.001
    },
    constraints: {
      minTurnaroundTime: 8,
      maxDailyOperatingHours: 20,
      minPlatformDwellTime: 22,
      fitnessComplianceRequired: true,
      mandatoryMaintenanceWindow: true,
      maxCrewDutyHours: 8.5,
      minCrewRestPeriod: 7.5,
      platformCapacity: 5,
      depotCapacity: 15
    },
    objectives: {
      fitnessCompliance: 0.15,
      maintenanceScheduling: 0.10,
      mileageBalancing: 0.15,
      energyEfficiency: 0.15,
      passengerComfort: 0.15,
      operationalCost: 0.30
    },
    shift: 'AFTERNOON',
    expectedResults: {
      fitnessScore: 8.0,
      improvementPercentage: 19.7,
      energyReduction: 15.2,
      costSavings: 35000
    }
  },
  {
    name: 'Passenger Comfort Optimization',
    description: 'Optimize for maximum passenger satisfaction and comfort',
    parameters: {
      algorithm: 'SIMULATED_ANNEALING',
      maxIterations: 550,
      populationSize: 38,
      mutationRate: 0.11,
      crossoverRate: 0.82,
      convergenceThreshold: 0.0008
    },
    constraints: {
      minTurnaroundTime: 18,
      maxDailyOperatingHours: 17,
      minPlatformDwellTime: 40,
      fitnessComplianceRequired: true,
      mandatoryMaintenanceWindow: true,
      maxCrewDutyHours: 7.5,
      minCrewRestPeriod: 8.5,
      platformCapacity: 3,
      depotCapacity: 9
    },
    objectives: {
      fitnessCompliance: 0.20,
      maintenanceScheduling: 0.15,
      mileageBalancing: 0.15,
      energyEfficiency: 0.10,
      passengerComfort: 0.35,
      operationalCost: 0.05
    },
    shift: 'EVENING',
    expectedResults: {
      fitnessScore: 8.7,
      improvementPercentage: 21.3,
      energyReduction: 9.8,
      costSavings: 18000
    }
  },
  {
    name: 'Festival Season Rush Optimization',
    description: 'Special optimization for festival seasons with high passenger demand',
    parameters: {
      algorithm: 'GENETIC_ALGORITHM',
      maxIterations: 900,
      populationSize: 55,
      mutationRate: 0.18,
      crossoverRate: 0.90,
      convergenceThreshold: 0.0005
    },
    constraints: {
      minTurnaroundTime: 5,
      maxDailyOperatingHours: 22,
      minPlatformDwellTime: 45,
      fitnessComplianceRequired: true,
      mandatoryMaintenanceWindow: false,
      maxCrewDutyHours: 9,
      minCrewRestPeriod: 7,
      platformCapacity: 6,
      depotCapacity: 18
    },
    objectives: {
      fitnessCompliance: 0.15,
      maintenanceScheduling: 0.05,
      mileageBalancing: 0.10,
      energyEfficiency: 0.15,
      passengerComfort: 0.45,
      operationalCost: 0.10
    },
    shift: 'MORNING',
    expectedResults: {
      fitnessScore: 9.1,
      improvementPercentage: 28.4,
      energyReduction: 5.3,
      costSavings: 45000
    }
  },
  {
    name: 'Night Service Optimization',
    description: 'Optimize limited night services for essential connectivity',
    parameters: {
      algorithm: 'TABU_SEARCH',
      maxIterations: 300,
      populationSize: 20,
      mutationRate: 0.05,
      crossoverRate: 0.65,
      convergenceThreshold: 0.005
    },
    constraints: {
      minTurnaroundTime: 25,
      maxDailyOperatingHours: 8,
      minPlatformDwellTime: 20,
      fitnessComplianceRequired: false,
      mandatoryMaintenanceWindow: true,
      maxCrewDutyHours: 6,
      minCrewRestPeriod: 10,
      platformCapacity: 2,
      depotCapacity: 6
    },
    objectives: {
      fitnessCompliance: 0.05,
      maintenanceScheduling: 0.40,
      mileageBalancing: 0.20,
      energyEfficiency: 0.25,
      passengerComfort: 0.05,
      operationalCost: 0.05
    },
    shift: 'EVENING',
    expectedResults: {
      fitnessScore: 6.8,
      improvementPercentage: 12.1,
      energyReduction: 30.5,
      costSavings: 8000
    }
  }
];

// Generate realistic operational metrics
const generateOptimizationMetrics = (scenario, trainsetCount, scheduleCount) => {
  const baseDistance = trainsetCount * 250; // Average daily distance per trainset
  const baseEnergy = baseDistance * 3.2; // kWh per km
  const baseCost = baseDistance * 42; // INR per km
  
  return {
    totalDistance: baseDistance + Math.floor(Math.random() * 100),
    energyConsumption: baseEnergy * (1 - scenario.expectedResults.energyReduction / 100),
    passengerCapacity: scheduleCount * 650, // Average passengers per schedule
    averageUtilization: 75 + Math.floor(Math.random() * 20), // 75-95%
    maintenanceCompliance: Math.random() > 0.1 ? 100 : 95, // 90% compliance rate
    constraintViolations: Math.floor(Math.random() * 3), // 0-2 violations
    operationalCost: baseCost - scenario.expectedResults.costSavings,
    estimatedRevenue: scheduleCount * 650 * 28, // Average fare
    profitMargin: scenario.expectedResults.fitnessScore * 2.5
  };
};

// Generate sample optimization results
const generateOptimizationResults = (scenario, trainsets) => {
  const scheduleCount = Math.floor(trainsets.length * 6 + Math.random() * 12); // 6-18 schedules per trainset
  const metrics = generateOptimizationMetrics(scenario, trainsets.length, scheduleCount);
  
  return {
    fitnessScore: scenario.expectedResults.fitnessScore + (Math.random() - 0.5) * 0.8,
    improvementPercentage: scenario.expectedResults.improvementPercentage + (Math.random() - 0.5) * 5,
    scheduleCount,
    generatedSchedules: trainsets.slice(0, Math.min(5, trainsets.length)).map((trainset, index) => ({
      trainsetId: trainset._id,
      route: {
        from: index % 2 === 0 ? 'Aluva' : 'Pettah',
        to: index % 2 === 0 ? 'Pettah' : 'Aluva',
        routeName: index % 2 === 0 ? 'Aluva - Pettah' : 'Pettah - Aluva'
      },
      departureTime: new Date(Date.now() + index * 15 * 60 * 1000), // 15 min intervals
      arrivalTime: new Date(Date.now() + (index * 15 + 53) * 60 * 1000), // 53 min journey
      expectedDuration: 53,
      crew: {
        driver: `Driver-${index + 1}`,
        coDriver: `CoDriver-${index + 1}`
      }
    })),
    metrics
  };
};

// Generate execution details
const generateExecutionDetails = (scenario) => {
  const startTime = new Date(Date.now() - Math.floor(Math.random() * 30 * 24 * 60 * 60 * 1000)); // Last 30 days
  const duration = Math.floor(scenario.parameters.maxIterations / 10 + Math.random() * 30000); // Realistic duration
  
  return {
    status: Math.random() > 0.15 ? 'COMPLETED' : 'FAILED', // 85% success rate
    startTime,
    endTime: new Date(startTime.getTime() + duration),
    duration,
    iterations: Math.floor(scenario.parameters.maxIterations * (0.8 + Math.random() * 0.4)), // 80-120% of max
    convergence: scenario.parameters.convergenceThreshold * (0.5 + Math.random() * 1.5),
    progress: 100,
    errorMessage: Math.random() > 0.85 ? 'Memory allocation failed during genetic algorithm execution' : undefined
  };
};

async function seedOptimizations() {
  try {
    console.log('🚀 Starting optimization seeding...\n');
    
    // Clear existing optimizations
    await Optimization.deleteMany({});
    console.log('✅ Cleared existing optimizations\n');
    
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
    
    // Create a test user ID (using a sample ObjectId)
    const testUserId = new mongoose.Types.ObjectId('649c8b5c4a5b2f1234567890');
    
    let seedCount = 0;
    
    // Generate optimization records for each scenario
    for (const scenario of optimizationScenarios) {
      try {
        const scheduleDate = new Date();
        scheduleDate.setDate(scheduleDate.getDate() + Math.floor(Math.random() * 7)); // Next 7 days
        
        const selectedTrainsets = trainsets.slice(0, Math.min(8, trainsets.length)); // Use up to 8 trainsets
        const results = generateOptimizationResults(scenario, selectedTrainsets);
        const execution = generateExecutionDetails(scenario);
        
        const optimization = new Optimization({
          inputData: {
            trainsetIds: selectedTrainsets.map(t => t._id),
            trainsetCount: selectedTrainsets.length,
            scheduleDate,
            shift: scenario.shift
          },
          parameters: scenario.parameters,
          constraints: scenario.constraints,
          objectives: scenario.objectives,
          results,
          execution,
          createdBy: testUserId,
          tags: [
            scenario.name.replace(/\s+/g, '_').toLowerCase(),
            scenario.shift.toLowerCase(),
            'kmrl_optimization',
            'automated_seed'
          ],
          notes: `${scenario.description}\n\nGenerated for testing and demonstration purposes with realistic KMRL operational parameters.`,
          version: '1.0'
        });
        
        await optimization.save();
        seedCount++;
        
        console.log(`✅ Created optimization: ${optimization.optimizationId}`);
        console.log(`   Scenario: ${scenario.name}`);
        console.log(`   Status: ${execution.status}`);
        console.log(`   Fitness Score: ${results.fitnessScore.toFixed(2)}`);
        console.log(`   Trainsets: ${selectedTrainsets.length}`);
        console.log(`   Schedules Generated: ${results.scheduleCount}`);
        console.log(`   Energy Savings: ${((scenario.expectedResults.energyReduction || 0)).toFixed(1)}%`);
        console.log(`   Cost Savings: ₹${(results.metrics.operationalCost > 0 ? scenario.expectedResults.costSavings : 0).toLocaleString()}`);
        console.log('');
        
      } catch (error) {
        console.error(`❌ Failed to create optimization for ${scenario.name}:`, error.message);
      }
    }
    
    console.log(`\n✅ Successfully created ${seedCount} optimization records!\n`);
    
    // Display statistics
    const stats = await Optimization.aggregate([
      { $group: { 
        _id: '$execution.status', 
        count: { $sum: 1 },
        avgFitness: { $avg: '$results.fitnessScore' },
        avgImprovement: { $avg: '$results.improvementPercentage' }
      }}
    ]);
    
    console.log('📊 Optimization Statistics:');
    stats.forEach(stat => {
      console.log(`   ${stat._id}: ${stat.count} optimizations`);
      if (stat.avgFitness) {
        console.log(`     Average Fitness Score: ${stat.avgFitness.toFixed(2)}`);
        console.log(`     Average Improvement: ${stat.avgImprovement.toFixed(1)}%`);
      }
    });
    
    // Algorithm usage statistics
    const algorithmStats = await Optimization.aggregate([
      { $group: { 
        _id: '$parameters.algorithm', 
        count: { $sum: 1 },
        avgIterations: { $avg: '$execution.iterations' },
        successRate: { 
          $avg: { 
            $cond: [
              { $eq: ['$execution.status', 'COMPLETED'] }, 
              1, 
              0
            ] 
          } 
        }
      }}
    ]);
    
    console.log('\n🔬 Algorithm Performance:');
    algorithmStats.forEach(alg => {
      console.log(`   ${alg._id}:`);
      console.log(`     Usage: ${alg.count} times`);
      console.log(`     Average Iterations: ${Math.round(alg.avgIterations)}`);
      console.log(`     Success Rate: ${(alg.successRate * 100).toFixed(1)}%`);
    });
    
    // Recent optimizations
    const recentOptimizations = await Optimization.find({ 
      'execution.status': 'COMPLETED' 
    })
    .sort({ createdAt: -1 })
    .limit(3)
    .select('optimizationId results.fitnessScore results.improvementPercentage inputData.trainsetCount');
    
    console.log('\n🏆 Top Recent Optimizations:');
    recentOptimizations.forEach((opt, index) => {
      console.log(`   ${index + 1}. ${opt.optimizationId}`);
      console.log(`      Fitness Score: ${opt.results.fitnessScore.toFixed(2)}`);
      console.log(`      Improvement: ${opt.results.improvementPercentage.toFixed(1)}%`);
      console.log(`      Trainsets: ${opt.inputData.trainsetCount}`);
    });
    
    console.log('\n🎯 Seed Data Summary:');
    console.log(`   Total Scenarios: ${optimizationScenarios.length}`);
    console.log(`   Successful Seeds: ${seedCount}`);
    console.log(`   Coverage: ${(seedCount / optimizationScenarios.length * 100).toFixed(1)}%`);
    console.log('   Ready for UI testing and demonstration! 🚀');
    
  } catch (error) {
    console.error('❌ Error seeding optimizations:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔒 Database connection closed');
  }
}

// Run the seeding
seedOptimizations();

require('dotenv').config();
const mongoose = require('mongoose');
const Optimization = require('./models/Optimization');
const Trainset = require('./models/Trainset');
const User = require('./models/User');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/kmrl-auth-system');
    console.log('MongoDB connected for seeding optimizations...');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

const seedOptimizations = async () => {
  try {
    await connectDB();

    // Get existing trainsets and user for reference
    const trainsets = await Trainset.find().limit(10);
    const user = await User.findOne({ role: 'admin' }) || await User.findOne();

    if (trainsets.length === 0) {
      console.log('No trainsets found. Please run seed-trainsets.js first.');
      return;
    }

    if (!user) {
      console.log('No users found. Please create a user first.');
      return;
    }

    // Clear existing optimization data
    await Optimization.deleteMany({});
    console.log('Cleared existing optimization data');

    const optimizationData = [];
    const algorithms = ['GENETIC_ALGORITHM', 'SIMULATED_ANNEALING', 'PARTICLE_SWARM', 'TABU_SEARCH'];
    const statuses = ['COMPLETED', 'COMPLETED', 'COMPLETED', 'RUNNING', 'FAILED', 'PENDING'];
    
    // Create sample optimizations for the last 30 days
    for (let i = 0; i < 25; i++) {
      const createdDate = new Date();
      createdDate.setDate(createdDate.getDate() - Math.floor(Math.random() * 30));
      
      const selectedTrainsets = trainsets.slice(0, Math.floor(Math.random() * 5) + 3); // 3-7 trainsets
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      const algorithm = algorithms[Math.floor(Math.random() * algorithms.length)];
      
      const baseOptimization = {
        optimizationId: `OPT-${Date.now()}-${i.toString().padStart(3, '0')}`,
        createdBy: user._id,
        inputData: {
          trainsetIds: selectedTrainsets.map(t => t._id),
          trainsetCount: selectedTrainsets.length,
          scheduleDate: createdDate,
          shift: ['MORNING', 'AFTERNOON', 'EVENING'][Math.floor(Math.random() * 3)]
        },
        parameters: {
          algorithm: algorithm,
          maxIterations: Math.floor(Math.random() * 500) + 100,
          populationSize: Math.floor(Math.random() * 50) + 20,
          mutationRate: Math.random() * 0.3 + 0.05,
          crossoverRate: Math.random() * 0.3 + 0.6,
          convergenceThreshold: Math.random() * 0.01 + 0.001
        },
        constraints: {
          minTurnaroundTime: Math.floor(Math.random() * 15) + 15,
          maxDailyOperatingHours: Math.floor(Math.random() * 4) + 16,
          minPlatformDwellTime: Math.floor(Math.random() * 30) + 30,
          fitnessComplianceRequired: Math.random() > 0.5,
          mandatoryMaintenanceWindow: Math.random() > 0.3,
          maxCrewDutyHours: Math.floor(Math.random() * 4) + 8,
          minCrewRestPeriod: Math.floor(Math.random() * 4) + 8,
          platformCapacity: Math.floor(Math.random() * 4) + 4,
          depotCapacity: Math.floor(Math.random() * 10) + 10
        },
        objectives: {
          fitnessCompliance: Math.random() * 0.5 + 0.2,
          maintenanceScheduling: Math.random() * 0.4 + 0.15,
          mileageBalancing: Math.random() * 0.25 + 0.1,
          energyEfficiency: Math.random() * 0.25 + 0.1,
          passengerComfort: Math.random() * 0.25 + 0.1,
          operationalCost: Math.random() * 0.15 + 0.05
        },
        execution: {
          status: status,
          startTime: createdDate,
          endTime: status === 'COMPLETED' ? new Date(createdDate.getTime() + Math.random() * 3600000) : null,
          duration: status === 'COMPLETED' ? Math.floor(Math.random() * 3600000) + 300000 : null, // 5 minutes to 1 hour
          progress: status === 'RUNNING' ? Math.floor(Math.random() * 80) + 10 : (status === 'COMPLETED' ? 100 : 0),
          errorMessage: status === 'FAILED' ? ['Memory limit exceeded', 'Invalid constraint configuration', 'Database connection timeout'][Math.floor(Math.random() * 3)] : null
        },
        results: status === 'COMPLETED' ? {
          fitnessScore: Math.random() * 4 + 6, // 6-10 score (matches model validation)
          improvementPercentage: Math.random() * 30 + 5, // 5-35% improvement
          scheduleCount: selectedTrainsets.length * 2,
          generatedSchedules: selectedTrainsets.map((trainset, idx) => ({
            trainsetId: trainset._id,
            route: {
              from: ['Central', 'North', 'South', 'East'][idx % 4],
              to: ['Airport', 'Mall', 'University', 'Stadium'][idx % 4],
              routeName: `Route ${idx + 1}`
            },
            departureTime: new Date(createdDate.getTime() + idx * 3600000),
            arrivalTime: new Date(createdDate.getTime() + (idx + 1) * 3600000),
            expectedDuration: Math.floor(Math.random() * 60) + 30, // 30-90 minutes
            platforms: [`Platform ${(idx % 4) + 1}`],
            crew: {
              driver: `Driver ${idx + 1}`,
              coDriver: `CoDriver ${idx + 1}`
            }
          })),
          metrics: {
            totalDistance: Math.floor(Math.random() * 500) + 200,
            energyConsumption: Math.floor(Math.random() * 1000) + 500,
            passengerCapacity: Math.floor(Math.random() * 500) + 200,
            averageUtilization: Math.floor(Math.random() * 30) + 70, // 70-100%
            maintenanceCompliance: Math.floor(Math.random() * 20) + 80, // 80-100%
            constraintViolations: Math.floor(Math.random() * 3)
          }
        } : null,
        tags: ['production', algorithm.toLowerCase().replace('_', '-')],
        notes: `Optimization run for ${selectedTrainsets.length} trainsets using ${algorithm}`,
        version: '1.0',
        createdAt: createdDate,
        updatedAt: createdDate,
        isArchived: false
      };

      optimizationData.push(baseOptimization);
    }

    // Insert the sample data
    const createdOptimizations = await Optimization.insertMany(optimizationData);
    console.log(`✅ Created ${createdOptimizations.length} sample optimization records`);

    // Display summary
    const statusCounts = createdOptimizations.reduce((acc, opt) => {
      acc[opt.execution.status] = (acc[opt.execution.status] || 0) + 1;
      return acc;
    }, {});

    const completedOptimizations = createdOptimizations.filter(opt => opt.execution.status === 'COMPLETED');
    const avgFitnessScore = completedOptimizations.length > 0 
      ? completedOptimizations.reduce((sum, opt) => sum + opt.results.fitnessScore, 0) / completedOptimizations.length 
      : 0;

    console.log('\n📊 Optimization Data Summary:');
    console.log(`Total optimizations: ${createdOptimizations.length}`);
    console.log(`Status breakdown:`, statusCounts);
    console.log(`Average fitness score: ${avgFitnessScore.toFixed(2)}`);
    console.log(`Algorithms used: ${[...new Set(createdOptimizations.map(o => o.parameters.algorithm))].join(', ')}`);

    console.log('\n🎯 Sample optimization records created successfully!');
    console.log('You can now test the optimization analytics dashboard.');

  } catch (error) {
    console.error('Error seeding optimizations:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed.');
  }
};

// Run the seeding function
if (require.main === module) {
  seedOptimizations();
}

module.exports = seedOptimizations;