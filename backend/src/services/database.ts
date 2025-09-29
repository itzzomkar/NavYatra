/**
 * Persistent Database Service
 * Provides real data storage and retrieval using JSON files
 * All data is permanently stored and survives server restarts
 */

import * as fs from 'fs';
import * as path from 'path';
import { EventEmitter } from 'events';

// Database file paths
const DB_DIR = path.join(__dirname, '../../data');
const TRAINSETS_DB = path.join(DB_DIR, 'trainsets.json');
const MAINTENANCE_DB = path.join(DB_DIR, 'maintenance.json');
const SCHEDULES_DB = path.join(DB_DIR, 'schedules.json');
const DEPOT_DB = path.join(DB_DIR, 'depot.json');
const ALERTS_DB = path.join(DB_DIR, 'alerts.json');
const ENERGY_DB = path.join(DB_DIR, 'energy.json');
const CREW_DB = path.join(DB_DIR, 'crew.json');
const AUDIT_DB = path.join(DB_DIR, 'audit.json');

// Interfaces for data models
export interface Trainset {
  id: string;
  name: string;
  status: 'IN_SERVICE' | 'STANDBY' | 'MAINTENANCE' | 'OUT_OF_SERVICE';
  currentLocation: string;
  lastMaintenance: Date;
  nextMaintenance: Date;
  mileage: number;
  operationalHours: number;
  healthScore: number;
  subsystems: {
    propulsion: number;
    braking: number;
    doors: number;
    hvac: number;
    electrical: number;
    communication: number;
  };
  currentSpeed: number;
  energyConsumption: number;
  passengerLoad: number;
  defects: string[];
  assignedCrew?: string[];
}

export interface MaintenanceRecord {
  id: string;
  trainsetId: string;
  type: 'SCHEDULED' | 'CORRECTIVE' | 'PREDICTIVE' | 'EMERGENCY';
  status: 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  scheduledDate: Date;
  actualDate?: Date;
  duration: number; // hours
  bay: string;
  workOrder: string;
  description: string;
  partsUsed: Array<{ partNumber: string; quantity: number; cost: number }>;
  laborHours: number;
  cost: number;
  technicians: string[];
  clearances: {
    safety: boolean;
    electrical: boolean;
    mechanical: boolean;
  };
}

export interface Schedule {
  id: string;
  trainsetId: string;
  date: Date;
  departureTime: string;
  arrivalTime: string;
  route: string;
  status: 'SCHEDULED' | 'ACTIVE' | 'COMPLETED' | 'DELAYED' | 'CANCELLED';
  actualDeparture?: string;
  actualArrival?: string;
  delayMinutes: number;
  passengerCount: number;
  energyUsed: number;
}

export interface DepotBay {
  id: string;
  name: string;
  type: 'STABLING' | 'MAINTENANCE' | 'INSPECTION' | 'CLEANING' | 'WASHING';
  track: string;
  position: number;
  occupied: boolean;
  trainsetId?: string;
  available: boolean;
  equipment: string[];
  capacity: number;
  powerAvailable: boolean;
}

export interface Alert {
  id: string;
  timestamp: Date;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  type: 'MAINTENANCE' | 'SAFETY' | 'OPERATIONAL' | 'SYSTEM';
  source: string;
  trainsetId?: string;
  title: string;
  description: string;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
  resolved: boolean;
  resolvedBy?: string;
  resolvedAt?: Date;
  actions: string[];
}

export interface EnergyData {
  id: string;
  timestamp: Date;
  totalConsumption: number; // kWh
  peakDemand: number; // kW
  regenerativeEnergy: number; // kWh
  substations: Array<{
    id: string;
    name: string;
    load: number;
    voltage: number;
    status: 'NORMAL' | 'WARNING' | 'CRITICAL';
  }>;
  trainsetConsumption: Array<{
    trainsetId: string;
    consumption: number;
    regenerated: number;
  }>;
  cost: number;
}

