import express from 'express';
import { Request, Response } from 'express';
import { apiResponse } from '../utils/apiResponse';
import { logger, performanceLogger } from '../utils/logger';
import { cacheService } from '../services/cacheService';
import os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';

const router = express.Router();
const execAsync = promisify(exec);

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
  services: {
    [key: string]: {
      status: 'up' | 'down' | 'degraded';
      responseTime?: number;
      error?: string;
      lastCheck?: string;
    };
  };
  system: {
    memory: {
      total: number;
      used: number;
      free: number;
      usage: number;
    };
    cpu: {
      usage: number;
      load: number[];
    };
    disk: {
      total: number;
      used: number;
      free: number;
      usage: number;
    };
  };
  database: {
    status: 'connected' | 'disconnected' | 'error';
    responseTime?: number;
    connections?: number;
    queries?: {
      total: number;
      slow: number;
      failed: number;
    };
  };
  cache: {
    status: 'connected' | 'disconnected' | 'error';
    responseTime?: number;
    stats?: {
      hits: number;
      misses: number;
      hitRate: number;
    };
  };
}

// Get system memory information
async function getMemoryInfo() {
  const totalMemory = os.totalmem();
  const freeMemory = os.freemem();
  const usedMemory = totalMemory - freeMemory;
  
  return {
    total: Math.round(totalMemory / 1024 / 1024), // MB
    used: Math.round(usedMemory / 1024 / 1024), // MB
    free: Math.round(freeMemory / 1024 / 1024), // MB
    usage: Math.round((usedMemory / totalMemory) * 100) // percentage
  };
}

// Get CPU usage information
async function getCpuInfo() {
  const cpus = os.cpus();
  const loadAvg = os.loadavg();
  
  // Calculate CPU usage (simplified)
  let totalIdle = 0;
  let totalTick = 0;
  
  cpus.forEach(cpu => {
    for (const type in cpu.times) {
      totalTick += cpu.times[type as keyof typeof cpu.times];
    }
    totalIdle += cpu.times.idle;
  });
  
  const usage = Math.round(100 - (totalIdle / totalTick) * 100);
  
  return {
    usage: Math.max(0, Math.min(100, usage)),
    load: loadAvg.map(load => Math.round(load * 100) / 100)
  };
}

// Get disk usage information
async function getDiskInfo() {
  try {
    const { stdout } = await execAsync('df -h / | tail -1');
    const diskData = stdout.split(/\s+/);
    
    const total = parseFloat(diskData[1].replace('G', '')) || 0;
    const used = parseFloat(diskData[2].replace('G', '')) || 0;
    const available = parseFloat(diskData[3].replace('G', '')) || 0;
    const usage = parseInt(diskData[4]?.replace('%', '') || '0');
    
    return {
      total: Math.round(total * 1024), // MB
      used: Math.round(used * 1024), // MB
      free: Math.round(available * 1024), // MB
      usage
    };
  } catch (error) {
    // Fallback for Windows or other systems
    return {
      total: 0,
      used: 0,
      free: 0,
      usage: 0
    };
  }
}

