// Mock Database Service for Development
// This provides in-memory data storage to avoid PostgreSQL dependency

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

interface User {
  id: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: string;
  isActive: boolean;
  permissions: string[];
  createdAt: string;
  lastLogin?: string;
}

interface Trainset {
  id: string;
  trainsetNumber: string;
  manufacturer: string;
  model: string;
  yearOfManufacture: number;
  capacity: number;
  maxSpeed: number;
  currentMileage: number;
  totalMileage: number;
  status: string;
  location?: string;
  depot: string;
  isActive: boolean;
  fitnessScore?: number;
  lastMaintenance?: string;
  nextMaintenance?: string;
}

interface Schedule {
  id: string;
  trainsetId: string;
  date: string;
  startTime: string;
  endTime: string;
  route: string;
  status: string;
  assignedOperator?: string;
}

interface FitnessCertificate {
  id: string;
  trainsetId: string;
  certificateNumber: string;
  issueDate: string;
  expiryDate: string;
  status: string;
  issuingAuthority: string;
  fitnessScore: number;
}

class MockDatabase {
  private users: Map<string, User> = new Map();
  private trainsets: Map<string, Trainset> = new Map();
  private schedules: Map<string, Schedule> = new Map();
  private fitnessCertificates: Map<string, FitnessCertificate> = new Map();
  private initialized = false;

  constructor() {
    this.initializeData();
  }

  private async initializeData() {
    if (this.initialized) return;
    // Initialize users with hashed passwords
    const hashedPassword = bcrypt.hashSync('password123', 10);
    
    const users: User[] = [
      {
        id: '1',
        email: 'admin@kmrl.com',
        password: hashedPassword,
        firstName: 'Admin',
        lastName: 'User',
        role: 'ADMIN',
        isActive: true,
        permissions: ['ALL'],
        createdAt: new Date().toISOString(),
      },
      {
        id: '2',
        email: 'supervisor@kmrl.com',
        password: hashedPassword,
        firstName: 'Supervisor',
        lastName: 'User',
        role: 'SUPERVISOR',
        isActive: true,
        permissions: ['VIEW_SCHEDULE', 'EDIT_SCHEDULE', 'VIEW_TRAINSETS'],
        createdAt: new Date().toISOString(),
      },
      {
        id: '3',
        email: 'operator@kmrl.com',
        password: hashedPassword,
        firstName: 'Operator',
        lastName: 'User',
        role: 'OPERATOR',
        isActive: true,
        permissions: ['VIEW_SCHEDULE', 'VIEW_TRAINSETS'],
        createdAt: new Date().toISOString(),
      },
      {
        id: '4',
        email: 'maintenance@kmrl.com',
        password: hashedPassword,
        firstName: 'Maintenance',
        lastName: 'Tech',
        role: 'MAINTENANCE',
        isActive: true,
        permissions: ['VIEW_TRAINSETS', 'EDIT_MAINTENANCE', 'VIEW_FITNESS'],
        createdAt: new Date().toISOString(),
      },
    ];

    users.forEach(user => this.users.set(user.email, user));

    // Initialize trainsets
    const trainsets: Trainset[] = [
      {
        id: 'ts-001',
        trainsetNumber: 'TS-001',
        manufacturer: 'Alstom',
        model: 'Metropolis',
        yearOfManufacture: 2020,
        capacity: 300,
        maxSpeed: 80,
        currentMileage: 15234,
        totalMileage: 125000,
        status: 'AVAILABLE',
        location: 'Aluva Depot',
        depot: 'Aluva',
        isActive: true,
        fitnessScore: 8.7,
        lastMaintenance: '2024-11-01',
        nextMaintenance: '2024-12-01',
      },
      {
        id: 'ts-002',
        trainsetNumber: 'TS-002',
        manufacturer: 'Alstom',
        model: 'Metropolis',
        yearOfManufacture: 2020,
        capacity: 300,
        maxSpeed: 80,
        currentMileage: 8921,
        totalMileage: 98000,
        status: 'IN_SERVICE',
        location: 'Line 1',
        depot: 'Aluva',
        isActive: true,
        fitnessScore: 9.2,
        lastMaintenance: '2024-10-15',
        nextMaintenance: '2024-11-15',
      },
      {
        id: 'ts-003',
        trainsetNumber: 'TS-003',
        manufacturer: 'Alstom',
        model: 'Metropolis',
        yearOfManufacture: 2021,
        capacity: 300,
        maxSpeed: 80,
        currentMileage: 5432,
        totalMileage: 67000,
        status: 'MAINTENANCE',
        location: 'Muttom Workshop',
        depot: 'Muttom',
        isActive: true,
        fitnessScore: 7.5,
        lastMaintenance: '2024-11-10',
        nextMaintenance: '2024-11-20',
      },
      {
        id: 'ts-004',
        trainsetNumber: 'TS-004',
        manufacturer: 'BEML',
        model: 'Metro',
        yearOfManufacture: 2019,
        capacity: 280,
        maxSpeed: 75,
        currentMileage: 22145,
        totalMileage: 156000,
        status: 'AVAILABLE',
        location: 'Muttom Depot',
        depot: 'Muttom',
        isActive: true,
        fitnessScore: 8.1,
        lastMaintenance: '2024-10-25',
        nextMaintenance: '2024-11-25',
      },
    ];

    trainsets.forEach(ts => this.trainsets.set(ts.id, ts));

    // Initialize schedules
    const schedules: Schedule[] = [
      {
        id: 'sch-001',
        trainsetId: 'ts-001',
        date: new Date().toISOString().split('T')[0],
        startTime: '06:00',
        endTime: '10:00',
        route: 'Aluva - Palarivattom',
        status: 'SCHEDULED',
        assignedOperator: 'operator@kmrl.com',
      },
      {
        id: 'sch-002',
        trainsetId: 'ts-002',
        date: new Date().toISOString().split('T')[0],
        startTime: '10:30',
        endTime: '14:30',
        route: 'Palarivattom - Aluva',
        status: 'IN_PROGRESS',
        assignedOperator: 'operator@kmrl.com',
      },
    ];

    schedules.forEach(sch => this.schedules.set(sch.id, sch));

    // Initialize fitness certificates
    const certificates: FitnessCertificate[] = [
      {
        id: 'fc-001',
        trainsetId: 'ts-001',
        certificateNumber: 'FC-2024-001',
        issueDate: '2024-10-01',
        expiryDate: '2025-10-01',
        status: 'VALID',
        issuingAuthority: 'KMRL Safety Division',
        fitnessScore: 8.7,
      },
      {
        id: 'fc-002',
        trainsetId: 'ts-002',
        certificateNumber: 'FC-2024-002',
        issueDate: '2024-09-15',
        expiryDate: '2025-09-15',
        status: 'VALID',
        issuingAuthority: 'KMRL Safety Division',
        fitnessScore: 9.2,
      },
    ];

    certificates.forEach(cert => this.fitnessCertificates.set(cert.id, cert));
    this.initialized = true;
  }

