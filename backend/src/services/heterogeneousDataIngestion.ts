/**
 * Heterogeneous Data Ingestion Service
 * Unified ingestion pipeline for multiple data sources:
 * - Maximo exports (CSV/Excel)
 * - IoT sensor data
 * - UNS streams
 * - Manual overrides from UI
 * - Department clearances
 */

import { EventEmitter } from 'events';
import * as fs from 'fs';
import * as path from 'path';

interface DataSource {
  id: string;
  type: 'MAXIMO' | 'IOT_SENSOR' | 'UNS_STREAM' | 'MANUAL_OVERRIDE' | 'DEPARTMENT_CLEARANCE';
  format: 'CSV' | 'JSON' | 'XML' | 'MQTT' | 'KAFKA' | 'API' | 'FILE';
  priority: number; // 1-10, higher overrides lower
  timestamp: Date;
  status: 'ACTIVE' | 'INACTIVE' | 'ERROR';
  lastSync?: Date;
  errorCount: number;
}

interface IngestedData {
  sourceId: string;
  sourceType: string;
  timestamp: Date;
  data: any;
  metadata: {
    format: string;
    size: number;
    processingTime: number;
    transformations: string[];
    validationErrors: string[];
  };
}

interface DataConflict {
  id: string;
  timestamp: Date;
  field: string;
  sources: Array<{
    sourceId: string;
    value: any;
    priority: number;
    timestamp: Date;
  }>;
  resolution: 'MANUAL' | 'AUTO_PRIORITY' | 'AUTO_TIMESTAMP' | 'PENDING';
  resolvedValue?: any;
  resolvedBy?: string;
}

interface IngestionMetrics {
  totalIngested: number;
  bySource: Map<string, number>;
  averageProcessingTime: number;
  conflictsDetected: number;
  conflictsResolved: number;
  errorRate: number;
  lastUpdateTime: Date;
}

export class HeterogeneousDataIngestionService extends EventEmitter {
  private dataSources: Map<string, DataSource> = new Map();
  private dataBuffer: IngestedData[] = [];
  private conflicts: Map<string, DataConflict> = new Map();
  private metrics: IngestionMetrics;
  private readonly BUFFER_SIZE = 10000;
  private readonly CONFLICT_WINDOW = 5000; // ms

  constructor() {
    super();
    this.metrics = this.initializeMetrics();
    this.initializeDataSources();
    this.startIngestionPipeline();
  }

  /**
   * Initialize default data sources
   */
  private initializeDataSources(): void {
    // Maximo export source
    this.registerDataSource({
      id: 'MAXIMO_EXPORT',
      type: 'MAXIMO',
      format: 'CSV',
      priority: 5,
      timestamp: new Date(),
      status: 'ACTIVE',
      errorCount: 0
    });

    // IoT sensor sources
    ['IOT_TRAINSET_01', 'IOT_DEPOT_01', 'IOT_TRACK_01'].forEach(id => {
      this.registerDataSource({
        id,
        type: 'IOT_SENSOR',
        format: 'MQTT',
        priority: 7,
        timestamp: new Date(),
        status: 'ACTIVE',
        errorCount: 0
      });
    });

    // UNS stream source
    this.registerDataSource({
      id: 'UNS_MAIN_STREAM',
      type: 'UNS_STREAM',
      format: 'KAFKA',
      priority: 6,
      timestamp: new Date(),
      status: 'ACTIVE',
      errorCount: 0
    });

    // Manual override source (highest priority)
    this.registerDataSource({
      id: 'MANUAL_OVERRIDE_UI',
      type: 'MANUAL_OVERRIDE',
      format: 'API',
      priority: 10,
      timestamp: new Date(),
      status: 'ACTIVE',
      errorCount: 0
    });

    // Department clearance sources
    ['DEPT_SAFETY', 'DEPT_ELECTRICAL', 'DEPT_ROLLING_STOCK'].forEach(dept => {
      this.registerDataSource({
        id: dept,
        type: 'DEPARTMENT_CLEARANCE',
        format: 'API',
        priority: 8,
        timestamp: new Date(),
        status: 'ACTIVE',
        errorCount: 0
      });
    });
  }

