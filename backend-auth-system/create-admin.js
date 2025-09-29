const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/kmrl-auth', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

async function createAdminUser() {
  try {
    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: 'admin@kmrl.com' });
    
    if (existingAdmin) {
      console.log('Admin user already exists');
      
      // Update password (let the model hash it)
      existingAdmin.password = 'admin123';
      existingAdmin.role = 'admin';
      existingAdmin.isActive = true;
      await existingAdmin.save();
      
      console.log('✅ Admin password updated');
    } else {
      // Create new admin user (let the model hash the password)
      const adminUser = new User({
        username: 'admin',
        email: 'admin@kmrl.com',
        password: 'admin123',
        firstName: 'System',
        lastName: 'Administrator',
        role: 'admin',
        isActive: true,
        profile: {
          phone: '+91-9999999999'
        }
      });
      
      await adminUser.save();
      console.log('✅ Admin user created successfully');
    }
    
    console.log('\nAdmin Credentials:');
    console.log('==================');
    console.log('Email: admin@kmrl.com');
    console.log('Password: admin123');
    console.log('Role: admin');
    
  } catch (error) {
    console.error('Error creating admin user:', error);
  } finally {
    await mongoose.connection.close();
  }
}

createAdminUser();