export interface CrewMember {
  id: string;
  name: string;
  role: 'DRIVER' | 'ASSISTANT_DRIVER' | 'GUARD' | 'TECHNICIAN';
  status: 'AVAILABLE' | 'ON_DUTY' | 'OFF_DUTY' | 'ON_LEAVE';
  currentAssignment?: string;
  shiftStart: string;
  shiftEnd: string;
  hoursWorked: number;
  certifications: string[];
  phone: string;
  email: string;
}

export interface AuditLog {
  id: string;
  timestamp: Date;
  userId: string;
  action: string;
  entity: string;
  entityId: string;
  oldValue?: any;
  newValue?: any;
  ipAddress?: string;
  userAgent?: string;
}

class DatabaseService extends EventEmitter {
  private initialized = false;

  constructor() {
    super();
    this.initialize();
  }

  /**
   * Initialize database with default data if files don't exist
   */
  private async initialize(): Promise<void> {
    // Create data directory if it doesn't exist
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }

    // Initialize trainsets database
    if (!fs.existsSync(TRAINSETS_DB)) {
      const trainsets = this.generateInitialTrainsets();
      this.saveToFile(TRAINSETS_DB, trainsets);
    }

    // Initialize maintenance database
    if (!fs.existsSync(MAINTENANCE_DB)) {
      const maintenance = this.generateInitialMaintenance();
      this.saveToFile(MAINTENANCE_DB, maintenance);
    }

    // Initialize schedules database
    if (!fs.existsSync(SCHEDULES_DB)) {
      const schedules = this.generateInitialSchedules();
      this.saveToFile(SCHEDULES_DB, schedules);
    }

    // Initialize depot database
    if (!fs.existsSync(DEPOT_DB)) {
      const depot = this.generateInitialDepot();
      this.saveToFile(DEPOT_DB, depot);
    }

    // Initialize alerts database
    if (!fs.existsSync(ALERTS_DB)) {
      this.saveToFile(ALERTS_DB, []);
    }

    // Initialize energy database
    if (!fs.existsSync(ENERGY_DB)) {
      const energy = this.generateInitialEnergy();
      this.saveToFile(ENERGY_DB, energy);
    }

    // Initialize crew database
    if (!fs.existsSync(CREW_DB)) {
      const crew = this.generateInitialCrew();
      this.saveToFile(CREW_DB, crew);
    }

    // Initialize audit database
    if (!fs.existsSync(AUDIT_DB)) {
      this.saveToFile(AUDIT_DB, []);
    }

