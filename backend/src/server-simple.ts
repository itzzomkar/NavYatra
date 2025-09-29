import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { prisma } from './utils/database';
import http from 'http';
import { Server } from 'socket.io';
import jobCardRoutes, { setSocketIO } from './routes/jobCardRoutes';
import fitnessRoutes, { setSocketIO as setFitnessSocketIO } from './routes/fitnessRoutes';
import optimizationRoutes, { setSocketIO as setOptimizationSocketIO } from './routes/optimizationRoutes';
import operationsRoutes, { setSocketIO as setOperationsSocketIO } from './routes/operationsRoutes';
import dashboardRoutes, { setSocketIO as setDashboardSocketIO } from './routes/dashboardRoutes';

const app = express();
const PORT = process.env.PORT || 3001;
const FRONTEND_ORIGIN = process.env.FRONTEND_URL || 'http://localhost:3000';

// Create HTTP server and Socket.IO
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: FRONTEND_ORIGIN,
    credentials: true
  }
});

io.on('connection', (socket) => {
  console.log('🔗 Socket connected:', socket.id);

  socket.on('subscribe:trainsets', () => socket.join('trainsets'));
  socket.on('subscribe:fitness', () => socket.join('fitness'));
  socket.on('subscribe:jobcards', () => socket.join('jobcards'));
  socket.on('subscribe:schedules', () => socket.join('schedules'));
  socket.on('subscribe:optimization', () => socket.join('optimization'));
  socket.on('subscribe:operations', () => socket.join('operations'));
  socket.on('subscribe:dashboards', () => socket.join('dashboards'));
  socket.on('subscribe:users', () => socket.join('users'));

  socket.on('ping', () => socket.emit('pong', { ts: Date.now() }));

  socket.on('disconnect', (reason) => {
    console.log('🔌 Socket disconnected:', socket.id, reason);
  });
});

// Set socket.io for real-time updates
setSocketIO(io);
setFitnessSocketIO(io);
setOptimizationSocketIO(io);
setOperationsSocketIO(io);
setDashboardSocketIO(io);

// Middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'KMRL Backend is healthy',
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: Math.round(process.uptime()),
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development'
    }
  });
});

// Trainsets endpoints (real DB)
app.get('/api/trainsets', async (req, res) => {
  try {
    const { page, limit, status, depot, search, fitnessStatus } = req.query as any;

    // Filters
    const where: any = {};
    if (status) where.status = String(status).toUpperCase();
    if (depot) where.depot = String(depot);
    if (search) {
      const q = String(search);
      where.OR = [
        { trainsetNumber: { contains: q, mode: 'insensitive' } },
        { manufacturer: { contains: q, mode: 'insensitive' } },
        { model: { contains: q, mode: 'insensitive' } }
      ];
    }

    const shouldPaginate = !!page || !!limit;
    const pageNum = Math.max(1, parseInt(page) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(limit) || 25));
    const skip = (pageNum - 1) * pageSize;

    const [items, totalItems] = await Promise.all([
      prisma.trainset.findMany({
        where,
        skip: shouldPaginate ? skip : undefined,
        take: shouldPaginate ? pageSize : undefined,
        orderBy: { createdAt: 'desc' },
        include: {
          fitnessRecords: { orderBy: { expiryDate: 'desc' }, take: 1 },
          jobCards: { orderBy: { updatedAt: 'desc' }, take: 1 }
        }
      }),
      prisma.trainset.count({ where })
    ]);

    // Compute derived fitness status if requested
    const mapped = items.map((t: any) => {
      const latestFitness = t.fitnessRecords?.[0];
      const fitnessStatusComputed = latestFitness
        ? (new Date(latestFitness.expiryDate) > new Date() ? 'VALID' : 'EXPIRED')
        : 'UNKNOWN';
      return { ...t, fitnessStatus: fitnessStatusComputed };
    });

    let filtered = mapped;
    if (fitnessStatus) {
      filtered = mapped.filter(m => m.fitnessStatus === String(fitnessStatus).toUpperCase());
    }

    if (shouldPaginate) {
      const total = fitnessStatus ? filtered.length : totalItems;
      const itemsPage = fitnessStatus ? filtered.slice(skip, skip + pageSize) : filtered;
      return res.json({
        success: true,
        message: 'Trainsets retrieved',
        data: {
          items: itemsPage,
          pagination: {
            currentPage: pageNum,
            totalPages: Math.ceil(total / pageSize) || 1,
            totalItems: total,
            itemsPerPage: pageSize,
            hasNextPage: pageNum * pageSize < total,
            hasPreviousPage: pageNum > 1
          }
        }
      });
    }

    return res.json({ success: true, message: 'Trainsets retrieved', data: mapped });
  } catch (error) {
    console.error('Error fetching trainsets:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch trainsets', error: { code: 'FETCH_ERROR', message: String(error) } });
  }
});

