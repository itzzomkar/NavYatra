require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

async function createDemoUsers() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const demoUsers = [
      {
        username: 'admin',
        email: 'admin@kmrl.com',
        password: 'Password123',
        firstName: 'Admin',
        lastName: 'User',
        role: 'admin',
        isActive: true
      },
      {
        username: 'supervisor',
        email: 'supervisor@kmrl.com',
        password: 'Password123',
        firstName: 'Supervisor',
        lastName: 'User',
        role: 'user',
        isActive: true
      },
      {
        username: 'operator',
        email: 'operator@kmrl.com',
        password: 'Password123',
        firstName: 'Operator',
        lastName: 'User',
        role: 'user',
        isActive: true
      },
      {
        username: 'maintenance',
        email: 'maintenance@kmrl.com',
        password: 'Password123',
        firstName: 'Maintenance',
        lastName: 'User',
        role: 'user',
        isActive: true
      }
    ];

    console.log('🔄 Creating demo users...\n');

    for (const userData of demoUsers) {
      // Check if user already exists
      const existingUser = await User.findOne({ 
        $or: [{ email: userData.email }, { username: userData.username }]
      });

      if (existingUser) {
        console.log(`   ⚠️  ${userData.firstName} user already exists`);
      } else {
        const newUser = new User(userData);
        await newUser.save();
        console.log(`   ✅ Created ${userData.firstName} user (${userData.email})`);
      }
    }

    // List all users
    const allUsers = await User.find({}).select('-password');
    console.log(`\n📊 Total users in database: ${allUsers.length}`);
    console.log('👥 All Users:');
    
    allUsers.forEach((user, index) => {
      console.log(`${index + 1}. ${user.firstName} ${user.lastName} (${user.email}) - ${user.role}`);
    });

    console.log('\n🎯 Demo Login Credentials:');
    console.log('========================');
    console.log('Admin:       admin@kmrl.com / Password123');
    console.log('Supervisor:  supervisor@kmrl.com / Password123');
    console.log('Operator:    operator@kmrl.com / Password123');
    console.log('Maintenance: maintenance@kmrl.com / Password123');
    console.log('Test User:   testuser@example.com / Password123');

    await mongoose.disconnect();
    console.log('\n✅ Demo users creation complete!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

createDemoUsers();