    this.initialized = true;
    console.log('Database initialized successfully');
  }

  /**
   * Generate initial trainset data (25 trainsets as per Kochi Metro fleet)
   */
  private generateInitialTrainsets(): Trainset[] {
    const trainsets: Trainset[] = [];
    const stations = ['ALUVA', 'PULINCHODU', 'COMPANYPADY', 'AMBATTUKAVU', 'MUTTOM', 'KALAMASSERY', 'CUSAT', 
                      'PATHADIPALAM', 'EDAPALLY', 'CHANGAMPUZHA', 'PALARIVATTOM', 'JLN_STADIUM', 'KALOOR', 
                      'LISSIE', 'MG_ROAD', 'MAHARAJAS', 'ERNAKULAM_SOUTH', 'KADAVANTHRA', 'ELAMKULAM', 
                      'VYTTILA', 'THAIKOODAM', 'PETTAH', 'VADAKKEKOTTA', 'SN_JUNCTION'];

    for (let i = 1; i <= 25; i++) {
      const trainsetId = `KM${String(i).padStart(2, '0')}`;
      const status = i <= 18 ? 'IN_SERVICE' : i <= 22 ? 'STANDBY' : 'MAINTENANCE';
      const healthScore = 70 + Math.floor(Math.random() * 25);
      
      trainsets.push({
        id: trainsetId,
        name: `Kochi Metro Unit ${i}`,
        status: status as any,
        currentLocation: status === 'IN_SERVICE' ? stations[Math.floor(Math.random() * stations.length)] : 'MUTTOM_DEPOT',
        lastMaintenance: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
        nextMaintenance: new Date(Date.now() + Math.random() * 30 * 24 * 60 * 60 * 1000),
        mileage: 50000 + Math.floor(Math.random() * 100000),
        operationalHours: 5000 + Math.floor(Math.random() * 10000),
        healthScore,
        subsystems: {
          propulsion: 85 + Math.floor(Math.random() * 15),
          braking: 80 + Math.floor(Math.random() * 20),
          doors: 90 + Math.floor(Math.random() * 10),
          hvac: 75 + Math.floor(Math.random() * 25),
          electrical: 85 + Math.floor(Math.random() * 15),
          communication: 95 + Math.floor(Math.random() * 5)
        },
        currentSpeed: status === 'IN_SERVICE' ? Math.floor(Math.random() * 80) : 0,
        energyConsumption: status === 'IN_SERVICE' ? 150 + Math.random() * 100 : 0,
        passengerLoad: status === 'IN_SERVICE' ? Math.floor(Math.random() * 975) : 0, // Max capacity 975
        defects: healthScore < 80 ? ['MINOR_BRAKE_WEAR'] : [],
        assignedCrew: status === 'IN_SERVICE' ? [`CREW_${i}A`, `CREW_${i}B`] : undefined
      });
    }

    return trainsets;
  }

  /**
   * Generate initial maintenance records
   */
  private generateInitialMaintenance(): MaintenanceRecord[] {
    const records: MaintenanceRecord[] = [];
    const trainsetIds = Array.from({ length: 25 }, (_, i) => `KM${String(i + 1).padStart(2, '0')}`);
    
    // Generate historical maintenance records
    for (let i = 0; i < 100; i++) {
      const trainsetId = trainsetIds[Math.floor(Math.random() * trainsetIds.length)];
      const type = ['SCHEDULED', 'CORRECTIVE', 'PREDICTIVE'][Math.floor(Math.random() * 3)] as any;
      const scheduledDate = new Date(Date.now() - Math.random() * 180 * 24 * 60 * 60 * 1000);
      
      records.push({
        id: `MNT-2024-${String(i + 1).padStart(4, '0')}`,
        trainsetId,
        type,
        status: 'COMPLETED',
        scheduledDate,
        actualDate: scheduledDate,
        duration: 2 + Math.floor(Math.random() * 8),
        bay: `BAY-${Math.floor(Math.random() * 5) + 1}`,
        workOrder: `WO-2024-${String(i + 1).padStart(4, '0')}`,
        description: type === 'SCHEDULED' ? 'Routine maintenance and inspection' : 
                     type === 'CORRECTIVE' ? 'Brake system adjustment and testing' :
                     'Predictive maintenance based on sensor data',
        partsUsed: [
          { partNumber: 'BRK-PAD-001', quantity: 4, cost: 5000 },
          { partNumber: 'FLT-AIR-002', quantity: 2, cost: 500 }
        ],
        laborHours: 4 + Math.floor(Math.random() * 8),
        cost: 10000 + Math.floor(Math.random() * 50000),
        technicians: [`TECH-${Math.floor(Math.random() * 10) + 1}`, `TECH-${Math.floor(Math.random() * 10) + 11}`],
        clearances: {
          safety: true,
          electrical: true,
          mechanical: true
        }
      });
    }

    // Add upcoming maintenance
    for (let i = 0; i < 15; i++) {
      const trainsetId = trainsetIds[i];
      const scheduledDate = new Date(Date.now() + Math.random() * 30 * 24 * 60 * 60 * 1000);
      
      records.push({
        id: `MNT-2024-${String(101 + i).padStart(4, '0')}`,
        trainsetId,
        type: 'SCHEDULED',
        status: 'PLANNED',
        scheduledDate,
        duration: 4,
        bay: `BAY-${Math.floor(Math.random() * 5) + 1}`,
        workOrder: `WO-2024-${String(101 + i).padStart(4, '0')}`,
        description: 'Scheduled preventive maintenance',
        partsUsed: [],
        laborHours: 0,
        cost: 0,
        technicians: [],
        clearances: {
          safety: false,
          electrical: false,
          mechanical: false
        }
      });
    }

    return records;
  }

  /**
   * Generate initial schedules
   */
  private generateInitialSchedules(): Schedule[] {
    const schedules: Schedule[] = [];
    const trainsetIds = Array.from({ length: 18 }, (_, i) => `KM${String(i + 1).padStart(2, '0')}`);
    const routes = ['ALUVA-PETTAH', 'PETTAH-ALUVA', 'ALUVA-SN_JUNCTION', 'SN_JUNCTION-ALUVA'];
    
    // Generate today's schedules
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    for (let hour = 6; hour < 22; hour++) {
      for (let min = 0; min < 60; min += 15) {
        const trainsetId = trainsetIds[Math.floor(Math.random() * trainsetIds.length)];
        const route = routes[Math.floor(Math.random() * routes.length)];
        const departureTime = `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
        const arrivalTime = `${String(hour + 1).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
        
        schedules.push({
          id: `SCH-${today.toISOString().split('T')[0]}-${String(schedules.length + 1).padStart(4, '0')}`,
          trainsetId,
          date: new Date(today),
          departureTime,
          arrivalTime,
          route,
          status: hour < new Date().getHours() ? 'COMPLETED' : hour === new Date().getHours() ? 'ACTIVE' : 'SCHEDULED',
          actualDeparture: hour < new Date().getHours() ? departureTime : undefined,
          actualArrival: hour < new Date().getHours() ? arrivalTime : undefined,
          delayMinutes: Math.random() > 0.8 ? Math.floor(Math.random() * 10) : 0,
          passengerCount: 200 + Math.floor(Math.random() * 600),
          energyUsed: 50 + Math.random() * 50
        });
      }
    }

    return schedules;
  }

  /**
   * Generate initial depot configuration
   */
  private generateInitialDepot(): DepotBay[] {
    const bays: DepotBay[] = [];
    
    // Stabling lines (20 positions)
    for (let track = 1; track <= 4; track++) {
      for (let pos = 1; pos <= 5; pos++) {
        bays.push({
          id: `STB-T${track}-${pos}`,
          name: `Stabling Track ${track} Position ${pos}`,
          type: 'STABLING',
          track: `T${track}`,
          position: pos,
          occupied: Math.random() > 0.5,
          trainsetId: Math.random() > 0.5 ? `KM${String(Math.floor(Math.random() * 25) + 1).padStart(2, '0')}` : undefined,
          available: true,
          equipment: ['ORS_CONNECTION', 'WALKWAY'],
          capacity: 1,
          powerAvailable: true
        });
      }
    }

    // Maintenance bays (5 bays)
    for (let i = 1; i <= 5; i++) {
      bays.push({
        id: `MNT-${i}`,
        name: `Maintenance Bay ${i}`,
        type: 'MAINTENANCE',
        track: 'MAINTENANCE',
        position: i,
        occupied: i <= 2,
        trainsetId: i <= 2 ? `KM${String(22 + i).padStart(2, '0')}` : undefined,
        available: true,
        equipment: ['LIFTING_JACKS', 'INSPECTION_PIT', 'OVERHEAD_CRANE', 'TOOL_STATION'],
        capacity: 1,
        powerAvailable: true
      });
    }

    // Inspection bays (3 bays)
    for (let i = 1; i <= 3; i++) {
      bays.push({
        id: `INS-${i}`,
        name: `Inspection Bay ${i}`,
        type: 'INSPECTION',
        track: 'INSPECTION',
        position: i,
        occupied: false,
        available: true,
        equipment: ['INSPECTION_PIT', 'MEASURING_TOOLS', 'DIAGNOSTIC_EQUIPMENT'],
        capacity: 1,
        powerAvailable: true
      });
    }

    // Washing bays (2 bays)
    for (let i = 1; i <= 2; i++) {
      bays.push({
        id: `WSH-${i}`,
        name: `Washing Bay ${i}`,
        type: 'WASHING',
        track: 'WASHING',
        position: i,
        occupied: false,
        available: true,
        equipment: ['AUTOMATIC_WASHER', 'WATER_RECYCLING', 'DETERGENT_SYSTEM'],
        capacity: 1,
        powerAvailable: true
      });
    }

    return bays;
  }

  /**
   * Generate initial energy data
   */
  private generateInitialEnergy(): EnergyData[] {
    const data: EnergyData[] = [];
    const now = Date.now();
    
    // Generate last 24 hours of energy data
    for (let i = 23; i >= 0; i--) {
      const timestamp = new Date(now - i * 60 * 60 * 1000);
      const hour = timestamp.getHours();
      const isPeak = hour >= 6 && hour <= 22;
      
      data.push({
        id: `ENERGY-${timestamp.toISOString()}`,
        timestamp,
        totalConsumption: isPeak ? 2000 + Math.random() * 1000 : 500 + Math.random() * 500,
        peakDemand: isPeak ? 3000 + Math.random() * 500 : 1000 + Math.random() * 500,
        regenerativeEnergy: isPeak ? 200 + Math.random() * 100 : 50 + Math.random() * 50,
        substations: [
          {
            id: 'SS-01',
            name: 'Aluva Substation',
            load: isPeak ? 1000 + Math.random() * 500 : 300 + Math.random() * 200,
            voltage: 24.8 + Math.random() * 0.4,
            status: 'NORMAL'
          },
          {
            id: 'SS-02',
            name: 'Muttom Substation',
            load: isPeak ? 800 + Math.random() * 400 : 200 + Math.random() * 200,
            voltage: 24.9 + Math.random() * 0.2,
            status: 'NORMAL'
          },
          {
            id: 'SS-03',
            name: 'Pettah Substation',
            load: isPeak ? 900 + Math.random() * 400 : 250 + Math.random() * 150,
            voltage: 24.7 + Math.random() * 0.6,
            status: 'NORMAL'
          }
        ],
        trainsetConsumption: Array.from({ length: isPeak ? 18 : 5 }, (_, i) => ({
          trainsetId: `KM${String(i + 1).padStart(2, '0')}`,
          consumption: 100 + Math.random() * 50,
          regenerated: 10 + Math.random() * 10
        })),
        cost: (isPeak ? 2500 + Math.random() * 1000 : 800 + Math.random() * 400) * 5.5 // Rs 5.5 per unit
      });
    }

    return data;
  }

  /**
   * Generate initial crew data
   */
  private generateInitialCrew(): CrewMember[] {
    const crew: CrewMember[] = [];
    const roles = ['DRIVER', 'ASSISTANT_DRIVER', 'GUARD', 'TECHNICIAN'];
    const shifts = [
      { start: '06:00', end: '14:00' },
      { start: '14:00', end: '22:00' },
      { start: '22:00', end: '06:00' }
    ];

    for (let i = 1; i <= 100; i++) {
      const role = roles[Math.floor(Math.random() * roles.length)] as any;
      const shift = shifts[Math.floor(Math.random() * shifts.length)];
      const currentHour = new Date().getHours();
      const shiftStartHour = parseInt(shift.start.split(':')[0]);
      const shiftEndHour = parseInt(shift.end.split(':')[0]);
      const isOnDuty = shiftEndHour > shiftStartHour 
        ? currentHour >= shiftStartHour && currentHour < shiftEndHour
        : currentHour >= shiftStartHour || currentHour < shiftEndHour;

      crew.push({
        id: `CREW-${String(i).padStart(3, '0')}`,
        name: `Employee ${i}`,
        role,
        status: isOnDuty ? 'ON_DUTY' : 'OFF_DUTY',
        currentAssignment: isOnDuty && Math.random() > 0.3 ? `KM${String(Math.floor(Math.random() * 18) + 1).padStart(2, '0')}` : undefined,
        shiftStart: shift.start,
        shiftEnd: shift.end,
        hoursWorked: Math.floor(Math.random() * 160),
        certifications: role === 'DRIVER' ? ['METRO_DRIVING', 'SAFETY', 'EMERGENCY_RESPONSE'] :
                        role === 'TECHNICIAN' ? ['ELECTRICAL', 'MECHANICAL', 'SAFETY'] :
                        ['SAFETY', 'FIRST_AID'],
        phone: `+91${Math.floor(Math.random() * 9000000000) + 1000000000}`,
        email: `employee${i}@kochimetro.org`
      });
    }

    return crew;
  }

  /**
   * Save data to JSON file
   */
  private saveToFile(filePath: string, data: any): void {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  }

  /**
   * Load data from JSON file
   */
  private loadFromFile(filePath: string): any {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(data);
    }
    return null;
  }

  /**
   * Log audit entry
   */
  private logAudit(userId: string, action: string, entity: string, entityId: string, oldValue?: any, newValue?: any): void {
    const audits = this.loadFromFile(AUDIT_DB) || [];
    audits.push({
      id: `AUDIT-${Date.now()}`,
      timestamp: new Date(),
      userId,
      action,
      entity,
      entityId,
      oldValue,
      newValue
    });
    this.saveToFile(AUDIT_DB, audits);
  }

  // Public API methods

  /**
   * Get all trainsets
   */
  public getTrainsets(): Trainset[] {
    return this.loadFromFile(TRAINSETS_DB) || [];
  }

  /**
   * Get trainset by ID
   */
  public getTrainset(id: string): Trainset | null {
    const trainsets = this.getTrainsets();
    return trainsets.find(t => t.id === id) || null;
  }

  /**
   * Update trainset
   */
  public updateTrainset(id: string, updates: Partial<Trainset>, userId: string = 'SYSTEM'): boolean {
    const trainsets = this.getTrainsets();
    const index = trainsets.findIndex(t => t.id === id);
    
    if (index !== -1) {
      const oldValue = { ...trainsets[index] };
      trainsets[index] = { ...trainsets[index], ...updates };
      this.saveToFile(TRAINSETS_DB, trainsets);
      this.logAudit(userId, 'UPDATE', 'TRAINSET', id, oldValue, trainsets[index]);
      this.emit('trainsetUpdated', trainsets[index]);
      return true;
    }
    return false;
  }

  /**
   * Get maintenance records
   */
  public getMaintenanceRecords(trainsetId?: string): MaintenanceRecord[] {
    const records = this.loadFromFile(MAINTENANCE_DB) || [];
    if (trainsetId) {
      return records.filter((r: MaintenanceRecord) => r.trainsetId === trainsetId);
    }
    return records;
  }

  /**
   * Create maintenance record
   */
  public createMaintenanceRecord(record: Omit<MaintenanceRecord, 'id'>, userId: string = 'SYSTEM'): MaintenanceRecord {
    const records = this.getMaintenanceRecords();
    const newRecord: MaintenanceRecord = {
      ...record,
      id: `MNT-${Date.now()}`
    };
    records.push(newRecord);
    this.saveToFile(MAINTENANCE_DB, records);
    this.logAudit(userId, 'CREATE', 'MAINTENANCE', newRecord.id, null, newRecord);
    this.emit('maintenanceCreated', newRecord);
    return newRecord;
  }

  /**
   * Update maintenance record
   */
  public updateMaintenanceRecord(id: string, updates: Partial<MaintenanceRecord>, userId: string = 'SYSTEM'): boolean {
    const records = this.getMaintenanceRecords();
    const index = records.findIndex(r => r.id === id);
    
    if (index !== -1) {
      const oldValue = { ...records[index] };
      records[index] = { ...records[index], ...updates };
      this.saveToFile(MAINTENANCE_DB, records);
      this.logAudit(userId, 'UPDATE', 'MAINTENANCE', id, oldValue, records[index]);
      this.emit('maintenanceUpdated', records[index]);
      return true;
    }
    return false;
  }

  /**
   * Get schedules
   */
  public getSchedules(date?: Date): Schedule[] {
    const schedules = this.loadFromFile(SCHEDULES_DB) || [];
    if (date) {
      const dateStr = date.toISOString().split('T')[0];
      return schedules.filter((s: Schedule) => 
        new Date(s.date).toISOString().split('T')[0] === dateStr
      );
    }
    return schedules;
  }

  /**
   * Create schedule
   */
  public createSchedule(schedule: Omit<Schedule, 'id'>, userId: string = 'SYSTEM'): Schedule {
    const schedules = this.getSchedules();
    const newSchedule: Schedule = {
      ...schedule,
      id: `SCH-${Date.now()}`
    };
    schedules.push(newSchedule);
    this.saveToFile(SCHEDULES_DB, schedules);
    this.logAudit(userId, 'CREATE', 'SCHEDULE', newSchedule.id, null, newSchedule);
    this.emit('scheduleCreated', newSchedule);
    return newSchedule;
  }

  /**
   * Get depot bays
   */
  public getDepotBays(): DepotBay[] {
    return this.loadFromFile(DEPOT_DB) || [];
  }

  /**
   * Update depot bay
   */
  public updateDepotBay(id: string, updates: Partial<DepotBay>, userId: string = 'SYSTEM'): boolean {
    const bays = this.getDepotBays();
    const index = bays.findIndex(b => b.id === id);
    
    if (index !== -1) {
      const oldValue = { ...bays[index] };
      bays[index] = { ...bays[index], ...updates };
      this.saveToFile(DEPOT_DB, bays);
      this.logAudit(userId, 'UPDATE', 'DEPOT_BAY', id, oldValue, bays[index]);
      this.emit('depotBayUpdated', bays[index]);
      return true;
    }
    return false;
  }

  /**
   * Get alerts
   */
  public getAlerts(unacknowledgedOnly: boolean = false): Alert[] {
    const alerts = this.loadFromFile(ALERTS_DB) || [];
    if (unacknowledgedOnly) {
      return alerts.filter((a: Alert) => !a.acknowledged);
    }
    return alerts;
  }

  /**
   * Create alert
   */
  public createAlert(alert: Omit<Alert, 'id' | 'timestamp'>): Alert {
    const alerts = this.getAlerts();
    const newAlert: Alert = {
      ...alert,
      id: `ALERT-${Date.now()}`,
      timestamp: new Date()
    };
    alerts.push(newAlert);
    this.saveToFile(ALERTS_DB, alerts);
    this.emit('alertCreated', newAlert);
    
    // Send WhatsApp notification for critical alerts
    if (newAlert.severity === 'CRITICAL' || newAlert.severity === 'HIGH') {
      this.emit('criticalAlert', newAlert);
    }
    
    return newAlert;
  }

  /**
   * Acknowledge alert
   */
  public acknowledgeAlert(id: string, userId: string): boolean {
    const alerts = this.getAlerts();
    const index = alerts.findIndex(a => a.id === id);
    
    if (index !== -1) {
      alerts[index].acknowledged = true;
      alerts[index].acknowledgedBy = userId;
      alerts[index].acknowledgedAt = new Date();
      this.saveToFile(ALERTS_DB, alerts);
      this.emit('alertAcknowledged', alerts[index]);
      return true;
    }
    return false;
  }

  /**
   * Get energy data
   */
  public getEnergyData(hours: number = 24): EnergyData[] {
    const data = this.loadFromFile(ENERGY_DB) || [];
    const cutoff = Date.now() - hours * 60 * 60 * 1000;
    return data.filter((d: EnergyData) => new Date(d.timestamp).getTime() > cutoff);
  }

  /**
   * Add energy data point
   */
  public addEnergyData(data: Omit<EnergyData, 'id'>): EnergyData {
    const energyData = this.loadFromFile(ENERGY_DB) || [];
    const newData: EnergyData = {
      ...data,
      id: `ENERGY-${Date.now()}`
    };
    energyData.push(newData);
    
    // Keep only last 7 days of data
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const filtered = energyData.filter((d: EnergyData) => 
      new Date(d.timestamp).getTime() > cutoff
    );
    
    this.saveToFile(ENERGY_DB, filtered);
    this.emit('energyDataAdded', newData);
    return newData;
  }

  /**
   * Get crew members
   */
  public getCrewMembers(availableOnly: boolean = false): CrewMember[] {
    const crew = this.loadFromFile(CREW_DB) || [];
    if (availableOnly) {
      return crew.filter((c: CrewMember) => c.status === 'AVAILABLE');
    }
    return crew;
  }

  /**
   * Update crew member
   */
  public updateCrewMember(id: string, updates: Partial<CrewMember>, userId: string = 'SYSTEM'): boolean {
    const crew = this.getCrewMembers();
    const index = crew.findIndex(c => c.id === id);
    
    if (index !== -1) {
      const oldValue = { ...crew[index] };
      crew[index] = { ...crew[index], ...updates };
      this.saveToFile(CREW_DB, crew);
      this.logAudit(userId, 'UPDATE', 'CREW', id, oldValue, crew[index]);
      this.emit('crewUpdated', crew[index]);
      return true;
    }
    return false;
  }

  /**
   * Get audit logs
   */
  public getAuditLogs(entity?: string, limit: number = 100): AuditLog[] {
    const logs = this.loadFromFile(AUDIT_DB) || [];
    let filtered = logs;
    
    if (entity) {
      filtered = logs.filter((l: AuditLog) => l.entity === entity);
    }
    
    // Return most recent logs
    return filtered.slice(-limit).reverse();
  }

  /**
   * Get system statistics
   */
  public getStatistics(): any {
    const trainsets = this.getTrainsets();
    const maintenance = this.getMaintenanceRecords();
    const schedules = this.getSchedules(new Date());
    const alerts = this.getAlerts();
    const depot = this.getDepotBays();
    const crew = this.getCrewMembers();

    return {
      trainsets: {
        total: trainsets.length,
        inService: trainsets.filter(t => t.status === 'IN_SERVICE').length,
        standby: trainsets.filter(t => t.status === 'STANDBY').length,
        maintenance: trainsets.filter(t => t.status === 'MAINTENANCE').length,
        outOfService: trainsets.filter(t => t.status === 'OUT_OF_SERVICE').length,
        averageHealth: trainsets.reduce((sum, t) => sum + t.healthScore, 0) / trainsets.length
      },
      maintenance: {
        total: maintenance.length,
        planned: maintenance.filter(m => m.status === 'PLANNED').length,
        inProgress: maintenance.filter(m => m.status === 'IN_PROGRESS').length,
        completed: maintenance.filter(m => m.status === 'COMPLETED').length,
        overdue: maintenance.filter(m => 
          m.status === 'PLANNED' && new Date(m.scheduledDate) < new Date()
        ).length
      },
      schedules: {
        today: schedules.length,
        active: schedules.filter(s => s.status === 'ACTIVE').length,
        completed: schedules.filter(s => s.status === 'COMPLETED').length,
        delayed: schedules.filter(s => s.delayMinutes > 0).length,
        onTime: schedules.filter(s => s.status === 'COMPLETED' && s.delayMinutes === 0).length
      },
      alerts: {
        total: alerts.length,
        unacknowledged: alerts.filter(a => !a.acknowledged).length,
        critical: alerts.filter(a => a.severity === 'CRITICAL').length,
        high: alerts.filter(a => a.severity === 'HIGH').length
      },
      depot: {
        totalBays: depot.length,
        occupied: depot.filter(b => b.occupied).length,
        available: depot.filter(b => b.available && !b.occupied).length,
        maintenance: depot.filter(b => b.type === 'MAINTENANCE').length,
        stabling: depot.filter(b => b.type === 'STABLING').length
      },
      crew: {
        total: crew.length,
        onDuty: crew.filter(c => c.status === 'ON_DUTY').length,
        available: crew.filter(c => c.status === 'AVAILABLE').length,
        offDuty: crew.filter(c => c.status === 'OFF_DUTY').length,
        drivers: crew.filter(c => c.role === 'DRIVER').length,
        technicians: crew.filter(c => c.role === 'TECHNICIAN').length
      }
    };
  }
}

// Export singleton instance
export const database = new DatabaseService();
export default database;
