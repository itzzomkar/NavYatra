import express from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import dotenv from 'dotenv';

// Mock Routes
import authMockRoutes from './routes/authMock';
import trainsetMockRoutes from './routes/trainsetsMock';
import optimizationMockRoutes from './routes/optimizationMock';
import advancedOptimizationRoutes from './routes/advancedOptimization';
import whatIfSimulatorRoutes from './routes/whatIfSimulator';

// Services
import { dataIngestionService } from './services/dataIngestion';
import { whatsappService } from './services/whatsappService';

dotenv.config();

const app = express();
const server = http.createServer(app);

// Middleware
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: false,
}));

app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(compression());
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      database: 'mock',
      redis: 'not-required',
      server: 'running'
    }
  });
});

// API Routes with mock data
app.use('/api/auth', authMockRoutes);
app.use('/api/trainsets', trainsetMockRoutes);
app.use('/api/optimization', optimizationMockRoutes);
app.use('/api/advanced', advancedOptimizationRoutes);
app.use('/api/whatif', whatIfSimulatorRoutes);

// Mock routes for other endpoints
app.get('/api/schedule', (req, res) => {
  res.json({
    success: true,
    data: [
      {
        id: 'sch-001',
        trainsetId: 'ts-001',
        date: new Date().toISOString().split('T')[0],
        startTime: '06:00',
        endTime: '10:00',
        route: 'Aluva - Palarivattom',
        status: 'SCHEDULED',
      },
      {
        id: 'sch-002',
        trainsetId: 'ts-002',
        date: new Date().toISOString().split('T')[0],
        startTime: '10:30',
        endTime: '14:30',
        route: 'Palarivattom - Aluva',
        status: 'IN_PROGRESS',
      },
    ]
  });
});

app.get('/api/fitness', (req, res) => {
  res.json({
    success: true,
    data: [
      {
        id: 'fc-001',
        trainsetId: 'ts-001',
        certificateNumber: 'FC-2024-001',
        issueDate: '2024-10-01',
        expiryDate: '2025-10-01',
        status: 'VALID',
        fitnessScore: 8.7,
      },
      {
        id: 'fc-002',
        trainsetId: 'ts-002',
        certificateNumber: 'FC-2024-002',
        issueDate: '2024-09-15',
        expiryDate: '2025-09-15',
        status: 'VALID',
        fitnessScore: 9.2,
      },
    ]
  });
});

app.get('/api/job-cards', (req, res) => {
  res.json({
    success: true,
    data: [
      {
        id: 'jc-001',
        trainsetId: 'ts-003',
        jobCardNumber: 'JC-2024-001',
        priority: 'HIGH',
        status: 'IN_PROGRESS',
        workType: 'Brake System Maintenance',
        description: 'Regular brake system check and pad replacement',
        estimatedHours: 4,
        actualHours: 3.5,
        scheduledDate: '2024-11-10',
      }
    ]
  });
});

// API documentation
app.get('/api', (req, res) => {
  res.json({
    name: 'KMRL Train Induction System API (Mock)',
    version: '1.0.0',
    description: 'Mock API for development without database dependencies',
    endpoints: {
      health: '/health',
      auth: '/api/auth',
      trainsets: '/api/trainsets',
      schedule: '/api/schedule',
      fitness: '/api/fitness',
      jobCards: '/api/job-cards',
    },
    mockCredentials: [
      { email: 'admin@kmrl.com', password: 'password123', role: 'ADMIN' },
      { email: 'supervisor@kmrl.com', password: 'password123', role: 'SUPERVISOR' },
      { email: 'operator@kmrl.com', password: 'password123', role: 'OPERATOR' },
      { email: 'maintenance@kmrl.com', password: 'password123', role: 'MAINTENANCE' },
    ]
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    message: `The route ${req.originalUrl} does not exist on this server`,
    availableRoutes: ['/api', '/health']
  });
});

// Global error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal server error',
  });
});

const PORT = process.env.PORT || 3001;

// Start server
server.listen(PORT, () => {
  console.log(`🚄 KMRL Mock Backend Server running on port ${PORT}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  console.log(`📚 API docs: http://localhost:${PORT}/api`);
  console.log(`✅ Mock API ready - No database required!`);
  
  // Start data ingestion service
  dataIngestionService.start();
  console.log(`📡 Real-time data ingestion service started`);
  console.log(`🤖 Advanced AI optimization engine ready`);
  
  // Initialize WhatsApp service
  whatsappService.on('connected', () => {
    console.log(`📱 WhatsApp Business API connected`);
  });
  
  // Send daily summary at startup (for demo)
  setTimeout(() => {
    whatsappService.sendDailySummary({
      punctuality: 99.5,
      availability: 92,
      maintenanceCompleted: 3,
      energyConsumed: 4500
    });
  }, 3000);
  
  console.log(`\n📧 Test credentials:`);
  console.log(`   admin@kmrl.com / password123`);
  console.log(`   supervisor@kmrl.com / password123`);
  console.log(`   operator@kmrl.com / password123`);
  console.log(`   maintenance@kmrl.com / password123`);
});

export { app, server };
