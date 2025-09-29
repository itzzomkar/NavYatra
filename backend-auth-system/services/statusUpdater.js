const Trainset = require('../models/Trainset');
const cron = require('node-cron');

class StatusUpdaterService {
  constructor() {
    this.isRunning = false;
    this.lastRun = null;
    this.logs = [];
  }

  // Main function to check and update statuses
  async checkAndUpdateStatuses() {
    const startTime = new Date();
    console.log(`\n🔄 [${startTime.toLocaleString()}] Running automatic status check...`);
    
    const updates = {
      maintenanceDue: 0,
      fitnessExpired: 0,
      cleaningScheduled: 0,
      backToService: 0,
      errors: []
    };

    try {
      // Get all active trainsets
      const trainsets = await Trainset.find({ isActive: true });
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      for (const trainset of trainsets) {
        try {
          let statusChanged = false;
          let newStatus = trainset.status;
          let reason = '';

          // Check 1: Fitness Certificate Expiry
          if (trainset.fitnessExpiry) {
            const fitnessDate = new Date(trainset.fitnessExpiry);
            fitnessDate.setHours(0, 0, 0, 0);
            
            if (fitnessDate < today && trainset.status !== 'OUT_OF_ORDER') {
              newStatus = 'OUT_OF_ORDER';
              reason = 'Fitness certificate expired';
              statusChanged = true;
              updates.fitnessExpired++;
              
              console.log(`  ⚠️ ${trainset.trainsetNumber}: Fitness expired on ${fitnessDate.toLocaleDateString()}`);
            }
          }

          // Check 2: Maintenance Due (only if not already out of order)
          if (trainset.nextMaintenanceDate && newStatus !== 'OUT_OF_ORDER') {
            const maintenanceDate = new Date(trainset.nextMaintenanceDate);
            maintenanceDate.setHours(0, 0, 0, 0);
            
            if (maintenanceDate <= today && trainset.status !== 'MAINTENANCE') {
              newStatus = 'MAINTENANCE';
              reason = 'Scheduled maintenance due';
              statusChanged = true;
              updates.maintenanceDue++;
              
              console.log(`  🔧 ${trainset.trainsetNumber}: Maintenance due since ${maintenanceDate.toLocaleDateString()}`);
            }
          }

          // Check 3: Return from maintenance (if maintenance date updated and is future)
          if (trainset.status === 'MAINTENANCE' && trainset.lastMaintenanceDate) {
            const lastMaintenance = new Date(trainset.lastMaintenanceDate);
            lastMaintenance.setHours(0, 0, 0, 0);
            
            // If maintenance was done today or recently, and next maintenance is in future
            if (lastMaintenance >= today && trainset.nextMaintenanceDate) {
              const nextMaintenance = new Date(trainset.nextMaintenanceDate);
              if (nextMaintenance > today) {
                newStatus = 'AVAILABLE';
                reason = 'Maintenance completed';
                statusChanged = true;
                updates.backToService++;
                
                console.log(`  ✅ ${trainset.trainsetNumber}: Maintenance completed, returning to service`);
              }
            }
          }

          // Check 4: Daily cleaning schedule (10 PM - 12 AM)
          const currentHour = new Date().getHours();
          if (currentHour >= 22 && currentHour < 24) {
            // Only clean trains that are available and not recently cleaned
            if (trainset.status === 'AVAILABLE' && !this.wasRecentlyCleaned(trainset)) {
              // Randomly select 30% of available trains for cleaning
              if (Math.random() < 0.3) {
                newStatus = 'CLEANING';
                reason = 'Scheduled daily cleaning';
                statusChanged = true;
                updates.cleaningScheduled++;
                
                // Update last cleaning date
                trainset.lastCleaningDate = new Date();
                trainset.nextCleaningDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
                
                console.log(`  🧹 ${trainset.trainsetNumber}: Scheduled for cleaning`);
              }
            }
          } else if (trainset.status === 'CLEANING') {
            // Return from cleaning after midnight
            if (currentHour >= 0 && currentHour < 22) {
              newStatus = 'AVAILABLE';
              reason = 'Cleaning completed';
              statusChanged = true;
              updates.backToService++;
              
              console.log(`  ✨ ${trainset.trainsetNumber}: Cleaning completed`);
            }
          }

          // Apply status change if needed
          if (statusChanged) {
            trainset.status = newStatus;
            await trainset.save();
            
            // Log the change
            this.logStatusChange({
              trainsetNumber: trainset.trainsetNumber,
              oldStatus: trainset.status,
              newStatus: newStatus,
              reason: reason,
              timestamp: new Date()
            });
          }

        } catch (error) {
          console.error(`  ❌ Error processing ${trainset.trainsetNumber}:`, error.message);
          updates.errors.push({
            trainset: trainset.trainsetNumber,
            error: error.message
          });
        }
      }

      // Summary
      const endTime = new Date();
      const duration = (endTime - startTime) / 1000;
      
      console.log(`\n📊 Status Update Summary:`);
      console.log(`  Duration: ${duration.toFixed(2)}s`);
      console.log(`  Trainsets checked: ${trainsets.length}`);
      console.log(`  Maintenance due: ${updates.maintenanceDue}`);
      console.log(`  Fitness expired: ${updates.fitnessExpired}`);
      console.log(`  Cleaning scheduled: ${updates.cleaningScheduled}`);
      console.log(`  Returned to service: ${updates.backToService}`);
      if (updates.errors.length > 0) {
        console.log(`  Errors: ${updates.errors.length}`);
      }
      console.log(`✅ Status check completed\n`);

      this.lastRun = endTime;
      return updates;

    } catch (error) {
      console.error('❌ Status updater error:', error);
      throw error;
    }
  }

