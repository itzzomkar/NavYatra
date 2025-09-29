/**
 * Enhanced Prisma Seed Script with Job Cards
 * 
 * Populates the database with realistic data including:
 * - Trainsets
 * - Fitness certificates
 * - Job cards with IBM Maximo integration
 * - Sample users
 * - Branding records
 * - Cleaning slots
 */

import { PrismaClient } from '@prisma/client';
import { createSampleJobCards } from '../src/utils/maximoIntegration';

const prisma = new PrismaClient();

// Sample data generators
const generateTrainsets = (count: number = 25) => {
  const manufacturers = ['Alstom', 'BEML', 'Bombardier', 'Titagarh'];
  const models = ['Citadis', 'Metro Neo', 'Regina', 'Type-1'];
  const depots = ['MUTTOM', 'KALAMASSERY'];
  const statuses = ['AVAILABLE', 'IN_SERVICE', 'MAINTENANCE'];

  return Array.from({ length: count }, (_, i) => ({
    trainsetNumber: `KMRL-${(i + 1).toString().padStart(3, '0')}`,
    manufacturer: manufacturers[Math.floor(Math.random() * manufacturers.length)],
    model: models[Math.floor(Math.random() * models.length)],
    yearOfManufacture: 2018 + Math.floor(Math.random() * 6),
    capacity: 974 + Math.floor(Math.random() * 100),
    maxSpeed: 80 + Math.floor(Math.random() * 20),
    currentMileage: Math.floor(Math.random() * 200000),
    totalMileage: Math.floor(Math.random() * 500000),
    status: statuses[Math.floor(Math.random() * statuses.length)],
    location: Math.random() > 0.5 ? 'Station' : 'Depot',
    depot: depots[Math.floor(Math.random() * depots.length)],
    isActive: true
  }));
};

const generateUsers = () => [
  {
    email: 'admin@kmrl.com',
    password: 'admin123',
    firstName: 'KMRL',
    lastName: 'Administrator',
    role: 'ADMIN',
    isActive: true
  },
  {
    email: 'operations@kmrl.com',
    password: 'ops123',
    firstName: 'Operations',
    lastName: 'Manager',
    role: 'OPERATIONS_MANAGER',
    isActive: true
  },
  {
    email: 'maintenance@kmrl.com',
    password: 'maint123',
    firstName: 'Maintenance',
    lastName: 'Supervisor',
    role: 'MAINTENANCE_SUPERVISOR',
    isActive: true
  },
  {
    email: 'technician@kmrl.com',
    password: 'tech123',
    firstName: 'Senior',
    lastName: 'Technician',
    role: 'TECHNICIAN',
    isActive: true
  }
];

