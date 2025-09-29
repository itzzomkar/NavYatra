/**
 * IoT Integration Service for KMRL Train Induction System
 * Handles real-time sensor data from trains and infrastructure
 */

import { EventEmitter } from 'events';
import * as mqtt from 'mqtt';
import { WebSocket } from 'ws';

interface SensorData {
  trainsetId: string;
  timestamp: Date;
  sensorType: string;
  value: number;
  unit: string;
  location?: string;
  metadata?: Record<string, any>;
}

interface TrainTelemetry {
  trainsetId: string;
  timestamp: Date;
  location: {
    latitude: number;
    longitude: number;
    altitude?: number;
    speed: number;
    heading: number;
  };
  systems: {
    propulsion: {
      motorTemp: number[];
      current: number[];
      voltage: number;
      power: number;
      efficiency: number;
    };
    braking: {
      padWear: number[];
      discTemp: number[];
      pressure: number;
      regenerativePower: number;
    };
    hvac: {
      temperature: number[];
      humidity: number[];
      airQuality: number;
      powerConsumption: number;
      filterStatus: number;
    };
    doors: {
      status: string[];
      cycleCount: number[];
      obstacleDetected: boolean[];
    };
    battery: {
      voltage: number;
      current: number;
      temperature: number;
      soc: number; // State of Charge
      soh: number; // State of Health
    };
  };
  passenger: {
    count: number;
    distribution: number[];
    weightEstimate: number;
  };
  energy: {
    consumption: number;
    regeneration: number;
    auxiliary: number;
    net: number;
  };
}

interface FitnessCertificate {
  trainsetId: string;
  department: 'rolling_stock' | 'signalling' | 'telecom';
  status: 'valid' | 'expiring' | 'expired' | 'suspended';
  validUntil: Date;
  lastInspection: Date;
  nextInspection: Date;
  parameters: {
    name: string;
    value: number;
    threshold: number;
    status: 'normal' | 'warning' | 'critical';
  }[];
}

class IoTIntegrationService extends EventEmitter {
  private mqttClient: mqtt.MqttClient | null = null;
  private wsConnections: Map<string, WebSocket> = new Map();
  private sensorDataBuffer: SensorData[] = [];
  private telemetryCache: Map<string, TrainTelemetry> = new Map();
  private fitnessStatus: Map<string, FitnessCertificate[]> = new Map();
  private alertThresholds: Map<string, number> = new Map();
  private dataAggregator: NodeJS.Timeout | null = null;

  constructor() {
    super();
    this.initializeThresholds();
    this.startDataAggregator();
  }

  /**
   * Initialize alert thresholds for various parameters
   */
  private initializeThresholds(): void {
    // Motor temperature thresholds (Celsius)
    this.alertThresholds.set('motor_temp_warning', 80);
    this.alertThresholds.set('motor_temp_critical', 95);
    
    // Brake pad wear thresholds (mm)
    this.alertThresholds.set('brake_pad_warning', 3);
    this.alertThresholds.set('brake_pad_critical', 1.5);
    
    // Battery SOH thresholds (%)
    this.alertThresholds.set('battery_soh_warning', 80);
    this.alertThresholds.set('battery_soh_critical', 70);
    
    // HVAC filter status (%)
    this.alertThresholds.set('hvac_filter_warning', 30);
    this.alertThresholds.set('hvac_filter_critical', 15);
    
    // Energy efficiency thresholds (%)
    this.alertThresholds.set('efficiency_warning', 75);
    this.alertThresholds.set('efficiency_critical', 65);
  }

  /**
   * Connect to MQTT broker for IoT data
   */
  public connectMQTT(brokerUrl: string, options?: mqtt.IClientOptions): void {
    try {
      this.mqttClient = mqtt.connect(brokerUrl, {
        ...options,
        reconnectPeriod: 5000,
        connectTimeout: 30000,
        keepalive: 60,
        clean: true,
        clientId: `kmrl-induction-${Date.now()}`,
      });

      this.mqttClient.on('connect', () => {
        console.log('✅ Connected to MQTT broker');
        this.subscribeToTopics();
      });

      this.mqttClient.on('message', this.handleMQTTMessage.bind(this));
      
      this.mqttClient.on('error', (error) => {
        console.error('MQTT error:', error);
        this.emit('mqtt:error', error);
      });

      this.mqttClient.on('offline', () => {
        console.log('MQTT client offline');
        this.emit('mqtt:offline');
      });

    } catch (error) {
      console.error('Failed to connect to MQTT broker:', error);
      throw error;
    }
  }

