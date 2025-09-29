require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

async function checkAndCreateUser() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Check if test user exists
    const existingUser = await User.findOne({ email: 'testuser@example.com' });
    
    if (existingUser) {
      console.log('✅ Test user already exists:');
      console.log('   Email:', existingUser.email);
      console.log('   Username:', existingUser.username);
      console.log('   Name:', existingUser.firstName, existingUser.lastName);
      console.log('   Created:', existingUser.createdAt);
      console.log('   Active:', existingUser.isActive);
    } else {
      console.log('❌ Test user does not exist. Creating...');
      
      // Create test user
      const newUser = new User({
        username: 'testuser',
        email: 'testuser@example.com',
        password: 'Password123',
        firstName: 'Test',
        lastName: 'User',
        role: 'user',
        isActive: true
      });

      await newUser.save();
      console.log('✅ Test user created successfully!');
      console.log('   Email: testuser@example.com');
      console.log('   Password: Password123');
    }

    // List all users
    const allUsers = await User.find({}).select('-password');
    console.log(`\n📊 Total users in database: ${allUsers.length}`);
    
    allUsers.forEach((user, index) => {
      console.log(`${index + 1}. ${user.firstName} ${user.lastName} (${user.email}) - ${user.role}`);
    });

    await mongoose.disconnect();
    console.log('\n✅ Database check complete');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkAndCreateUser();