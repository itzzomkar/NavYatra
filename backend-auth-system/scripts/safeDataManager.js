const mongoose = require('mongoose');
const readline = require('readline');
require('dotenv').config();

const DataManager = require('../utils/dataManager');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/auth_system_db');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const dataManager = new DataManager();

function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim().toLowerCase());
    });
  });
}

async function showMainMenu() {
  console.log('\n🎯 KMRL Safe Data Management System');
  console.log('=====================================');
  console.log('1. 📊 Check current data statistics');
  console.log('2. 💾 Create full backup');
  console.log('3. 📚 List all backups');
  console.log('4. 🔄 Restore from backup');
  console.log('5. 🔍 Verify data integrity');
  console.log('6. ➕ Safe data seeding (add missing data only)');
  console.log('7. 🚪 Exit');
  console.log('=====================================');
  
  const choice = await askQuestion('Select an option (1-7): ');
  return choice;
}

async function handleDataStats() {
  try {
    await dataManager.getDataStats();
  } catch (error) {
    console.error('Error getting data stats:', error.message);
  }
}

async function handleCreateBackup() {
  try {
    const description = await askQuestion('Enter backup description (optional): ');
    const backupFile = await dataManager.createFullBackup(description || 'Manual backup');
    console.log(`\n✅ Backup created: ${backupFile}`);
  } catch (error) {
    console.error('Error creating backup:', error.message);
  }
}

async function handleListBackups() {
  try {
    await dataManager.listBackups();
  } catch (error) {
    console.error('Error listing backups:', error.message);
  }
}

async function handleRestore() {
  try {
    const backups = await dataManager.listBackups();
    if (backups.length === 0) {
      console.log('❌ No backups found');
      return;
    }
    
    console.log('\n⚠️  WARNING: This will overwrite ALL current data!');
    const confirmWarning = await askQuestion('Type "CONFIRM" to proceed: ');
    
    if (confirmWarning !== 'confirm') {
      console.log('✅ Restore cancelled');
      return;
    }
    
    const backupName = await askQuestion('Enter backup filename: ');
    const restored = await dataManager.restoreFromBackup(backupName, true);
    
    if (restored) {
      console.log('✅ Data restoration completed successfully');
    }
  } catch (error) {
    console.error('Error restoring data:', error.message);
  }
}

async function handleDataIntegrity() {
  try {
    const result = await dataManager.verifyDataIntegrity();
    if (!result.passed) {
      console.log('\n⚠️  Would you like to create a backup before fixing issues?');
      const createBackup = await askQuestion('Create backup? (y/n): ');
      if (createBackup === 'y' || createBackup === 'yes') {
        await dataManager.createFullBackup('Pre-integrity-fix backup');
      }
    }
  } catch (error) {
    console.error('Error verifying data integrity:', error.message);
  }
}

async function handleSafeSeeding() {
  try {
    console.log('\n📊 Current data status:');
    await dataManager.getDataStats();
    
    console.log('\n⚠️  This will ONLY add missing trainsets (no existing data will be changed)');
    const proceed = await askQuestion('Proceed with safe seeding? (y/n): ');
    
    if (proceed !== 'y' && proceed !== 'yes') {
      console.log('✅ Safe seeding cancelled');
      return;
    }
    
    const trainsetCount = await askQuestion('How many trainsets should exist in total? (default: 11): ');
    const count = parseInt(trainsetCount) || 11;
    
    const result = await dataManager.safeDataSeed(count, true);
    
    if (result) {
      console.log(`\n📊 Safe seeding results:`);
      console.log(`   - Added: ${result.added} new trainsets`);
      console.log(`   - Existing: ${result.existing} trainsets (unchanged)`);
      console.log(`   - Total: ${result.total} trainsets`);
    }
  } catch (error) {
    console.error('Error in safe seeding:', error.message);
  }
}

async function main() {
  try {
    console.log('🔗 Connecting to database...');
    
    // Wait for database connection
    await new Promise((resolve, reject) => {
      mongoose.connection.once('open', resolve);
      mongoose.connection.once('error', reject);
    });
    
    console.log('✅ Database connected successfully');
    
    while (true) {
      const choice = await showMainMenu();
      
      switch (choice) {
        case '1':
          await handleDataStats();
          break;
        case '2':
          await handleCreateBackup();
          break;
        case '3':
          await handleListBackups();
          break;
        case '4':
          await handleRestore();
          break;
        case '5':
          await handleDataIntegrity();
          break;
        case '6':
          await handleSafeSeeding();
          break;
        case '7':
          console.log('👋 Goodbye!');
          process.exit(0);
        default:
          console.log('❌ Invalid choice, please try again');
      }
      
      console.log('\n' + '='.repeat(50));
      const continueChoice = await askQuestion('Press Enter to continue...');
    }
    
  } catch (error) {
    console.error('❌ Application error:', error.message);
    process.exit(1);
  } finally {
    rl.close();
    mongoose.disconnect();
  }
}

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n👋 Goodbye!');
  rl.close();
  mongoose.disconnect();
  process.exit(0);
});

// Run the application
main();