  /**
   * Register a new data source
   */
  public registerDataSource(source: DataSource): void {
    this.dataSources.set(source.id, source);
    this.emit('sourceRegistered', source);
    console.log(`Data source registered: ${source.id} (${source.type})`);
  }

  /**
   * Start the main ingestion pipeline
   */
  private startIngestionPipeline(): void {
    // Simulate continuous data ingestion
    setInterval(() => this.pollDataSources(), 5000);
    
    // Process buffer periodically
    setInterval(() => this.processBuffer(), 2000);
    
    // Detect and resolve conflicts
    setInterval(() => this.detectAndResolveConflicts(), 3000);
    
    // Update metrics
    setInterval(() => this.updateMetrics(), 10000);
  }

  /**
   * Poll all active data sources
   */
  private async pollDataSources(): Promise<void> {
    for (const [sourceId, source] of this.dataSources) {
      if (source.status === 'ACTIVE') {
        try {
          const data = await this.fetchDataFromSource(source);
          if (data) {
            await this.ingestData(source, data);
          }
        } catch (error) {
          this.handleIngestionError(source, error);
        }
      }
    }
  }

  /**
   * Fetch data from a specific source
   */
  private async fetchDataFromSource(source: DataSource): Promise<any> {
    const startTime = Date.now();
    
    switch (source.type) {
      case 'MAXIMO':
        return this.fetchMaximoData(source);
      
      case 'IOT_SENSOR':
        return this.fetchIoTData(source);
      
      case 'UNS_STREAM':
        return this.fetchUNSData(source);
      
      case 'MANUAL_OVERRIDE':
        return this.fetchManualOverrides(source);
      
      case 'DEPARTMENT_CLEARANCE':
        return this.fetchDepartmentClearances(source);
      
      default:
        return null;
    }
  }

  /**
   * Fetch Maximo export data
   */
  private async fetchMaximoData(source: DataSource): Promise<any> {
    // Simulate Maximo data export
    return {
      timestamp: new Date(),
      trainsets: [
        {
          id: 'TS-01',
          maintenanceStatus: 'DUE',
          lastService: '2024-01-15',
          nextService: '2024-02-15',
          mileage: 125000,
          operationalHours: 8760,
          defects: []
        },
        {
          id: 'TS-02',
          maintenanceStatus: 'COMPLETED',
          lastService: '2024-02-01',
          nextService: '2024-03-01',
          mileage: 98000,
          operationalHours: 6840,
          defects: ['MINOR_BRAKE_WEAR']
        }
      ],
      workOrders: [
        {
          id: 'WO-2024-001',
          trainsetId: 'TS-01',
          type: 'SCHEDULED',
          priority: 'MEDIUM',
          estimatedHours: 4,
          requiredBay: 'MNT-1'
        }
      ]
    };
  }

  /**
   * Fetch IoT sensor data
   */
  private async fetchIoTData(source: DataSource): Promise<any> {
    // Simulate IoT sensor readings
    const sensorType = source.id.split('_')[1];
    
    if (sensorType === 'TRAINSET') {
      return {
        timestamp: new Date(),
        trainsetId: 'TS-' + Math.floor(Math.random() * 25 + 1).toString().padStart(2, '0'),
        sensors: {
          temperature: 22 + Math.random() * 10,
          vibration: 0.5 + Math.random() * 2,
          speed: Math.random() * 80,
          brakeWear: 20 + Math.random() * 60,
          pantographPressure: 4.5 + Math.random() * 1,
          hvacStatus: 'OPERATIONAL',
          doorStatus: 'CLOSED',
          energyConsumption: 150 + Math.random() * 100
        }
      };
    } else if (sensorType === 'DEPOT') {
      return {
        timestamp: new Date(),
        depotId: 'MUTTOM',
        environmental: {
          temperature: 28 + Math.random() * 5,
          humidity: 65 + Math.random() * 20,
          windSpeed: Math.random() * 20
        },
        power: {
          totalLoad: 1500 + Math.random() * 500,
          orsVoltage: 24.8 + Math.random() * 0.4,
          trsVoltage: 749 + Math.random() * 2
        },
        bayOccupancy: {
          'MNT-1': Math.random() > 0.5,
          'MNT-2': Math.random() > 0.5,
          'MNT-3': Math.random() > 0.5,
          'INS-1': Math.random() > 0.7,
          'INS-2': Math.random() > 0.7
        }
      };
    }
    
    return null;
  }

