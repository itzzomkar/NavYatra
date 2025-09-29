require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const connectDB = require('../config/database');
const authRoutes = require('../routes/authRoutes');
const userRoutes = require('../routes/userRoutes');
const aiRoutes = require('../routes/aiRoutes');

// Initialize Express app
const app = express();

// Connect to database
connectDB();

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://yourdomain.com'] // Replace with your actual domain
    : ['http://localhost:3000', 'http://localhost:3001'], // Development origins
  credentials: true,
}));

// Rate limiting
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(generalLimiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/ai', aiRoutes);

// Import authentication middleware
const { authenticate } = require('../middleware/auth');

// KMRL System routes
const trainsetRoutes = require('../routes/trainsetRoutes');
const statusRoutes = require('../routes/statusRoutes');
const scheduleRoutes = require('../routes/scheduleRoutes');
const optimizationRoutes = require('../routes/optimizationRoutes');
const optimizationAnalyticsRoutes = require('../routes/optimizationAnalytics');
const realTimeEngineRoutes = require('../routes/realTimeEngine');
const aiServiceRoutes = require('../routes/aiService');
const analyticsRoutes = require('../routes/analytics');
const fitnessRoutes = require('../routes/fitnessRoutes');
const dashboardRoutes = require('../routes/dashboardRoutes');
const reportRoutes = require('../routes/reportRoutes');

// Protected KMRL system routes - require authentication
app.use('/api/trainsets', authenticate, trainsetRoutes);
app.use('/api/status-updater', authenticate, statusRoutes);
app.use('/api/schedules', authenticate, scheduleRoutes);
app.use('/api/optimizations', authenticate, optimizationRoutes);
app.use('/api/optimizations/analytics', authenticate, optimizationAnalyticsRoutes);
app.use('/api/real-time-engine', authenticate, realTimeEngineRoutes);
app.use('/api/ai-service', authenticate, aiServiceRoutes);
app.use('/api/analytics', authenticate, analyticsRoutes);
app.use('/api/fitness', authenticate, fitnessRoutes);
app.use('/api/dashboard', authenticate, dashboardRoutes);
app.use('/api/reports', authenticate, reportRoutes);

// Import and start status updater service
const statusUpdater = require('../services/statusUpdater');
// Import real-time optimization engine
const realTimeOptimizationEngine = require('../services/realTimeOptimizationEngine');
// Import AI optimization service
const aiOptimizationService = require('../services/aiOptimizationService');

// Start the automatic status updater when server starts
setTimeout(() => {
  statusUpdater.start();
  console.log('🤖 Automatic status updater service initialized');
}, 5000); // Start after 5 seconds to ensure DB connection

// Start the real-time optimization engine
setTimeout(async () => {
  try {
    await realTimeOptimizationEngine.start();
    console.log('🧠 Real-time optimization engine started successfully');
  } catch (error) {
    console.error('❌ Failed to start real-time optimization engine:', error.message);
    console.log('⚠️ Real-time optimization engine can be started manually via API');
  }
}, 10000); // Start after 10 seconds to ensure all services are ready

// Initialize AI optimization service
setTimeout(async () => {
  try {
    await aiOptimizationService.initialize();
    console.log('🤖 AI optimization service initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize AI optimization service:', error.message);
    console.log('⚠️ AI service can be initialized manually via API');
  }
}, 15000); // Start after 15 seconds to ensure database and other services are ready

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is running properly',
    timestamp: new Date().toISOString(),
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Backend Authentication System API',
    version: '1.0.0',
    endpoints: {
      auth: {
        signup: 'POST /api/auth/signup',
        login: 'POST /api/auth/login',
        logout: 'POST /api/auth/logout',
      },
      user: {
        profile: 'GET /api/user/profile',
        updateProfile: 'PUT /api/user/profile',
        updateEmail: 'PUT /api/user/email',
        deleteAccount: 'DELETE /api/user/account',
        getAllUsers: 'GET /api/user/all (admin only)',
      },
      health: 'GET /api/health',
    },
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  
  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({
      success: false,
      message: 'Validation Error',
      errors,
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid token',
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Token expired',
    });
  }

  // MongoDB duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0];
    return res.status(400).json({
      success: false,
      message: `${field.charAt(0).toUpperCase() + field.slice(1)} already exists`,
    });
  }

  // Default error
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'Internal server error',
  });
});

// Start server
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`
🚀 Server is running on port ${PORT}
📁 Environment: ${process.env.NODE_ENV || 'development'}
🌐 API Base URL: http://localhost:${PORT}
🔐 Database: ${process.env.MONGODB_URI || 'Not configured'}
  `);
});

// Initialize WebSocket service
const websocketService = require('../services/websocketService');
websocketService.initialize(server);

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  try {
    await realTimeOptimizationEngine.stop();
    console.log('Real-time optimization engine stopped');
  } catch (error) {
    console.error('Error stopping real-time optimization engine:', error.message);
  }
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully');
  try {
    await realTimeOptimizationEngine.stop();
    console.log('Real-time optimization engine stopped');
  } catch (error) {
    console.error('Error stopping real-time optimization engine:', error.message);
  }
  process.exit(0);
});

module.exports = app;