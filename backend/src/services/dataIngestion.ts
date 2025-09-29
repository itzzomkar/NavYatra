/**
 * Real-time Data Ingestion System for KMRL
 * Handles IoT sensors, IBM Maximo integration, fitness certificates, and more
 */

import { EventEmitter } from 'events';
import * as schedule from 'node-schedule';
import WebSocket from 'ws';

// Data ingestion types
export interface IoTSensorReading {
  trainsetId: string;
  timestamp: Date;
  sensors: {
    temperature: number;
    vibration: number;
    brakeWear: number;
    wheelCondition: number;
    hvacStatus: number;
    doorFunctionality: number;
    motorCurrent: number;
    batteryVoltage: number;
    pneumaticPressure: number;
    oilPressure: number;
  };
  location: {
    latitude: number;
    longitude: number;
    speed: number;
    heading: number;
    station?: string;
  };
  alerts: SensorAlert[];
}

export interface SensorAlert {
  type: 'WARNING' | 'CRITICAL' | 'INFO';
  component: string;
  message: string;
  value: number;
  threshold: number;
}

export interface MaximoJobCard {
  workOrderId: string;
  trainsetId: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  priority: 'EMERGENCY' | 'HIGH' | 'MEDIUM' | 'LOW';
  workType: string;
  description: string;
  estimatedHours: number;
  actualHours?: number;
  assignedCrew: string[];
  requiredParts: Part[];
  createdDate: Date;
  dueDate: Date;
  completedDate?: Date;
  cost?: number;
}

export interface Part {
  partNumber: string;
  description: string;
  quantity: number;
  unitCost: number;
  availability: 'IN_STOCK' | 'ORDER_REQUIRED' | 'ON_ORDER';
}

export interface FitnessCertificate {
  certificateId: string;
  trainsetId: string;
  issueDate: Date;
  expiryDate: Date;
  issuingAuthority: string;
  inspectionType: 'ANNUAL' | 'QUARTERLY' | 'SPECIAL';
  inspectionResults: InspectionResult[];
  overallScore: number;
  status: 'VALID' | 'EXPIRING' | 'EXPIRED' | 'SUSPENDED';
  documents: string[];
}

export interface InspectionResult {
  category: string;
  component: string;
  score: number;
  issues: string[];
  recommendations: string[];
}

export interface BrandingData {
  trainsetId: string;
  advertiserId: string;
  campaignId: string;
  startDate: Date;
  endDate: Date;
  dailyExposureHours: number;
  routesCovered: string[];
  impressions: number;
  revenue: number;
  slaCompliance: number;
}

export interface MaintenanceSchedule {
  trainsetId: string;
  scheduleType: 'PREVENTIVE' | 'CORRECTIVE' | 'PREDICTIVE';
  frequency: string;
  lastPerformed: Date;
  nextDue: Date;
  tasks: MaintenanceTask[];
  estimatedDowntime: number;
}

export interface MaintenanceTask {
  taskId: string;
  description: string;
  category: string;
  estimatedTime: number;
  requiredSkills: string[];
  tools: string[];
  parts: Part[];
}

/**
 * Real-time Data Ingestion Service
 */
export class DataIngestionService extends EventEmitter {
  private iotWebSocket: WebSocket | null = null;
  private maximoPollingInterval: NodeJS.Timeout | null = null;
  private sensorSimulationInterval: NodeJS.Timeout | null = null;
  private dataBuffer: Map<string, any[]> = new Map();
  private isRunning: boolean = false;

  constructor() {
    super();
    this.initializeDataSources();
  }

  /**
   * Initialize all data sources
   */
  private initializeDataSources() {
    // Schedule periodic data ingestion
    this.scheduleDataIngestion();
    
    // Initialize WebSocket for real-time IoT data
    this.initializeIoTWebSocket();
    
    // Start Maximo polling
    this.startMaximoPolling();
    
    // Initialize sensor simulation
    this.startSensorSimulation();
  }

  /**
   * Schedule periodic data ingestion tasks
   */
  private scheduleDataIngestion() {
    // Every 5 minutes - fetch fitness certificates
    schedule.scheduleJob('*/5 * * * *', () => {
      this.fetchFitnessCertificates();
    });

    // Every hour - fetch branding data
    schedule.scheduleJob('0 * * * *', () => {
      this.fetchBrandingData();
    });

    // Every 30 minutes - fetch maintenance schedules
    schedule.scheduleJob('*/30 * * * *', () => {
      this.fetchMaintenanceSchedules();
    });

    // Daily at 2 AM - comprehensive data sync
    schedule.scheduleJob('0 2 * * *', () => {
      this.performComprehensiveSync();
    });
  }