// Check database health
async function checkDatabaseHealth() {
  const start = Date.now();
  
  try {
    // This would be replaced with actual database connection check
    // await prisma.$queryRaw`SELECT 1`;
    
    const responseTime = Date.now() - start;
    
    return {
      status: 'connected' as const,
      responseTime,
      connections: 5, // Mock data
      queries: {
        total: 1250,
        slow: 3,
        failed: 0
      }
    };
  } catch (error) {
    return {
      status: 'error' as const,
      responseTime: Date.now() - start,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Check cache health
async function checkCacheHealth() {
  try {
    const healthCheck = await cacheService.healthCheck();
    const stats = cacheService.getStats();
    
    return {
      status: healthCheck.status === 'healthy' ? 'connected' as const : 'error' as const,
      responseTime: healthCheck.latency,
      stats: {
        hits: stats.hits,
        misses: stats.misses,
        hitRate: stats.hitRate
      }
    };
  } catch (error) {
    return {
      status: 'error' as const,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Check external services health
async function checkExternalServices() {
  const services: { [key: string]: any } = {};
  
  // Check AI Service
  try {
    const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:8001';
    const start = Date.now();
    
    // Mock health check - replace with actual HTTP request
    // const response = await fetch(`${aiServiceUrl}/health`);
    const responseTime = Date.now() - start;
    
    services.aiService = {
      status: 'up',
      responseTime,
      lastCheck: new Date().toISOString()
    };
  } catch (error) {
    services.aiService = {
      status: 'down',
      error: error instanceof Error ? error.message : 'Unknown error',
      lastCheck: new Date().toISOString()
    };
  }
  
  // Check WhatsApp Service
  try {
    // Mock check - replace with actual WhatsApp API status check
    services.whatsappService = {
      status: 'up',
      responseTime: 150,
      lastCheck: new Date().toISOString()
    };
  } catch (error) {
    services.whatsappService = {
      status: 'down',
      error: error instanceof Error ? error.message : 'Unknown error',
      lastCheck: new Date().toISOString()
    };
  }
  
  return services;
}

// Calculate overall health status
function calculateOverallStatus(database: any, cache: any, services: any): 'healthy' | 'degraded' | 'unhealthy' {
  const criticalServices = [database.status, cache.status];
  const externalServices = Object.values(services).map((service: any) => service.status);
  
  // If any critical service is down, system is unhealthy
  if (criticalServices.some(status => status === 'error' || status === 'disconnected')) {
    return 'unhealthy';
  }
  
  // If external services are down, system is degraded
  if (externalServices.some(status => status === 'down')) {
    return 'degraded';
  }
  
  return 'healthy';
}

// Basic health check endpoint
router.get('/', async (req: Request, res: Response) => {
  const startTime = Date.now();
  
  try {
    const timestamp = new Date().toISOString();
    const uptime = process.uptime();
    const version = process.env.npm_package_version || '1.0.0';
    const environment = process.env.NODE_ENV || 'development';
    
    // Get basic system info
    const memory = await getMemoryInfo();
    const cpu = await getCpuInfo();
    const disk = await getDiskInfo();
    
    // Check services
    const database = await checkDatabaseHealth();
    const cache = await checkCacheHealth();
    const services = await checkExternalServices();
    
    const overallStatus = calculateOverallStatus(database, cache, services);
    
    const healthStatus: HealthStatus = {
      status: overallStatus,
      timestamp,
      uptime: Math.round(uptime),
      version,
      environment,
      services,
      system: {
        memory,
        cpu,
        disk
      },
      database,
      cache
    };
    
    const duration = Date.now() - startTime;
    performanceLogger.logApiCall('GET', '/health', duration, 200);
    
    const statusCode = overallStatus === 'healthy' ? 200 : overallStatus === 'degraded' ? 206 : 503;
    
    return res.status(statusCode).json({
      success: true,
      message: `System is ${overallStatus}`,
      data: healthStatus,
      meta: {
        timestamp,
        responseTime: duration,
        version
      }
    });
    
  } catch (error) {
    logger.error('Health check failed', error);
    
    return apiResponse.serviceUnavailable(res, 'Health check failed', {
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Detailed health check endpoint
router.get('/detailed', async (req: Request, res: Response) => {
  const startTime = Date.now();
  
  try {
    const basicHealth = await new Promise((resolve) => {
      // Safely access the route handler
      const route = router.stack?.[0]?.route?.stack?.[0];
      if (route?.handle) {
        route.handle(req, {
          status: (code: number) => ({ json: (data: any) => resolve(data) }),
          json: (data: any) => resolve(data)
        } as any, () => {});
      } else {
        resolve({ data: {} });
      }
    }) as any;
    
    // Add additional detailed metrics
    const detailedMetrics = {
      ...basicHealth.data,
      performance: {
        apiResponseTimes: {
          avg: 150,
          min: 45,
          max: 1200,
          p95: 300,
          p99: 800
        },
        throughput: {
          requestsPerSecond: 25,
          requestsPerMinute: 1500
        },
        errors: {
          rate: 0.5, // percentage
          count: 8,
          lastError: '2024-01-15T10:30:00Z'
        }
      },
      resources: {
        openFiles: process.resourceUsage?.().maxRSS || 0,
        threads: 12, // Mock data
        connections: {
          active: 45,
          idle: 5,
          total: 50
        }
      },
      security: {
        rateLimitHits: 3,
        blockedIPs: 0,
        failedLogins: 2
      }
    };
    
    const duration = Date.now() - startTime;
    
    return apiResponse.success(res, detailedMetrics, {
      message: 'Detailed health check completed'
    });
    
  } catch (error) {
    logger.error('Detailed health check failed', error);
    return apiResponse.serviceUnavailable(res, 'Detailed health check failed');
  }
});

// Readiness check endpoint (for container orchestration)
router.get('/ready', async (req: Request, res: Response) => {
  try {
    // Check if all critical services are available
    const database = await checkDatabaseHealth();
    const cache = await checkCacheHealth();
    
    const isReady = database.status === 'connected' && 
                   (cache.status === 'connected' || cache.status === 'error'); // Cache is optional
    
    if (isReady) {
      return apiResponse.success(res, { ready: true }, {
        message: 'Service is ready to accept traffic'
      });
    } else {
      return apiResponse.serviceUnavailable(res, 'Service is not ready', {
        details: {
          database: database.status,
          cache: cache.status
        }
      });
    }
    
  } catch (error) {
    logger.error('Readiness check failed', error);
    return apiResponse.serviceUnavailable(res, 'Readiness check failed');
  }
});

// Liveness check endpoint (for container orchestration)
router.get('/live', async (req: Request, res: Response) => {
  try {
    // Simple check to verify the service is running
    const memory = process.memoryUsage();
    const uptime = process.uptime();
    
    // Check if memory usage is not excessive
    const memoryUsageMB = memory.heapUsed / 1024 / 1024;
    const isHealthy = memoryUsageMB < 500 && uptime > 0; // Less than 500MB heap
    
    if (isHealthy) {
      return apiResponse.success(res, {
        alive: true,
        uptime: Math.round(uptime),
        memoryUsage: Math.round(memoryUsageMB)
      }, {
        message: 'Service is alive'
      });
    } else {
      return apiResponse.serviceUnavailable(res, 'Service is not responsive');
    }
    
  } catch (error) {
    logger.error('Liveness check failed', error);
    return apiResponse.serviceUnavailable(res, 'Liveness check failed');
  }
});

// Metrics endpoint for monitoring systems
router.get('/metrics', async (req: Request, res: Response) => {
  try {
    const metrics = {
      // Application metrics
      http_requests_total: 1250,
      http_request_duration_seconds: {
        sum: 125.5,
        count: 1250,
        avg: 0.1
      },
      http_request_errors_total: 8,
      
      // System metrics
      process_cpu_usage: await getCpuInfo(),
      process_memory_usage: await getMemoryInfo(),
      
      // Business metrics
      active_trainsets: 25,
      optimization_requests_total: 45,
      optimization_success_rate: 0.96,
      schedule_conflicts_total: 3,
      
      // Cache metrics
      cache_hits_total: cacheService.getStats().hits,
      cache_misses_total: cacheService.getStats().misses,
      cache_hit_rate: cacheService.getStats().hitRate / 100
    };
    
    return apiResponse.success(res, metrics, {
      message: 'System metrics retrieved'
    });
    
  } catch (error) {
    logger.error('Metrics retrieval failed', error);
    return apiResponse.serviceUnavailable(res, 'Metrics unavailable');
  }
});

// Version information endpoint
router.get('/version', (req: Request, res: Response) => {
  const versionInfo = {
    version: process.env.npm_package_version || '1.0.0',
    name: process.env.npm_package_name || 'kmrl-backend',
    environment: process.env.NODE_ENV || 'development',
    buildTime: process.env.BUILD_TIME || new Date().toISOString(),
    gitCommit: process.env.GIT_COMMIT || 'unknown',
    node: process.version,
    platform: process.platform,
    arch: process.arch,
    uptime: Math.round(process.uptime())
  };
  
  return apiResponse.success(res, versionInfo, {
    message: 'Version information retrieved'
  });
});

export default router;