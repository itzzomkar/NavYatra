const mongoose = require('mongoose');
require('dotenv').config();

const Trainset = require('../models/Trainset');
const Fitness = require('../models/Fitness');
const DataManager = require('../utils/dataManager');

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/auth_system_db');

const addFitnessDataOnly = async () => {
  try {
    const dataManager = new DataManager();
    
    console.log('🔄 Adding fitness data for existing trainsets...');
    console.log('⚠️  NOTE: This will NOT modify any existing trainset data');
    
    // Create backup first
    await dataManager.createFullBackup('Pre-fitness-data-addition backup');
    
    // Get existing trainsets
    const existingTrainsets = await Trainset.find({});
    console.log(`📊 Found ${existingTrainsets.length} existing trainsets`);
    
    if (existingTrainsets.length === 0) {
      console.log('❌ No trainsets found! Please add trainsets first.');
      process.exit(1);
    }
    
    // Check if any trainsets already have fitness data
    const existingFitnessCount = await Fitness.countDocuments();
    console.log(`📊 Current fitness records: ${existingFitnessCount}`);
    
    let addedFitnessRecords = 0;
    
    // Add fitness data for each trainset
    for (const trainset of existingTrainsets) {
      // Check if this trainset already has fitness records
      const existingFitness = await Fitness.countDocuments({ trainsetId: trainset._id });
      
      if (existingFitness === 0) {
        console.log(`➕ Adding fitness data for ${trainset.trainsetNumber}...`);
        
        // Generate realistic fitness data based on trainset age and mileage
        const trainAge = new Date().getFullYear() - trainset.yearOfManufacture;
        const mileageImpact = Math.min(trainset.currentMileage / 200000, 1);
        const baseScore = Math.max(9.5 - (trainAge * 0.3) - (mileageImpact * 1.5), 4.0);
        
        // Create 3-5 fitness assessments for each trainset
        const numAssessments = Math.floor(Math.random() * 3) + 3;
        
        for (let i = 0; i < numAssessments; i++) {
          const daysAgo = Math.floor(Math.random() * 180) + (i * 30);
          const assessmentDate = new Date();
          assessmentDate.setDate(assessmentDate.getDate() - daysAgo);
          
          const fitnessScore = Math.max(baseScore + (Math.random() * 1.5 - 0.75), 3.5);
          
          const fitnessRecord = new Fitness({
            trainsetId: trainset._id,
            trainsetNumber: trainset.trainsetNumber,
            assessmentType: [
              'COMPREHENSIVE_HEALTH_CHECK',
              'PERFORMANCE_ANALYSIS',
              'SAFETY_INSPECTION',
              'ROUTINE_MONITORING'
            ][Math.floor(Math.random() * 4)],
            
            healthMetrics: {
              overall: {
                fitnessScore: Math.round(fitnessScore * 10) / 10,
                healthGrade: fitnessScore >= 8.5 ? 'A' : fitnessScore >= 7.5 ? 'B' : fitnessScore >= 6.5 ? 'C' : 'D',
                status: fitnessScore >= 8.5 ? 'EXCELLENT' : fitnessScore >= 7.5 ? 'GOOD' : fitnessScore >= 6.5 ? 'FAIR' : 'POOR',
                reliability: Math.min(95 - (trainAge * 2) + (Math.random() * 10 - 5), 100),
                availability: Math.min(92 - (mileageImpact * 8) + (Math.random() * 8 - 4), 100)
              },
              
              mechanical: {
                engineHealth: Math.max(baseScore - 0.1 + (Math.random() * 0.6 - 0.3), 1),
                brakeSystem: Math.max(baseScore + 0.3 + (Math.random() * 0.4 - 0.2), 1),
                suspension: Math.max(baseScore - 0.3 + (Math.random() * 0.8 - 0.4), 1),
                wheelCondition: Math.max(baseScore - 0.4 + (Math.random() * 0.8 - 0.4), 1),
                doorMechanism: Math.max(baseScore + 0.1 + (Math.random() * 0.6 - 0.3), 1),
                couplingSystem: Math.max(baseScore + (Math.random() * 0.6 - 0.3), 1),
                airCompressor: Math.max(baseScore - 0.2 + (Math.random() * 0.8 - 0.4), 1),
                auxiliarySystems: Math.max(baseScore + 0.2 + (Math.random() * 0.6 - 0.3), 1)
              },
              
              electrical: {
                powerSystem: Math.max(baseScore + 0.2 + (Math.random() * 0.4 - 0.2), 1),
                tractionMotors: Math.max(baseScore + (Math.random() * 0.6 - 0.3), 1),
                controlSystems: Math.max(baseScore + 0.1 + (Math.random() * 0.6 - 0.3), 1),
                lightingSystems: Math.max(baseScore + 0.3 + (Math.random() * 0.4 - 0.2), 1),
                batteryHealth: Math.max(baseScore - 0.2 + (Math.random() * 0.8 - 0.4), 1),
                chargingSystem: Math.max(baseScore + 0.1 + (Math.random() * 0.6 - 0.3), 1),
                emergencySystems: Math.max(baseScore + 0.4 + (Math.random() * 0.4 - 0.2), 1)
              },
              
              comfort: {
                airConditioning: Math.max(baseScore + 0.1 + (Math.random() * 0.8 - 0.4), 1),
                seatingCondition: Math.max(baseScore + 0.2 + (Math.random() * 0.6 - 0.3), 1),
                flooringCondition: Math.max(baseScore + (Math.random() * 0.8 - 0.4), 1),
                windowsCondition: Math.max(baseScore - 0.1 + (Math.random() * 0.8 - 0.4), 1),
                cleanlinessScore: Math.max(baseScore + 0.4 + (Math.random() * 0.6 - 0.3), 1),
                noiseLevel: Math.max(baseScore - 0.1 + (Math.random() * 0.8 - 0.4), 1),
                vibrationLevel: Math.max(baseScore + 0.2 + (Math.random() * 0.6 - 0.3), 1)
              },
              
              safety: {
                emergencyBrakes: Math.max(baseScore + 0.4 + (Math.random() * 0.4 - 0.2), 1),
                fireSuppressionSystem: Math.max(baseScore + 0.5 + (Math.random() * 0.3 - 0.15), 1),
                emergencyExits: Math.max(baseScore + 0.3 + (Math.random() * 0.4 - 0.2), 1),
                communicationSystems: Math.max(baseScore + 0.2 + (Math.random() * 0.6 - 0.3), 1),
                signagingClarity: Math.max(baseScore + 0.3 + (Math.random() * 0.4 - 0.2), 1),
                cctvSystems: Math.max(baseScore + 0.1 + (Math.random() * 0.6 - 0.3), 1),
                accessibilityFeatures: Math.max(baseScore + 0.2 + (Math.random() * 0.6 - 0.3), 1)
              }
            },
            
            performanceMetrics: {
              operational: {
                onTimePerformance: Math.min(90 - (trainAge * 1.5) + (Math.random() * 10 - 5), 100),
                serviceReliability: Math.min(88 - (mileageImpact * 5) + (Math.random() * 8 - 4), 100),
                passengerCapacityUtilization: 65 + (Math.random() * 25),
                averageSpeed: 35 + (Math.random() * 15),
                accelerationPerformance: Math.max(baseScore + (Math.random() * 0.6 - 0.3), 1),
                brakingEfficiency: Math.max(baseScore + 0.2 + (Math.random() * 0.4 - 0.2), 1)
              },
              
              energy: {
                energyEfficiencyScore: Math.min(Math.max(baseScore + (Math.random() * 1 - 0.5), 1), 10),
                powerConsumptionPerKm: 2.1 + (trainAge * 0.1) + (Math.random() * 0.4 - 0.2),
                regenerativeBrakingEfficiency: Math.min(78 - (trainAge * 0.8) + (Math.random() * 8 - 4), 95),
                idlePowerConsumption: 15 + (trainAge * 0.5) + (Math.random() * 5 - 2.5),
                peakPowerDemand: 800 + (Math.random() * 200 - 100),
                powerFactorEfficiency: Math.min(0.85 + (Math.random() * 0.1 - 0.05), 1)
              },
              
              maintenance: {
                maintenanceCompliance: Math.min(85 + (Math.random() * 15), 100),
                breakdownFrequency: Math.max(0.1 + (trainAge * 0.05) + (Math.random() * 0.3 - 0.15), 0),
                meanTimeBetweenFailures: Math.max(720 - (trainAge * 30) + (Math.random() * 120 - 60), 200),
                meanTimeToRepair: Math.min(4 + (trainAge * 0.3) + (Math.random() * 2 - 1), 12),
                sparesAvailability: Math.min(80 + (Math.random() * 20), 100),
                predictiveMaintenanceScore: Math.max(baseScore + (Math.random() * 0.8 - 0.4), 1)
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
              criticalIssues: [],
              recommendations: [],
              improvements: [],
              compliance: {
                safetyStandards: {
                  isCompliant: fitnessScore >= 6.0,
                  standardsChecked: ['IS 12663', 'EN 15227', 'IEC 62267'],
                  nonComplianceIssues: [],
                  certificationStatus: 'VALID'
                },
                performanceStandards: {
                  isCompliant: fitnessScore >= 6.0,
                  benchmarksChecked: ['RDSO Guidelines', 'UIC Standards'],
                  performanceGaps: [],
                  improvementPlan: 'Regular monitoring and maintenance'
                }
              }
            },
            
            assessmentDetails: {
              inspectorId: new mongoose.Types.ObjectId(),
              inspectorName: 'KMRL Inspector ' + (i + 1),
              inspectorCertification: 'KMRL-CERT-' + String(Math.floor(Math.random() * 999) + 1).padStart(3, '0'),
              assessmentDate,
              assessmentDuration: Math.floor(Math.random() * 120) + 90,
              assessmentLocation: trainset.location || 'KMRL Depot',
              weatherConditions: ['Clear', 'Cloudy', 'Rainy'][Math.floor(Math.random() * 3)]
            },
            
            operationalContext: {
              totalMileage: trainset.currentMileage || trainset.totalMileage || 50000,
              recentMileage: Math.floor(Math.random() * 5000) + 2000,
              operatingHours: trainset.operationalHours || 10000,
              routesOperated: ['Blue Line'],
              averagePassengerLoad: 60 + Math.random() * 30,
              recentIncidents: Math.floor(Math.random() * 3),
              lastMaintenanceDate: trainset.lastMaintenanceDate || new Date(),
              nextScheduledMaintenance: trainset.nextMaintenanceDate || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
            },
            
            financialMetrics: {
              maintenanceCostPerMonth: 80000 + Math.random() * 40000,
              operationalCostPerKm: 40 + Math.random() * 15,
              revenueGenerationCapacity: 120000 + Math.random() * 40000,
              depreciationRate: 8 + Math.random() * 3,
              residualValue: 12000000 + Math.random() * 8000000,
              costBenefitRatio: 1.5 + Math.random() * 0.8
            }
          });
          
          await fitnessRecord.save();
          addedFitnessRecords++;
        }
        
        console.log(`✅ Added ${numAssessments} fitness records for ${trainset.trainsetNumber}`);
      } else {
        console.log(`ℹ️  ${trainset.trainsetNumber} already has ${existingFitness} fitness records - skipping`);
      }
    }
    
    console.log(`\n📊 FITNESS DATA ADDITION COMPLETED!`);
    console.log(`✅ Added ${addedFitnessRecords} new fitness records`);
    console.log(`📊 Total trainsets: ${existingTrainsets.length} (unchanged)`);
    console.log(`📊 Total fitness records: ${await Fitness.countDocuments()}`);
    
    // Verify data integrity
    console.log('\n🔍 Verifying data integrity...');
    const dataManager2 = new DataManager();
    await dataManager2.verifyDataIntegrity();
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error adding fitness data:', error);
    process.exit(1);
  }
};

addFitnessDataOnly();