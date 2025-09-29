import 'jest-extended';
import { logger } from '../src/utils/logger';
import { cacheService } from '../src/services/cacheService';

// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key';
process.env.LOG_LEVEL = 'error';
process.env.REDIS_URL = 'redis://localhost:6379/1'; // Use test database

// Mock logger to avoid console output during tests
jest.mock('../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    verbose: jest.fn()
  },
  performanceLogger: {
    logApiCall: jest.fn(),
    logDatabaseQuery: jest.fn(),
    logError: jest.fn(),
    logOptimization: jest.fn(),
    logCacheOperation: jest.fn()
  },
  authLogger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
  },
  securityLogger: {
    logPermissionDenied: jest.fn(),
    logSuspiciousActivity: jest.fn(),
    logLogin: jest.fn(),
    logPasswordChange: jest.fn(),
    logTokenGenerated: jest.fn()
  },
  businessLogger: {
    logOptimizationRequest: jest.fn(),
    logScheduleGenerated: jest.fn(),
    logMaintenanceAlert: jest.fn(),
    logDataIngestion: jest.fn()
  }
}));

// Mock Redis/Cache service
jest.mock('../src/services/cacheService', () => ({
  cacheService: {
    get: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
    exists: jest.fn(),
    increment: jest.fn(),
    getStats: jest.fn(() => ({
      hits: 100,
      misses: 20,
      sets: 50,
      deletes: 10,
      errors: 0,
      hitRate: 83.33
    })),
    healthCheck: jest.fn(() => Promise.resolve({ status: 'healthy', latency: 10 }))
  },
  trainsetCache: {
    getTrainsetData: jest.fn(),
    setTrainsetData: jest.fn(),
    getTrainsetList: jest.fn(),
    setTrainsetList: jest.fn(),
    invalidateTrainset: jest.fn()
  },
  scheduleCache: {
    getOptimizedSchedule: jest.fn(),
    setOptimizedSchedule: jest.fn(),
    getScheduleConflicts: jest.fn(),
    setScheduleConflicts: jest.fn(),
    invalidateScheduleDate: jest.fn()
  },
  optimizationCache: {
    getOptimizationResult: jest.fn(),
    setOptimizationResult: jest.fn(),
    getAlgorithmPerformance: jest.fn(),
    setAlgorithmPerformance: jest.fn()
  },
  analyticsCache: {
    getPerformanceMetrics: jest.fn(),
    setPerformanceMetrics: jest.fn(),
    getDashboardData: jest.fn(),
    setDashboardData: jest.fn()
  }
}));

// Mock Prisma client
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    $connect: jest.fn(),
    $disconnect: jest.fn(),
    $queryRaw: jest.fn(),
    user: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn()
    },
    trainset: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn()
    },
    schedule: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn()
    },
    fitness: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn()
    },
    jobCard: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn()
    }
  }))
}));

// Global test timeout
jest.setTimeout(30000);

// Global error handler for uncaught errors in tests
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

// Setup and teardown hooks
beforeAll(async () => {
  // Global setup
  console.log('🧪 Starting test suite');
});

afterAll(async () => {
  // Global cleanup
  console.log('✅ Test suite completed');
  
  // Clear all timers
  jest.clearAllTimers();
  
  // Clear all mocks
  jest.clearAllMocks();
});

beforeEach(() => {
  // Reset all mocks before each test
  jest.clearAllMocks();
  
  // Reset console.log/error spies if they exist
  if (jest.isMockFunction(console.log)) {
    (console.log as jest.MockedFunction<typeof console.log>).mockClear();
  }
  if (jest.isMockFunction(console.error)) {
    (console.error as jest.MockedFunction<typeof console.error>).mockClear();
  }
});

afterEach(() => {
  // Clean up after each test
  jest.restoreAllMocks();
});

// Custom matchers
expect.extend({
  toBeValidUUID(received: string) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const pass = typeof received === 'string' && uuidRegex.test(received);
    
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid UUID`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid UUID`,
        pass: false,
      };
    }
  },

  toBeValidEmail(received: string) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const pass = typeof received === 'string' && emailRegex.test(received);
    
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid email`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid email`,
        pass: false,
      };
    }
  },

  toHaveValidApiResponse(received: any) {
    const hasRequiredFields = received &&
      typeof received.success === 'boolean' &&
      typeof received.message === 'string' &&
      received.meta &&
      typeof received.meta.timestamp === 'string';
    
    if (hasRequiredFields) {
      return {
        message: () => `expected response not to have valid API structure`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected response to have valid API structure with success, message, and meta.timestamp`,
        pass: false,
      };
    }
  }
});

// Declare custom matchers for TypeScript
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidUUID(): R;
      toBeValidEmail(): R;
      toHaveValidApiResponse(): R;
    }
  }
}

export {};