  /**
   * Subscribe to relevant MQTT topics
   */
  private subscribeToTopics(): void {
    if (!this.mqttClient) return;

    const topics = [
      'kmrl/trains/+/telemetry',
      'kmrl/trains/+/sensors/+',
      'kmrl/trains/+/fitness',
      'kmrl/trains/+/alerts',
      'kmrl/infrastructure/+/status',
      'kmrl/depot/+/sensors',
    ];

    topics.forEach(topic => {
      this.mqttClient?.subscribe(topic, { qos: 1 }, (err) => {
        if (err) {
          console.error(`Failed to subscribe to ${topic}:`, err);
        } else {
          console.log(`Subscribed to ${topic}`);
        }
      });
    });
  }

  /**
   * Handle incoming MQTT messages
   */
  private handleMQTTMessage(topic: string, message: Buffer): void {
    try {
      const data = JSON.parse(message.toString());
      const topicParts = topic.split('/');

      if (topic.includes('telemetry')) {
        this.processTelemetry(data);
      } else if (topic.includes('sensors')) {
        this.processSensorData(data);
      } else if (topic.includes('fitness')) {
        this.processFitnessData(data);
      } else if (topic.includes('alerts')) {
        this.processAlert(data);
      }

      // Emit event for real-time updates
      this.emit('iot:data', { topic, data });
      
    } catch (error) {
      console.error('Error processing MQTT message:', error);
    }
  }

  /**
   * Process telemetry data from trains
   */
  private processTelemetry(data: Partial<TrainTelemetry>): void {
    if (!data.trainsetId) return;

    const telemetry: TrainTelemetry = {
      timestamp: new Date(),
      ...data,
    } as TrainTelemetry;

    // Update cache
    this.telemetryCache.set(data.trainsetId, telemetry);

    // Check for anomalies
    this.checkTelemetryAnomalies(telemetry);

    // Store in buffer for batch processing
    this.sensorDataBuffer.push({
      trainsetId: telemetry.trainsetId,
      timestamp: telemetry.timestamp,
      sensorType: 'telemetry',
      value: 1,
      unit: 'complete',
      metadata: telemetry,
    });

    this.emit('telemetry:update', telemetry);
  }

  /**
   * Process individual sensor data
   */
  private processSensorData(data: SensorData): void {
    this.sensorDataBuffer.push(data);

    // Check if immediate action needed
    if (this.isUrgentSensorReading(data)) {
      this.handleUrgentSensorReading(data);
    }

    this.emit('sensor:data', data);
  }

  /**
   * Process fitness certificate updates
   */
  private processFitnessData(data: FitnessCertificate): void {
    if (!this.fitnessStatus.has(data.trainsetId)) {
      this.fitnessStatus.set(data.trainsetId, []);
    }

    const certificates = this.fitnessStatus.get(data.trainsetId)!;
    const existingIndex = certificates.findIndex(c => c.department === data.department);

    if (existingIndex >= 0) {
      certificates[existingIndex] = data;
    } else {
      certificates.push(data);
    }

    // Check fitness validity
    this.checkFitnessValidity(data);

    this.emit('fitness:update', data);
  }

  /**
   * Process alerts from IoT devices
   */
  private processAlert(alert: any): void {
    console.warn('IoT Alert received:', alert);
    
    this.emit('alert:received', {
      ...alert,
      timestamp: new Date(),
      source: 'iot',
    });

    // Take automated action if configured
    if (alert.severity === 'critical') {
      this.handleCriticalAlert(alert);
    }
  }

  /**
   * Check telemetry for anomalies
   */
  private checkTelemetryAnomalies(telemetry: TrainTelemetry): void {
    const anomalies: any[] = [];

    // Check motor temperatures
    telemetry.systems.propulsion.motorTemp.forEach((temp, index) => {
      if (temp > this.alertThresholds.get('motor_temp_critical')!) {
        anomalies.push({
          type: 'motor_temp',
          severity: 'critical',
          motor: index,
          value: temp,
          threshold: this.alertThresholds.get('motor_temp_critical'),
        });
      } else if (temp > this.alertThresholds.get('motor_temp_warning')!) {
        anomalies.push({
          type: 'motor_temp',
          severity: 'warning',
          motor: index,
          value: temp,
          threshold: this.alertThresholds.get('motor_temp_warning'),
        });
      }
    });

    // Check brake pad wear
    telemetry.systems.braking.padWear.forEach((wear, index) => {
      if (wear < this.alertThresholds.get('brake_pad_critical')!) {
        anomalies.push({
          type: 'brake_pad_wear',
          severity: 'critical',
          pad: index,
          value: wear,
          threshold: this.alertThresholds.get('brake_pad_critical'),
        });
      }
    });

    // Check battery health
    if (telemetry.systems.battery.soh < this.alertThresholds.get('battery_soh_critical')!) {
      anomalies.push({
        type: 'battery_health',
        severity: 'critical',
        value: telemetry.systems.battery.soh,
        threshold: this.alertThresholds.get('battery_soh_critical'),
      });
    }

    // Emit anomalies
    if (anomalies.length > 0) {
      this.emit('anomaly:detected', {
        trainsetId: telemetry.trainsetId,
        timestamp: telemetry.timestamp,
        anomalies,
      });
    }
  }