  /**
   * Fetch UNS stream data
   */
  private async fetchUNSData(source: DataSource): Promise<any> {
    // Simulate UNS stream data
    return {
      timestamp: new Date(),
      streamId: 'UNS_MAIN',
      messages: [
        {
          topic: 'trainset/status',
          payload: {
            trainsetId: 'TS-03',
            status: 'IN_SERVICE',
            location: 'ALUVA',
            nextStop: 'PULINCHODU'
          }
        },
        {
          topic: 'depot/clearance',
          payload: {
            department: 'SAFETY',
            trainsetId: 'TS-05',
            clearanceStatus: 'APPROVED',
            validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000)
          }
        },
        {
          topic: 'maintenance/alert',
          payload: {
            trainsetId: 'TS-07',
            alertType: 'PREDICTIVE',
            component: 'TRACTION_MOTOR',
            severity: 'MEDIUM',
            predictedFailure: '72_HOURS'
          }
        }
      ]
    };
  }

  /**
   * Fetch manual overrides from UI
   */
  private async fetchManualOverrides(source: DataSource): Promise<any> {
    // Check for any manual overrides from UI
    // In production, this would connect to a queue or API
    if (Math.random() > 0.95) { // Simulate occasional manual override
      return {
        timestamp: new Date(),
        override: {
          trainsetId: 'TS-10',
          field: 'inductionStatus',
          originalValue: 'STANDBY',
          overrideValue: 'IN_SERVICE',
          reason: 'Urgent service requirement',
          authorizedBy: 'Operations Manager',
          expiresAt: new Date(Date.now() + 4 * 60 * 60 * 1000)
        }
      };
    }
    return null;
  }

  /**
   * Fetch department clearances
   */
  private async fetchDepartmentClearances(source: DataSource): Promise<any> {
    const department = source.id.replace('DEPT_', '');
    
    if (Math.random() > 0.8) { // Simulate periodic clearances
      return {
        timestamp: new Date(),
        department,
        clearances: [
          {
            trainsetId: 'TS-' + Math.floor(Math.random() * 25 + 1).toString().padStart(2, '0'),
            type: department === 'SAFETY' ? 'SAFETY_CHECK' : 
                  department === 'ELECTRICAL' ? 'ELECTRICAL_TEST' : 
                  'ROLLING_STOCK_INSPECTION',
            status: Math.random() > 0.2 ? 'CLEARED' : 'PENDING',
            validFrom: new Date(),
            validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            notes: 'Routine clearance'
          }
        ]
      };
    }
    return null;
  }

  /**
   * Ingest data into the pipeline
   */
  private async ingestData(source: DataSource, rawData: any): Promise<void> {
    const startTime = Date.now();
    
    // Transform data based on source type
    const transformedData = await this.transformData(source, rawData);
    
    // Validate data
    const validationErrors = this.validateData(source, transformedData);
    
    // Create ingestion record
    const ingestedData: IngestedData = {
      sourceId: source.id,
      sourceType: source.type,
      timestamp: new Date(),
      data: transformedData,
      metadata: {
        format: source.format,
        size: JSON.stringify(rawData).length,
        processingTime: Date.now() - startTime,
        transformations: this.getAppliedTransformations(source.type),
        validationErrors
      }
    };
    
    // Add to buffer
    this.addToBuffer(ingestedData);
    
    // Update source last sync
    source.lastSync = new Date();
    
    // Emit event
    this.emit('dataIngested', {
      sourceId: source.id,
      timestamp: ingestedData.timestamp,
      recordCount: Array.isArray(transformedData) ? transformedData.length : 1
    });
  }

  /**
   * Transform data based on source type
   */
  private async transformData(source: DataSource, rawData: any): Promise<any> {
    switch (source.type) {
      case 'MAXIMO':
        return this.transformMaximoData(rawData);
      
      case 'IOT_SENSOR':
        return this.transformIoTData(rawData);
      
      case 'UNS_STREAM':
        return this.transformUNSData(rawData);
      
      case 'MANUAL_OVERRIDE':
        return this.transformManualOverride(rawData);
      
      case 'DEPARTMENT_CLEARANCE':
        return this.transformDepartmentClearance(rawData);
      
      default:
        return rawData;
    }
  }

  /**
   * Transform Maximo data to unified format
   */
  private transformMaximoData(data: any): any {
    return {
      trainsets: data.trainsets?.map((ts: any) => ({
        ...ts,
        source: 'MAXIMO',
        transformedAt: new Date(),
        maintenanceScore: this.calculateMaintenanceScore(ts)
      })),
      workOrders: data.workOrders?.map((wo: any) => ({
        ...wo,
        source: 'MAXIMO',
        transformedAt: new Date(),
        urgency: this.calculateWorkOrderUrgency(wo)
      }))
    };
  }

  /**
   * Transform IoT sensor data
   */
  private transformIoTData(data: any): any {
    if (data.trainsetId) {
      return {
        entityType: 'TRAINSET',
        entityId: data.trainsetId,
        source: 'IOT_SENSOR',
        timestamp: data.timestamp,
        metrics: {
          ...data.sensors,
          healthScore: this.calculateHealthScore(data.sensors),
          anomalies: this.detectAnomalies(data.sensors)
        }
      };
    } else if (data.depotId) {
      return {
        entityType: 'DEPOT',
        entityId: data.depotId,
        source: 'IOT_SENSOR',
        timestamp: data.timestamp,
        environmental: data.environmental,
        power: data.power,
        bayOccupancy: data.bayOccupancy
      };
    }
    return data;
  }

  /**
   * Transform UNS stream data
   */
  private transformUNSData(data: any): any {
    return data.messages?.map((msg: any) => ({
      source: 'UNS_STREAM',
      timestamp: data.timestamp,
      topic: msg.topic,
      entityType: msg.topic.split('/')[0].toUpperCase(),
      payload: msg.payload,
      processed: false
    }));
  }

  /**
   * Transform manual override data
   */
  private transformManualOverride(data: any): any {
    return {
      source: 'MANUAL_OVERRIDE',
      timestamp: data.timestamp,
      entityType: 'TRAINSET',
      entityId: data.override.trainsetId,
      override: {
        ...data.override,
        active: true,
        appliedAt: new Date()
      }
    };
  }

  /**
   * Transform department clearance data
   */
  private transformDepartmentClearance(data: any): any {
    return {
      source: 'DEPARTMENT_CLEARANCE',
      timestamp: data.timestamp,
      department: data.department,
      clearances: data.clearances?.map((c: any) => ({
        ...c,
        processed: false,
        appliedAt: new Date()
      }))
    };
  }

  /**
   * Validate ingested data
   */
  private validateData(source: DataSource, data: any): string[] {
    const errors: string[] = [];
    
    // Check for required fields based on source type
    switch (source.type) {
      case 'MAXIMO':
        if (!data.trainsets && !data.workOrders) {
          errors.push('Missing trainsets or workOrders data');
        }
        break;
      
      case 'IOT_SENSOR':
        if (!data.entityType || !data.entityId) {
          errors.push('Missing entity identification');
        }
        if (data.metrics) {
          // Check sensor value ranges
          if (data.metrics.temperature && (data.metrics.temperature < -50 || data.metrics.temperature > 100)) {
            errors.push('Temperature out of valid range');
          }
          if (data.metrics.vibration && data.metrics.vibration < 0) {
            errors.push('Invalid vibration value');
          }
        }
        break;
      
      case 'MANUAL_OVERRIDE':
        if (!data.override || !data.override.authorizedBy) {
          errors.push('Manual override missing authorization');
        }
        break;
    }
    
    return errors;
  }

  /**
   * Add data to processing buffer
   */
  private addToBuffer(data: IngestedData): void {
    this.dataBuffer.push(data);
    
    // Maintain buffer size limit
    if (this.dataBuffer.length > this.BUFFER_SIZE) {
      this.dataBuffer.shift(); // Remove oldest
    }
  }

  /**
   * Process buffered data
   */
  private async processBuffer(): Promise<void> {
    const toProcess = this.dataBuffer.filter(d => !d.data.processed);
    
    for (const data of toProcess) {
      try {
        await this.processIngestedData(data);
        data.data.processed = true;
      } catch (error) {
        console.error(`Error processing data from ${data.sourceId}:`, error);
      }
    }
    
    // Clean up processed data older than 1 hour
    const cutoffTime = Date.now() - 60 * 60 * 1000;
    this.dataBuffer = this.dataBuffer.filter(d => 
      !d.data.processed || d.timestamp.getTime() > cutoffTime
    );
  }

  /**
   * Process individual ingested data record
   */
  private async processIngestedData(data: IngestedData): Promise<void> {
    // Route to appropriate handler based on source type
    const source = this.dataSources.get(data.sourceId);
    if (!source) return;
    
    switch (source.type) {
      case 'MAXIMO':
        await this.processMaximoUpdate(data.data);
        break;
      
      case 'IOT_SENSOR':
        await this.processIoTReading(data.data);
        break;
      
      case 'UNS_STREAM':
        await this.processUNSMessage(data.data);
        break;
      
      case 'MANUAL_OVERRIDE':
        await this.applyManualOverride(data.data);
        break;
      
      case 'DEPARTMENT_CLEARANCE':
        await this.processClearance(data.data);
        break;
    }
    
    // Update metrics
    this.metrics.totalIngested++;
    const count = this.metrics.bySource.get(source.type) || 0;
    this.metrics.bySource.set(source.type, count + 1);
  }

  /**
   * Detect and resolve data conflicts
   */
  private detectAndResolveConflicts(): void {
    // Group recent data by entity
    const recentData = this.dataBuffer.filter(d => 
      Date.now() - d.timestamp.getTime() < this.CONFLICT_WINDOW
    );
    
    const entityData = new Map<string, IngestedData[]>();
    
    recentData.forEach(data => {
      const entityId = this.extractEntityId(data);
      if (entityId) {
        if (!entityData.has(entityId)) {
          entityData.set(entityId, []);
        }
        entityData.get(entityId)!.push(data);
      }
    });
    
    // Check for conflicts
    entityData.forEach((dataPoints, entityId) => {
      if (dataPoints.length > 1) {
        this.checkForConflicts(entityId, dataPoints);
      }
    });
    
    // Auto-resolve conflicts based on priority
    this.conflicts.forEach((conflict, id) => {
      if (conflict.resolution === 'PENDING') {
        this.autoResolveConflict(conflict);
      }
    });
  }

  /**
   * Check for conflicts in entity data
   */
  private checkForConflicts(entityId: string, dataPoints: IngestedData[]): void {
    const fields = new Set<string>();
    const fieldValues = new Map<string, any[]>();
    
    // Extract all fields and values
    dataPoints.forEach(dp => {
      const flatData = this.flattenObject(dp.data);
      Object.keys(flatData).forEach(field => {
        fields.add(field);
        if (!fieldValues.has(field)) {
          fieldValues.set(field, []);
        }
        fieldValues.get(field)!.push({
          value: flatData[field],
          source: dp.sourceId,
          timestamp: dp.timestamp,
          priority: this.dataSources.get(dp.sourceId)?.priority || 0
        });
      });
    });
    
    // Check each field for conflicts
    fields.forEach(field => {
      const values = fieldValues.get(field)!;
      const uniqueValues = new Set(values.map(v => JSON.stringify(v.value)));
      
      if (uniqueValues.size > 1) {
        // Conflict detected
        const conflictId = `${entityId}_${field}_${Date.now()}`;
        const conflict: DataConflict = {
          id: conflictId,
          timestamp: new Date(),
          field,
          sources: values.map(v => ({
            sourceId: v.source,
            value: v.value,
            priority: v.priority,
            timestamp: v.timestamp
          })),
          resolution: 'PENDING'
        };
        
        this.conflicts.set(conflictId, conflict);
        this.metrics.conflictsDetected++;
        
        this.emit('conflictDetected', conflict);
      }
    });
  }

  /**
   * Auto-resolve conflict based on priority and timestamp
   */
  private autoResolveConflict(conflict: DataConflict): void {
    // Sort sources by priority (highest first), then by timestamp (newest first)
    const sorted = conflict.sources.sort((a, b) => {
      if (a.priority !== b.priority) {
        return b.priority - a.priority;
      }
      return b.timestamp.getTime() - a.timestamp.getTime();
    });
    
    // Use highest priority/newest value
    conflict.resolvedValue = sorted[0].value;
    conflict.resolution = 'AUTO_PRIORITY';
    conflict.resolvedBy = 'SYSTEM';
    
    this.metrics.conflictsResolved++;
    
    this.emit('conflictResolved', {
      conflictId: conflict.id,
      resolution: conflict.resolution,
      resolvedValue: conflict.resolvedValue
    });
  }

  /**
   * Manually resolve a conflict
   */
  public resolveConflict(conflictId: string, resolvedValue: any, resolvedBy: string): void {
    const conflict = this.conflicts.get(conflictId);
    if (conflict) {
      conflict.resolvedValue = resolvedValue;
      conflict.resolution = 'MANUAL';
      conflict.resolvedBy = resolvedBy;
      
      this.metrics.conflictsResolved++;
      
      this.emit('conflictResolved', {
        conflictId,
        resolution: 'MANUAL',
        resolvedValue,
        resolvedBy
      });
    }
  }

  // Helper methods
  
  private initializeMetrics(): IngestionMetrics {
    return {
      totalIngested: 0,
      bySource: new Map(),
      averageProcessingTime: 0,
      conflictsDetected: 0,
      conflictsResolved: 0,
      errorRate: 0,
      lastUpdateTime: new Date()
    };
  }

  private getAppliedTransformations(sourceType: string): string[] {
    const transformations: string[] = [];
    
    switch (sourceType) {
      case 'MAXIMO':
        transformations.push('NORMALIZE_DATES', 'CALCULATE_SCORES', 'MAP_WORK_ORDERS');
        break;
      case 'IOT_SENSOR':
        transformations.push('UNIT_CONVERSION', 'ANOMALY_DETECTION', 'AGGREGATION');
        break;
      case 'UNS_STREAM':
        transformations.push('MESSAGE_PARSING', 'TOPIC_ROUTING', 'PAYLOAD_VALIDATION');
        break;
      case 'MANUAL_OVERRIDE':
        transformations.push('AUTHORIZATION_CHECK', 'EXPIRY_CALCULATION');
        break;
      case 'DEPARTMENT_CLEARANCE':
        transformations.push('CLEARANCE_VALIDATION', 'DEPENDENCY_CHECK');
        break;
    }
    
    return transformations;
  }

  private calculateMaintenanceScore(trainset: any): number {
    let score = 100;
    
    // Reduce score based on mileage
    if (trainset.mileage > 100000) score -= 10;
    if (trainset.mileage > 150000) score -= 15;
    
    // Reduce score based on operational hours
    if (trainset.operationalHours > 8000) score -= 10;
    if (trainset.operationalHours > 10000) score -= 15;
    
    // Reduce score for defects
    score -= trainset.defects?.length * 5 || 0;
    
    return Math.max(0, score);
  }

  private calculateWorkOrderUrgency(workOrder: any): string {
    if (workOrder.priority === 'CRITICAL') return 'IMMEDIATE';
    if (workOrder.priority === 'HIGH') return 'URGENT';
    if (workOrder.estimatedHours > 8) return 'SCHEDULED';
    return 'ROUTINE';
  }

  private calculateHealthScore(sensors: any): number {
    let score = 100;
    
    // Temperature check
    if (sensors.temperature > 30) score -= 5;
    if (sensors.temperature > 35) score -= 10;
    
    // Vibration check
    if (sensors.vibration > 1.5) score -= 10;
    if (sensors.vibration > 2.0) score -= 15;
    
    // Brake wear check
    if (sensors.brakeWear > 60) score -= 10;
    if (sensors.brakeWear > 80) score -= 20;
    
    return Math.max(0, score);
  }

  private detectAnomalies(sensors: any): string[] {
    const anomalies: string[] = [];
    
    if (sensors.temperature > 40) anomalies.push('HIGH_TEMPERATURE');
    if (sensors.vibration > 2.5) anomalies.push('EXCESSIVE_VIBRATION');
    if (sensors.brakeWear > 90) anomalies.push('CRITICAL_BRAKE_WEAR');
    if (sensors.pantographPressure < 4.0 || sensors.pantographPressure > 6.0) {
      anomalies.push('PANTOGRAPH_PRESSURE_ANOMALY');
    }
    
    return anomalies;
  }

  private extractEntityId(data: IngestedData): string | null {
    if (data.data.entityId) return data.data.entityId;
    if (data.data.trainsetId) return data.data.trainsetId;
    if (data.data.depotId) return data.data.depotId;
    return null;
  }

  private flattenObject(obj: any, prefix = ''): any {
    const flattened: any = {};
    
    Object.keys(obj).forEach(key => {
      const value = obj[key];
      const newKey = prefix ? `${prefix}.${key}` : key;
      
      if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
        Object.assign(flattened, this.flattenObject(value, newKey));
      } else {
        flattened[newKey] = value;
      }
    });
    
    return flattened;
  }

  private handleIngestionError(source: DataSource, error: any): void {
    source.errorCount++;
    
    if (source.errorCount > 5) {
      source.status = 'ERROR';
      this.emit('sourceError', {
        sourceId: source.id,
        error: error.message,
        errorCount: source.errorCount
      });
    }
    
    console.error(`Ingestion error for ${source.id}:`, error);
  }

  private updateMetrics(): void {
    // Calculate average processing time
    const processingTimes = this.dataBuffer
      .slice(-100)
      .map(d => d.metadata.processingTime);
    
    if (processingTimes.length > 0) {
      this.metrics.averageProcessingTime = 
        processingTimes.reduce((a, b) => a + b, 0) / processingTimes.length;
    }
    
    // Calculate error rate
    const totalSources = this.dataSources.size;
    const errorSources = Array.from(this.dataSources.values())
      .filter(s => s.status === 'ERROR').length;
    
    this.metrics.errorRate = totalSources > 0 ? errorSources / totalSources : 0;
    this.metrics.lastUpdateTime = new Date();
    
    this.emit('metricsUpdated', this.metrics);
  }

  // Placeholder processing methods (would be implemented with actual business logic)
  
  private async processMaximoUpdate(data: any): Promise<void> {
    console.log('Processing Maximo update:', data);
  }

  private async processIoTReading(data: any): Promise<void> {
    console.log('Processing IoT reading:', data);
  }

  private async processUNSMessage(data: any): Promise<void> {
    console.log('Processing UNS message:', data);
  }

  private async applyManualOverride(data: any): Promise<void> {
    console.log('Applying manual override:', data);
  }

  private async processClearance(data: any): Promise<void> {
    console.log('Processing clearance:', data);
  }

  /**
   * Get current ingestion status
   */
  public getStatus(): any {
    return {
      sources: Array.from(this.dataSources.values()).map(s => ({
        id: s.id,
        type: s.type,
        status: s.status,
        lastSync: s.lastSync,
        errorCount: s.errorCount
      })),
      bufferSize: this.dataBuffer.length,
      conflicts: {
        total: this.conflicts.size,
        pending: Array.from(this.conflicts.values())
          .filter(c => c.resolution === 'PENDING').length
      },
      metrics: this.metrics
    };
  }
}

// Export singleton instance
export const dataIngestionService = new HeterogeneousDataIngestionService();
