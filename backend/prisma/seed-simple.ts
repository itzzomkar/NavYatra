import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Create admin user
  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@kmrl.com',
      password: '$2a$12$LQv3c1yqBWVHxkd0LQ4YCu.ZZxN2OUzQP4pJI8oHGPUfDfSzL/NlG', // password: admin123
      firstName: 'Admin',
      lastName: 'User',
      role: 'ADMIN'
    }
  });

  console.log('✅ Created admin user');

  // Create sample trainsets
  const trainsets = [];
  for (let i = 1; i <= 5; i++) {
    const trainset = await prisma.trainset.create({
      data: {
        trainsetNumber: `KMRL-${String(i).padStart(3, '0')}`,
        manufacturer: 'BEML',
        model: 'Standard',
        yearOfManufacture: 2020 + i,
        capacity: 300,
        maxSpeed: 80,
        currentMileage: Math.floor(Math.random() * 50000) + 10000,
        totalMileage: Math.floor(Math.random() * 100000) + 50000,
        status: 'AVAILABLE',
        location: `Platform ${i}`,
        depot: 'Muttom Depot'
      }
    });
    trainsets.push(trainset);
  }

  console.log('✅ Created 5 trainsets');

  // Create fitness certificates
  for (const trainset of trainsets) {
    await prisma.fitnessCertificate.create({
      data: {
        trainsetId: trainset.id,
        certificateNumber: `FC-${trainset.trainsetNumber}-2024`,
        issueDate: new Date('2024-01-01'),
        expiryDate: new Date('2024-12-31'),
        status: 'VALID',
        issuingAuthority: 'Railway Safety Department',
        remarks: 'All systems functional',
        documents: JSON.stringify(['cert1.pdf', 'inspection_report.pdf'])
      }
    });
  }

  console.log('✅ Created fitness certificates');

  // Create job cards
  for (let i = 0; i < 10; i++) {
    const randomTrainset = trainsets[Math.floor(Math.random() * trainsets.length)];
    await prisma.jobCard.create({
      data: {
        trainsetId: randomTrainset.id,
        jobCardNumber: `JC-2024-${String(i + 1).padStart(4, '0')}`,
        priority: ['LOW', 'MEDIUM', 'HIGH'][Math.floor(Math.random() * 3)],
        status: ['PENDING', 'IN_PROGRESS', 'COMPLETED'][Math.floor(Math.random() * 3)],
        workType: ['MAINTENANCE', 'INSPECTION', 'REPAIR'][Math.floor(Math.random() * 3)],
        description: `Job card ${i + 1} - Regular maintenance work`,
        estimatedHours: Math.floor(Math.random() * 8) + 2,
        assignedTo: 'Maintenance Team A',
        scheduledDate: new Date(Date.now() + Math.floor(Math.random() * 7) * 24 * 60 * 60 * 1000),
        notes: 'Standard maintenance procedure'
      }
    });
  }

  console.log('✅ Created 10 job cards');

  console.log('🎉 Database seeding completed successfully!');
  console.log('\n📊 Created:');
  console.log('- 1 admin user');
  console.log('- 5 trainsets');
  console.log('- 5 fitness certificates');
  console.log('- 10 job cards');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });