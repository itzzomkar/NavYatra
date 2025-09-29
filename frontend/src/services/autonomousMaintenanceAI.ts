// Autonomous AI Maintenance Scheduler for 2-Hour Midnight Window
// Automatically decides which trains need maintenance without human input

export interface TrainConditionData {
  trainsetId: string;
  lastServiceDate: string;
  mileageToday: number;
  totalMileage: number;
  automaticSensorData: {
    brakeTemperature: number[];    // From thermal sensors
    motorVibration: number[];      // From accelerometer sensors  
    doorCycles: number[];          // From door controller logs
    energyEfficiency: number;      // From power consumption logs
    passengerLoadStress: number;   // From weight sensors
    airConditioningRuntime: number;// From HVAC logs
    batteryHealth: number;         // From battery management system
    wheelWear: number;             // From ultrasonic sensors
  };
  operationalMetrics: {
    delaysToday: number;
    emergencyBrakingEvents: number;
    doorMalfunctions: number;
    passengerComplaints: number;
    energyConsumptionVariance: number;
  };
  criticalAlerts: string[];        // Automated system alerts
}

export interface MaintenanceDecision {
  trainsetId: string;
  maintenanceType: 'CRITICAL' | 'PREVENTIVE' | 'CLEANING' | 'INSPECTION' | 'NONE';
  priority: number;                // 1-10 (10 = must do tonight)
  estimatedDuration: number;       // Minutes
  requiredTechnicians: number;
  requiredParts: string[];
  reasoning: string[];             // AI explanation
  confidence: number;              // AI confidence 0-100%
  riskIfSkipped: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  recommendedStartTime: string;    // Optimal time within 2-hour window
}

export interface MidnightSchedule {
  totalAvailableTime: number;      // 120 minutes
  totalTechnicians: number;        // Available staff
  decisions: MaintenanceDecision[];
  optimizedSchedule: {
    timeSlot: string;              // "00:00-01:30"
    trainsets: string[];
    technicians: number;
    parallelTasks: string[];
  }[];
  predictedOutcomes: {
    trainsServiced: number;
    criticalIssuesPrevented: number;
    estimatedCostSavings: number;
    serviceReliabilityImpact: number;
  };
}

class AutonomousMaintenanceAI {
  private readonly MAINTENANCE_WINDOW_MINUTES = 120; // 2 hours
  private readonly AVAILABLE_TECHNICIANS = 8;        // Night shift staff
  private readonly CRITICAL_THRESHOLDS = {
    brakeTemperature: 65,     // °C
    motorVibration: 2.5,      // g-force
    doorCycles: 10000,        // cycles per day
    batteryHealth: 75,        // percentage
    wheelWear: 80             // percentage
  };

  // Main AI Decision Engine
  async generateMidnightSchedule(trainFleetData: TrainConditionData[]): Promise<MidnightSchedule> {
    console.log('🤖 AI analyzing all trains for midnight maintenance decisions...');
    
    // Step 1: AI analyzes each train's condition automatically
    const trainDecisions = await Promise.all(
      trainFleetData.map(train => this.analyzeTrainCondition(train))
    );

    // Step 2: AI optimizes the 2-hour schedule
    const optimizedSchedule = this.optimizeMidnightSchedule(trainDecisions);

    // Step 3: AI predicts outcomes
    const predictedOutcomes = this.predictMaintenanceOutcomes(optimizedSchedule);

    return {
      totalAvailableTime: this.MAINTENANCE_WINDOW_MINUTES,
      totalTechnicians: this.AVAILABLE_TECHNICIANS,
      decisions: trainDecisions,
      optimizedSchedule,
      predictedOutcomes
    };
  }

