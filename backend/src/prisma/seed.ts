import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Clear existing data
  await prisma.auditLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.userPermission.deleteMany();
  await prisma.scheduleEntry.deleteMany();
  await prisma.schedule.deleteMany();
  await prisma.optimizationResult.deleteMany();
  await prisma.mileageRecord.deleteMany();
  await prisma.brandingRecord.deleteMany();
  await prisma.maintenanceRecord.deleteMany();
  await prisma.jobCard.deleteMany();
  await prisma.fitnessCertificate.deleteMany();
  await prisma.trainset.deleteMany();
  await prisma.stablingPosition.deleteMany();
  await prisma.configuration.deleteMany();
  await prisma.permission.deleteMany();
  await prisma.user.deleteMany();

  console.log('🧹 Cleaned existing data');

  // Create Permissions
  const permissions = await Promise.all([
    prisma.permission.create({
      data: {
        name: 'trainset:read',
        description: 'View trainset information',
        module: 'trainset'
      }
    }),
    prisma.permission.create({
      data: {
        name: 'trainset:write',
        description: 'Create and update trainsets',
        module: 'trainset'
      }
    }),
    prisma.permission.create({
      data: {
        name: 'schedule:read',
        description: 'View schedules',
        module: 'schedule'
      }
    }),
    prisma.permission.create({
      data: {
        name: 'schedule:write',
        description: 'Create and update schedules',
        module: 'schedule'
      }
    }),
    prisma.permission.create({
      data: {
        name: 'schedule:optimize',
        description: 'Run optimization algorithms',
        module: 'schedule'
      }
    }),
    prisma.permission.create({
      data: {
        name: 'fitness:read',
        description: 'View fitness certificates',
        module: 'fitness'
      }
    }),
    prisma.permission.create({
      data: {
        name: 'fitness:write',
        description: 'Manage fitness certificates',
        module: 'fitness'
      }
    }),
    prisma.permission.create({
      data: {
        name: 'jobcard:read',
        description: 'View job cards',
        module: 'jobcard'
      }
    }),
    prisma.permission.create({
      data: {
        name: 'jobcard:write',
        description: 'Manage job cards',
        module: 'jobcard'
      }
    }),
    prisma.permission.create({
      data: {
        name: 'analytics:read',
        description: 'View analytics and reports',
        module: 'analytics'
      }
    }),
    prisma.permission.create({
      data: {
        name: 'user:read',
        description: 'View user information',
        module: 'user'
      }
    }),
    prisma.permission.create({
      data: {
        name: 'user:write',
        description: 'Manage users',
        module: 'user'
      }
    }),
    prisma.permission.create({
      data: {
        name: 'system:admin',
        description: 'Full system administration access',
        module: 'system'
      }
    })
  ]);

  console.log('✅ Created permissions');

  // Create Users
  const hashedPassword = await bcrypt.hash('password123', 12);
  
  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@kmrl.com',
      password: hashedPassword,
      firstName: 'Omkar',
      lastName: 'Kadam',
      role: 'ADMIN'
    }
  });

  const supervisorUser = await prisma.user.create({
    data: {
      email: 'supervisor@kmrl.com',
      password: hashedPassword,
      firstName: 'Girishma',
      lastName: 'Shinde',
      role: 'SUPERVISOR'
    }
  });

  const operatorUser = await prisma.user.create({
    data: {
      email: 'operator@kmrl.com',
      password: hashedPassword,
      firstName: 'Sukanya',
      lastName: 'Jhadav',
      role: 'OPERATOR'
    }
  });

  const maintenanceUser = await prisma.user.create({
    data: {
      email: 'maintenance@kmrl.com',
      password: hashedPassword,
      firstName: 'Maintenance',
      lastName: 'Engineer',
      role: 'MAINTENANCE'
    }
  });

  console.log('✅ Created users');

  // Assign permissions to users
  const adminPermissions = permissions.map(p => p.id);
  const supervisorPermissions = permissions.filter(p => 
    !p.name.includes('user:write') && !p.name.includes('system:admin')
  ).map(p => p.id);
  const operatorPermissions = permissions.filter(p => 
    p.name.includes(':read') || p.name === 'schedule:write'
  ).map(p => p.id);
  const maintenancePermissions = permissions.filter(p => 
    p.name.includes('fitness:') || p.name.includes('jobcard:') || p.name.includes('trainset:read')
  ).map(p => p.id);

  // Admin gets all permissions
  await Promise.all(adminPermissions.map(permissionId =>
    prisma.userPermission.create({
      data: { userId: adminUser.id, permissionId }
    })
  ));

  // Supervisor gets most permissions
  await Promise.all(supervisorPermissions.map(permissionId =>
    prisma.userPermission.create({
      data: { userId: supervisorUser.id, permissionId }
    })
  ));

  // Operator gets limited permissions
  await Promise.all(operatorPermissions.map(permissionId =>
    prisma.userPermission.create({
      data: { userId: operatorUser.id, permissionId }
    })
  ));

  // Maintenance gets specific permissions
  await Promise.all(maintenancePermissions.map(permissionId =>
    prisma.userPermission.create({
      data: { userId: maintenanceUser.id, permissionId }
    })
  ));

  console.log('✅ Assigned user permissions');

  // Create Trainsets (25 trainsets as per KMRL requirement)
  const trainsets: any[] = [];
  for (let i = 1; i <= 25; i++) {
    const trainset = await prisma.trainset.create({
      data: {
        trainsetNumber: `KMRL-${i.toString().padStart(3, '0')}`,
        manufacturer: i <= 15 ? 'Alstom' : 'BEML',
        model: i <= 15 ? 'Metropolis' : 'Standard',
        yearOfManufacture: i <= 10 ? 2017 : i <= 20 ? 2018 : 2019,
        capacity: 975, // Standard capacity for Kochi Metro
        maxSpeed: 80.0,
        currentMileage: Math.floor(Math.random() * 100000) + 50000,
        totalMileage: Math.floor(Math.random() * 200000) + 100000,
        status: Math.random() > 0.8 ? 'MAINTENANCE' : Math.random() > 0.9 ? 'CLEANING' : 'AVAILABLE',
        location: `Platform-${Math.ceil(i / 5)}`,
        depot: 'Muttom Depot'
      }
    });
    trainsets.push(trainset);
  }

  console.log('✅ Created 25 trainsets');

  // Create Fitness Certificates
  for (const trainset of trainsets) {
    await prisma.fitnessCertificate.create({
      data: {
        trainsetId: trainset.id,
        certificateNumber: `FIT-${trainset.trainsetNumber}-2024`,
        issueDate: new Date('2024-01-01'),
        expiryDate: new Date('2024-12-31'),
        status: Math.random() > 0.8 ? 'EXPIRED' : Math.random() > 0.9 ? 'PENDING' : 'VALID',
        issuingAuthority: 'Commissioner of Railway Safety',
        remarks: 'Annual fitness certificate',
        documents: [`/documents/fitness/${trainset.trainsetNumber}.pdf`],
        iotData: {
          temperature: Math.floor(Math.random() * 20) + 20,
          vibration: Math.floor(Math.random() * 5) + 1,
          airPressure: Math.floor(Math.random() * 10) + 90,
          lastUpdate: new Date()
        }
      }
    });
  }

  console.log('✅ Created fitness certificates');

  // Create Job Cards
  const workTypes = ['Brake Inspection', 'AC Maintenance', 'Door System Check', 'Electrical Inspection', 'Wheel Maintenance'];
  for (let i = 0; i < 50; i++) {
    const randomTrainset = trainsets[Math.floor(Math.random() * trainsets.length)];
    await prisma.jobCard.create({
      data: {
        trainsetId: randomTrainset.id,
        jobCardNumber: `JOB-2024-${(i + 1).toString().padStart(4, '0')}`,
        maximoId: `MAX-${Math.floor(Math.random() * 10000)}`,
        priority: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'][Math.floor(Math.random() * 4)] as any,
        status: ['PENDING', 'IN_PROGRESS', 'COMPLETED'][Math.floor(Math.random() * 3)] as any,
        workType: workTypes[Math.floor(Math.random() * workTypes.length)],
        description: `Scheduled maintenance for ${randomTrainset.trainsetNumber}`,
        estimatedHours: Math.floor(Math.random() * 8) + 1,
        scheduledDate: new Date(Date.now() + Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000),
        externalData: {
          maximoWorkOrder: `WO-${Math.floor(Math.random() * 100000)}`,
          craftSkill: 'Electrical',
          location: 'Muttom Depot'
        }
      }
    });
  }

  console.log('✅ Created job cards');

  // Create Branding Records
  const brandNames = ['Coca Cola', 'Samsung', 'BSNL', 'Indian Oil', 'State Bank of India'];
  for (let i = 0; i < 30; i++) {
    const randomTrainset = trainsets[Math.floor(Math.random() * trainsets.length)];
    const startDate = new Date();
    const endDate = new Date(startDate.getTime() + (Math.floor(Math.random() * 90) + 30) * 24 * 60 * 60 * 1000);
    
    await prisma.brandingRecord.create({
      data: {
        trainsetId: randomTrainset.id,
        brandName: brandNames[Math.floor(Math.random() * brandNames.length)],
        campaignId: `CAMP-2024-${(i + 1).toString().padStart(3, '0')}`,
        startDate,
        endDate,
        priority: Math.floor(Math.random() * 5) + 1,
        exposureTarget: Math.floor(Math.random() * 1000) + 500,
        actualExposure: Math.floor(Math.random() * 800) + 200,
        revenue: Math.floor(Math.random() * 50000) + 25000,
        status: 'ACTIVE'
      }
    });
  }

  console.log('✅ Created branding records');

  // Create Maintenance Records
  for (let i = 0; i < 40; i++) {
    const randomTrainset = trainsets[Math.floor(Math.random() * trainsets.length)];
    await prisma.maintenanceRecord.create({
      data: {
        trainsetId: randomTrainset.id,
        type: ['PREVENTIVE', 'CORRECTIVE', 'SCHEDULED', 'INSPECTION'][Math.floor(Math.random() * 4)] as any,
        description: 'Regular maintenance and inspection',
        performedBy: 'Maintenance Team A',
        performedAt: new Date(Date.now() - Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000),
        nextDueDate: new Date(Date.now() + Math.floor(Math.random() * 60) * 24 * 60 * 60 * 1000),
        cost: Math.floor(Math.random() * 10000) + 5000,
        parts: {
          used: ['Brake Pads', 'Air Filter', 'Hydraulic Fluid'],
          quantities: [2, 1, 1],
          costs: [1500, 500, 800]
        }
      }
    });
  }

  console.log('✅ Created maintenance records');

  // Create Stabling Positions (30 positions)
  for (let i = 1; i <= 30; i++) {
    await prisma.stablingPosition.create({
      data: {
        positionNumber: i,
        type: i <= 5 ? 'cleaning' : i <= 15 ? 'maintenance' : 'parking',
        capacity: 1,
        isAvailable: Math.random() > 0.2,
        features: {
          hasPowerSupply: true,
          hasCompressedAir: i <= 15,
          hasWashingFacility: i <= 5,
          hasLift: i >= 6 && i <= 15
        },
        coordinates: {
          x: Math.floor(Math.random() * 100),
          y: Math.floor(Math.random() * 100),
          zone: `Zone-${Math.ceil(i / 10)}`
        }
      }
    });
  }

  console.log('✅ Created stabling positions');

  // Create System Configurations
  const configs = [
    { key: 'max_trainsets', value: '25', type: 'NUMBER', description: 'Maximum number of trainsets in system' },
    { key: 'optimization_timeout', value: '30000', type: 'NUMBER', description: 'Optimization timeout in milliseconds' },
    { key: 'fitness_check_interval', value: '24', type: 'NUMBER', description: 'Fitness check interval in hours' },
    { key: 'notification_enabled', value: 'true', type: 'BOOLEAN', description: 'Enable system notifications' },
    { key: 'maximo_sync_enabled', value: 'true', type: 'BOOLEAN', description: 'Enable Maximo synchronization' },
    { key: 'maintenance_window', value: '{"start": "02:00", "end": "06:00"}', type: 'JSON', description: 'Maintenance time window' }
  ];

  for (const config of configs) {
    await prisma.configuration.create({
      data: {
        key: config.key,
        value: config.value,
        type: config.type as any,
        description: config.description,
        isSystem: true
      }
    });
  }

  console.log('✅ Created system configurations');

  // Create Sample Schedule
  const sampleSchedule = await prisma.schedule.create({
    data: {
      name: 'Morning Schedule',
      description: 'Daily morning schedule',
      startDate: new Date(),
      endDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
      shift: 'MORNING',
      status: 'ACTIVE',
      optimizationScore: 0.87,
      constraints: {
        maxTrainsetsPerPosition: 1,
        prioritizeFitnessValid: true,
        balanceMileage: true,
        respectBrandingPriority: true
      },
      metadata: {
        algorithm: 'genetic_algorithm',
        iterations: 1000,
        convergenceScore: 0.95,
        totalTrainsets: 20
      },
      createdById: supervisorUser.id
    }
  });

  // Create Schedule Entries
  const availableTrainsets = trainsets.filter(t => t.status === 'AVAILABLE').slice(0, 20);
  for (let i = 0; i < availableTrainsets.length; i++) {
    await prisma.scheduleEntry.create({
      data: {
        scheduleId: sampleSchedule.id,
        trainsetId: availableTrainsets[i].id,
        startTime: new Date(),
        endTime: new Date(Date.now() + 4 * 60 * 60 * 1000), // 4 hours from now
        notes: `Assigned based on fitness status and mileage balance. Priority score: ${Math.floor(Math.random() * 10) + 1}. Position: ${i + 1}`
      }
    });
  }

  console.log('✅ Created sample schedule with entries');

  // Create Sample Optimization Results
  for (let i = 0; i < 5; i++) {
    await prisma.optimizationResult.create({
      data: {
        algorithm: 'genetic_algorithm',
        parameters: {
          populationSize: 100,
          generations: 1000,
          crossoverRate: 0.8,
          mutationRate: 0.1,
          elitismCount: 10,
          createdDate: new Date(Date.now() - i * 24 * 60 * 60 * 1000)
        },
        score: Math.random() * 0.3 + 0.7,
        executionTime: Math.floor(Math.random() * 25000) + 5000,
        solutions: [
          { trainsetIds: availableTrainsets.slice(0, 10).map(t => t.id), score: 0.89 },
          { trainsetIds: availableTrainsets.slice(5, 15).map(t => t.id), score: 0.87 },
          { trainsetIds: availableTrainsets.slice(10, 20).map(t => t.id), score: 0.85 }
        ],
        constraints: {
          fitnessRequired: true,
          maxMileageVariance: 0.15,
          brandingPriorityWeight: 0.3,
          maintenanceWindow: { start: '02:00', end: '06:00' }
        },
        isImplemented: i === 0
      }
    });
  }

  console.log('✅ Created optimization results');

  // Create Sample Mileage Records
  for (const trainset of trainsets.slice(0, 10)) {
    for (let day = 0; day < 30; day++) {
      const date = new Date(Date.now() - day * 24 * 60 * 60 * 1000);
      const dailyMileage = Math.floor(Math.random() * 200) + 100;
      
      await prisma.mileageRecord.create({
        data: {
          trainsetId: trainset.id,
          date,
          startMileage: trainset.currentMileage - dailyMileage,
          endMileage: trainset.currentMileage,
          distance: dailyMileage,
          routeInfo: {
            routes: ['Aluva-Pettah', 'Pettah-Aluva'],
            trips: Math.floor(Math.random() * 10) + 5,
            operatingHours: Math.floor(Math.random() * 8) + 8
          }
        }
      });
    }
  }

  console.log('✅ Created mileage records');

  console.log('🎉 Database seeding completed successfully!');
  console.log('\n📊 Created:');
  console.log(`- ${permissions.length} permissions`);
  console.log('- 4 users (Omkar Kadam - Admin, Girishma Shinde - Supervisor, Sukanya Jhadav - Operator, Maintenance Engineer)');
  console.log('- 25 trainsets');
  console.log('- 25 fitness certificates');
  console.log('- 50 job cards');
  console.log('- 30 branding records');
  console.log('- 40 maintenance records');
  console.log('- 30 stabling positions');
  console.log('- 6 system configurations');
  console.log('- 1 sample schedule with 20 entries');
  console.log('- 5 optimization results');
  console.log('- 300 mileage records (10 trainsets × 30 days)');
  
  console.log('\n🔑 Default Login Credentials:');
  console.log('Admin (Omkar Kadam): admin@kmrl.com / password123');
  console.log('Supervisor (Girishma Shinde): supervisor@kmrl.com / password123');
  console.log('Operator (Sukanya Jhadav): operator@kmrl.com / password123');
  console.log('Maintenance Engineer: maintenance@kmrl.com / password123');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