  /**
   * Check if sensor reading requires immediate attention
   */
  private isUrgentSensorReading(data: SensorData): boolean {
    const urgentTypes = [
      'emergency_brake',
      'fire_detection',
      'collision_warning',
      'door_obstruction',
      'power_failure',
    ];

    return urgentTypes.includes(data.sensorType);
  }

  /**
   * Handle urgent sensor readings
   */
  private handleUrgentSensorReading(data: SensorData): void {
    console.error('🚨 Urgent sensor reading:', data);
    
    this.emit('urgent:sensor', {
      ...data,
      handledAt: new Date(),
      priority: 'immediate',
    });

    // Notify all connected WebSocket clients
    this.broadcastToWebSockets({
      type: 'urgent_sensor',
      data,
    });
  }

  /**
   * Check fitness certificate validity
   */
  private checkFitnessValidity(certificate: FitnessCertificate): void {
    const now = new Date();
    const daysUntilExpiry = Math.floor(
      (certificate.validUntil.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (certificate.status === 'expired' || daysUntilExpiry <= 0) {
      this.emit('fitness:expired', {
        ...certificate,
        daysExpired: Math.abs(daysUntilExpiry),
      });
    } else if (daysUntilExpiry <= 7) {
      this.emit('fitness:expiring', {
        ...certificate,
        daysUntilExpiry,
      });
    }

    // Check critical parameters
    const criticalParams = certificate.parameters.filter(p => p.status === 'critical');
    if (criticalParams.length > 0) {
      this.emit('fitness:critical', {
        trainsetId: certificate.trainsetId,
        department: certificate.department,
        criticalParameters: criticalParams,
      });
    }
  }

  /**
   * Handle critical alerts
   */
  private handleCriticalAlert(alert: any): void {
    // Implement automated response to critical alerts
    const response = {
      alertId: alert.id,
      trainsetId: alert.trainsetId,
      action: 'auto_response',
      timestamp: new Date(),
      measures: [] as string[],
    };

    switch (alert.type) {
      case 'emergency_brake':
        response.measures.push('notify_control_center', 'dispatch_emergency_team');
        break;
      case 'fire_detection':
        response.measures.push('activate_suppression', 'evacuate_train', 'notify_fire_dept');
        break;
      case 'power_failure':
        response.measures.push('switch_to_backup', 'notify_maintenance');
        break;
      default:
        response.measures.push('notify_supervisor', 'log_incident');
    }

    this.emit('critical:response', response);
  }

  /**
   * Start data aggregator for batch processing
   */
  private startDataAggregator(): void {
    this.dataAggregator = setInterval(() => {
      if (this.sensorDataBuffer.length > 0) {
        this.processBatchData();
      }
    }, 5000); // Process every 5 seconds
  }

  /**
   * Process batch sensor data
   */
  private processBatchData(): void {
    const batchSize = this.sensorDataBuffer.length;
    const batch = this.sensorDataBuffer.splice(0, batchSize);

    // Group by trainset
    const groupedData = batch.reduce((acc, data) => {
      if (!acc[data.trainsetId]) {
        acc[data.trainsetId] = [];
      }
      acc[data.trainsetId].push(data);
      return acc;
    }, {} as Record<string, SensorData[]>);

    // Process each trainset's data
    Object.entries(groupedData).forEach(([trainsetId, data]) => {
      this.aggregateTrainsetData(trainsetId, data);
    });

    this.emit('batch:processed', {
      timestamp: new Date(),
      count: batchSize,
      trainsets: Object.keys(groupedData).length,
    });
  }

  /**
   * Aggregate data for a specific trainset
   */
  private aggregateTrainsetData(trainsetId: string, data: SensorData[]): void {
    const aggregated = {
      trainsetId,
      timestamp: new Date(),
      sensorCount: data.length,
      averages: {} as Record<string, number>,
      alerts: [] as any[],
    };

    // Calculate averages by sensor type
    const typeGroups = data.reduce((acc, d) => {
      if (!acc[d.sensorType]) {
        acc[d.sensorType] = [];
      }
      acc[d.sensorType].push(d.value);
      return acc;
    }, {} as Record<string, number[]>);

    Object.entries(typeGroups).forEach(([type, values]) => {
      aggregated.averages[type] = values.reduce((a, b) => a + b, 0) / values.length;
    });

    this.emit('data:aggregated', aggregated);
  }

  /**
   * Add WebSocket connection for real-time updates
   */
  public addWebSocketConnection(id: string, ws: WebSocket): void {
    this.wsConnections.set(id, ws);
    
    ws.on('close', () => {
      this.wsConnections.delete(id);
    });
  }

  /**
   * Broadcast to all WebSocket connections
   */
  private broadcastToWebSockets(message: any): void {
    const messageStr = JSON.stringify(message);
    
    this.wsConnections.forEach((ws, id) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(messageStr);
      }
    });
  }