  // AI analyzes individual train condition
  private async analyzeTrainCondition(train: TrainConditionData): Promise<MaintenanceDecision> {
    const sensors = train.automaticSensorData;
    const operations = train.operationalMetrics;
    
    // AI Risk Assessment Algorithm
    let riskScore = 0;
    let maintenanceReasons: string[] = [];
    let maintenanceType: MaintenanceDecision['maintenanceType'] = 'NONE';
    
    // Critical Safety Analysis (Highest Priority)
    if (Math.max(...sensors.brakeTemperature) > this.CRITICAL_THRESHOLDS.brakeTemperature) {
      riskScore += 100;
      maintenanceType = 'CRITICAL';
      maintenanceReasons.push(`Brake overheating detected: ${Math.max(...sensors.brakeTemperature)}°C (Critical threshold: 65°C)`);
    }
    
    if (Math.max(...sensors.motorVibration) > this.CRITICAL_THRESHOLDS.motorVibration) {
      riskScore += 90;
      maintenanceType = maintenanceType === 'NONE' ? 'CRITICAL' : maintenanceType;
      maintenanceReasons.push(`Excessive motor vibration: ${Math.max(...sensors.motorVibration)}g (Threshold: 2.5g)`);
    }

    if (sensors.wheelWear > this.CRITICAL_THRESHOLDS.wheelWear) {
      riskScore += 80;
      maintenanceType = maintenanceType === 'NONE' ? 'CRITICAL' : maintenanceType;
      maintenanceReasons.push(`Wheel wear at ${sensors.wheelWear}% (Threshold: 80%)`);
    }

    // Predictive Maintenance Analysis
    if (Math.max(...sensors.doorCycles) > this.CRITICAL_THRESHOLDS.doorCycles) {
      riskScore += 40;
      maintenanceType = maintenanceType === 'NONE' ? 'PREVENTIVE' : maintenanceType;
      maintenanceReasons.push(`Door cycle count high: ${Math.max(...sensors.doorCycles)} cycles today`);
    }

    if (sensors.batteryHealth < this.CRITICAL_THRESHOLDS.batteryHealth) {
      riskScore += 35;
      maintenanceType = maintenanceType === 'NONE' ? 'PREVENTIVE' : maintenanceType;
      maintenanceReasons.push(`Battery health declining: ${sensors.batteryHealth}% (Threshold: 75%)`);
    }

    // Energy Efficiency Check
    if (sensors.energyEfficiency < 0.85) {
      riskScore += 25;
      maintenanceType = maintenanceType === 'NONE' ? 'INSPECTION' : maintenanceType;
      maintenanceReasons.push(`Energy efficiency drop: ${(sensors.energyEfficiency * 100).toFixed(1)}%`);
    }

    // Operational Issues
    if (operations.delaysToday > 3) {
      riskScore += 30;
      maintenanceReasons.push(`Multiple delays today: ${operations.delaysToday} incidents`);
    }

    if (operations.emergencyBrakingEvents > 2) {
      riskScore += 50;
      maintenanceReasons.push(`Emergency braking events: ${operations.emergencyBrakingEvents} today`);
    }

    // Cleaning Assessment
    const daysSinceLastService = Math.floor(
      (Date.now() - new Date(train.lastServiceDate).getTime()) / (1000 * 60 * 60 * 24)
    );
    
    if (daysSinceLastService >= 3 && maintenanceType === 'NONE') {
      maintenanceType = 'CLEANING';
      maintenanceReasons.push(`Cleaning due: ${daysSinceLastService} days since last service`);
    }

    // AI Decision Logic
    const priority = Math.min(Math.floor(riskScore / 10), 10);
    const confidence = this.calculateConfidence(train, riskScore);
    
    const estimatedDuration = this.estimateMaintenanceDuration(maintenanceType, maintenanceReasons);
    const requiredTechnicians = this.calculateRequiredTechnicians(maintenanceType);
    const requiredParts = this.predictRequiredParts(train, maintenanceReasons);
    
    return {
      trainsetId: train.trainsetId,
      maintenanceType,
      priority,
      estimatedDuration,
      requiredTechnicians,
      requiredParts,
      reasoning: maintenanceReasons.length ? maintenanceReasons : ['No maintenance required based on current data'],
      confidence,
      riskIfSkipped: this.assessRiskIfSkipped(riskScore),
      recommendedStartTime: '' // Will be set by scheduler
    };
  }

