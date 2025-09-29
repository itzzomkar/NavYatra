const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create admin user
  const hashedPassword = await bcrypt.hash('admin123!', 12);
  
  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@kmrl.gov.in',
      password: hashedPassword,
      firstName: 'Omkar',
      lastName: 'Kadam',
      role: 'ADMIN',
    },
  });

  console.log('✅ Created admin user');

  // Create sample trainsets
  const trainsets = await Promise.all([
    prisma.trainset.create({
      data: {
        trainsetNumber: 'KMRL-001',
        manufacturer: 'Alstom',
        model: 'Metropolis',
        yearOfManufacture: 2017,
        capacity: 975,
        maxSpeed: 80.0,
        depot: 'Muttom Depot',
        currentMileage: 45230.5,
        totalMileage: 156789.2,
        status: 'IN_SERVICE',
      },
    }),
    prisma.trainset.create({
      data: {
        trainsetNumber: 'KMRL-002',
        manufacturer: 'Alstom',
        model: 'Metropolis',
        yearOfManufacture: 2017,
        capacity: 975,
        maxSpeed: 80.0,
        depot: 'Muttom Depot',
        currentMileage: 42156.8,
        totalMileage: 148234.6,
        status: 'AVAILABLE',
      },
    }),
    prisma.trainset.create({
      data: {
        trainsetNumber: 'KMRL-003',
        manufacturer: 'Alstom',
        model: 'Metropolis',
        yearOfManufacture: 2018,
        capacity: 975,
        maxSpeed: 80.0,
        depot: 'Kalamassery Depot',
        currentMileage: 38967.4,
        totalMileage: 142789.3,
        status: 'MAINTENANCE',
      },
    }),
  ]);

  console.log('✅ Created sample trainsets');

  // Create sample fitness certificates
  for (const trainset of trainsets) {
    await prisma.fitnessCertificate.create({
      data: {
        trainsetId: trainset.id,
        certificateNumber: `FIT-${trainset.trainsetNumber}-2024`,
        issueDate: new Date('2024-01-01'),
        expiryDate: new Date('2024-12-31'),
        status: 'VALID',
        issuingAuthority: 'KMRL Technical Department',
        remarks: 'Annual fitness certificate',
      },
    });
  }

  console.log('✅ Created fitness certificates');

  // Create sample job cards
  await prisma.jobCard.create({
    data: {
      trainsetId: trainsets[0].id,
      jobCardNumber: 'JC-2024-0001',
      priority: 'HIGH',
      status: 'PENDING',
      workType: 'Brake System Maintenance',
      description: 'Scheduled maintenance for brake system',
      estimatedHours: 6,
      scheduledDate: new Date(Date.now() + 86400000), // Tomorrow
    },
  });

  console.log('✅ Created sample job cards');

  console.log('🎉 Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
