const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkData() {
  try {
    console.log('📊 Checking current database data...\n');
    
    const [trainsetCount, jobCardCount, userCount, fitnessCount] = await Promise.all([
      prisma.trainset.count(),
      prisma.jobCard.count(),
      prisma.user.count(),
      prisma.fitnessCertificate.count()
    ]);
    
    console.log('Current Data in Database:');
    console.log('─'.repeat(30));
    console.log(`👥 Users:                ${userCount}`);
    console.log(`🚄 Trainsets:            ${trainsetCount}`);
    console.log(`🔧 Job Cards:            ${jobCardCount}`);
    console.log(`📋 Fitness Certificates: ${fitnessCount}`);
    
    if (trainsetCount > 0) {
      console.log('\n✅ Great! You have existing data.');
      console.log('   We\'ll add job card functionality on top of it.');
    } else {
      console.log('\n⚠️  No data found. We\'ll need to seed some data first.');
    }
    
  } catch (error) {
    console.error('❌ Error checking data:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkData();