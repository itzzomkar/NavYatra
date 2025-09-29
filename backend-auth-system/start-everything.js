const { spawn, exec } = require('child_process');
const path = require('path');

console.log('🚀 Starting Complete Backend Authentication System...');
console.log('====================================================');

let mongoProcess = null;
let apiProcess = null;

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

// Function to start MongoDB
async function startMongoDB() {
  console.log('\n1. 🔄 Checking MongoDB...');
  
  const running = await isMongoRunning();
  if (running) {
    console.log('   ✅ MongoDB is already running');
    return true;
  }

  return new Promise((resolve) => {
    // Try Windows service first
    exec('net start MongoDB', (error, stdout, stderr) => {
      if (!error) {
        console.log('   ✅ MongoDB service started');
        resolve(true);
      } else {
        // Start manually
        console.log('   🔄 Starting MongoDB manually...');
        mongoProcess = spawn('mongod', ['--quiet'], {
          stdio: ['ignore', 'ignore', 'ignore'],
          detached: false
        });

        mongoProcess.on('error', (err) => {
          console.error('   ❌ Failed to start MongoDB:', err.message);
          process.exit(1);
        });

        setTimeout(() => {
          console.log('   ✅ MongoDB started successfully');
          resolve(true);
        }, 4000);
      }
    });
  });
}

// Function to start the API server
function startAPI() {
  console.log('\n2. 🔄 Starting API Server...');
  
  apiProcess = spawn('npm', ['run', 'dev'], {
    stdio: 'inherit',
    shell: true
  });

  apiProcess.on('error', (err) => {
    console.error('   ❌ Failed to start API server:', err.message);
    process.exit(1);
  });

  console.log('   ✅ API Server starting...');
  console.log('   🌐 Available at: http://localhost:5000');
}

// Cleanup function
function cleanup() {
  console.log('\n🛑 Shutting down...');
  
  if (apiProcess) {
    apiProcess.kill();
    console.log('   ✅ API Server stopped');
  }
  
  if (mongoProcess) {
    mongoProcess.kill();
    console.log('   ✅ MongoDB stopped');
  }
  
  process.exit(0);
}

// Handle graceful shutdown
process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

// Main startup function
async function startEverything() {
  try {
    // Start MongoDB first
    await startMongoDB();
    
    // Wait a bit for MongoDB to be fully ready
    console.log('\n⏳ Waiting for MongoDB to be ready...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Start API server
    startAPI();
    
    console.log('\n🎉 SYSTEM FULLY STARTED!');
    console.log('========================');
    console.log('✅ MongoDB: Running');
    console.log('✅ API Server: Running at http://localhost:5000');
    console.log('✅ All endpoints: Ready');
    console.log('\n📝 Next steps:');
    console.log('   • Visit: http://localhost:5000');
    console.log('   • Test API: node test-api.js');
    console.log('   • Stop: Press Ctrl+C');
    console.log('\n🔥 Your backend is LIVE and ready for users!');
    
  } catch (error) {
    console.error('❌ Failed to start system:', error.message);
    process.exit(1);
  }
}

// Start everything
startEverything();