  /**
   * Initialize WebSocket connection for IoT data
   */
  private initializeIoTWebSocket() {
    const wsUrl = process.env.IOT_WEBSOCKET_URL || 'ws://localhost:8080';
    
    try {
      this.iotWebSocket = new WebSocket(wsUrl);

      this.iotWebSocket.on('open', () => {
        console.log('IoT WebSocket connected');
        this.emit('iot:connected');
      });

      this.iotWebSocket.on('message', (data: WebSocket.Data) => {
        try {
          const sensorData = JSON.parse(data.toString());
          this.processSensorData(sensorData);
        } catch (error) {
          console.error('Error processing IoT data:', error);
        }
      });

      this.iotWebSocket.on('error', (error) => {
        console.error('IoT WebSocket error:', error);
        this.emit('iot:error', error);
      });

      this.iotWebSocket.on('close', () => {
        console.log('IoT WebSocket disconnected, reconnecting...');
        setTimeout(() => this.initializeIoTWebSocket(), 5000);
      });
    } catch (error) {
      console.error('Failed to initialize IoT WebSocket:', error);
      // For development, start simulation if WebSocket fails
      this.startSensorSimulation();
    }
  }

  /**
   * Start polling IBM Maximo for job cards
   */
  private startMaximoPolling() {
    // Poll every 2 minutes
    this.maximoPollingInterval = setInterval(() => {
      this.fetchMaximoJobCards();
    }, 2 * 60 * 1000);

    // Initial fetch
    this.fetchMaximoJobCards();
  }

  /**
   * Fetch job cards from IBM Maximo
   */
  private async fetchMaximoJobCards() {
    try {
      // In production, this would call actual Maximo REST API
      // For now, simulate the data
      const jobCards = this.simulateMaximoData();
      
      jobCards.forEach(jobCard => {
        this.emit('maximo:jobcard', jobCard);
        this.bufferData('jobcards', jobCard);
      });

      // Check for critical job cards
      const criticalCards = jobCards.filter(j => j.priority === 'EMERGENCY');
      if (criticalCards.length > 0) {
        this.emit('maximo:critical', criticalCards);
      }
    } catch (error) {
      console.error('Error fetching Maximo data:', error);
      this.emit('maximo:error', error);
    }
  }