  // Check if trainset was cleaned in last 20 hours
  wasRecentlyCleaned(trainset) {
    if (!trainset.lastCleaningDate) return false;
    
    const lastCleaning = new Date(trainset.lastCleaningDate);
    const hoursSinceClean = (Date.now() - lastCleaning.getTime()) / (1000 * 60 * 60);
    
    return hoursSinceClean < 20;
  }

  // Get upcoming status changes (for dashboard)
  async getUpcomingChanges(days = 7) {
    const upcoming = {
      maintenanceDue: [],
      fitnessExpiring: [],
      cleaningScheduled: []
    };

    try {
      const trainsets = await Trainset.find({ isActive: true });
      const today = new Date();
      const futureDate = new Date(today.getTime() + (days * 24 * 60 * 60 * 1000));

      for (const trainset of trainsets) {
        // Check maintenance due
        if (trainset.nextMaintenanceDate) {
          const maintenanceDate = new Date(trainset.nextMaintenanceDate);
          if (maintenanceDate > today && maintenanceDate <= futureDate) {
            upcoming.maintenanceDue.push({
              trainsetNumber: trainset.trainsetNumber,
              dueDate: maintenanceDate,
              daysUntil: Math.ceil((maintenanceDate - today) / (1000 * 60 * 60 * 24))
            });
          }
        }

        // Check fitness expiring
        if (trainset.fitnessExpiry) {
          const fitnessDate = new Date(trainset.fitnessExpiry);
          if (fitnessDate > today && fitnessDate <= futureDate) {
            upcoming.fitnessExpiring.push({
              trainsetNumber: trainset.trainsetNumber,
              expiryDate: fitnessDate,
              daysUntil: Math.ceil((fitnessDate - today) / (1000 * 60 * 60 * 24))
            });
          }
        }
      }

      // Sort by days until
      upcoming.maintenanceDue.sort((a, b) => a.daysUntil - b.daysUntil);
      upcoming.fitnessExpiring.sort((a, b) => a.daysUntil - b.daysUntil);

      return upcoming;
    } catch (error) {
      console.error('Error getting upcoming changes:', error);
      throw error;
    }
  }

  // Log status changes for audit
  logStatusChange(change) {
    this.logs.push(change);
    
    // Keep only last 1000 logs in memory
    if (this.logs.length > 1000) {
      this.logs = this.logs.slice(-1000);
    }
  }

  // Get recent logs
  getRecentLogs(limit = 100) {
    return this.logs.slice(-limit).reverse();
  }

  // Start the automatic status updater
  start() {
    if (this.isRunning) {
      console.log('⚠️ Status updater is already running');
      return;
    }

    console.log('🚀 Starting automatic status updater service...');
    
    // Run immediately on start
    this.checkAndUpdateStatuses().catch(console.error);

    // Schedule to run every hour
    this.cronJob = cron.schedule('0 * * * *', async () => {
      await this.checkAndUpdateStatuses();
    });

    // Special schedule for cleaning (10 PM daily)
    this.cleaningJob = cron.schedule('0 22 * * *', async () => {
      console.log('🧹 Starting nightly cleaning schedule...');
      await this.checkAndUpdateStatuses();
    });

    // Return from cleaning (12 AM daily)
    this.cleaningReturnJob = cron.schedule('0 0 * * *', async () => {
      console.log('✨ Returning trains from cleaning...');
      await this.checkAndUpdateStatuses();
    });

    this.isRunning = true;
    console.log('✅ Status updater service started');
    console.log('📅 Schedule: Every hour + Special cleaning times (10 PM, 12 AM)');
  }

  // Stop the service
  stop() {
    if (!this.isRunning) {
      console.log('⚠️ Status updater is not running');
      return;
    }

    if (this.cronJob) {
      this.cronJob.destroy();
    }
    if (this.cleaningJob) {
      this.cleaningJob.destroy();
    }
    if (this.cleaningReturnJob) {
      this.cleaningReturnJob.destroy();
    }

    this.isRunning = false;
    console.log('🛑 Status updater service stopped');
  }

  // Get service status
  getStatus() {
    return {
      isRunning: this.isRunning,
      lastRun: this.lastRun,
      logsCount: this.logs.length
    };
  }
}

// Create singleton instance
const statusUpdater = new StatusUpdaterService();

module.exports = statusUpdater;