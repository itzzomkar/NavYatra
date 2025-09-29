import express from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { Server } from 'socket.io';
import dotenv from 'dotenv';

import { errorHandler } from './middleware/errorHandler';
import { authMiddleware } from './middleware/auth';
import { logger } from './utils/logger';
import { redisClient } from './utils/redis';
import { prisma } from './utils/database';

// Routes
import authRoutes from './routes/auth';
import trainsetRoutes from './routes/trainsets';
import scheduleRoutes from './routes/schedule';
import schedulesRoutes from './routes/schedules';
import fitnessRoutes from './routes/fitness';
import jobCardRoutes from './routes/jobCards';
import analyticsRoutes from './routes/analytics';
import userRoutes from './routes/users';
import whatIfSimulatorRoutes from './routes/whatIfSimulator';

// Socket handlers
import { setupSocketHandlers } from './services/socketService';

dotenv.config();

const app = express();
const server = http.createServer(app);

// Socket.IO setup with CORS
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Middleware
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(compression());
app.use(morgan('combined', { stream: { write: (message) => logger.info(message.trim()) } }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/health', async (req, res) => {
  const services: any = {
    server: 'running'
  };
  
  try {
    // Check database connection
    await prisma.$queryRaw`SELECT 1`;
    services.database = 'connected';
  } catch (error) {
    services.database = 'disconnected';
    logger.error('Database health check failed:', error);
  }
  
  try {
    // Check Redis connection (optional)
    if (redisClient.isReady) {
      services.redis = 'connected';
    } else {
      services.redis = 'disconnected';
    }
  } catch (error) {
    services.redis = 'disconnected';
  }
  
  const overallStatus = services.database === 'connected' ? 'healthy' : 'degraded';
  const statusCode = overallStatus === 'healthy' ? 200 : 503;
  
  res.status(statusCode).json({
    status: overallStatus,
    timestamp: new Date().toISOString(),
    services
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/trainsets', authMiddleware, trainsetRoutes);
app.use('/api/schedule', authMiddleware, scheduleRoutes);
app.use('/api/schedules', authMiddleware, schedulesRoutes);
app.use('/api/fitness', authMiddleware, fitnessRoutes);
app.use('/api/job-cards', authMiddleware, jobCardRoutes);
app.use('/api/analytics', authMiddleware, analyticsRoutes);
app.use('/api/users', authMiddleware, userRoutes);
app.use('/api/whatif', authMiddleware, whatIfSimulatorRoutes);

// API documentation
app.get('/api', (req, res) => {
  res.json({
    name: 'KMRL Train Induction System API',
    version: '1.0.0',
    description: 'AI-driven train scheduling and optimization system',
    endpoints: {
      health: '/health',
      auth: '/api/auth',
      trainsets: '/api/trainsets',
      schedule: '/api/schedule',
      schedules: '/api/schedules',
      fitness: '/api/fitness',
      jobCards: '/api/job-cards',
      analytics: '/api/analytics',
      users: '/api/users',
      whatIf: '/api/whatif'
    },
    documentation: '/docs'
  });
});

// Setup Socket.IO handlers
setupSocketHandlers(io);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    message: `The route ${req.originalUrl} does not exist on this server`,
    availableRoutes: ['/api', '/health']
  });
});

// Global error handler (must be last)
app.use(errorHandler);

const PORT = process.env.PORT || 3001;

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  
  server.close(() => {
    logger.info('HTTP server closed');
  });
  
  await prisma.$disconnect();
  await redisClient.disconnect();
  
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  
  server.close(() => {
    logger.info('HTTP server closed');
  });
  
  await prisma.$disconnect();
  await redisClient.disconnect();
  
  process.exit(0);
});

// Start server
server.listen(PORT, () => {
  logger.info(`🚄 KMRL Backend Server running on port ${PORT}`);
  logger.info(`🔗 Health check: http://localhost:${PORT}/health`);
  logger.info(`📚 API docs: http://localhost:${PORT}/api`);
  logger.info(`🔌 Socket.IO ready for connections`);
});

export { app, server, io };