  // AI Schedule Optimizer for 2-Hour Window
  private optimizeMidnightSchedule(decisions: MaintenanceDecision[]): MidnightSchedule['optimizedSchedule'] {
    // Sort by priority and risk
    const sortedDecisions = decisions
      .filter(d => d.maintenanceType !== 'NONE')
      .sort((a, b) => {
        if (a.priority !== b.priority) return b.priority - a.priority;
        return b.confidence - a.confidence;
      });

    const schedule: MidnightSchedule['optimizedSchedule'] = [];
    let currentTime = 0; // Minutes from midnight
    let availableTechnicians = this.AVAILABLE_TECHNICIANS;
    
    // Critical tasks first (must complete)
    const criticalTasks = sortedDecisions.filter(d => d.maintenanceType === 'CRITICAL');
    const preventiveTasks = sortedDecisions.filter(d => d.maintenanceType === 'PREVENTIVE');
    const cleaningTasks = sortedDecisions.filter(d => d.maintenanceType === 'CLEANING');
    
    // Schedule critical tasks immediately
    for (const task of criticalTasks) {
      if (currentTime + task.estimatedDuration <= this.MAINTENANCE_WINDOW_MINUTES) {
        const startTime = this.formatTime(currentTime);
        const endTime = this.formatTime(currentTime + task.estimatedDuration);
        
        schedule.push({
          timeSlot: `${startTime}-${endTime}`,
          trainsets: [task.trainsetId],
          technicians: task.requiredTechnicians,
          parallelTasks: [`CRITICAL: ${task.reasoning[0]}`]
        });
        
        task.recommendedStartTime = startTime;
        currentTime += task.estimatedDuration;
        availableTechnicians -= task.requiredTechnicians;
      }
    }

    // Schedule preventive tasks if time allows
    for (const task of preventiveTasks) {
      if (currentTime + task.estimatedDuration <= this.MAINTENANCE_WINDOW_MINUTES && 
          availableTechnicians >= task.requiredTechnicians) {
        const startTime = this.formatTime(currentTime);
        const endTime = this.formatTime(currentTime + task.estimatedDuration);
        
        schedule.push({
          timeSlot: `${startTime}-${endTime}`,
          trainsets: [task.trainsetId],
          technicians: task.requiredTechnicians,
          parallelTasks: [`PREVENTIVE: ${task.reasoning[0]}`]
        });
        
        task.recommendedStartTime = startTime;
        currentTime += task.estimatedDuration;
      }
    }

    // Batch cleaning tasks (can be done in parallel)
    if (cleaningTasks.length > 0 && currentTime < this.MAINTENANCE_WINDOW_MINUTES) {
      const remainingTime = this.MAINTENANCE_WINDOW_MINUTES - currentTime;
      const cleaningBatch = cleaningTasks.slice(0, Math.floor(remainingTime / 20)); // 20 min per cleaning
      
      if (cleaningBatch.length > 0) {
        const startTime = this.formatTime(currentTime);
        const endTime = this.formatTime(currentTime + 20);
        
        schedule.push({
          timeSlot: `${startTime}-${endTime}`,
          trainsets: cleaningBatch.map(t => t.trainsetId),
          technicians: Math.min(cleaningBatch.length * 2, availableTechnicians),
          parallelTasks: [`CLEANING: ${cleaningBatch.length} trains simultaneously`]
        });
        
        cleaningBatch.forEach(task => {
          task.recommendedStartTime = startTime;
        });
      }
    }

    return schedule;
  }

  // AI Outcome Prediction
  private predictMaintenanceOutcomes(schedule: MidnightSchedule['optimizedSchedule']): MidnightSchedule['predictedOutcomes'] {
    const trainsServiced = schedule.reduce((total, slot) => total + slot.trainsets.length, 0);
    const criticalSlots = schedule.filter(slot => slot.parallelTasks.some(task => task.includes('CRITICAL')));
    
    return {
      trainsServiced,
      criticalIssuesPrevented: criticalSlots.length,
      estimatedCostSavings: trainsServiced * 25000 + criticalSlots.length * 150000, // Cost avoidance
      serviceReliabilityImpact: Math.min(95 + (criticalSlots.length * 2), 100) // Service reliability %
    };
  }