  // User methods
  async getUserByEmail(email: string): Promise<User | undefined> {
    return this.users.get(email);
  }

  async getUserById(id: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(u => u.id === id);
  }

  async updateUserLogin(email: string): Promise<void> {
    const user = this.users.get(email);
    if (user) {
      user.lastLogin = new Date().toISOString();
    }
  }

  // Trainset methods
  async getAllTrainsets(): Promise<Trainset[]> {
    return Array.from(this.trainsets.values());
  }

  async getTrainsetById(id: string): Promise<Trainset | undefined> {
    return this.trainsets.get(id);
  }

  async updateTrainset(id: string, data: Partial<Trainset>): Promise<Trainset | undefined> {
    const trainset = this.trainsets.get(id);
    if (trainset) {
      Object.assign(trainset, data);
      return trainset;
    }
    return undefined;
  }

  // Schedule methods
  async getAllSchedules(): Promise<Schedule[]> {
    return Array.from(this.schedules.values());
  }

  async getScheduleById(id: string): Promise<Schedule | undefined> {
    return this.schedules.get(id);
  }

  async createSchedule(schedule: Omit<Schedule, 'id'>): Promise<Schedule> {
    const id = 'sch-' + Date.now();
    const newSchedule = { ...schedule, id };
    this.schedules.set(id, newSchedule);
    return newSchedule;
  }

  // Fitness methods
  async getAllFitnessCertificates(): Promise<FitnessCertificate[]> {
    return Array.from(this.fitnessCertificates.values());
  }

  async getFitnessByTrainsetId(trainsetId: string): Promise<FitnessCertificate | undefined> {
    return Array.from(this.fitnessCertificates.values()).find(fc => fc.trainsetId === trainsetId);
  }

  // Dashboard stats
  async getDashboardStats() {
    const trainsets = await this.getAllTrainsets();
    const schedules = await this.getAllSchedules();
    const certificates = await this.getAllFitnessCertificates();

    return {
      totalTrainsets: trainsets.length,
      activeTrainsets: trainsets.filter(t => t.status === 'IN_SERVICE').length,
      maintenanceTrainsets: trainsets.filter(t => t.status === 'MAINTENANCE').length,
      averageFitnessScore: certificates.reduce((acc, c) => acc + c.fitnessScore, 0) / certificates.length || 0,
      todaySchedules: schedules.filter(s => s.date === new Date().toISOString().split('T')[0]).length,
      activeSessions: schedules.filter(s => s.status === 'IN_PROGRESS').length,
    };
  }
}

// Export singleton instance
export const mockDb = new MockDatabase();

// Auth helper functions
export async function authenticateUser(email: string, password: string): Promise<User | null> {
  const user = await mockDb.getUserByEmail(email);
  if (!user) return null;

  const isValid = await bcrypt.compare(password, user.password);
  if (!isValid) return null;

  await mockDb.updateUserLogin(email);
  return user;
}

export function generateTokens(user: User) {
  const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key-change-in-production';
  const REFRESH_SECRET = process.env.REFRESH_TOKEN_SECRET || 'dev-refresh-secret-key';

  const payload = {
    id: user.id,
    email: user.email,
    role: user.role,
  };

  const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
  const refreshToken = jwt.sign(payload, REFRESH_SECRET, { expiresIn: '7d' });

  return { access: accessToken, refresh: refreshToken };
}

export function verifyToken(token: string): any {
  const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key-change-in-production';
  return jwt.verify(token, JWT_SECRET);
}