app.get('/api/trainsets/:id', async (req, res) => {
  try {
    const item = await prisma.trainset.findUnique({
      where: { id: req.params.id },
      include: { fitnessRecords: { orderBy: { expiryDate: 'desc' } }, jobCards: true }
    });
    if (!item) return res.status(404).json({ success: false, message: 'Trainset not found' });
    return res.json({ success: true, message: 'Trainset retrieved', data: { trainset: item } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch trainset', error: { code: 'FETCH_ERROR', message: String(error) } });
  }
});

app.post('/api/trainsets', async (req, res) => {
  try {
    const body = req.body || {};
const created = await prisma.trainset.create({ data: {
      trainsetNumber: body.trainsetNumber,
      manufacturer: body.manufacturer,
      model: body.model,
      yearOfManufacture: Number(body.yearOfManufacture) || new Date().getFullYear(),
      capacity: Number(body.capacity) || 0,
      maxSpeed: Number(body.maxSpeed) || 0,
      depot: body.depot || 'MUTTOM',
      status: (body.status || 'AVAILABLE').toUpperCase() as any,
      location: body.location || null
    }});
    io.to('trainsets').emit('trainset:updated', { trainset: created, updatedBy: 'system', timestamp: new Date().toISOString() });
    return res.status(201).json({ success: true, message: 'Trainset created', data: { trainset: created } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to create trainset', error: { code: 'CREATE_ERROR', message: String(error) } });
  }
});

app.put('/api/trainsets/:id', async (req, res) => {
  try {
    const body = req.body || {};
const updated = await prisma.trainset.update({ where: { id: req.params.id }, data: {
      trainsetNumber: body.trainsetNumber,
      manufacturer: body.manufacturer,
      model: body.model,
      capacity: body.capacity != null ? Number(body.capacity) : undefined,
      maxSpeed: body.maxSpeed != null ? Number(body.maxSpeed) : undefined,
      depot: body.depot,
      status: body.status ? String(body.status).toUpperCase() as any : undefined,
      location: body.location
    }});
    io.to('trainsets').emit('trainset:updated', { trainset: updated, updatedBy: 'system', timestamp: new Date().toISOString() });
    return res.json({ success: true, message: 'Trainset updated', data: { trainset: updated } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update trainset', error: { code: 'UPDATE_ERROR', message: String(error) } });
  }
});

app.patch('/api/trainsets/:id/status', async (req, res) => {
  try {
    const { status, location } = req.body || {};
const updated = await prisma.trainset.update({ where: { id: req.params.id }, data: {
      status: String(status || 'AVAILABLE').toUpperCase() as any,
      location: location ?? undefined
    }});
    io.to('trainsets').emit('trainset:updated', { trainset: updated, updatedBy: 'system', timestamp: new Date().toISOString(), notes: req.body?.notes });
    return res.json({ success: true, message: 'Trainset status updated', data: { trainset: updated } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update status', error: { code: 'UPDATE_ERROR', message: String(error) } });
  }
});

app.delete('/api/trainsets/:id', async (req, res) => {
  try {
const deleted = await prisma.trainset.delete({ where: { id: req.params.id } });
    io.to('trainsets').emit('trainset:updated', { trainset: deleted, updatedBy: 'system', timestamp: new Date().toISOString(), deleted: true });
    return res.json({ success: true, message: 'Trainset deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete trainset', error: { code: 'DELETE_ERROR', message: String(error) } });
  }
});

// Fitness endpoints
app.get('/api/fitness', async (req, res) => {
  try {
    const records = await prisma.fitnessCertificate.findMany({
      orderBy: { updatedAt: 'desc' },
      include: { trainset: true }
    });

    // Transform into assessments-like data expected by UI
    const data = records.map((r: any) => ({
      id: r.id,
      trainsetId: r.trainsetId,
      trainsetNumber: r.trainset?.trainsetNumber,
      certificateNumber: r.certificateNumber,
      status: r.status,
      issueDate: r.issueDate,
      expiryDate: r.expiryDate,
      remarks: r.remarks,
      lastChecked: r.lastChecked
    }));

    return res.json({ success: true, message: 'Fitness records retrieved', data });
  } catch (error) {
    console.error('Error fetching fitness records:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch fitness records', error: { code: 'FETCH_ERROR', message: String(error) } });
  }
});

app.post('/api/fitness', async (req, res) => {
  try {
    const body = req.body || {};
    const now = new Date();
    const issue = body.issueDate ? new Date(body.issueDate) : now;
    const expiry = body.expiryDate ? new Date(body.expiryDate) : new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000); // +90 days by default
    const created = await prisma.fitnessCertificate.create({ data: {
      trainsetId: String(body.trainsetId),
      certificateNumber: String(body.certificateNumber || `FIT-${Date.now()}`),
      issueDate: issue,
      expiryDate: expiry,
      status: String(body.status || 'VALID') as any,
      issuingAuthority: body.inspectorName || 'SYSTEM',
      remarks: body.remarks || 'Auto-generated from assessment',
      lastChecked: now,
      documents: null
    }});
    return res.status(201).json({ success: true, message: 'Fitness certificate created', data: created });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to create fitness certificate', error: { code: 'CREATE_ERROR', message: String(error) } });
  }
});

// Use enhanced job card routes for full IBM Maximo integration
app.use('/api/job-cards', jobCardRoutes);

// Auth endpoints
app.post('/api/auth/login', async (req, res) => {
  const { email, identifier, password } = req.body;
  const loginEmail = (email || identifier || '').toLowerCase();
  
  try {
    const user = await prisma.user.findUnique({
      where: { email: loginEmail }
    });

    if (!user) {
      return res.status(401).json({
        error: 'Invalid credentials',
        code: 'INVALID_CREDENTIALS'
      });
    }

    // Temporary relaxed auth fallback for development
    if (loginEmail === 'admin@kmrl.com' || password === 'admin123' || password === user.password) {
      return res.json({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            permissions: []
          },
          tokens: {
            access: 'demo-token-' + Date.now(),
            refresh: 'demo-refresh-token-' + Date.now()
          }
        }
      });
    }

    res.status(401).json({
      error: 'Invalid credentials',
      code: 'INVALID_CREDENTIALS'
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      error: 'Login failed',
      code: 'LOGIN_ERROR'
    });
  }
});

// Real-time dashboard and analytics
async function computeDashboard() {
  const [totalTrainsets, availableTrainsets, inService, maintenance, jobPending, fitness] = await Promise.all([
    prisma.trainset.count(),
    prisma.trainset.count({ where: { status: 'AVAILABLE' } }),
    prisma.trainset.count({ where: { status: 'IN_SERVICE' } }),
    prisma.trainset.count({ where: { status: 'MAINTENANCE' } }),
    prisma.jobCard.count({ where: { status: 'PENDING' } }),
    prisma.fitnessCertificate.findMany({ orderBy: { updatedAt: 'desc' }, take: 100 })
  ]);
  const fitnessValid = fitness.filter(f => new Date(f.expiryDate) > new Date()).length;

  const recentActivity: any[] = [];
  // Recent trainset updates
  const recentTrainsets = await prisma.trainset.findMany({ orderBy: { updatedAt: 'desc' }, take: 5 });
  recentTrainsets.forEach(t => recentActivity.push({ id: t.id, type: 'trainset', description: `Trainset ${t.trainsetNumber} updated`, timestamp: t.updatedAt }));
  // Recent job cards
  const recentJobs = await prisma.jobCard.findMany({ orderBy: { updatedAt: 'desc' }, take: 5 });
  recentJobs.forEach(j => recentActivity.push({ id: j.id, type: 'job_card', description: `Job card ${j.jobCardNumber} ${j.status}`, timestamp: j.updatedAt }));

  recentActivity.sort((a, b) => new Date(String(b.timestamp)).getTime() - new Date(String(a.timestamp)).getTime());

  return {
    metrics: {
      totalTrainsets,
      availableTrainsets,
      inService,
      maintenance,
      fitnessValid,
      pendingJobCards: jobPending
    },
    recentActivity: recentActivity.slice(0, 10)
  };
}

app.get('/api/dashboard', async (req, res) => {
  try {
    const data = await computeDashboard();
    res.json({ success: true, message: 'Dashboard metrics', data });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to compute dashboard', error: { code: 'DASH_ERROR', message: String(error) } });
  }
});

// Optimization endpoints used by frontend dashboard
app.get('/api/optimization/last', async (req, res) => {
  try {
    // Build a simple last-known optimization from current DB state
    const trainsets = await prisma.trainset.findMany({ orderBy: { updatedAt: 'desc' } });
    const decisions = trainsets.map(t => ({
      trainsetId: t.id,
      trainsetNumber: t.trainsetNumber,
      decision: (t.status === 'AVAILABLE' ? 'STANDBY' : (t.status === 'MAINTENANCE' ? 'MAINTENANCE' : 'IN_SERVICE')) as any,
      score: 0.5,
      reasons: [],
      conflicts: [],
      shuntingMoves: 0
    }));
    const summary = {
      inService: decisions.filter(d => d.decision === 'IN_SERVICE').length,
      standby: decisions.filter(d => d.decision === 'STANDBY').length,
      maintenance: decisions.filter(d => d.decision === 'MAINTENANCE').length,
      totalShuntingMoves: 0,
      conflictsDetected: 0
    };
    const result = {
      timestamp: new Date().toISOString(),
      processingTime: 0,
      decisions,
      summary,
      recommendations: []
    };
    return res.json({ success: true, message: 'Last optimization', data: result });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to get last optimization', error: { code: 'OPT_LAST_ERROR', message: String(error) } });
  }
});

app.get('/api/optimization/metrics', async (req, res) => {
  try {
    // Compute basic placeholder metrics from DB activity
    const [trainsetCount, jobsPending] = await Promise.all([
      prisma.trainset.count(),
      prisma.jobCard.count({ where: { status: 'PENDING' } })
    ]);
    const metrics = {
      avgOptimizationTime: 1200,
      dailyEnergyReduction: Math.max(0, trainsetCount - jobsPending) * 10,
      punctualityRate: 98,
      maintenanceCostReduction: 12,
      brandingCompliance: 95,
      shuntingReduction: 18
    };
    return res.json({ success: true, message: 'Optimization metrics', data: metrics });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to get metrics', error: { code: 'OPT_METRICS_ERROR', message: String(error) } });
  }
});

app.post('/api/optimization/run', async (req, res) => {
  const start = Date.now();
  try {
    const today = new Date();
    const trainsets = await prisma.trainset.findMany({ orderBy: { updatedAt: 'desc' } });

    // Basic constraints scoring (placeholder but real):
    // - Fitness valid gets +0.2, expired -0.3
    // - Pending job card -0.2 (worse score)
    // - Branding priority adds 0.01 * priority (bounded)
    // - Mileage balance (prefer lower totalMileage) adds up to +0.2 normalized
    const now = new Date();

    // Preload related data
    const [fitnessAll, jobsPendingAll, brandingAll] = await Promise.all([
      prisma.fitnessCertificate.findMany({ orderBy: { updatedAt: 'desc' } }),
      prisma.jobCard.findMany({ where: { status: 'PENDING' } }),
      prisma.brandingRecord.findMany({})
    ]);

    const pendingByTrainset = new Set(jobsPendingAll.map(j => j.trainsetId));
    const brandingByTrainset: Record<string, number> = {};
    brandingAll.forEach(b => {
      brandingByTrainset[b.trainsetId] = Math.max(brandingByTrainset[b.trainsetId] || 0, b.priority || 0);
    });

    const maxMileage = Math.max(1, ...trainsets.map(t => t.totalMileage || 0));

    const fitnessByTrainset: Record<string, 'VALID'|'EXPIRED'|'UNKNOWN'> = {};
    trainsets.forEach(t => {
      const latest = fitnessAll.filter(f => f.trainsetId === t.id).sort((a,b) => new Date(b.expiryDate).getTime() - new Date(a.expiryDate).getTime())[0];
      if (!latest) fitnessByTrainset[t.id] = 'UNKNOWN';
      else fitnessByTrainset[t.id] = (new Date(latest.expiryDate) > now) ? 'VALID' : 'EXPIRED';
    });

    const decisions = trainsets.map(t => {
      let score = 0.5;
      const reasons: string[] = [];
      const conflicts: string[] = [];

      // Fitness
      const fstat = fitnessByTrainset[t.id];
      if (fstat === 'VALID') { score += 0.2; reasons.push('Fitness valid'); }
      if (fstat === 'EXPIRED') { score -= 0.3; conflicts.push('Fitness expired'); }

      // Job cards
      if (pendingByTrainset.has(t.id)) { score -= 0.2; conflicts.push('Pending job cards'); }

      // Branding
      const brandPriority = Math.min(brandingByTrainset[t.id] || 0, 50); // cap influence
      if (brandPriority > 0) { score += 0.01 * brandPriority; reasons.push(`Branding priority ${brandPriority}`); }

      // Mileage balance (prefer lower mileage to equalize wear)
      const mileageFactor = 1 - (t.totalMileage || 0) / maxMileage; // 0..1
      score += 0.2 * mileageFactor;
      reasons.push(`Mileage balancing factor ${mileageFactor.toFixed(2)}`);

      // Clamp score
      score = Math.max(0, Math.min(1, score));

      // Decision selection
      let decision: 'IN_SERVICE'|'STANDBY'|'MAINTENANCE' = 'STANDBY';
      if (fstat === 'VALID' && !pendingByTrainset.has(t.id)) {
        decision = 'IN_SERVICE';
      } else if (fstat === 'EXPIRED' || pendingByTrainset.has(t.id)) {
        decision = 'MAINTENANCE';
      }

      return {
        trainsetId: t.id,
        trainsetNumber: t.trainsetNumber,
        decision,
        score,
        reasons,
        conflicts,
        shuntingMoves: 0
      };
    });

    // Respect cleaning capacity: if CleaningSlot exists for today, cap IN_SERVICE by capacity sum
    const slots = await prisma.cleaningSlot.findMany({
      where: {
        date: { gte: new Date(today.toDateString()), lt: new Date(new Date(today.toDateString()).getTime() + 24*3600*1000) }
      }
    });
    const cleaningCapacity = slots.reduce((a,s)=>a + (s.capacity||0), 0) || Infinity;
    const inServiceCandidates = decisions.filter(d => d.decision === 'IN_SERVICE').sort((a,b)=> b.score - a.score);
    const overflow = Math.max(0, inServiceCandidates.length - cleaningCapacity);
    if (overflow > 0 && isFinite(cleaningCapacity)) {
      // demote lowest scoring overflow to STANDBY
      const demote = inServiceCandidates.slice(-overflow);
      demote.forEach(d => { d.decision = 'STANDBY'; d.reasons.push('Demoted due to cleaning capacity'); });
    }

    const summary = {
      inService: decisions.filter(d => d.decision === 'IN_SERVICE').length,
      standby: decisions.filter(d => d.decision === 'STANDBY').length,
      maintenance: decisions.filter(d => d.decision === 'MAINTENANCE').length,
      totalShuntingMoves: 0,
      conflictsDetected: decisions.reduce((a,d)=> a + (d.conflicts?.length||0), 0)
    };

    // Persist schedule
    const schedule = await prisma.schedule.create({
      data: {
        date: new Date(),
        status: 'DRAFT',
        entries: {
          create: decisions.map(d => ({
            trainset: { connect: { id: d.trainsetId } },
            decision: d.decision,
            score: d.score,
            reasons: JSON.stringify(d.reasons),
            conflicts: JSON.stringify(d.conflicts)
          }))
        }
      },
      include: { entries: true }
    });

    const result = {
      timestamp: new Date().toISOString(),
      processingTime: Date.now() - start,
      decisions,
      summary,
      scheduleId: schedule.id,
      recommendations: []
    };

    io.to('optimization').emit('optimization:completed', { optimizationResult: result, timestamp: new Date().toISOString() });
    return res.json({ success: true, message: 'Optimization completed', data: result });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Optimization failed', error: { code: 'OPT_RUN_ERROR', message: String(error) } });
  }
});

app.get('/api/analytics/dashboard', async (req, res) => {
  try {
    const data = await computeDashboard();
    res.json({ success: true, message: 'Analytics dashboard', data });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to get analytics dashboard', error: { code: 'ANALYTICS_ERROR', message: String(error) } });
  }
});

// Schedules endpoints
app.get('/api/schedules', async (req, res) => {
  try {
    const latest = await prisma.schedule.findMany({ orderBy: { createdAt: 'desc' }, take: 1, include: { entries: true } });
    return res.json({ success: true, message: 'Latest schedule', data: latest[0] || null });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to get schedules', error: { code: 'SCHEDULES_ERROR', message: String(error) } });
  }
});

app.get('/api/schedules/:id', async (req, res) => {
  try {
    const schedule = await prisma.schedule.findUnique({ where: { id: req.params.id }, include: { entries: true } });
    if (!schedule) return res.status(404).json({ success: false, message: 'Schedule not found' });
    return res.json({ success: true, message: 'Schedule', data: schedule });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to get schedule', error: { code: 'SCHEDULE_ERROR', message: String(error) } });
  }
});

app.patch('/api/schedules/:id/status', async (req, res) => {
  try {
    const { status } = req.body || {};
    const updated = await prisma.schedule.update({ where: { id: req.params.id }, data: { status: String(status || 'DRAFT') as any } });
    return res.json({ success: true, message: 'Schedule status updated', data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update schedule', error: { code: 'SCHEDULE_UPDATE_ERROR', message: String(error) } });
  }
});

// Simple import endpoints for rapid setup
app.post('/api/branding/import', async (req, res) => {
  try {
    const items = Array.isArray(req.body) ? req.body : (req.body?.items || []);
    if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ success: false, message: 'No items provided' });
    const data = items.map((b: any) => ({
      trainsetId: String(b.trainsetId),
      campaignName: String(b.campaignName || 'Campaign'),
      priority: Number(b.priority || 0),
      slaHoursTarget: Number(b.slaHoursTarget || 0),
      hoursDelivered: Number(b.hoursDelivered || 0),
      startDate: b.startDate ? new Date(b.startDate) : new Date(),
      endDate: b.endDate ? new Date(b.endDate) : new Date(new Date().getTime() + 30*24*3600*1000)
    }));
const created = await prisma.brandingRecord.createMany({ data: data as any });
    return res.json({ success: true, message: 'Branding records imported', data: { count: created.count } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to import branding', error: { code: 'IMPORT_BRANDING_ERROR', message: String(error) } });
  }
});

app.post('/api/cleaning-slots/import', async (req, res) => {
  try {
    const items = Array.isArray(req.body) ? req.body : (req.body?.items || []);
    if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ success: false, message: 'No items provided' });
    const data = items.map((c: any) => ({
      date: c.date ? new Date(c.date) : new Date(new Date().toDateString()),
      bayName: String(c.bayName || 'Bay-1'),
      startTime: c.startTime ? new Date(c.startTime) : new Date(),
      endTime: c.endTime ? new Date(c.endTime) : new Date(new Date().getTime() + 2*3600*1000),
      capacity: Number(c.capacity || 1)
    }));
const created = await prisma.cleaningSlot.createMany({ data: data as any });
    return res.json({ success: true, message: 'Cleaning slots imported', data: { count: created.count } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to import cleaning slots', error: { code: 'IMPORT_CLEANING_ERROR', message: String(error) } });
  }
});

// Trainsets dashboard stats to match frontend expectations
app.get('/api/trainsets/stats/dashboard', async (req, res) => {
  try {
    const [total, available, inService, maintenance] = await Promise.all([
      prisma.trainset.count(),
      prisma.trainset.count({ where: { status: 'AVAILABLE' } }),
      prisma.trainset.count({ where: { status: 'IN_SERVICE' } }),
      prisma.trainset.count({ where: { status: 'MAINTENANCE' } })
    ]);

    const statusCounts = [
      { status: 'AVAILABLE', _count: available },
      { status: 'IN_SERVICE', _count: inService },
      { status: 'MAINTENANCE', _count: maintenance }
    ];

    // Simple heuristic for maintenanceDue: number of PENDING job cards
    const maintenanceDue = await prisma.jobCard.count({ where: { status: 'PENDING' } });

    return res.json({
      success: true,
      message: 'Trainsets dashboard stats',
      data: {
        totalTrainsets: total,
        statusCounts,
        maintenanceDue,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to get trainsets stats', error: { code: 'STATS_ERROR', message: String(error) } });
  }
});

// Job card routes
app.use('/api/job-cards', jobCardRoutes);

// Fitness certificate routes
app.use('/api/fitness-certificates', fitnessRoutes);

// AI Optimization routes
app.use('/api/optimization', optimizationRoutes);

// Operations Management routes
app.use('/api/operations', operationsRoutes);

// Dashboard Management routes
app.use('/api/dashboards', dashboardRoutes);

// Catch-all for unknown API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({
    error: 'API endpoint not found',
    code: 'NOT_FOUND'
  });
});

// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Server error:', err);
  res.status(500).json({
    error: 'Internal server error',
    code: 'INTERNAL_ERROR'
  });
});

// Start server
server.listen(PORT, () => {
  console.log(`🚄 KMRL Backend Server running on port ${PORT}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  console.log(`🎯 API base: http://localhost:${PORT}/api`);
  console.log(`📡 WebSocket: ${FRONTEND_ORIGIN}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
});
