const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

// Override DATABASE_URL for local development
process.env.DATABASE_URL = "file:./dev.db";

const prisma = new PrismaClient();

async function quickSetup() {
  try {
    console.log('🚀 Quick setup for local development...');
    
    // Create admin user
    const hashedPassword = await bcrypt.hash('password123', 12);
    
    const adminUser = await prisma.user.upsert({
      where: { email: 'admin@kmrl.com' },
      update: {},
      create: {
        email: 'admin@kmrl.com',
        password: hashedPassword,
        firstName: 'System',
        lastName: 'Administrator',
        role: 'ADMIN'
      }
    });
    
    console.log('✅ Admin user created/updated');
    console.log('📧 Email: admin@kmrl.com');
    console.log('🔑 Password: password123');
    
    // Create a few more test users
    const supervisorUser = await prisma.user.upsert({
      where: { email: 'supervisor@kmrl.com' },
      update: {},
      create: {
        email: 'supervisor@kmrl.com',
        password: hashedPassword,
        firstName: 'Operations',
        lastName: 'Supervisor',
        role: 'SUPERVISOR'
      }
    });
    
    const operatorUser = await prisma.user.upsert({
      where: { email: 'operator@kmrl.com' },
      update: {},
      create: {
        email: 'operator@kmrl.com',
        password: hashedPassword,
        firstName: 'Train',
        lastName: 'Operator',
        role: 'OPERATOR'
      }
    });
    
    console.log('✅ Test users created');
    console.log('👤 Users: admin@kmrl.com, supervisor@kmrl.com, operator@kmrl.com');
    console.log('🔐 Password for all: password123');
    
  } catch (error) {
    console.error('❌ Setup failed:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

quickSetup();