/**
 * UNS (Unified Namespace) Stream Service
 * Real-time data streaming for KMRL train operations
 * Implements MQTT/Kafka-like messaging for industrial IoT
 */

import EventEmitter from 'events';

interface UNSMessage {
  topic: string;
  payload: any;
  timestamp: Date;
  source: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  qos: 0 | 1 | 2; // Quality of Service levels
}

interface UNSSubscription {
  topic: string;
  handler: (message: UNSMessage) => void;
  filter?: (message: UNSMessage) => boolean;
}

interface DepartmentClearance {
  department: 'ROLLING_STOCK' | 'SIGNALLING' | 'TELECOM';
  trainsetId: string;
  status: 'CLEARED' | 'PENDING' | 'FAILED';
  validFrom: Date;
  validTo: Date;
  remarks?: string;
}

export class UNSStreamService extends EventEmitter {
  private static instance: UNSStreamService;
  private subscriptions: Map<string, UNSSubscription[]> = new Map();
  private messageBuffer: UNSMessage[] = [];
  private isConnected: boolean = false;
  private streamInterval: NodeJS.Timeout | null = null;
  
  // KMRL-specific UNS topics
  private readonly TOPICS = {
    // Department clearances
    ROLLING_STOCK_CLEARANCE: 'kmrl/clearance/rolling-stock',
    SIGNALLING_CLEARANCE: 'kmrl/clearance/signalling',
    TELECOM_CLEARANCE: 'kmrl/clearance/telecom',
    
    // Real-time operations
    TRAINSET_STATUS: 'kmrl/trainset/status',
    TRAINSET_LOCATION: 'kmrl/trainset/location',
    TRAINSET_HEALTH: 'kmrl/trainset/health',
    
    // Maintenance
    MAXIMO_UPDATE: 'kmrl/maximo/update',
    JOB_CARD_STATUS: 'kmrl/maintenance/jobcard',
    
    // Depot operations
    STABLING_UPDATE: 'kmrl/depot/stabling',
    SHUNTING_REQUEST: 'kmrl/depot/shunting',
    BAY_OCCUPANCY: 'kmrl/depot/bay-occupancy',
    
    // Cleaning & detailing
    CLEANING_SCHEDULE: 'kmrl/cleaning/schedule',
    CLEANING_COMPLETE: 'kmrl/cleaning/complete',
    
    // Energy & safety
    ENERGY_CONSUMPTION: 'kmrl/energy/consumption',
    SAFETY_ALERT: 'kmrl/safety/alert',
    
    // KPIs
    PUNCTUALITY_UPDATE: 'kmrl/kpi/punctuality',
    AVAILABILITY_UPDATE: 'kmrl/kpi/availability'
  };

  private constructor() {
    super();
    this.connect();
  }

  static getInstance(): UNSStreamService {
    if (!UNSStreamService.instance) {
      UNSStreamService.instance = new UNSStreamService();
    }
    return UNSStreamService.instance;
  }

  private async connect(): Promise<void> {
    try {
      // Simulate UNS/MQTT connection
      await new Promise(resolve => setTimeout(resolve, 500));
      this.isConnected = true;
      this.emit('connected');
      console.log('✅ UNS Stream connected to KMRL industrial network');
      
      // Start simulating real-time data streams
      this.startDataStreaming();
    } catch (error) {
      console.error('❌ UNS connection failed:', error);
      this.isConnected = false;
      // Retry after 5 seconds
      setTimeout(() => this.connect(), 5000);
    }
  }

  private startDataStreaming(): void {
    // Simulate real-time data streams at different intervals
    
    // Department clearances (every 30 seconds)
    setInterval(() => this.streamDepartmentClearances(), 30000);
    
    // Trainset status updates (every 10 seconds)
    setInterval(() => this.streamTrainsetStatus(), 10000);
    
    // Bay occupancy updates (every 20 seconds)
    setInterval(() => this.streamBayOccupancy(), 20000);
    
    // Energy consumption (every minute)
    setInterval(() => this.streamEnergyData(), 60000);
    
    // KPI updates (every 5 minutes)
    setInterval(() => this.streamKPIUpdates(), 300000);
  }

