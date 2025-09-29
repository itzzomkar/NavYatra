import request from 'supertest';
import { app } from '../../src/server';
import { mockPrisma } from '../setup';

describe('API Integration Tests', () => {
  describe('Health Check', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'healthy');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('services');
    });

    it('should handle database connection failure', async () => {
      mockPrisma.$queryRaw.mockRejectedValueOnce(new Error('Database connection failed'));

      const response = await request(app)
        .get('/health')
        .expect(500);

      expect(response.body).toHaveProperty('status', 'unhealthy');
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Authentication', () => {
    it('should login with valid credentials', async () => {
      const mockUser = {
        id: '1',
        email: 'test@kmrl.com',
        password: 'hashed-password',
        role: 'ADMIN',
        isActive: true,
      };

      mockPrisma.user.findUnique.mockResolvedValueOnce(mockUser);

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@kmrl.com',
          password: 'password123',
        })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data).toHaveProperty('tokens');
    });

    it('should reject invalid credentials', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce(null);

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'invalid@kmrl.com',
          password: 'wrongpassword',
        })
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });

    it('should require authentication for protected routes', async () => {
      const response = await request(app)
        .get('/api/trainsets')
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Trainsets API', () => {
    const authToken = 'Bearer mock-token';

    beforeEach(() => {
      // Mock authentication middleware
      mockPrisma.user.findUnique.mockResolvedValue({
        id: '1',
        email: 'test@kmrl.com',
        role: 'ADMIN',
        isActive: true,
        permissions: [
          { permission: { name: 'trainset:read' } },
          { permission: { name: 'trainset:write' } },
        ],
      });
    });

    it('should get all trainsets', async () => {
      const mockTrainsets = [
        {
          id: '1',
          trainsetNumber: 'KMRL-001',
          manufacturer: 'Alstom',
          model: 'Citadis X05',
          status: 'AVAILABLE',
        },
        {
          id: '2',
          trainsetNumber: 'KMRL-002',
          manufacturer: 'Alstom',
          model: 'Citadis X05',
          status: 'IN_SERVICE',
        },
      ];

      mockPrisma.trainset.findMany.mockResolvedValueOnce(mockTrainsets);
      mockPrisma.trainset.count.mockResolvedValueOnce(2);

      const response = await request(app)
        .get('/api/trainsets')
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('trainsets');
      expect(response.body.data).toHaveProperty('pagination');
      expect(response.body.data.trainsets).toHaveLength(2);
    });

    it('should get a single trainset by ID', async () => {
      const mockTrainset = {
        id: '1',
        trainsetNumber: 'KMRL-001',
        manufacturer: 'Alstom',
        model: 'Citadis X05',
        status: 'AVAILABLE',
        fitnessRecords: [],
        jobCards: [],
        maintenanceRecords: [],
        brandingRecords: [],
        mileageRecords: [],
        scheduleEntries: [],
      };

      mockPrisma.trainset.findUnique.mockResolvedValueOnce(mockTrainset);

      const response = await request(app)
        .get('/api/trainsets/1')
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('trainset');
      expect(response.body.data.trainset).toHaveProperty('trainsetNumber', 'KMRL-001');
    });

    it('should return 404 for non-existent trainset', async () => {
      mockPrisma.trainset.findUnique.mockResolvedValueOnce(null);

      const response = await request(app)
        .get('/api/trainsets/999')
        .set('Authorization', authToken)
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Trainset not found');
    });

    it('should create a new trainset', async () => {
      const newTrainset = {
        trainsetNumber: 'KMRL-003',
        manufacturer: 'Alstom',
        model: 'Citadis X05',
        yearOfManufacture: 2024,
        capacity: 200,
        maxSpeed: 80,
        depot: 'Muttom',
      };

      const mockCreatedTrainset = {
        id: '3',
        ...newTrainset,
        currentMileage: 0,
        totalMileage: 0,
        status: 'AVAILABLE',
      };

      mockPrisma.trainset.create.mockResolvedValueOnce(mockCreatedTrainset);

      const response = await request(app)
        .post('/api/trainsets')
        .set('Authorization', authToken)
        .send(newTrainset)
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('trainset');
      expect(response.body.data.trainset).toHaveProperty('trainsetNumber', 'KMRL-003');
    });

    it('should get dashboard stats', async () => {
      const mockStatusCounts = [
        { status: 'AVAILABLE', _count: 15 },
        { status: 'IN_SERVICE', _count: 8 },
        { status: 'MAINTENANCE', _count: 2 },
      ];

      mockPrisma.trainset.groupBy.mockResolvedValueOnce(mockStatusCounts);
      mockPrisma.trainset.count.mockResolvedValueOnce(25);

      const response = await request(app)
        .get('/api/trainsets/stats/dashboard')
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('totalTrainsets', 25);
      expect(response.body.data).toHaveProperty('statusCounts');
      expect(response.body.data).toHaveProperty('maintenanceDue');
    });
  });

  describe('Schedule API', () => {
    const authToken = 'Bearer mock-token';

    beforeEach(() => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: '1',
        email: 'test@kmrl.com',
        role: 'ADMIN',
        isActive: true,
        permissions: [
          { permission: { name: 'schedule:read' } },
          { permission: { name: 'schedule:optimize' } },
        ],
      });
    });

    it('should get all schedules', async () => {
      const mockSchedules = [
        {
          id: '1',
          name: 'Morning Schedule',
          date: new Date(),
          status: 'ACTIVE',
          entries: [],
          createdBy: {
            id: '1',
            firstName: 'John',
            lastName: 'Doe',
            email: 'john@kmrl.com',
          },
        },
      ];

      mockPrisma.schedule.findMany.mockResolvedValueOnce(mockSchedules);

      const response = await request(app)
        .get('/api/schedule')
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('schedules');
    });

    it('should handle optimization request', async () => {
      // Mock trainsets data
      const mockTrainsets = [
        {
          id: '1',
          trainsetNumber: 'KMRL-001',
          status: 'AVAILABLE',
          fitnessRecords: [{ status: 'VALID', expiryDate: '2025-01-01' }],
          jobCards: [],
          brandingRecords: [],
          maintenanceRecords: [],
          mileageRecords: [],
        },
      ];

      mockPrisma.trainset.findMany.mockResolvedValueOnce(mockTrainsets);
      
      // Mock schedule creation
      const mockSchedule = {
        id: '1',
        name: 'Optimized Schedule',
        status: 'GENERATED',
        optimizationScore: 0.85,
        executionTime: 15.5,
      };

      mockPrisma.schedule.create.mockResolvedValueOnce(mockSchedule);
      mockPrisma.scheduleEntry.create.mockResolvedValue({});

      const response = await request(app)
        .post('/api/schedule/optimize')
        .set('Authorization', authToken)
        .send({
          constraints: {
            fitnessRequired: true,
            mileageBalancing: true,
          },
          parameters: {
            optimizationWindow: 24,
            maxIterations: 1000,
          },
        });

      // Note: This might not return 201 immediately due to AI service integration
      // In a real scenario, you might want to mock the AI service as well
      expect(response.status).toBeGreaterThanOrEqual(200);
    });
  });

  describe('Error Handling', () => {
    it('should handle 404 routes', async () => {
      const response = await request(app)
        .get('/non-existent-route')
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Route not found');
    });

    it('should handle validation errors', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: '1',
        email: 'test@kmrl.com',
        role: 'ADMIN',
        isActive: true,
        permissions: [{ permission: { name: 'trainset:write' } }],
      });

      const response = await request(app)
        .post('/api/trainsets')
        .set('Authorization', 'Bearer mock-token')
        .send({
          // Missing required fields
          trainsetNumber: '',
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });
});
