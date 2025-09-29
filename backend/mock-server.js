const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = 8001;

// Middleware
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());

// Mock data
const users = [
  {
    id: '1',
    email: 'admin@kmrl.gov.in',
    password: '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqyJirc9aA8EQ1XPnN6QfSa', // admin123!
    firstName: 'System',
    lastName: 'Administrator',
    role: 'ADMIN',
    isActive: true,
  }
];

const trainsets = [
  {
    id: '1',
    trainsetNumber: 'KMRL-001',
    manufacturer: 'Alstom',
    model: 'Metropolis',
    yearOfManufacture: 2017,
    capacity: 975,
    maxSpeed: 80.0,
    depot: 'Muttom Depot',
    currentMileage: 45230.5,
    totalMileage: 156789.2,
    status: 'IN_SERVICE',
  },
  {
    id: '2', 
    trainsetNumber: 'KMRL-002',
    manufacturer: 'Alstom',
    model: 'Metropolis',
    yearOfManufacture: 2017,
    capacity: 975,
    maxSpeed: 80.0,
    depot: 'Muttom Depot',
    currentMileage: 42156.8,
    totalMileage: 148234.6,
    status: 'AVAILABLE',
  },
  {
    id: '3',
    trainsetNumber: 'KMRL-003',
    manufacturer: 'Alstom', 
    model: 'Metropolis',
    yearOfManufacture: 2018,
    capacity: 975,
    maxSpeed: 80.0,
    depot: 'Kalamassery Depot',
    currentMileage: 38967.4,
    totalMileage: 142789.3,
    status: 'MAINTENANCE',
  }
];

const fitnessData = [
  {
    id: '1',
    trainsetId: '1',
    certificateNumber: 'FIT-KMRL-001-2024',
    issueDate: '2024-01-01',
    expiryDate: '2024-12-31',
    status: 'VALID',
    issuingAuthority: 'KMRL Technical Department',
  }
];

const jobCards = [
  {
    id: '1',
    trainsetId: '1',
    jobCardNumber: 'JC-2024-0001',
    priority: 'HIGH',
    status: 'PENDING',
    workType: 'Brake System Maintenance',
    description: 'Scheduled maintenance for brake system',
    estimatedHours: 6,
  }
];

// Auth middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.sendStatus(401);
  }

  jwt.verify(token, 'kmrl_super_secure_jwt_secret_key_2024', (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// Routes
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      database: 'connected',
      server: 'running'
    }
  });
});

// Auth routes
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    console.log('Login attempt:', { email, password });
    
    const user = users.find(u => u.email === email);
    if (!user) {
      console.log('User not found');
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // For demo purposes, accept both the hash and plain password
    const validPassword = password === 'admin123!' || await bcrypt.compare(password, user.password);
    if (!validPassword) {
      console.log('Invalid password');
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      'kmrl_super_secure_jwt_secret_key_2024',
      { expiresIn: '24h' }
    );

    const { password: _, ...userWithoutPassword } = user;
    console.log('Login successful');
    res.json({
      success: true,
      data: {
        user: userWithoutPassword,
        tokens: {
          access: token,
          refresh: 'refresh_' + token
        }
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/api/auth/me', authenticateToken, (req, res) => {
  const user = users.find(u => u.id === req.user.id);
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }
  const { password, ...userWithoutPassword } = user;
  res.json({ success: true, data: { user: userWithoutPassword } });
});

// Trainsets routes
app.get('/api/trainsets', authenticateToken, (req, res) => {
  res.json({
    success: true,
    data: {
      trainsets: trainsets,
      total: trainsets.length,
      page: 1,
      totalPages: 1
    }
  });
});

// Analytics routes
app.get('/api/analytics/dashboard', authenticateToken, (req, res) => {
  res.json({
    success: true,
    data: {
      trainsets: {
        total: 25,
        statusBreakdown: [
          { status: 'IN_SERVICE', _count: 15 },
          { status: 'AVAILABLE', _count: 8 },
          { status: 'MAINTENANCE', _count: 2 }
        ],
        availabilityRate: 92.5
      },
      schedules: {
        total: 156,
        optimizationRuns: 23
      },
      jobCards: {
        active: 12,
        completedThisMonth: 45
      },
      fitness: {
        complianceRate: 96.8
      }
    }
  });
});

app.get('/api/analytics/optimization', authenticateToken, (req, res) => {
  res.json({
    success: true,
    data: {
      recent: [
        {
          id: 'opt-001',
          status: 'completed',
          score: 8.7,
          createdAt: new Date().toISOString(),
          executionTime: 45000,
          trainsetIds: ['KMRL-001', 'KMRL-002']
        },
        {
          id: 'opt-002', 
          status: 'completed',
          score: 9.1,
          createdAt: new Date(Date.now() - 86400000).toISOString(),
          executionTime: 52000,
          trainsetIds: ['KMRL-003']
        }
      ],
      trends: [
        { date: new Date(Date.now() - 7*86400000).toISOString(), _avg: { score: 7.8 } },
        { date: new Date(Date.now() - 6*86400000).toISOString(), _avg: { score: 8.1 } },
        { date: new Date(Date.now() - 5*86400000).toISOString(), _avg: { score: 8.5 } },
        { date: new Date().toISOString(), _avg: { score: 8.7 } }
      ]
    }
  });
});

// Schedule routes
app.post('/api/schedule/optimize', authenticateToken, (req, res) => {
  // Simulate optimization process
  setTimeout(() => {
    res.json({
      success: true,
      data: {
        scheduleId: 'sch-' + Date.now(),
        optimizationScore: 8.9,
        trainsets: req.body.trainsets || [],
        message: 'Optimization completed successfully'
      }
    });
  }, 2000); // 2 second delay to show loading state
});

// Fitness routes
app.get('/api/fitness', authenticateToken, (req, res) => {
  res.json({
    success: true,
    data: fitnessData
  });
});

// Job cards routes  
app.get('/api/job-cards', authenticateToken, (req, res) => {
  res.json({
    success: true,
    data: jobCards
  });
});

// Catch all
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    message: `The route ${req.originalUrl} does not exist on this server`
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚄 KMRL Mock Backend Server running on port ${PORT}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  console.log(`📚 Available routes:`);
  console.log(`   POST /api/auth/login`);
  console.log(`   GET  /api/auth/me`);
  console.log(`   GET  /api/trainsets`);
  console.log(`   GET  /api/analytics/dashboard`);
  console.log(`   GET  /api/analytics/optimization`);
  console.log(`   POST /api/schedule/optimize`);
});