  private streamDepartmentClearances(): void {
    const departments: DepartmentClearance['department'][] = ['ROLLING_STOCK', 'SIGNALLING', 'TELECOM'];
    const trainsetId = `TS${String(Math.floor(Math.random() * 25) + 1).padStart(3, '0')}`;
    
    departments.forEach(dept => {
      const clearance: DepartmentClearance = {
        department: dept,
        trainsetId,
        status: Math.random() > 0.1 ? 'CLEARED' : 'PENDING',
        validFrom: new Date(),
        validTo: new Date(Date.now() + 24 * 60 * 60 * 1000),
        remarks: Math.random() > 0.8 ? 'Conditional clearance - monitor closely' : undefined
      };
      
      const topic = dept === 'ROLLING_STOCK' ? this.TOPICS.ROLLING_STOCK_CLEARANCE :
                   dept === 'SIGNALLING' ? this.TOPICS.SIGNALLING_CLEARANCE :
                   this.TOPICS.TELECOM_CLEARANCE;
      
      this.publish(topic, clearance, 'high');
    });
  }

  private streamTrainsetStatus(): void {
    const trainsetId = `TS${String(Math.floor(Math.random() * 25) + 1).padStart(3, '0')}`;
    const statuses = ['IN_SERVICE', 'STANDBY', 'MAINTENANCE', 'STABLED', 'SHUNTING'];
    
    const statusUpdate = {
      trainsetId,
      status: statuses[Math.floor(Math.random() * statuses.length)],
      location: `DEPOT_${Math.random() > 0.5 ? 'A' : 'B'}`,
      mileage: Math.floor(50000 + Math.random() * 100000),
      lastUpdate: new Date(),
      nextScheduledService: new Date(Date.now() + Math.random() * 7 * 24 * 60 * 60 * 1000)
    };
    
    this.publish(this.TOPICS.TRAINSET_STATUS, statusUpdate, 'medium');
  }

  private streamBayOccupancy(): void {
    const bayStatus = {
      depot: 'MUTTOM',
      timestamp: new Date(),
      bays: {
        inspection: {
          total: 5,
          occupied: Math.floor(Math.random() * 5),
          trainsets: ['TS001', 'TS003', 'TS007'].slice(0, Math.floor(Math.random() * 3))
        },
        maintenance: {
          total: 3,
          occupied: Math.floor(Math.random() * 3),
          trainsets: ['TS012', 'TS018'].slice(0, Math.floor(Math.random() * 2))
        },
        cleaning: {
          total: 4,
          occupied: Math.floor(Math.random() * 4),
          trainsets: ['TS005', 'TS009', 'TS015'].slice(0, Math.floor(Math.random() * 3))
        },
        stabling: {
          total: 20,
          occupied: Math.floor(10 + Math.random() * 10),
          arrangement: this.generateStablingArrangement()
        }
      }
    };
    
    this.publish(this.TOPICS.BAY_OCCUPANCY, bayStatus, 'medium');
  }

  private generateStablingArrangement(): any {
    // Generate optimal stabling arrangement to minimize shunting
    const tracks = ['T1', 'T2', 'T3', 'T4'];
    const arrangement: any = {};
    
    tracks.forEach(track => {
      arrangement[track] = {
        capacity: 5,
        trainsets: [],
        nextDepartureOrder: []
      };
      
      // Simulate trainsets on each track
      const count = Math.floor(Math.random() * 5);
      for (let i = 0; i < count; i++) {
        const tsNumber = Math.floor(Math.random() * 25) + 1;
        arrangement[track].trainsets.push(`TS${String(tsNumber).padStart(3, '0')}`);
      }
      
      // Order by morning departure time
      arrangement[track].nextDepartureOrder = arrangement[track].trainsets
        .sort(() => Math.random() - 0.5);
    });
    
    return arrangement;
  }

  private streamEnergyData(): void {
    const energyData = {
      timestamp: new Date(),
      depot: 'MUTTOM',
      consumption: {
        traction: Math.floor(3000 + Math.random() * 2000), // kWh
        auxiliary: Math.floor(500 + Math.random() * 500),   // kWh
        lighting: Math.floor(100 + Math.random() * 100),    // kWh
        hvac: Math.floor(800 + Math.random() * 400),        // kWh
        total: 0
      },
      shuntingOperations: {
        count: Math.floor(Math.random() * 10),
        energyPerMove: 15, // kWh
        totalShuntingEnergy: 0
      },
      regenerativeBraking: {
        energyRecovered: Math.floor(200 + Math.random() * 300), // kWh
        efficiency: 0.35 + Math.random() * 0.15 // 35-50%
      }
    };
    
    energyData.consumption.total = 
      energyData.consumption.traction + 
      energyData.consumption.auxiliary + 
      energyData.consumption.lighting + 
      energyData.consumption.hvac;
    
    energyData.shuntingOperations.totalShuntingEnergy = 
      energyData.shuntingOperations.count * energyData.shuntingOperations.energyPerMove;
    
    this.publish(this.TOPICS.ENERGY_CONSUMPTION, energyData, 'low');
  }

