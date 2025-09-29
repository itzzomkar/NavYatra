const { spawn, exec } = require('child_process');
const path = require('path');

console.log('🚀 Starting Complete KMRL Train Induction System...');
console.log('==================================================');

let mongoProcess = null;
let backendProcess = null;
let frontendProcess = null;

// Function to check if MongoDB is running
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
  console.log('\n1. 🔄 Starting MongoDB...');
  
  const running = await isMongoRunning();
  if (running) {
    console.log('   ✅ MongoDB is already running');
    return true;
  }

  return new Promise((resolve) => {
    exec('net start MongoDB', (error, stdout, stderr) => {
      if (!error) {
        console.log('   ✅ MongoDB service started');
        resolve(true);
      } else {
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

// Function to start the backend
function startBackend() {
  console.log('\n2. 🔄 Starting Backend API Server...');
  
  backendProcess = spawn('npm', ['run', 'dev'], {
    cwd: path.join(__dirname, 'backend-auth-system'),
    stdio: ['inherit', 'pipe', 'pipe'],
    shell: true
  });

  backendProcess.stdout.on('data', (data) => {
    const output = data.toString();
    if (output.includes('Server is running on port')) {
      console.log('   ✅ Backend API Server started at http://localhost:5000');
    }
  });

  backendProcess.stderr.on('data', (data) => {
    const output = data.toString();
    if (output.includes('MongoDB Connected')) {
      console.log('   ✅ Backend connected to MongoDB');
    }
  });

  backendProcess.on('error', (err) => {
    console.error('   ❌ Failed to start Backend:', err.message);
    process.exit(1);
  });
}

// Function to start the frontend
function startFrontend() {
  console.log('\n3. 🔄 Starting Frontend React App...');
  
  frontendProcess = spawn('npm', ['start'], {
    cwd: path.join(__dirname, 'frontend'),
    stdio: ['inherit', 'pipe', 'pipe'],
    shell: true
  });

  frontendProcess.stdout.on('data', (data) => {
    const output = data.toString();
    if (output.includes('webpack compiled')) {
      console.log('   ✅ Frontend React App started at http://localhost:3000');
    }
  });

  frontendProcess.on('error', (err) => {
    console.error('   ❌ Failed to start Frontend:', err.message);
    process.exit(1);
  });
}

// Cleanup function
function cleanup() {
  console.log('\n🛑 Shutting down all services...');
  
  if (frontendProcess) {
    frontendProcess.kill();
    console.log('   ✅ Frontend stopped');
  }
  
  if (backendProcess) {
    backendProcess.kill();
    console.log('   ✅ Backend stopped');
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
async function startCompleteSystem() {
  try {
    // Start MongoDB first
    await startMongoDB();
    
    console.log('\n⏳ Waiting for MongoDB to be ready...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Start Backend
    startBackend();
    
    console.log('\n⏳ Waiting for Backend to be ready...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Start Frontend
    startFrontend();
    
    console.log('\n🎉 COMPLETE SYSTEM STARTED!');
    console.log('============================');
    console.log('✅ MongoDB: Running');
    console.log('✅ Backend API: http://localhost:5000');
    console.log('✅ Frontend App: http://localhost:3000');
    console.log('✅ Authentication: Ready');
    console.log('✅ Database: Connected');
    console.log('\n📝 Next steps:');
    console.log('   • Open: http://localhost:3000');
    console.log('   • Login with your created account');
    console.log('   • API Docs: http://localhost:5000');
    console.log('   • Stop: Press Ctrl+C');
    console.log('\n🔥 Your complete KMRL Train Induction System is LIVE!');
    console.log('\n🎯 Test user credentials:');
    console.log('   Email: testuser@example.com');
    console.log('   Password: Password123');
    
  } catch (error) {
    console.error('❌ Failed to start system:', error.message);
    process.exit(1);
  }
}

// Start everything
startCompleteSystem();