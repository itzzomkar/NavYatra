import { PrismaClient } from '@prisma/client';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Mock Prisma client for tests
const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  trainset: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
    groupBy: jest.fn(),
  },
  schedule: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  scheduleEntry: {
    create: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  fitnessRecord: {
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  jobCard: {
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  $queryRaw: jest.fn(),
  $disconnect: jest.fn(),
};

// Mock Redis client
const mockRedis = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  exists: jest.fn(),
  ping: jest.fn(),
  disconnect: jest.fn(),
};

// Mock JWT
jest.mock('jsonwebtoken', () => ({
  sign: jest.fn(() => 'mock-token'),
  verify: jest.fn(() => ({ userId: '1', email: 'test@example.com', role: 'ADMIN' })),
  decode: jest.fn(() => ({ userId: '1', exp: Date.now() / 1000 + 3600 })),
}));

// Mock bcrypt
jest.mock('bcryptjs', () => ({
  hash: jest.fn(() => Promise.resolve('hashed-password')),
  compare: jest.fn(() => Promise.resolve(true)),
}));

// Mock Prisma
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn(() => mockPrisma),
}));

// Mock Redis
jest.mock('../src/utils/redis', () => mockRedis);

// Mock logger
jest.mock('../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
  authLogger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
  socketLogger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
  securityLogger: {
    logPermissionDenied: jest.fn(),
    logSuspiciousActivity: jest.fn(),
  },
}));

// Global test environment setup
beforeAll(async () => {
  // Setup test database if needed
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'test-jwt-secret';
  process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/kmrl_test_db';
});

beforeEach(() => {
  // Clear all mocks before each test
  jest.clearAllMocks();
  
  // Reset mock implementations
  mockPrisma.$queryRaw.mockResolvedValue([{ result: 'ok' }]);
  mockRedis.ping.mockResolvedValue('PONG');
});

afterAll(async () => {
  // Cleanup after all tests
  await mockPrisma.$disconnect();
  await mockRedis.disconnect();
});

// Export mocks for use in tests
export { mockPrisma, mockRedis };