  /**
   * Simulate Maximo job card data
   */
  private simulateMaximoData(): MaximoJobCard[] {
    const trainsetIds = ['ts-001', 'ts-002', 'ts-003', 'ts-004'];
    const jobCards: MaximoJobCard[] = [];

    trainsetIds.forEach(trainsetId => {
      // Random chance of having job cards
      if (Math.random() > 0.3) {
        const priorities = ['EMERGENCY', 'HIGH', 'MEDIUM', 'LOW'] as const;
        const workTypes = [
          'Brake System Maintenance',
          'HVAC Repair',
          'Door Mechanism Adjustment',
          'Wheel Replacement',
          'Electrical System Check',
          'Pneumatic System Service'
        ];

        jobCards.push({
          workOrderId: `WO-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          trainsetId,
          status: Math.random() > 0.5 ? 'OPEN' : 'IN_PROGRESS',
          priority: priorities[Math.floor(Math.random() * priorities.length)],
          workType: workTypes[Math.floor(Math.random() * workTypes.length)],
          description: `Scheduled maintenance for ${trainsetId}`,
          estimatedHours: Math.floor(Math.random() * 8) + 1,
          assignedCrew: [`TECH-${Math.floor(Math.random() * 10) + 1}`],
          requiredParts: this.generateRandomParts(),
          createdDate: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
          dueDate: new Date(Date.now() + Math.random() * 7 * 24 * 60 * 60 * 1000)
        });
      }
    });

    return jobCards;
  }

  /**
   * Generate random parts for job cards
   */
  private generateRandomParts(): Part[] {
    const parts: Part[] = [];
    const partTypes = [
      { partNumber: 'BRK-001', description: 'Brake Pad Set', unitCost: 1500 },
      { partNumber: 'WHE-002', description: 'Wheel Bearing', unitCost: 3000 },
      { partNumber: 'HVA-003', description: 'HVAC Filter', unitCost: 500 },
      { partNumber: 'DOR-004', description: 'Door Motor', unitCost: 5000 },
      { partNumber: 'ELE-005', description: 'Control Module', unitCost: 8000 }
    ];

    const numParts = Math.floor(Math.random() * 3) + 1;
    for (let i = 0; i < numParts; i++) {
      const part = partTypes[Math.floor(Math.random() * partTypes.length)];
      parts.push({
        ...part,
        quantity: Math.floor(Math.random() * 4) + 1,
        availability: Math.random() > 0.7 ? 'IN_STOCK' : 'ORDER_REQUIRED'
      });
    }

    return parts;
  }

  /**
   * Start sensor simulation for development
   */
  private startSensorSimulation() {
    if (this.sensorSimulationInterval) return;

    this.sensorSimulationInterval = setInterval(() => {
      const trainsetIds = ['ts-001', 'ts-002', 'ts-003', 'ts-004'];
      
      trainsetIds.forEach(trainsetId => {
        const sensorData = this.generateSensorData(trainsetId);
        this.processSensorData(sensorData);
      });
    }, 5000); // Every 5 seconds
  }

  /**
   * Generate simulated sensor data
   */
  private generateSensorData(trainsetId: string): IoTSensorReading {
    const baseTemp = 25 + Math.random() * 15;
    const baseVibration = 0.1 + Math.random() * 0.3;
    
    const reading: IoTSensorReading = {
      trainsetId,
      timestamp: new Date(),
      sensors: {
        temperature: baseTemp + Math.random() * 5,
        vibration: baseVibration + Math.random() * 0.1,
        brakeWear: 0.3 + Math.random() * 0.4,
        wheelCondition: 0.6 + Math.random() * 0.3,
        hvacStatus: 0.8 + Math.random() * 0.2,
        doorFunctionality: 0.9 + Math.random() * 0.1,
        motorCurrent: 50 + Math.random() * 30,
        batteryVoltage: 72 + Math.random() * 5,
        pneumaticPressure: 8 + Math.random() * 2,
        oilPressure: 3 + Math.random() * 1
      },
      location: {
        latitude: 10.0152 + Math.random() * 0.1,
        longitude: 76.3416 + Math.random() * 0.1,
        speed: Math.random() * 80,
        heading: Math.random() * 360,
        station: Math.random() > 0.5 ? 'Aluva' : 'Palarivattom'
      },
      alerts: []
    };

    // Generate alerts based on sensor values
    if (reading.sensors.temperature > 40) {
      reading.alerts.push({
        type: 'WARNING',
        component: 'Temperature',
        message: 'High temperature detected',
        value: reading.sensors.temperature,
        threshold: 40
      });
    }

    if (reading.sensors.brakeWear > 0.6) {
      reading.alerts.push({
        type: reading.sensors.brakeWear > 0.8 ? 'CRITICAL' : 'WARNING',
        component: 'Brakes',
        message: 'Brake wear exceeding threshold',
        value: reading.sensors.brakeWear,
        threshold: 0.6
      });
    }

    if (reading.sensors.vibration > 0.4) {
      reading.alerts.push({
        type: 'WARNING',
        component: 'Vibration',
        message: 'Abnormal vibration detected',
        value: reading.sensors.vibration,
        threshold: 0.4
      });
    }

    return reading;
  }

  /**
   * Process incoming sensor data
   */
  private processSensorData(data: IoTSensorReading) {
    // Buffer the data
    this.bufferData('sensors', data);

    // Emit events for real-time processing
    this.emit('sensor:data', data);

    // Check for alerts
    if (data.alerts && data.alerts.length > 0) {
      this.emit('sensor:alert', {
        trainsetId: data.trainsetId,
        alerts: data.alerts,
        timestamp: data.timestamp
      });

      // Critical alerts need immediate attention
      const criticalAlerts = data.alerts.filter(a => a.type === 'CRITICAL');
      if (criticalAlerts.length > 0) {
        this.emit('sensor:critical', {
          trainsetId: data.trainsetId,
          alerts: criticalAlerts,
          timestamp: data.timestamp
        });
      }
    }

    // Analyze trends
    this.analyzeSensorTrends(data);
  }

  /**
   * Analyze sensor data trends
   */
  private analyzeSensorTrends(data: IoTSensorReading) {
    const buffer = this.getBufferedData('sensors', data.trainsetId);
    
    if (buffer.length >= 10) {
      // Calculate moving averages
      const recentData = buffer.slice(-10);
      const avgTemp = recentData.reduce((sum, d) => sum + d.sensors.temperature, 0) / 10;
      const avgVibration = recentData.reduce((sum, d) => sum + d.sensors.vibration, 0) / 10;

      // Check for trending issues
      const tempTrend = this.calculateTrend(recentData.map(d => d.sensors.temperature));
      const vibrationTrend = this.calculateTrend(recentData.map(d => d.sensors.vibration));

      if (tempTrend > 0.5) {
        this.emit('sensor:trend', {
          trainsetId: data.trainsetId,
          component: 'temperature',
          trend: 'increasing',
          rate: tempTrend,
          currentValue: data.sensors.temperature,
          average: avgTemp
        });
      }

      if (vibrationTrend > 0.3) {
        this.emit('sensor:trend', {
          trainsetId: data.trainsetId,
          component: 'vibration',
          trend: 'increasing',
          rate: vibrationTrend,
          currentValue: data.sensors.vibration,
          average: avgVibration
        });
      }
    }
  }

  /**
   * Calculate trend from data points
   */
  private calculateTrend(values: number[]): number {
    if (values.length < 2) return 0;

    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    const n = values.length;

    for (let i = 0; i < n; i++) {
      sumX += i;
      sumY += values[i];
      sumXY += i * values[i];
      sumX2 += i * i;
    }

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    return slope;
  }

  /**
   * Fetch fitness certificates
   */
  private async fetchFitnessCertificates() {
    try {
      const certificates = this.simulateFitnessCertificates();
      
      certificates.forEach(cert => {
        this.emit('fitness:certificate', cert);
        this.bufferData('fitness', cert);

        // Check for expiring certificates
        const daysUntilExpiry = Math.ceil(
          (cert.expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        );

        if (daysUntilExpiry <= 7) {
          this.emit('fitness:expiring', {
            trainsetId: cert.trainsetId,
            certificateId: cert.certificateId,
            daysUntilExpiry,
            expiryDate: cert.expiryDate
          });
        }
      });
    } catch (error) {
      console.error('Error fetching fitness certificates:', error);
      this.emit('fitness:error', error);
    }
  }

  /**
   * Simulate fitness certificates
   */
  private simulateFitnessCertificates(): FitnessCertificate[] {
    const trainsetIds = ['ts-001', 'ts-002', 'ts-003', 'ts-004'];
    const certificates: FitnessCertificate[] = [];

    trainsetIds.forEach(trainsetId => {
      const issueDate = new Date(Date.now() - Math.random() * 180 * 24 * 60 * 60 * 1000);
      const expiryDate = new Date(issueDate.getTime() + 365 * 24 * 60 * 60 * 1000);

      certificates.push({
        certificateId: `FC-${trainsetId}-${Date.now()}`,
        trainsetId,
        issueDate,
        expiryDate,
        issuingAuthority: 'KMRL Safety Division',
        inspectionType: 'ANNUAL',
        inspectionResults: this.generateInspectionResults(),
        overallScore: 0.7 + Math.random() * 0.3,
        status: this.determineCertificateStatus(expiryDate),
        documents: [`/certificates/${trainsetId}_fitness.pdf`]
      });
    });

    return certificates;
  }

  /**
   * Generate inspection results
   */
  private generateInspectionResults(): InspectionResult[] {
    const categories = [
      { category: 'Mechanical', component: 'Brakes' },
      { category: 'Mechanical', component: 'Wheels' },
      { category: 'Electrical', component: 'Motors' },
      { category: 'Electrical', component: 'Control Systems' },
      { category: 'Safety', component: 'Emergency Systems' },
      { category: 'Comfort', component: 'HVAC' }
    ];

    return categories.map(cat => ({
      category: cat.category,
      component: cat.component,
      score: 0.6 + Math.random() * 0.4,
      issues: Math.random() > 0.7 ? ['Minor wear detected'] : [],
      recommendations: Math.random() > 0.8 ? ['Schedule preventive maintenance'] : []
    }));
  }

  /**
   * Determine certificate status
   */
  private determineCertificateStatus(expiryDate: Date): 'VALID' | 'EXPIRING' | 'EXPIRED' | 'SUSPENDED' {
    const daysUntilExpiry = Math.ceil(
      (expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );

    if (daysUntilExpiry < 0) return 'EXPIRED';
    if (daysUntilExpiry <= 30) return 'EXPIRING';
    return 'VALID';
  }

  /**
   * Fetch branding data
   */
  private async fetchBrandingData() {
    try {
      const brandingData = this.simulateBrandingData();
      
      brandingData.forEach(data => {
        this.emit('branding:data', data);
        this.bufferData('branding', data);

        // Check SLA compliance
        if (data.slaCompliance < 0.9) {
          this.emit('branding:sla-risk', {
            trainsetId: data.trainsetId,
            advertiserId: data.advertiserId,
            compliance: data.slaCompliance,
            revenue: data.revenue
          });
        }
      });
    } catch (error) {
      console.error('Error fetching branding data:', error);
      this.emit('branding:error', error);
    }
  }

  /**
   * Simulate branding data
   */
  private simulateBrandingData(): BrandingData[] {
    const trainsetIds = ['ts-001', 'ts-002'];
    const advertisers = ['ADV-001', 'ADV-002', 'ADV-003'];

    return trainsetIds.map(trainsetId => ({
      trainsetId,
      advertiserId: advertisers[Math.floor(Math.random() * advertisers.length)],
      campaignId: `CAMP-${Math.random().toString(36).substr(2, 9)}`,
      startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      endDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
      dailyExposureHours: 8 + Math.random() * 4,
      routesCovered: ['Aluva-Palarivattom', 'Palarivattom-Aluva'],
      impressions: Math.floor(10000 + Math.random() * 5000),
      revenue: 50000 + Math.random() * 20000,
      slaCompliance: 0.85 + Math.random() * 0.15
    }));
  }

  /**
   * Fetch maintenance schedules
   */
  private async fetchMaintenanceSchedules() {
    try {
      const schedules = this.simulateMaintenanceSchedules();
      
      schedules.forEach(schedule => {
        this.emit('maintenance:schedule', schedule);
        this.bufferData('maintenance', schedule);

        // Check for overdue maintenance
        if (schedule.nextDue < new Date()) {
          this.emit('maintenance:overdue', {
            trainsetId: schedule.trainsetId,
            scheduleType: schedule.scheduleType,
            dueDate: schedule.nextDue,
            daysOverdue: Math.ceil(
              (Date.now() - schedule.nextDue.getTime()) / (1000 * 60 * 60 * 24)
            )
          });
        }
      });
    } catch (error) {
      console.error('Error fetching maintenance schedules:', error);
      this.emit('maintenance:error', error);
    }
  }

  /**
   * Simulate maintenance schedules
   */
  private simulateMaintenanceSchedules(): MaintenanceSchedule[] {
    const trainsetIds = ['ts-001', 'ts-002', 'ts-003', 'ts-004'];
    const schedules: MaintenanceSchedule[] = [];

    trainsetIds.forEach(trainsetId => {
      const types = ['PREVENTIVE', 'CORRECTIVE', 'PREDICTIVE'] as const;
      
      types.forEach(type => {
        if (Math.random() > 0.5) {
          const lastPerformed = new Date(Date.now() - Math.random() * 60 * 24 * 60 * 60 * 1000);
          const frequency = type === 'PREVENTIVE' ? 30 : type === 'PREDICTIVE' ? 45 : 60;
          
          schedules.push({
            trainsetId,
            scheduleType: type,
            frequency: `${frequency} days`,
            lastPerformed,
            nextDue: new Date(lastPerformed.getTime() + frequency * 24 * 60 * 60 * 1000),
            tasks: this.generateMaintenanceTasks(type),
            estimatedDowntime: 4 + Math.random() * 8
          });
        }
      });
    });

    return schedules;
  }

  /**
   * Generate maintenance tasks
   */
  private generateMaintenanceTasks(type: string): MaintenanceTask[] {
    const tasks: MaintenanceTask[] = [];
    const taskTemplates = {
      PREVENTIVE: [
        { description: 'Lubrication of moving parts', category: 'Mechanical' },
        { description: 'Filter replacement', category: 'HVAC' },
        { description: 'Brake inspection', category: 'Safety' }
      ],
      CORRECTIVE: [
        { description: 'Component replacement', category: 'Repair' },
        { description: 'System calibration', category: 'Electrical' }
      ],
      PREDICTIVE: [
        { description: 'Vibration analysis', category: 'Diagnostic' },
        { description: 'Thermal imaging', category: 'Diagnostic' }
      ]
    };

    const templates = taskTemplates[type as keyof typeof taskTemplates] || [];
    
    templates.forEach(template => {
      tasks.push({
        taskId: `TASK-${Math.random().toString(36).substr(2, 9)}`,
        description: template.description,
        category: template.category,
        estimatedTime: 1 + Math.random() * 3,
        requiredSkills: ['Mechanical', 'Electrical'],
        tools: ['Multimeter', 'Torque Wrench'],
        parts: Math.random() > 0.5 ? this.generateRandomParts() : []
      });
    });

    return tasks;
  }

  /**
   * Perform comprehensive data sync
   */
  private async performComprehensiveSync() {
    console.log('Starting comprehensive data sync...');
    
    try {
      // Sync all data sources
      await Promise.all([
        this.fetchMaximoJobCards(),
        this.fetchFitnessCertificates(),
        this.fetchBrandingData(),
        this.fetchMaintenanceSchedules()
      ]);

      // Analyze overall system state
      this.analyzeSystemState();
      
      this.emit('sync:complete', {
        timestamp: new Date(),
        dataSources: ['maximo', 'fitness', 'branding', 'maintenance', 'sensors']
      });
      
      console.log('Comprehensive data sync completed');
    } catch (error) {
      console.error('Comprehensive sync failed:', error);
      this.emit('sync:error', error);
    }
  }

  /**
   * Analyze overall system state
   */
  private analyzeSystemState() {
    const analysis = {
      totalTrainsets: 25,
      operationalTrainsets: 0,
      maintenanceRequired: 0,
      criticalAlerts: 0,
      slaRisks: 0,
      expiringCertificates: 0
    };

    // Analyze buffered data
    this.dataBuffer.forEach((buffer, key) => {
      if (key.startsWith('sensors')) {
        const recentData = buffer.slice(-100);
        const criticalAlerts = recentData.filter(d => 
          d.alerts && d.alerts.some((a: SensorAlert) => a.type === 'CRITICAL')
        );
        analysis.criticalAlerts += criticalAlerts.length;
      }
    });

    this.emit('system:analysis', analysis);
  }

  /**
   * Buffer data for batch processing
   */
  private bufferData(type: string, data: any) {
    const key = `${type}_${data.trainsetId || 'global'}`;
    
    if (!this.dataBuffer.has(key)) {
      this.dataBuffer.set(key, []);
    }
    
    const buffer = this.dataBuffer.get(key)!;
    buffer.push(data);
    
    // Keep only last 1000 entries
    if (buffer.length > 1000) {
      buffer.shift();
    }
  }

  /**
   * Get buffered data
   */
  private getBufferedData(type: string, trainsetId?: string): any[] {
    const key = `${type}_${trainsetId || 'global'}`;
    return this.dataBuffer.get(key) || [];
  }

  /**
   * Get current system status
   */
  public getSystemStatus() {
    return {
      isRunning: this.isRunning,
      iotConnected: this.iotWebSocket?.readyState === WebSocket.OPEN,
      bufferSizes: Array.from(this.dataBuffer.entries()).map(([key, buffer]) => ({
        key,
        size: buffer.length
      })),
      lastSync: new Date()
    };
  }

  /**
   * Start data ingestion service
   */
  public start() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.initializeDataSources();
    this.emit('service:started');
    console.log('Data ingestion service started');
  }

  /**
   * Stop data ingestion service
   */
  public stop() {
    if (!this.isRunning) return;
    
    this.isRunning = false;
    
    // Clean up intervals
    if (this.maximoPollingInterval) {
      clearInterval(this.maximoPollingInterval);
      this.maximoPollingInterval = null;
    }
    
    if (this.sensorSimulationInterval) {
      clearInterval(this.sensorSimulationInterval);
      this.sensorSimulationInterval = null;
    }
    
    // Close WebSocket
    if (this.iotWebSocket) {
      this.iotWebSocket.close();
      this.iotWebSocket = null;
    }
    
    this.emit('service:stopped');
    console.log('Data ingestion service stopped');
  }

  /**
   * Get real-time data stream
   */
  public getDataStream(type: string): NodeJS.ReadableStream {
    const { Readable } = require('stream');
    const stream = new Readable({
      read() {}
    });

    // Subscribe to events and push to stream
    this.on(`${type}:data`, (data) => {
      stream.push(JSON.stringify(data) + '\n');
    });

    return stream;
  }
}

// Export singleton instance
export const dataIngestionService = new DataIngestionService();