const generateFitnessCertificates = (trainsetIds: string[]) => {
  return trainsetIds.map(trainsetId => {
    const issueDate = new Date(Date.now() - Math.floor(Math.random() * 90) * 24 * 60 * 60 * 1000);
    const expiryDate = new Date(issueDate.getTime() + (90 + Math.floor(Math.random() * 90)) * 24 * 60 * 60 * 1000);
    
    return {
      trainsetId,
      certificateNumber: `FIT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      issueDate,
      expiryDate,
      status: new Date() < expiryDate ? 'VALID' : 'EXPIRED',
      issuingAuthority: 'KMRL Safety Department',
      remarks: 'Regular safety inspection completed',
      lastChecked: new Date()
    };
  });
};

const generateBrandingRecords = (trainsetIds: string[]) => {
  const campaigns = [
    'Kerala Tourism 2024',
    'Digital India Initiative',
    'Swachh Bharat Campaign',
    'Make in India',
    'Incredible India',
    'Local Business Promotion'
  ];

  return trainsetIds.slice(0, Math.floor(trainsetIds.length * 0.6)).map(trainsetId => ({
    trainsetId,
    campaignName: campaigns[Math.floor(Math.random() * campaigns.length)],
    priority: Math.floor(Math.random() * 100) + 1,
    slaHoursTarget: 8 * 30, // 8 hours daily for 30 days
    hoursDelivered: Math.floor(Math.random() * 200),
    startDate: new Date(Date.now() - Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000),
    endDate: new Date(Date.now() + Math.floor(Math.random() * 60) * 24 * 60 * 60 * 1000)
  }));
};

const generateCleaningSlots = () => {
  const slots = [];
  const today = new Date();
  
  // Generate slots for the next 7 days
  for (let day = 0; day < 7; day++) {
    const date = new Date(today.getTime() + day * 24 * 60 * 60 * 1000);
    
    // 3 cleaning bays, each with 2 slots per day
    for (let bay = 1; bay <= 3; bay++) {
      for (let slot = 0; slot < 2; slot++) {
        const startHour = 22 + slot * 4; // 10 PM and 2 AM
        const startTime = new Date(date);
        startTime.setHours(startHour, 0, 0, 0);
        
        const endTime = new Date(startTime);
        endTime.setHours(startHour + 2, 0, 0, 0); // 2 hour cleaning window
        
        slots.push({
          date,
          bayName: `Cleaning Bay ${bay}`,
          startTime,
          endTime,
          capacity: 2 // Each bay can handle 2 trainsets
        });
      }
    }
  }
  
  return slots;
};

async function main() {
  console.log('🌱 Starting enhanced database seeding...');

  try {
    // Clear existing data (optional - be careful in production!)
    console.log('🧹 Clearing existing data...');
    await prisma.jobCard.deleteMany();
    await prisma.fitnessCertificate.deleteMany();
    await prisma.brandingRecord.deleteMany();
    await prisma.cleaningSlot.deleteMany();
    await prisma.mileageRecord.deleteMany();
    await prisma.scheduleEntry.deleteMany();
    await prisma.schedule.deleteMany();
    await prisma.trainset.deleteMany();
    await prisma.user.deleteMany();

    // Create users
    console.log('👥 Creating users...');
    const users = generateUsers();
    for (const userData of users) {
      await prisma.user.create({ data: userData });
    }
    console.log(`✅ Created ${users.length} users`);

    // Create trainsets
    console.log('🚄 Creating trainsets...');
    const trainsetData = generateTrainsets(25);
    const trainsets = [];
    for (const data of trainsetData) {
      const trainset = await prisma.trainset.create({ data });
      trainsets.push(trainset);
    }
    console.log(`✅ Created ${trainsets.length} trainsets`);

    // Create fitness certificates
    console.log('📋 Creating fitness certificates...');
    const fitnessData = generateFitnessCertificates(trainsets.map(t => t.id));
    for (const data of fitnessData) {
      await prisma.fitnessCertificate.create({ data });
    }
    console.log(`✅ Created ${fitnessData.length} fitness certificates`);

    // Create branding records
    console.log('🎨 Creating branding records...');
    const brandingData = generateBrandingRecords(trainsets.map(t => t.id));
    for (const data of brandingData) {
      await prisma.brandingRecord.create({ data });
    }
    console.log(`✅ Created ${brandingData.length} branding records`);

    // Create cleaning slots
    console.log('🧽 Creating cleaning slots...');
    const cleaningData = generateCleaningSlots();
    for (const data of cleaningData) {
      await prisma.cleaningSlot.create({ data });
    }
    console.log(`✅ Created ${cleaningData.length} cleaning slots`);

    // Create sample mileage records
    console.log('📊 Creating mileage records...');
    let mileageCount = 0;
    for (const trainset of trainsets.slice(0, 10)) {
      // Create 30 days of mileage records
      for (let day = 0; day < 30; day++) {
        const date = new Date();
        date.setDate(date.getDate() - day);
        
        await prisma.mileageRecord.create({
          data: {
            trainsetId: trainset.id,
            date,
            km: Math.floor(Math.random() * 300) + 100 // 100-400 km per day
          }
        });
        mileageCount++;
      }
    }
    console.log(`✅ Created ${mileageCount} mileage records`);

    // Create job cards using the Maximo integration
    console.log('🔧 Creating job cards with IBM Maximo integration...');
    const jobCardResult = await createSampleJobCards(30);
    if (jobCardResult.success) {
      console.log(`✅ Created ${jobCardResult.data.created} job cards`);
      if (jobCardResult.data.errors > 0) {
        console.log(`⚠️  ${jobCardResult.data.errors} errors occurred while creating job cards`);
      }
    } else {
      console.error('❌ Failed to create job cards:', jobCardResult.error);
    }

    // Create a sample schedule
    console.log('📅 Creating sample schedule...');
    const schedule = await prisma.schedule.create({
      data: {
        date: new Date(),
        status: 'ACTIVE',
        entries: {
          create: trainsets.slice(0, 15).map((trainset, index) => ({
            trainsetId: trainset.id,
            decision: index < 10 ? 'IN_SERVICE' : index < 13 ? 'STANDBY' : 'MAINTENANCE',
            score: Math.random() * 100,
            reasons: JSON.stringify([
              'Fitness certificate valid',
              'No pending critical job cards',
              'Optimal mileage balance'
            ]),
            conflicts: JSON.stringify([])
          }))
        }
      }
    });
    console.log(`✅ Created sample schedule with ${15} entries`);

    // Summary
    const summary = await Promise.all([
      prisma.user.count(),
      prisma.trainset.count(),
      prisma.fitnessCertificate.count(),
      prisma.jobCard.count(),
      prisma.brandingRecord.count(),
      prisma.cleaningSlot.count(),
      prisma.mileageRecord.count(),
      prisma.schedule.count()
    ]);

    console.log('\n📊 Database seeding completed successfully!');
    console.log('─'.repeat(50));
    console.log(`👥 Users:                ${summary[0]}`);
    console.log(`🚄 Trainsets:            ${summary[1]}`);
    console.log(`📋 Fitness Certificates: ${summary[2]}`);
    console.log(`🔧 Job Cards:            ${summary[3]}`);
    console.log(`🎨 Branding Records:     ${summary[4]}`);
    console.log(`🧽 Cleaning Slots:       ${summary[5]}`);
    console.log(`📊 Mileage Records:      ${summary[6]}`);
    console.log(`📅 Schedules:            ${summary[7]}`);
    console.log('─'.repeat(50));
    console.log('✨ Your KMRL system is ready with comprehensive test data!');
    console.log('\n🔗 Login credentials:');
    console.log('   Admin: admin@kmrl.com / admin123');
    console.log('   Operations: operations@kmrl.com / ops123');
    console.log('   Maintenance: maintenance@kmrl.com / maint123');
    console.log('   Technician: technician@kmrl.com / tech123');

  } catch (error) {
    console.error('❌ Error during seeding:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();