  // Helper Methods
  private calculateConfidence(train: TrainConditionData, riskScore: number): number {
    // AI confidence based on data quality and sensor reliability
    const dataAge = Date.now() - new Date(train.lastServiceDate).getTime();
    const dataFreshness = Math.max(0, 100 - (dataAge / (1000 * 60 * 60 * 24))); // Fresher data = higher confidence
    const sensorReliability = 95; // Assume 95% sensor reliability
    
    return Math.floor((dataFreshness + sensorReliability) / 2);
  }

  private estimateMaintenanceDuration(type: MaintenanceDecision['maintenanceType'], reasons: string[]): number {
    switch (type) {
      case 'CRITICAL': return 60 + (reasons.length * 15); // 60-90 minutes
      case 'PREVENTIVE': return 30 + (reasons.length * 10); // 30-60 minutes  
      case 'CLEANING': return 20; // 20 minutes
      case 'INSPECTION': return 15; // 15 minutes
      default: return 0;
    }
  }

  private calculateRequiredTechnicians(type: MaintenanceDecision['maintenanceType']): number {
    switch (type) {
      case 'CRITICAL': return 3; // Senior technicians
      case 'PREVENTIVE': return 2; // Regular technicians
      case 'CLEANING': return 2; // Cleaning crew
      case 'INSPECTION': return 1; // Inspector
      default: return 0;
    }
  }

  private predictRequiredParts(train: TrainConditionData, reasons: string[]): string[] {
    const parts: string[] = [];
    
    reasons.forEach(reason => {
      if (reason.includes('brake')) parts.push('brake_pads', 'brake_fluid');
      if (reason.includes('door')) parts.push('door_motor', 'door_sensors');
      if (reason.includes('motor')) parts.push('motor_bearings', 'cooling_fluid');
      if (reason.includes('battery')) parts.push('battery_cells', 'battery_coolant');
      if (reason.includes('wheel')) parts.push('wheel_replacement', 'wheel_bearings');
    });
    
    return Array.from(new Set(parts)); // Remove duplicates
  }

  private assessRiskIfSkipped(riskScore: number): MaintenanceDecision['riskIfSkipped'] {
    if (riskScore >= 100) return 'CRITICAL';
    if (riskScore >= 60) return 'HIGH';
    if (riskScore >= 30) return 'MEDIUM';
    return 'LOW';
  }

  private formatTime(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  }

  // Simulate real-time train data (in production, this comes from sensors)
  generateSimulatedTrainData(trainsetIds: string[]): TrainConditionData[] {
    return trainsetIds.map(id => ({
      trainsetId: id,
      lastServiceDate: new Date(Date.now() - Math.random() * 5 * 24 * 60 * 60 * 1000).toISOString(),
      mileageToday: Math.floor(200 + Math.random() * 100),
      totalMileage: Math.floor(50000 + Math.random() * 200000),
      automaticSensorData: {
        brakeTemperature: Array(4).fill(0).map(() => 40 + Math.random() * 30),
        motorVibration: Array(4).fill(0).map(() => 0.5 + Math.random() * 2.5),
        doorCycles: Array(4).fill(0).map(() => Math.floor(8000 + Math.random() * 4000)),
        energyEfficiency: 0.75 + Math.random() * 0.2,
        passengerLoadStress: Math.random(),
        airConditioningRuntime: Math.floor(Math.random() * 20),
        batteryHealth: 70 + Math.random() * 25,
        wheelWear: Math.floor(60 + Math.random() * 35)
      },
      operationalMetrics: {
        delaysToday: Math.floor(Math.random() * 5),
        emergencyBrakingEvents: Math.floor(Math.random() * 3),
        doorMalfunctions: Math.floor(Math.random() * 2),
        passengerComplaints: Math.floor(Math.random() * 3),
        energyConsumptionVariance: Math.random() * 0.15
      },
      criticalAlerts: []
    }));
  }
}

export const autonomousMaintenanceAI = new AutonomousMaintenanceAI();
export default autonomousMaintenanceAI;