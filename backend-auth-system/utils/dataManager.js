const mongoose = require('mongoose');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

const Trainset = require('../models/Trainset');
const Fitness = require('../models/Fitness');

class DataManager {
  constructor() {
    this.backupDir = path.join(__dirname, '../backups');
    this.ensureBackupDirectory();
  }

  async ensureBackupDirectory() {
    try {
      await fs.mkdir(this.backupDir, { recursive: true });
    } catch (error) {
      console.error('Error creating backup directory:', error);
    }
  }

  // Create a timestamp-based backup of all data
  async createFullBackup(description = 'Manual backup') {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFile = path.join(this.backupDir, `backup_${timestamp}.json`);
      
      console.log('🔄 Creating full data backup...');
      
      const trainsets = await Trainset.find({}).lean();
      const fitness = await Fitness.find({}).lean();
      
      const backupData = {
        metadata: {
          backupDate: new Date(),
          description,
          version: '1.0',
          trainsetCount: trainsets.length,
          fitnessCount: fitness.length
        },
        trainsets,
        fitness
      };
      
      await fs.writeFile(backupFile, JSON.stringify(backupData, null, 2));
      
      console.log(`✅ Backup created successfully: ${backupFile}`);
      console.log(`📊 Backed up ${trainsets.length} trainsets and ${fitness.length} fitness records`);
      
      return backupFile;
    } catch (error) {
      console.error('❌ Error creating backup:', error);
      throw error;
    }
  }

  // List all available backups
  async listBackups() {
    try {
      const files = await fs.readdir(this.backupDir);
      const backups = files.filter(file => file.startsWith('backup_') && file.endsWith('.json'));
      
      console.log('📚 Available backups:');
      for (const backup of backups) {
        const backupPath = path.join(this.backupDir, backup);
        const stats = await fs.stat(backupPath);
        console.log(`  - ${backup} (${stats.size} bytes, ${stats.mtime.toLocaleString()})`);
      }
      
      return backups;
    } catch (error) {
      console.error('❌ Error listing backups:', error);
      return [];
    }
  }

  // Restore from a specific backup
  async restoreFromBackup(backupFileName, confirmRestore = false) {
    try {
      if (!confirmRestore) {
        console.log('⚠️  WARNING: This will overwrite all current data!');
        console.log('   Call with confirmRestore=true to proceed');
        return false;
      }

      const backupPath = path.join(this.backupDir, backupFileName);
      
      // Check if backup exists
      try {
        await fs.access(backupPath);
      } catch (error) {
        console.error(`❌ Backup file not found: ${backupPath}`);
        return false;
      }
      
      console.log(`🔄 Restoring from backup: ${backupFileName}`);
      
      // Read backup data
      const backupContent = await fs.readFile(backupPath, 'utf8');
      const backupData = JSON.parse(backupContent);
      
      console.log(`📊 Backup contains ${backupData.trainsets.length} trainsets and ${backupData.fitness.length} fitness records`);
      
      // Create current backup before restore
      await this.createFullBackup('Pre-restore backup');
      
      // Clear existing data and restore
      await Fitness.deleteMany({});
      await Trainset.deleteMany({});
      
      if (backupData.trainsets.length > 0) {
        await Trainset.insertMany(backupData.trainsets);
        console.log(`✅ Restored ${backupData.trainsets.length} trainsets`);
      }
      
      if (backupData.fitness.length > 0) {
        await Fitness.insertMany(backupData.fitness);
        console.log(`✅ Restored ${backupData.fitness.length} fitness records`);
      }
      
      console.log('✅ Data restoration completed successfully');
      return true;
      
    } catch (error) {
      console.error('❌ Error restoring from backup:', error);
      throw error;
    }
  }

  // Get current data statistics
  async getDataStats() {
    try {
      const trainsetCount = await Trainset.countDocuments();
      const fitnessCount = await Fitness.countDocuments();
      
      const healthStatusCounts = await Fitness.aggregate([
        {
          $group: {
            _id: '$healthMetrics.overall.status',
            count: { $sum: 1 }
          }
        }
      ]);
      
      console.log('📊 Current Data Statistics:');
      console.log(`   Trainsets: ${trainsetCount}`);
      console.log(`   Fitness Records: ${fitnessCount}`);
      console.log('   Health Status Distribution:');
      
      healthStatusCounts.forEach(status => {
        console.log(`     - ${status._id || 'Unknown'}: ${status.count}`);
      });
      
      return {
        trainsets: trainsetCount,
        fitness: fitnessCount,
        healthStatus: healthStatusCounts
      };
    } catch (error) {
      console.error('❌ Error getting data stats:', error);
      throw error;
    }
  }

  // Safe data seeding - only adds missing data
  async safeDataSeed(trainsetCount = 11, confirmSeed = false) {
    try {
      if (!confirmSeed) {
        console.log('⚠️  This will add missing data only (no existing data will be overwritten)');
        console.log('   Call with confirmSeed=true to proceed');
        return false;
      }

      // Create backup before any operations
      await this.createFullBackup('Pre-seed backup');
      
      const currentStats = await this.getDataStats();
      console.log(`🔄 Current data: ${currentStats.trainsets} trainsets, ${currentStats.fitness} fitness records`);
      
      // Only add missing trainsets
      const existingTrainsets = await Trainset.find({});
      const existingNumbers = existingTrainsets.map(t => t.trainsetNumber);
      
      let addedTrainsets = 0;
      for (let i = 1; i <= trainsetCount; i++) {
        const trainsetNumber = `TS${String(i).padStart(3, '0')}`;
        
        if (!existingNumbers.includes(trainsetNumber)) {
          // Add missing trainset
          const newTrainset = new Trainset({
            trainsetNumber,
            manufacturer: i <= 6 ? 'Alstom' : 'BEML',
            model: i <= 6 ? 'Metropolis' : 'Metro Coach',
            yearOfManufacture: 2017 + Math.floor((i-1)/2),
            capacity: 1200,
            maxSpeed: 80,
            currentMileage: Math.floor(Math.random() * 50000) + 40000,
            status: ['IN_SERVICE', 'AVAILABLE', 'MAINTENANCE'][Math.floor(Math.random() * 3)],
            location: ['MG Road Terminal', 'Aluva Depot', 'Kalamassery', 'Vytila'][Math.floor(Math.random() * 4)],
            depot: Math.random() > 0.5 ? 'Aluva Depot' : 'Muttom Workshop',
            lastMaintenanceDate: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000),
            nextMaintenanceDate: new Date(Date.now() + Math.random() * 180 * 24 * 60 * 60 * 1000),
            fitnessExpiry: new Date(Date.now() + Math.random() * 365 * 24 * 60 * 60 * 1000),
            operationalHours: Math.floor(Math.random() * 10000) + 5000
          });
          
          await newTrainset.save();
          addedTrainsets++;
          console.log(`✅ Added missing trainset: ${trainsetNumber}`);
        }
      }
      
      console.log(`📊 Added ${addedTrainsets} new trainsets (${trainsetCount - addedTrainsets} already existed)`);
      
      // Get updated stats
      const finalStats = await this.getDataStats();
      console.log('✅ Safe data seeding completed successfully');
      
      return {
        added: addedTrainsets,
        total: finalStats.trainsets,
        existing: trainsetCount - addedTrainsets
      };
      
    } catch (error) {
      console.error('❌ Error in safe data seeding:', error);
      throw error;
    }
  }

  // Verify data integrity
  async verifyDataIntegrity() {
    try {
      console.log('🔍 Verifying data integrity...');
      
      const issues = [];
      
      // Check for orphaned fitness records
      const fitnessRecords = await Fitness.find({}).populate('trainsetId');
      const orphanedFitness = fitnessRecords.filter(f => !f.trainsetId);
      
      if (orphanedFitness.length > 0) {
        issues.push(`Found ${orphanedFitness.length} orphaned fitness records`);
      }
      
      // Check for trainsets without fitness records
      const trainsets = await Trainset.find({});
      for (const trainset of trainsets) {
        const fitnessCount = await Fitness.countDocuments({ trainsetId: trainset._id });
        if (fitnessCount === 0) {
          issues.push(`Trainset ${trainset.trainsetNumber} has no fitness records`);
        }
      }
      
      // Check for duplicate trainset numbers
      const duplicateCheck = await Trainset.aggregate([
        { $group: { _id: '$trainsetNumber', count: { $sum: 1 } } },
        { $match: { count: { $gt: 1 } } }
      ]);
      
      if (duplicateCheck.length > 0) {
        issues.push(`Found duplicate trainset numbers: ${duplicateCheck.map(d => d._id).join(', ')}`);
      }
      
      if (issues.length === 0) {
        console.log('✅ Data integrity check passed - no issues found');
      } else {
        console.log('⚠️  Data integrity issues found:');
        issues.forEach(issue => console.log(`   - ${issue}`));
      }
      
      return { passed: issues.length === 0, issues };
      
    } catch (error) {
      console.error('❌ Error verifying data integrity:', error);
      throw error;
    }
  }
}

module.exports = DataManager;