  private streamKPIUpdates(): void {
    // Punctuality KPI
    const punctualityData = {
      timestamp: new Date(),
      period: 'LAST_24_HOURS',
      metrics: {
        onTimePerformance: 99.2 + Math.random() * 0.5, // 99.2-99.7%
        delayedServices: Math.floor(Math.random() * 3),
        cancelledServices: Math.random() > 0.9 ? 1 : 0,
        averageDelay: Math.floor(Math.random() * 5), // minutes
        target: 99.5
      }
    };
    
    this.publish(this.TOPICS.PUNCTUALITY_UPDATE, punctualityData, 'medium');
    
    // Availability KPI
    const availabilityData = {
      timestamp: new Date(),
      period: 'CURRENT',
      metrics: {
        totalFleet: 25,
        inService: 18 + Math.floor(Math.random() * 3),
        standby: 2 + Math.floor(Math.random() * 2),
        maintenance: 3 + Math.floor(Math.random() * 2),
        availability: 0,
        target: 92
      }
    };
    
    availabilityData.metrics.availability = 
      ((availabilityData.metrics.inService + availabilityData.metrics.standby) / 
       availabilityData.metrics.totalFleet) * 100;
    
    this.publish(this.TOPICS.AVAILABILITY_UPDATE, availabilityData, 'medium');
  }

  // Public methods for publishing and subscribing
  
  public publish(topic: string, payload: any, priority: UNSMessage['priority'] = 'medium'): void {
    if (!this.isConnected) {
      console.warn('UNS not connected, buffering message');
      this.bufferMessage(topic, payload, priority);
      return;
    }
    
    const message: UNSMessage = {
      topic,
      payload,
      timestamp: new Date(),
      source: 'KMRL_SYSTEM',
      priority,
      qos: priority === 'critical' ? 2 : priority === 'high' ? 1 : 0
    };
    
    // Emit to all subscribers
    this.emit('message', message);
    
    // Handle topic-specific subscribers
    const subscribers = this.subscriptions.get(topic) || [];
    subscribers.forEach(sub => {
      if (!sub.filter || sub.filter(message)) {
        sub.handler(message);
      }
    });
    
    // Log critical messages
    if (priority === 'critical') {
      console.log(`🚨 CRITICAL UNS Message: ${topic}`, payload);
    }
  }

  public subscribe(topic: string, handler: (message: UNSMessage) => void, filter?: (message: UNSMessage) => boolean): () => void {
    const subscription: UNSSubscription = { topic, handler, filter };
    
    if (!this.subscriptions.has(topic)) {
      this.subscriptions.set(topic, []);
    }
    
    this.subscriptions.get(topic)!.push(subscription);
    
    // Return unsubscribe function
    return () => {
      const subs = this.subscriptions.get(topic);
      if (subs) {
        const index = subs.indexOf(subscription);
        if (index > -1) {
          subs.splice(index, 1);
        }
      }
    };
  }

  public subscribePattern(pattern: RegExp, handler: (message: UNSMessage) => void): () => void {
    // Subscribe to all topics matching pattern
    const matchedTopics = Object.values(this.TOPICS).filter(topic => pattern.test(topic));
    const unsubscribers = matchedTopics.map(topic => this.subscribe(topic, handler));
    
    // Return function to unsubscribe from all
    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }

  private bufferMessage(topic: string, payload: any, priority: UNSMessage['priority']): void {
    const message: UNSMessage = {
      topic,
      payload,
      timestamp: new Date(),
      source: 'KMRL_SYSTEM',
      priority,
      qos: priority === 'critical' ? 2 : 1
    };
    
    this.messageBuffer.push(message);
    
    // Keep only last 100 messages in buffer
    if (this.messageBuffer.length > 100) {
      this.messageBuffer.shift();
    }
  }

  // Get latest message for a topic
  public getLatestMessage(topic: string): UNSMessage | null {
    // In production, this would query from message store
    return null;
  }

  // Get all available topics
  public getTopics(): typeof this.TOPICS {
    return this.TOPICS;
  }

  // Check specific clearances
  public async checkAllClearances(trainsetId: string): Promise<{
    rollingStock: boolean;
    signalling: boolean;
    telecom: boolean;
    allClear: boolean;
  }> {
    // In production, this would check actual clearance status
    return {
      rollingStock: Math.random() > 0.05,
      signalling: Math.random() > 0.05,
      telecom: Math.random() > 0.05,
      get allClear() {
        return this.rollingStock && this.signalling && this.telecom;
      }
    };
  }

  // Disconnect
  public disconnect(): void {
    this.isConnected = false;
    if (this.streamInterval) {
      clearInterval(this.streamInterval);
    }
    this.removeAllListeners();
  }
}

// Export singleton instance
export const unsStreamService = UNSStreamService.getInstance();
