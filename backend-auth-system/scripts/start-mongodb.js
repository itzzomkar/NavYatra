const { spawn, exec } = require('child_process');
const path = require('path');

console.log('🔄 Starting MongoDB...');

// Function to check if MongoDB is already running
function isMongoRunning() {
  return new Promise((resolve) => {
    exec('tasklist /FI "IMAGENAME eq mongod.exe"', (error, stdout) => {
      if (error) {
        resolve(false);
        return;
      }
      resolve(stdout.includes('mongod.exe'));
    });
  });
}

// Function to start MongoDB service
function startMongoService() {
  return new Promise((resolve) => {
    exec('net start MongoDB', (error, stdout, stderr) => {
      if (error) {
        console.log('   ⚠️  MongoDB service not found or already running');
        resolve(false);
      } else {
        console.log('   ✅ MongoDB service started successfully');
        resolve(true);
      }
    });
  });
}

// Function to start MongoDB manually
function startMongoManual() {
  return new Promise((resolve) => {
    console.log('   🔄 Starting MongoDB manually...');
    
    const mongod = spawn('mongod', ['--quiet'], {
      stdio: 'pipe',
      detached: true
    });

    mongod.on('error', (err) => {
      console.error('   ❌ Failed to start MongoDB:', err.message);
      process.exit(1);
    });

    // Give MongoDB time to start
    setTimeout(() => {
      console.log('   ✅ MongoDB started manually');
      resolve(true);
    }, 3000);
  });
}

// Main startup function
async function startMongoDB() {
  try {
    // Check if MongoDB is already running
    const running = await isMongoRunning();
    if (running) {
      console.log('   ✅ MongoDB is already running');
      return;
    }

    // Try to start as Windows service first
    const serviceStarted = await startMongoService();
    if (!serviceStarted) {
      // If service doesn't work, start manually
      await startMongoManual();
    }

    console.log('   🎯 MongoDB is ready for connections');
  } catch (error) {
    console.error('   ❌ Failed to start MongoDB:', error.message);
    process.exit(1);
  }
}

startMongoDB();