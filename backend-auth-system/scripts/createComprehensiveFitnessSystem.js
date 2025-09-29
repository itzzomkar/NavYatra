const mongoose = require('mongoose');
require('dotenv').config();

const Trainset = require('../models/Trainset');
const Fitness = require('../models/Fitness');

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/auth_system_db');

const createComprehensiveFitnessSystem = async () => {
  try {
    console.log('🚀 Creating Comprehensive KMRL Fitness System...');

    // Step 1: Create 11 trainsets with proper data
    console.log('🚂 Creating 11 KMRL trainsets...');
    await Trainset.deleteMany({});

    const trainsets = [
      {
        trainsetNumber: 'TS001',
        manufacturer: 'Alstom',
        model: 'Metropolis',
        yearOfManufacture: 2017,
        capacity: 1200,
        maxSpeed: 80,
        currentMileage: 125000,
        totalMileage: 125000,
        status: 'IN_SERVICE',
        location: 'MG Road Terminal',
        depot: 'Aluva Depot',
        lastMaintenanceDate: new Date('2024-06-15'),
        nextMaintenanceDate: new Date('2024-12-15'),
        fitnessExpiry: new Date('2025-06-15'),
        operationalHours: 18500,
        specifications: {
          length: 65.8,
          width: 2.9,
          height: 3.8,
          weight: 250000,
          engineType: 'Electric',
          fuelType: 'Electric',
          seatingCapacity: 300,
          standingCapacity: 900
        }
      },
      {
        trainsetNumber: 'TS002',
        manufacturer: 'Alstom',
        model: 'Metropolis',
        yearOfManufacture: 2017,
        capacity: 1200,
        maxSpeed: 80,
        currentMileage: 130000,
        totalMileage: 130000,
        status: 'AVAILABLE',
        location: 'Kalamassery',
        depot: 'Muttom Workshop',
        lastMaintenanceDate: new Date('2024-07-01'),
        nextMaintenanceDate: new Date('2025-01-01'),
        fitnessExpiry: new Date('2025-07-01'),
        operationalHours: 19200
      },
      {
        trainsetNumber: 'TS003',
        manufacturer: 'Alstom',
        model: 'Metropolis',
        yearOfManufacture: 2018,
        capacity: 1200,
        maxSpeed: 80,
        currentMileage: 115000,
        totalMileage: 115000,
        status: 'IN_SERVICE',
        location: 'Vytila',
        depot: 'Aluva Depot',
        lastMaintenanceDate: new Date('2024-05-20'),
        nextMaintenanceDate: new Date('2024-11-20'),
        fitnessExpiry: new Date('2025-05-20'),
        operationalHours: 17800
      },
      {
        trainsetNumber: 'TS004',
        manufacturer: 'Alstom',
        model: 'Metropolis',
        yearOfManufacture: 2018,
        capacity: 1200,
        maxSpeed: 80,
        currentMileage: 110000,
        totalMileage: 110000,
        status: 'MAINTENANCE',
        location: 'Muttom Workshop',
        depot: 'Muttom Workshop',
        lastMaintenanceDate: new Date('2024-08-10'),
        nextMaintenanceDate: new Date('2024-10-10'),
        fitnessExpiry: new Date('2025-02-10'),
        operationalHours: 16900
      },
      {
        trainsetNumber: 'TS005',
        manufacturer: 'Alstom',
        model: 'Metropolis',
        yearOfManufacture: 2019,
        capacity: 1200,
        maxSpeed: 80,
        currentMileage: 95000,
        totalMileage: 95000,
        status: 'IN_SERVICE',
        location: 'Edapally',
        depot: 'Aluva Depot',
        lastMaintenanceDate: new Date('2024-06-30'),
        nextMaintenanceDate: new Date('2024-12-30'),
        fitnessExpiry: new Date('2025-06-30'),
        operationalHours: 15200
      },
      {
        trainsetNumber: 'TS006',
        manufacturer: 'Alstom',
        model: 'Metropolis',
        yearOfManufacture: 2019,
        capacity: 1200,
        maxSpeed: 80,
        currentMileage: 92000,
        totalMileage: 92000,
        status: 'AVAILABLE',
        location: 'Aluva Depot',
        depot: 'Aluva Depot',
        lastMaintenanceDate: new Date('2024-07-15'),
        nextMaintenanceDate: new Date('2025-01-15'),
        fitnessExpiry: new Date('2025-07-15'),
        operationalHours: 14800
      },
      {
        trainsetNumber: 'TS007',
        manufacturer: 'BEML',
        model: 'Metro Coach',
        yearOfManufacture: 2020,
        capacity: 1200,
        maxSpeed: 80,
        currentMileage: 75000,
        totalMileage: 75000,
        status: 'CLEANING',
        location: 'Kalamassery',
        depot: 'Muttom Workshop',
        lastMaintenanceDate: new Date('2024-08-01'),
        nextMaintenanceDate: new Date('2025-02-01'),
        fitnessExpiry: new Date('2025-08-01'),
        operationalHours: 12500
      },
      {
        trainsetNumber: 'TS008',
        manufacturer: 'BEML',
        model: 'Metro Coach',
        yearOfManufacture: 2020,
        capacity: 1200,
        maxSpeed: 80,
        currentMileage: 72000,
        totalMileage: 72000,
        status: 'IN_SERVICE',
        location: 'MG Road Terminal',
        depot: 'Muttom Workshop',
        lastMaintenanceDate: new Date('2024-08-15'),
        nextMaintenanceDate: new Date('2025-02-15'),
        fitnessExpiry: new Date('2025-08-15'),
        operationalHours: 11800
      },
      {
        trainsetNumber: 'TS009',
        manufacturer: 'BEML',
        model: 'Metro Coach',
        yearOfManufacture: 2021,
        capacity: 1200,
        maxSpeed: 80,
        currentMileage: 58000,
        totalMileage: 58000,
        status: 'AVAILABLE',
        location: 'Vytila',
        depot: 'Aluva Depot',
        lastMaintenanceDate: new Date('2024-09-01'),
        nextMaintenanceDate: new Date('2025-03-01'),
        fitnessExpiry: new Date('2025-09-01'),
        operationalHours: 9500
      },
      {
        trainsetNumber: 'TS010',
        manufacturer: 'BEML',
        model: 'Metro Coach',
        yearOfManufacture: 2021,
        capacity: 1200,
        maxSpeed: 80,
        currentMileage: 55000,
        totalMileage: 55000,
        status: 'IN_SERVICE',
        location: 'Edapally',
        depot: 'Aluva Depot',
        lastMaintenanceDate: new Date('2024-09-10'),
        nextMaintenanceDate: new Date('2025-03-10'),
        fitnessExpiry: new Date('2025-09-10'),
        operationalHours: 9200
      },
      {
        trainsetNumber: 'TS011',
        manufacturer: 'BEML',
        model: 'Metro Coach Advanced',
        yearOfManufacture: 2022,
        capacity: 1200,
        maxSpeed: 80,
        currentMileage: 42000,
        totalMileage: 42000,
        status: 'AVAILABLE',
        location: 'Aluva Depot',
        depot: 'Aluva Depot',
        lastMaintenanceDate: new Date('2024-09-15'),
        nextMaintenanceDate: new Date('2025-03-15'),
        fitnessExpiry: new Date('2025-09-15'),
        operationalHours: 7800
      }
    ];

    await Trainset.insertMany(trainsets);
    console.log('✅ Created 11 trainsets successfully');

    // Step 2: Create comprehensive fitness assessments
    console.log('📊 Creating comprehensive fitness assessments...');
    await Fitness.deleteMany({});

    const createdTrainsets = await Trainset.find({});
    const assessmentTypes = [
      'COMPREHENSIVE_HEALTH_CHECK',
      'PERFORMANCE_ANALYSIS', 
      'SAFETY_INSPECTION',
      'ENERGY_EFFICIENCY_AUDIT',
      'PREVENTIVE_MAINTENANCE_REVIEW',
      'ROUTINE_MONITORING',
      'COMPLIANCE_AUDIT',
      'MECHANICAL_SYSTEMS_CHECK',
      'ELECTRICAL_SYSTEMS_CHECK',
      'COMFORT_ASSESSMENT',
      'ENVIRONMENTAL_IMPACT_STUDY'
    ];

    const inspectors = [
      { name: 'Dr. Rajesh Kumar', certification: 'KMRL-INSP-001', specialization: 'Mechanical Systems' },
      { name: 'Eng. Priya Sharma', certification: 'KMRL-INSP-002', specialization: 'Electrical Systems' },
      { name: 'Mr. Arun Nair', certification: 'KMRL-INSP-003', specialization: 'Safety Systems' },
      { name: 'Ms. Lakshmi Menon', certification: 'KMRL-INSP-004', specialization: 'Performance Analysis' },
      { name: 'Dr. Suresh Babu', certification: 'KMRL-INSP-005', specialization: 'Energy Efficiency' },
      { name: 'Eng. Ravi Varma', certification: 'KMRL-INSP-006', specialization: 'Environmental Systems' }
    ];

    const locations = [
      'Aluva Depot', 'Muttom Workshop', 'Kalamassery Station', 
      'MG Road Terminal', 'Vytila Mobility Hub', 'Edapally Station'
    ];

    let allAssessments = [];

    // Create multiple assessments per trainset
    for (const trainset of createdTrainsets) {
      const numAssessments = Math.floor(Math.random() * 8) + 5; // 5-12 assessments per trainset
      
      for (let i = 0; i < numAssessments; i++) {
        const daysAgo = Math.floor(Math.random() * 365) + (i * 15); // Spread over past year
        const assessmentDate = new Date();
        assessmentDate.setDate(assessmentDate.getDate() - daysAgo);
        
        const inspector = inspectors[Math.floor(Math.random() * inspectors.length)];
        const location = locations[Math.floor(Math.random() * locations.length)];
        const assessmentType = assessmentTypes[Math.floor(Math.random() * assessmentTypes.length)];

        // Generate realistic health metrics based on trainset age and mileage
        const trainAge = new Date().getFullYear() - trainset.yearOfManufacture;
        const mileageImpact = Math.min(trainset.currentMileage / 200000, 1);
        const baseScore = Math.max(9.5 - (trainAge * 0.3) - (mileageImpact * 1.5), 4.0);
        
        const healthMetrics = {
          overall: {
            fitnessScore: Math.max(baseScore + (Math.random() * 1.5 - 0.75), 3.5),
            healthGrade: baseScore >= 8.5 ? 'A' : baseScore >= 7.5 ? 'B' : baseScore >= 6.5 ? 'C' : 'D',
            status: baseScore >= 8.5 ? 'EXCELLENT' : baseScore >= 7.5 ? 'GOOD' : baseScore >= 6.5 ? 'FAIR' : baseScore >= 5 ? 'POOR' : 'CRITICAL',
            reliability: Math.min(95 - (trainAge * 2) + (Math.random() * 10 - 5), 100),
            availability: Math.min(92 - (mileageImpact * 8) + (Math.random() * 8 - 4), 100)
          },
          mechanical: {
            average: baseScore - 0.2 + (Math.random() * 0.8 - 0.4),
            engineHealth: baseScore - 0.1 + (Math.random() * 0.6 - 0.3),
            brakeSystem: baseScore + 0.3 + (Math.random() * 0.4 - 0.2),
            suspension: baseScore - 0.3 + (Math.random() * 0.8 - 0.4),
            wheelCondition: baseScore - 0.4 + (Math.random() * 0.8 - 0.4),
            airConditioning: baseScore + 0.1 + (Math.random() * 0.6 - 0.3)
          },
          electrical: {
            average: baseScore + 0.1 + (Math.random() * 0.6 - 0.3),
            powerSystem: baseScore + 0.2 + (Math.random() * 0.4 - 0.2),
            tractionMotors: baseScore + (Math.random() * 0.6 - 0.3),
            batteryHealth: baseScore - 0.2 + (Math.random() * 0.8 - 0.4),
            lightingSystems: baseScore + 0.3 + (Math.random() * 0.4 - 0.2)
          },
          comfort: {
            average: baseScore + 0.2 + (Math.random() * 0.6 - 0.3),
            airConditioning: baseScore + 0.1 + (Math.random() * 0.8 - 0.4),
            cleanlinessScore: baseScore + 0.4 + (Math.random() * 0.6 - 0.3),
            noiseLevel: baseScore - 0.1 + (Math.random() * 0.8 - 0.4),
            seatingComfort: baseScore + 0.2 + (Math.random() * 0.6 - 0.3)
          },
          safety: {
            average: baseScore + 0.3 + (Math.random() * 0.4 - 0.2),
            emergencyBrakes: baseScore + 0.4 + (Math.random() * 0.4 - 0.2),
            fireSuppressionSystem: baseScore + 0.5 + (Math.random() * 0.3 - 0.15),
            emergencyExits: baseScore + 0.3 + (Math.random() * 0.4 - 0.2),
            securitySystems: baseScore + 0.2 + (Math.random() * 0.6 - 0.3)
          }
        };

        const performanceMetrics = {
          operational: {
            onTimePerformance: Math.min(90 - (trainAge * 1.5) + (Math.random() * 10 - 5), 100),
            serviceReliability: Math.min(88 - (mileageImpact * 5) + (Math.random() * 8 - 4), 100),
            passengerCapacityUtilization: 65 + (Math.random() * 25),
            averageSpeed: 35 + (Math.random() * 15)
          },
          energy: {
            energyEfficiencyScore: Math.min(85 - (trainAge * 1) + (Math.random() * 10 - 5), 100),
            powerConsumptionPerKm: 2.1 + (trainAge * 0.1) + (Math.random() * 0.4 - 0.2),
            regenerativeBrakingEfficiency: Math.min(78 - (trainAge * 0.8) + (Math.random() * 8 - 4), 95),
            idlePowerConsumption: 15 + (trainAge * 0.5) + (Math.random() * 5 - 2.5)
          },
          maintenance: {
            mtbf: Math.max(720 - (trainAge * 30) + (Math.random() * 120 - 60), 200), // Mean Time Between Failures
            mttr: Math.min(4 + (trainAge * 0.3) + (Math.random() * 2 - 1), 12), // Mean Time To Repair
            maintenanceCostPerKm: 12 + (trainAge * 1.2) + (Math.random() * 4 - 2),
            componentReliability: Math.min(92 - (mileageImpact * 6) + (Math.random() * 8 - 4), 100)
          }
        };

        // Create assessment with comprehensive data
        const assessment = {
          trainsetId: trainset._id,
          trainsetNumber: trainset.trainsetNumber,
          assessmentType,
          healthMetrics,
          performanceMetrics,
          sensorData: {
            vibration: {
              average: 0.5 + (trainAge * 0.05) + (Math.random() * 0.3 - 0.15),
              peak: 1.2 + (trainAge * 0.08) + (Math.random() * 0.4 - 0.2),
              frequency: 15 + (Math.random() * 10 - 5)
            },
            temperature: {
              engine: 75 + (trainAge * 2) + (Math.random() * 10 - 5),
              brakes: 65 + (Math.random() * 15 - 7.5),
              electrical: 45 + (Math.random() * 8 - 4)
            },
            acoustic: {
              interior: 55 + (trainAge * 1.5) + (Math.random() * 8 - 4),
              exterior: 70 + (trainAge * 1) + (Math.random() * 6 - 3)
            },
            electrical: {
              voltage: 750 + (Math.random() * 20 - 10),
              current: 400 + (Math.random() * 50 - 25),
              powerFactor: 0.85 + (Math.random() * 0.1 - 0.05)
            }
          },
          environmentalImpact: {
            carbonFootprint: 0.15 + (trainAge * 0.02) + (Math.random() * 0.1 - 0.05),
            energySource: ['RENEWABLE', 'MIXED', 'CONVENTIONAL'][Math.floor(Math.random() * 3)],
            noiseEmission: 65 + (trainAge * 1) + (Math.random() * 8 - 4),
            recyclingScore: Math.max(7 + (Math.random() * 3 - 1.5), 5),
            wasteGeneration: 20 + (trainAge * 2) + (Math.random() * 10 - 5),
            ecoFriendlinessRating: Math.min(8.5 - (trainAge * 0.2) + (Math.random() * 1 - 0.5), 10)
          },
          passengerExperience: {
            comfortRating: Math.min(8.2 + (Math.random() * 1.5 - 0.75), 10),
            accessibilityScore: Math.min(8.8 + (Math.random() * 1 - 0.5), 10),
            informationSystemsQuality: Math.min(8.5 + (Math.random() * 1.2 - 0.6), 10),
            crowdManagementEffectiveness: Math.min(8.0 + (Math.random() * 1.5 - 0.75), 10),
            emergencyPreparedness: Math.min(9.0 + (Math.random() * 0.8 - 0.4), 10)
          },
          results: {
            criticalIssues: [], // Will be populated based on low scores
            recommendations: [], // Will be populated based on analysis
            improvements: []
          },
          assessmentDetails: {
            inspectorId: new mongoose.Types.ObjectId(),
            inspectorName: inspector.name,
            inspectorCertification: inspector.certification,
            assessmentDate,
            assessmentDuration: Math.floor(Math.random() * 120) + 90, // 90-210 minutes
            assessmentLocation: location,
            weatherConditions: ['Clear', 'Cloudy', 'Light Rain', 'Heavy Rain', 'Sunny'][Math.floor(Math.random() * 5)],
            specialCircumstances: []
          },
          operationalContext: {
            totalMileage: trainset.totalMileage,
            recentMileage: Math.floor(Math.random() * 5000) + 7000,
            operatingHours: trainset.operationalHours,
            routesOperated: ['Blue Line', 'Green Line'][Math.floor(Math.random() * 2)],
            averagePassengerLoad: 60 + Math.random() * 30,
            recentIncidents: Math.floor(Math.random() * 4),
            lastMaintenanceDate: trainset.lastMaintenanceDate,
            nextScheduledMaintenance: trainset.nextMaintenanceDate
          },
          aiAnalysis: {
            patternAnalysis: {
              deteriorationRate: 'Normal',
              seasonalVariations: 'Moderate',
              usagePatterns: 'Standard'
            },
            benchmarkComparison: {
              fleetAverage: Math.random() > 0.5 ? 'Above' : 'Below',
              industryStandard: Math.random() > 0.3 ? 'Meets' : 'Below',
              bestInClass: Math.random() > 0.7 ? 'Approaches' : 'Below'
            },
            predictiveInsights: [],
            anomalyDetection: []
          },
          realTimeStatus: {
            isMonitored: Math.random() > 0.2,
            lastDataUpdate: new Date(),
            dataQuality: ['EXCELLENT', 'GOOD', 'FAIR'][Math.floor(Math.random() * 3)],
            connectedSensors: Math.floor(Math.random() * 20) + 30,
            alertsActive: 0,
            monitoringFrequency: ['REAL_TIME', 'HOURLY', 'DAILY'][Math.floor(Math.random() * 3)]
          },
          certificates: [],
          financialMetrics: {
            maintenanceCostPerMonth: 80000 + Math.random() * 40000,
            operationalCostPerKm: 40 + Math.random() * 15,
            revenueGenerationCapacity: 120000 + Math.random() * 40000,
            depreciationRate: 8 + Math.random() * 3,
            residualValue: 12000000 + Math.random() * 8000000,
            costBenefitRatio: 1.5 + Math.random() * 0.8
          },
          createdAt: assessmentDate,
          updatedAt: assessmentDate
        };

        // Generate health status based on fitness score
        const fitnessScore = assessment.healthMetrics.overall.fitnessScore;
        if (fitnessScore >= 8.5) {
          assessment.overallHealthStatus = 'EXCELLENT';
          assessment.computedGrade = 'A';
        } else if (fitnessScore >= 7.5) {
          assessment.overallHealthStatus = 'VERY_GOOD';
          assessment.computedGrade = 'B';  
        } else if (fitnessScore >= 6.5) {
          assessment.overallHealthStatus = 'GOOD';
          assessment.computedGrade = 'C';
        } else if (fitnessScore >= 5.0) {
          assessment.overallHealthStatus = 'FAIR';
          assessment.computedGrade = 'D';
        } else {
          assessment.overallHealthStatus = 'POOR';
          assessment.computedGrade = 'F';
        }

        assessment.fitnessId = `FIT_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        assessment.daysUntilNextAssessment = Math.floor(Math.random() * 60) + 30;

        allAssessments.push(assessment);
      }
    }

    await Fitness.insertMany(allAssessments);
    console.log(`✅ Created ${allAssessments.length} comprehensive fitness assessments`);

    // Generate summary statistics
    const totalAssessments = allAssessments.length;
    const healthStatusCounts = {
      excellent: allAssessments.filter(a => a.overallHealthStatus === 'EXCELLENT').length,
      very_good: allAssessments.filter(a => a.overallHealthStatus === 'VERY_GOOD').length,
      good: allAssessments.filter(a => a.overallHealthStatus === 'GOOD').length,
      fair: allAssessments.filter(a => a.overallHealthStatus === 'FAIR').length,
      poor: allAssessments.filter(a => a.overallHealthStatus === 'POOR').length
    };

    console.log('\n📊 COMPREHENSIVE FITNESS SYSTEM CREATED!');
    console.log('================================================');
    console.log(`✅ Trainsets Created: 11`);
    console.log(`✅ Fitness Assessments: ${totalAssessments}`);
    console.log(`📈 Health Status Distribution:`);
    console.log(`   - Excellent: ${healthStatusCounts.excellent}`);
    console.log(`   - Very Good: ${healthStatusCounts.very_good}`);
    console.log(`   - Good: ${healthStatusCounts.good}`);
    console.log(`   - Fair: ${healthStatusCounts.fair}`);
    console.log(`   - Poor: ${healthStatusCounts.poor}`);
    console.log('\n🎯 System Features:');
    console.log('   ✓ 11 KMRL Trainsets (TS001-TS011)');
    console.log('   ✓ Comprehensive Health Metrics');
    console.log('   ✓ Performance Analysis');
    console.log('   ✓ Energy Efficiency Tracking');
    console.log('   ✓ Safety & Compliance Monitoring');
    console.log('   ✓ Environmental Impact Assessment');
    console.log('   ✓ Passenger Experience Metrics');
    console.log('   ✓ Predictive Maintenance Insights');
    console.log('   ✓ Real-time Monitoring Capabilities');
    console.log('   ✓ Financial Performance Tracking');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating comprehensive fitness system:', error);
    process.exit(1);
  }
};

// Run the script
createComprehensiveFitnessSystem();