import request from 'supertest';
import { app } from '../../src/server';

describe('Performance Tests', () => {
  let authToken: string;
  const PERFORMANCE_THRESHOLD = 1000; // 1 second
  const CONCURRENT_REQUESTS = 10;

  beforeAll(async () => {
    // Get auth token for authenticated endpoints
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin@kmrl.gov.in',
        password: 'admin123!'
      });

    if (loginResponse.body.success) {
      authToken = loginResponse.body.data.tokens.access;
    }
  });

  describe('Response Time Tests', () => {
    it('health check should respond quickly', async () => {
      const startTime = Date.now();
      
      const response = await request(app)
        .get('/health')
        .expect(200);
      
      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(PERFORMANCE_THRESHOLD);
      expect(response.body.status).toBe('healthy');
    });

    it('trainsets list should respond within threshold', async () => {
      const startTime = Date.now();
      
      const response = await request(app)
        .get('/api/trainsets')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(PERFORMANCE_THRESHOLD);
      expect(response.body.success).toBe(true);
    });

    it('analytics dashboard should respond within threshold', async () => {
      const startTime = Date.now();
      
      const response = await request(app)
        .get('/api/analytics/dashboard')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(PERFORMANCE_THRESHOLD);
      expect(response.body.success).toBe(true);
    });

    it('fitness certificates should respond within threshold', async () => {
      const startTime = Date.now();
      
      const response = await request(app)
        .get('/api/fitness')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(PERFORMANCE_THRESHOLD);
      expect(response.body.success).toBe(true);
    });

    it('job cards list should respond within threshold', async () => {
      const startTime = Date.now();
      
      const response = await request(app)
        .get('/api/job-cards')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(PERFORMANCE_THRESHOLD);
      expect(response.body.success).toBe(true);
    });
  });

  describe('Concurrent Request Tests', () => {
    it('should handle concurrent health check requests', async () => {
      const requests = Array(CONCURRENT_REQUESTS)
        .fill(null)
        .map(() => request(app).get('/health'));

      const responses = await Promise.all(requests);
      
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.status).toBe('healthy');
      });
    });

    it('should handle concurrent authenticated requests', async () => {
      const requests = Array(CONCURRENT_REQUESTS)
        .fill(null)
        .map(() => 
          request(app)
            .get('/api/trainsets')
            .set('Authorization', `Bearer ${authToken}`)
        );

      const responses = await Promise.all(requests);
      
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });

    it('should handle concurrent different endpoint requests', async () => {
      const endpoints = [
        '/api/trainsets',
        '/api/fitness',
        '/api/job-cards',
        '/api/analytics/dashboard',
        '/api/users'
      ];

      const requests = endpoints.map(endpoint =>
        request(app)
          .get(endpoint)
          .set('Authorization', `Bearer ${authToken}`)
      );

      const responses = await Promise.all(requests);
      
      responses.forEach(response => {
        expect([200, 401, 403]).toContain(response.status); // Some might require specific permissions
        if (response.status === 200) {
          expect(response.body.success).toBe(true);
        }
      });
    });
  });

  describe('Load Testing', () => {
    it('should handle sustained load', async () => {
      const LOAD_TEST_DURATION = 5000; // 5 seconds
      const REQUEST_INTERVAL = 100; // 100ms between requests
      const startTime = Date.now();
      const responses: any[] = [];

      while (Date.now() - startTime < LOAD_TEST_DURATION) {
        const response = await request(app)
          .get('/health')
          .timeout(2000); // 2 second timeout
        
        responses.push(response);
        
        // Wait before next request
        await new Promise(resolve => setTimeout(resolve, REQUEST_INTERVAL));
      }

      expect(responses.length).toBeGreaterThan(10);
      
      // Check that most requests were successful
      const successfulResponses = responses.filter(r => r.status === 200);
      const successRate = (successfulResponses.length / responses.length) * 100;
      
      expect(successRate).toBeGreaterThan(95); // At least 95% success rate
    });

    it('should handle paginated requests efficiently', async () => {
      const pageSize = 50;
      const pages = [1, 2, 3, 4, 5];
      
      const requests = pages.map(page =>
        request(app)
          .get(`/api/trainsets?page=${page}&limit=${pageSize}`)
          .set('Authorization', `Bearer ${authToken}`)
      );

      const startTime = Date.now();
      const responses = await Promise.all(requests);
      const totalTime = Date.now() - startTime;

      // All requests should complete within reasonable time
      expect(totalTime).toBeLessThan(PERFORMANCE_THRESHOLD * 2);

      responses.forEach((response, index) => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.pagination.page).toBe(pages[index]);
        expect(response.body.data.pagination.limit).toBe(pageSize);
      });
    });
  });

  describe('Memory Usage Tests', () => {
    it('should not leak memory during repeated requests', async () => {
      const initialMemory = process.memoryUsage();
      
      // Make 50 requests
      for (let i = 0; i < 50; i++) {
        await request(app)
          .get('/api/trainsets')
          .set('Authorization', `Bearer ${authToken}`);
      }
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      
      // Memory increase should be reasonable (less than 50MB)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    });
  });

  describe('Database Performance Tests', () => {
    it('should handle complex queries efficiently', async () => {
      const startTime = Date.now();
      
      const response = await request(app)
        .get('/api/analytics/maintenance?period=90')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(PERFORMANCE_THRESHOLD * 2); // 2 seconds for complex queries
      expect(response.body.success).toBe(true);
    });

    it('should handle search queries efficiently', async () => {
      const searchTerms = ['KMRL', 'Alstom', 'Maintenance', 'Available'];
      
      const requests = searchTerms.map(term =>
        request(app)
          .get(`/api/trainsets?search=${term}`)
          .set('Authorization', `Bearer ${authToken}`)
      );

      const startTime = Date.now();
      const responses = await Promise.all(requests);
      const totalTime = Date.now() - startTime;

      expect(totalTime).toBeLessThan(PERFORMANCE_THRESHOLD * searchTerms.length);

      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });

    it('should handle aggregation queries efficiently', async () => {
      const aggregationEndpoints = [
        '/api/trainsets/stats/dashboard',
        '/api/fitness/stats/dashboard',
        '/api/job-cards/stats/dashboard',
        '/api/analytics/dashboard'
      ];

      const requests = aggregationEndpoints.map(endpoint =>
        request(app)
          .get(endpoint)
          .set('Authorization', `Bearer ${authToken}`)
      );

      const startTime = Date.now();
      const responses = await Promise.all(requests);
      const totalTime = Date.now() - startTime;

      expect(totalTime).toBeLessThan(PERFORMANCE_THRESHOLD * 2);

      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });
  });

  describe('Rate Limiting Tests', () => {
    it('should enforce rate limits correctly', async () => {
      const requests = Array(120) // Exceed the 100 requests per 15 minutes limit
        .fill(null)
        .map(() => 
          request(app)
            .get('/api/trainsets')
            .set('Authorization', `Bearer ${authToken}`)
        );

      const responses = await Promise.allSettled(requests);
      
      const successfulResponses = responses.filter(
        result => result.status === 'fulfilled' && result.value.status === 200
      );
      
      const rateLimitedResponses = responses.filter(
        result => result.status === 'fulfilled' && result.value.status === 429
      );

      expect(successfulResponses.length).toBeLessThanOrEqual(100);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling Performance', () => {
    it('should handle 404 errors quickly', async () => {
      const startTime = Date.now();
      
      const response = await request(app)
        .get('/api/non-existent-endpoint')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
      
      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(500); // 404s should be very fast
      expect(response.body.error).toBeDefined();
    });

    it('should handle validation errors quickly', async () => {
      const startTime = Date.now();
      
      const response = await request(app)
        .post('/api/trainsets')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ /* invalid data */ })
        .expect(400);
      
      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(500);
      expect(response.body.error).toBeDefined();
    });

    it('should handle authentication errors quickly', async () => {
      const startTime = Date.now();
      
      const response = await request(app)
        .get('/api/trainsets')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
      
      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(500);
      expect(response.body.error).toBeDefined();
    });
  });
});