  /**
   * Get current telemetry for a trainset
   */
  public getTelemetry(trainsetId: string): TrainTelemetry | undefined {
    return this.telemetryCache.get(trainsetId);
  }

  /**
   * Get all telemetry data
   */
  public getAllTelemetry(): Map<string, TrainTelemetry> {
    return this.telemetryCache;
  }

  /**
   * Get fitness status for a trainset
   */
  public getFitnessStatus(trainsetId: string): FitnessCertificate[] | undefined {
    return this.fitnessStatus.get(trainsetId);
  }

  /**
   * Simulate IoT data for testing
   */
  public simulateData(trainsetId: string): void {
    const mockTelemetry: TrainTelemetry = {
      trainsetId,
      timestamp: new Date(),
      location: {
        latitude: 9.9312 + Math.random() * 0.01,
        longitude: 76.2673 + Math.random() * 0.01,
        speed: Math.random() * 80,
        heading: Math.random() * 360,
      },
      systems: {
        propulsion: {
          motorTemp: [75 + Math.random() * 20, 75 + Math.random() * 20, 75 + Math.random() * 20, 75 + Math.random() * 20],
          current: [100 + Math.random() * 50, 100 + Math.random() * 50, 100 + Math.random() * 50, 100 + Math.random() * 50],
          voltage: 750 + Math.random() * 50,
          power: 1500 + Math.random() * 500,
          efficiency: 85 + Math.random() * 10,
        },
        braking: {
          padWear: [8 + Math.random() * 2, 8 + Math.random() * 2, 8 + Math.random() * 2, 8 + Math.random() * 2],
          discTemp: [40 + Math.random() * 30, 40 + Math.random() * 30, 40 + Math.random() * 30, 40 + Math.random() * 30],
          pressure: 8 + Math.random() * 2,
          regenerativePower: Math.random() * 500,
        },
        hvac: {
          temperature: [22 + Math.random() * 3, 22 + Math.random() * 3, 22 + Math.random() * 3],
          humidity: [50 + Math.random() * 20, 50 + Math.random() * 20, 50 + Math.random() * 20],
          airQuality: 80 + Math.random() * 20,
          powerConsumption: 100 + Math.random() * 50,
          filterStatus: 70 + Math.random() * 30,
        },
        doors: {
          status: ['closed', 'closed', 'closed', 'closed', 'closed', 'closed', 'closed', 'closed'],
          cycleCount: [1000, 1020, 980, 1010, 990, 1005, 995, 1015],
          obstacleDetected: [false, false, false, false, false, false, false, false],
        },
        battery: {
          voltage: 110 + Math.random() * 10,
          current: 50 + Math.random() * 20,
          temperature: 25 + Math.random() * 10,
          soc: 80 + Math.random() * 20,
          soh: 85 + Math.random() * 15,
        },
      },
      passenger: {
        count: Math.floor(Math.random() * 300),
        distribution: [
          Math.floor(Math.random() * 75),
          Math.floor(Math.random() * 75),
          Math.floor(Math.random() * 75),
          Math.floor(Math.random() * 75),
        ],
        weightEstimate: 15000 + Math.random() * 5000,
      },
      energy: {
        consumption: 150 + Math.random() * 50,
        regeneration: Math.random() * 30,
        auxiliary: 20 + Math.random() * 10,
        net: 120 + Math.random() * 40,
      },
    };

    this.processTelemetry(mockTelemetry);
  }

  /**
   * Disconnect and cleanup
   */
  public disconnect(): void {
    if (this.mqttClient) {
      this.mqttClient.end();
      this.mqttClient = null;
    }

    if (this.dataAggregator) {
      clearTimeout(this.dataAggregator);
      this.dataAggregator = null;
    }

    this.wsConnections.forEach(ws => ws.close());
    this.wsConnections.clear();

    this.removeAllListeners();
  }
}

export default new IoTIntegrationService();
export type { SensorData, TrainTelemetry, FitnessCertificate };
export { IoTIntegrationService };
