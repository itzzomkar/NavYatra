/**
 * End-to-End Integration Tests for KMRL Train Induction System
 * 
 * These tests verify the complete flow between frontend, backend, and AI service
 */

const axios = require('axios');
const WebSocket = require('ws');

// Configuration
const config = {
  backend: {
    url: process.env.BACKEND_URL || 'http://localhost:3001',
    timeout: 30000
  },
  frontend: {
    url: process.env.FRONTEND_URL || 'http://localhost:3000'
  },
  aiService: {
    url: process.env.AI_SERVICE_URL || 'http://localhost:8001',
    timeout: 60000
  }
};

// Test utilities
class TestUtils {
  static async waitForService(url, maxRetries = 30) {
    for (let i = 0; i < maxRetries; i++) {
      try {
        await axios.get(`${url}/health`, { timeout: 5000 });
        return true;
      } catch (error) {
        if (i === maxRetries - 1) throw error;
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }

  static async authenticateUser(email = 'admin@kmrl.com', password = 'admin123') {
    const response = await axios.post(`${config.backend.url}/api/auth/login`, {
      email,
      password
    });

    if (!response.data.success) {
      throw new Error('Authentication failed');
    }

    return response.data.data.tokens.access;
  }

  static createAuthHeaders(token) {
    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  }

  static async waitForOptimization(optimizationId, token, maxWait = 120000) {
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWait) {
      try {
        const response = await axios.get(
          `${config.aiService.url}/api/v1/optimization/status/${optimizationId}`,
          { headers: TestUtils.createAuthHeaders(token) }
        );

        if (response.data.status === 'COMPLETED') {
          return response.data;
        }

        if (response.data.status === 'FAILED') {
          throw new Error('Optimization failed');
        }

        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        if (error.response?.status === 404) {
          // Optimization might not be created yet
          await new Promise(resolve => setTimeout(resolve, 2000));
          continue;
        }
        throw error;
      }
    }

    throw new Error('Optimization timeout');
  }
}

describe('KMRL System Integration Tests', () => {
  let authToken;

  beforeAll(async () => {
    console.log('🔄 Starting system integration tests...');
    
    // Wait for all services to be ready
    console.log('⏳ Waiting for services to start...');
    await TestUtils.waitForService(config.backend.url);
    await TestUtils.waitForService(config.aiService.url);
    console.log('✅ All services are ready');

    // Authenticate test user
    try {
      authToken = await TestUtils.authenticateUser();
      console.log('✅ Authentication successful');
    } catch (error) {
      console.error('❌ Authentication failed:', error.message);
      throw error;
    }
  }, 120000);

  describe('Service Health Checks', () => {
    it('should verify all services are healthy', async () => {
      // Backend health check
      const backendHealth = await axios.get(`${config.backend.url}/health`);
      expect(backendHealth.status).toBe(200);
      expect(backendHealth.data.status).toBe('healthy');

      // AI Service health check
      const aiHealth = await axios.get(`${config.aiService.url}/health/status`);
      expect(aiHealth.status).toBe(200);
      expect(aiHealth.data.status).toBe('ok');
    });
  });

  describe('Authentication Flow', () => {
    it('should authenticate user and receive tokens', async () => {
      const response = await axios.post(`${config.backend.url}/api/auth/login`, {
        email: 'admin@kmrl.com',
        password: 'admin123'
      });

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data).toHaveProperty('user');
      expect(response.data.data).toHaveProperty('tokens');
      expect(response.data.data.tokens).toHaveProperty('access');
      expect(response.data.data.tokens).toHaveProperty('refresh');
    });

    it('should reject invalid credentials', async () => {
      try {
        await axios.post(`${config.backend.url}/api/auth/login`, {
          email: 'invalid@kmrl.com',
          password: 'wrongpassword'
        });
        fail('Should have thrown an error');
      } catch (error) {
        expect(error.response.status).toBe(401);
      }
    });
  });

  describe('Trainsets Management', () => {
    it('should fetch trainsets from backend', async () => {
      const response = await axios.get(
        `${config.backend.url}/api/trainsets`,
        { headers: TestUtils.createAuthHeaders(authToken) }
      );

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data).toHaveProperty('trainsets');
      expect(response.data.data).toHaveProperty('pagination');
      expect(Array.isArray(response.data.data.trainsets)).toBe(true);
    });

    it('should get dashboard statistics', async () => {
      const response = await axios.get(
        `${config.backend.url}/api/trainsets/stats/dashboard`,
        { headers: TestUtils.createAuthHeaders(authToken) }
      );

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data).toHaveProperty('totalTrainsets');
      expect(response.data.data).toHaveProperty('statusCounts');
      expect(response.data.data).toHaveProperty('maintenanceDue');
    });
  });

  describe('Schedule Optimization Flow', () => {
    it('should complete full optimization workflow', async () => {
      console.log('🤖 Starting optimization workflow...');

      // Step 1: Request optimization through backend
      const optimizationRequest = {
        constraints: {
          fitnessRequired: true,
          mileageBalancing: true,
          brandingOptimization: true
        },
        parameters: {
          optimizationWindow: 24,
          maxIterations: 100,
          convergenceThreshold: 0.01
        },
        preferences: {
          fitnessWeight: 0.3,
          mileageWeight: 0.3,
          brandingWeight: 0.2,
          cleaningWeight: 0.1,
          stablingWeight: 0.1
        }
      };

      const optimizationResponse = await axios.post(
        `${config.backend.url}/api/schedule/optimize`,
        optimizationRequest,
        { 
          headers: TestUtils.createAuthHeaders(authToken),
          timeout: config.backend.timeout
        }
      );

      expect(optimizationResponse.status).toBeGreaterThanOrEqual(200);
      expect(optimizationResponse.status).toBeLessThan(300);

      if (optimizationResponse.data.success) {
        console.log('✅ Optimization completed successfully');
        expect(optimizationResponse.data.data).toHaveProperty('schedule');
        expect(optimizationResponse.data.data).toHaveProperty('optimizationResult');
        expect(optimizationResponse.data.data.optimizationResult).toHaveProperty('optimizationScore');
        
        // Verify optimization score is reasonable
        const score = optimizationResponse.data.data.optimizationResult.optimizationScore;
        expect(score).toBeGreaterThan(0);
        expect(score).toBeLessThanOrEqual(1);
      } else {
        console.log('⚠️ Optimization request accepted but not completed immediately');
      }
    }, 180000); // 3 minutes timeout for optimization
  });

  describe('AI Service Integration', () => {
    it('should validate optimization constraints', async () => {
      const constraints = {
        fitnessRequired: true,
        mileageBalancing: true,
        brandingOptimization: true
      };

      const response = await axios.post(
        `${config.aiService.url}/api/v1/optimization/validate`,
        { constraints },
        { headers: TestUtils.createAuthHeaders(authToken) }
      );

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('valid');
    });

    it('should get optimization statistics', async () => {
      const response = await axios.get(
        `${config.aiService.url}/api/v1/optimization/stats`,
        { headers: TestUtils.createAuthHeaders(authToken) }
      );

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('total_jobs');
      expect(response.data).toHaveProperty('completed_jobs');
      expect(response.data).toHaveProperty('success_rate');
    });

    it('should get available algorithms', async () => {
      const response = await axios.get(
        `${config.aiService.url}/api/v1/optimization/algorithms`,
        { headers: TestUtils.createAuthHeaders(authToken) }
      );

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('algorithms');
      expect(response.data).toHaveProperty('default');
      expect(Array.isArray(response.data.algorithms)).toBe(true);
    });
  });

  describe('Real-time Features', () => {
    it('should establish WebSocket connection', (done) => {
      const wsUrl = config.backend.url.replace('http', 'ws');
      const ws = new WebSocket(wsUrl, {
        headers: {
          Authorization: `Bearer ${authToken}`
        }
      });

      ws.on('open', () => {
        console.log('✅ WebSocket connection established');
        
        // Subscribe to trainset updates
        ws.send(JSON.stringify({
          type: 'subscribe',
          channel: 'trainsets'
        }));

        setTimeout(() => {
          ws.close();
          done();
        }, 2000);
      });

      ws.on('error', (error) => {
        console.error('❌ WebSocket error:', error);
        done(error);
      });

      ws.on('message', (data) => {
        console.log('📨 Received WebSocket message:', data.toString());
      });
    }, 10000);
  });

  describe('Data Consistency', () => {
    it('should maintain data consistency across services', async () => {
      // Fetch trainsets from backend
      const backendTrainsets = await axios.get(
        `${config.backend.url}/api/trainsets`,
        { headers: TestUtils.createAuthHeaders(authToken) }
      );

      expect(backendTrainsets.status).toBe(200);
      expect(backendTrainsets.data.success).toBe(true);

      const trainsetCount = backendTrainsets.data.data.pagination.total;
      
      // Verify dashboard stats match
      const dashboardStats = await axios.get(
        `${config.backend.url}/api/trainsets/stats/dashboard`,
        { headers: TestUtils.createAuthHeaders(authToken) }
      );

      expect(dashboardStats.data.data.totalTrainsets).toBe(trainsetCount);
    });
  });

  describe('Error Handling', () => {
    it('should handle unauthorized requests correctly', async () => {
      try {
        await axios.get(`${config.backend.url}/api/trainsets`);
        fail('Should have thrown an error');
      } catch (error) {
        expect(error.response.status).toBe(401);
      }
    });

    it('should handle non-existent routes', async () => {
      try {
        await axios.get(
          `${config.backend.url}/api/non-existent-route`,
          { headers: TestUtils.createAuthHeaders(authToken) }
        );
        fail('Should have thrown an error');
      } catch (error) {
        expect(error.response.status).toBe(404);
      }
    });

    it('should handle AI service errors gracefully', async () => {
      try {
        await axios.get(
          `${config.aiService.url}/api/v1/optimization/status/non-existent-id`,
          { headers: TestUtils.createAuthHeaders(authToken) }
        );
        fail('Should have thrown an error');
      } catch (error) {
        expect(error.response.status).toBe(404);
      }
    });
  });

  describe('Performance Tests', () => {
    it('should handle concurrent requests efficiently', async () => {
      const startTime = Date.now();
      
      // Make 10 concurrent requests
      const promises = Array.from({ length: 10 }, () =>
        axios.get(
          `${config.backend.url}/api/trainsets`,
          { headers: TestUtils.createAuthHeaders(authToken) }
        )
      );

      const responses = await Promise.all(promises);
      const endTime = Date.now();
      const duration = endTime - startTime;

      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.data.success).toBe(true);
      });

      // Should complete within reasonable time (less than 10 seconds)
      expect(duration).toBeLessThan(10000);
      console.log(`✅ Completed ${promises.length} concurrent requests in ${duration}ms`);
    });

    it('should respond to API calls within acceptable time limits', async () => {
      const startTime = Date.now();
      
      const response = await axios.get(
        `${config.backend.url}/api/trainsets/stats/dashboard`,
        { headers: TestUtils.createAuthHeaders(authToken) }
      );
      
      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(5000); // Should respond within 5 seconds
    });
  });
});

// Global test setup
beforeAll(() => {
  // Increase timeout for integration tests
  jest.setTimeout(300000); // 5 minutes
});

afterAll(() => {
  console.log('🏁 System integration tests completed');
});
