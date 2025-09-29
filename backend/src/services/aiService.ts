import axios, { AxiosInstance } from 'axios';
import { logger } from '../utils/logger';

export interface OptimizationRequest {
  trainsetsData: any[];
  constraints: {
    fitnessRequired?: boolean;
    priorityJobCards?: boolean;
    mileageBalancing?: boolean;
    brandingOptimization?: boolean;
    cleaningSlots?: boolean;
    stablingConstraints?: boolean;
  };
  parameters: {
    optimizationWindow?: number; // hours
    maxIterations?: number;
    convergenceThreshold?: number;
  };
  preferences: {
    preferenceWeights?: {
      fitness: number;
      jobCards: number;
      mileage: number;
      branding: number;
      cleaning: number;
      stabling: number;
    };
    penalties?: {
      fitnessViolation: number;
      jobCardDelay: number;
      mileageImbalance: number;
      brandingLoss: number;
    };
  };
}

export interface OptimizationResult {
  id: string;
  status: 'COMPLETED' | 'FAILED' | 'PROCESSING';
  executionTime: number;
  optimizationScore: number;
  recommendations: TrainsetAssignment[];
  constraints_satisfied: boolean;
  violations?: string[];
  metadata: {
    algorithm: string;
    convergence_iterations: number;
    solution_quality: number;
    confidence_score: number;
  };
}

export interface TrainsetAssignment {
  trainsetId: string;
  trainsetNumber: string;
  assignments: {
    inductionSlot: string;
    stablingPosition: string;
    cleaningSlot?: string;
    maintenanceWindow?: string;
    brandingPriority?: number;
  };
  reasons: string[];
  confidence: number;
}

export interface AnalyticsRequest {
  dateRange: {
    startDate: string;
    endDate: string;
  };
  metrics: string[];
  groupBy?: string[];
}

export interface MLPredictionRequest {
  trainsetId: string;
  predictionType: 'MAINTENANCE' | 'FAILURE' | 'PERFORMANCE' | 'MILEAGE';
  parameters: any;
}

class AIServiceClient {
  private client: AxiosInstance;
  private baseURL: string;
  private timeout: number = 60000; // 60 seconds for AI operations
  private retryAttempts: number = 3;

  constructor() {
    this.baseURL = process.env.AI_SERVICE_URL || 'http://localhost:8001';
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: this.timeout,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
    logger.info('AI Service client initialized', { baseURL: this.baseURL });
  }

  private setupInterceptors(): void {
    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        logger.debug('AI Service request', {
          method: config.method,
          url: config.url,
          params: config.params,
        });
        return config;
      },
      (error) => {
        logger.error('AI Service request error', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor with retry logic
    this.client.interceptors.response.use(
      (response) => {
        logger.debug('AI Service response', {
          status: response.status,
          url: response.config.url,
        });
        return response;
      },
      async (error) => {
        const originalRequest = error.config;

        // Retry on network errors or server errors (5xx)
        if (
          !originalRequest._retry &&
          (error.code === 'ECONNREFUSED' ||
            error.code === 'ECONNRESET' ||
            (error.response?.status >= 500 && error.response?.status < 600))
        ) {
          originalRequest._retry = true;
          originalRequest._retryCount = (originalRequest._retryCount || 0) + 1;

          if (originalRequest._retryCount <= this.retryAttempts) {
            logger.warn(`AI Service request failed, retrying... (${originalRequest._retryCount}/${this.retryAttempts})`, {
              url: originalRequest.url,
              error: error.message,
            });

            // Exponential backoff
            const delay = Math.pow(2, originalRequest._retryCount) * 1000;
            await new Promise(resolve => setTimeout(resolve, delay));

            return this.client(originalRequest);
          }
        }

        logger.error('AI Service response error', {
          status: error.response?.status,
          message: error.message,
          url: error.config?.url,
        });

        return Promise.reject(error);
      }
    );
  }

  /**
   * Check AI service health
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.client.get('/health/status');
      return response.status === 200;
    } catch (error) {
      logger.error('AI Service health check failed', error);
      return false;
    }
  }

  /**
   * Request schedule optimization
   */
  async requestOptimization(request: OptimizationRequest): Promise<OptimizationResult> {
    try {
      logger.info('Requesting schedule optimization from AI service', {
        trainsetsCount: request.trainsetsData.length,
        constraints: request.constraints,
      });

      const response = await this.client.post('/api/v1/optimization/schedule', request);
      
      logger.info('Optimization completed successfully', {
        id: response.data.id,
        score: response.data.optimizationScore,
        executionTime: response.data.executionTime,
      });

      return response.data;
    } catch (error) {
      logger.error('Schedule optimization failed', error);
      throw new Error(`AI Service optimization failed: ${(error as Error).message}`);
    }
  }

  /**
   * Get optimization status
   */
  async getOptimizationStatus(optimizationId: string): Promise<OptimizationResult> {
    try {
      const response = await this.client.get(`/api/v1/optimization/status/${optimizationId}`);
      return response.data;
    } catch (error) {
      logger.error('Failed to get optimization status', error);
      throw new Error(`Failed to get optimization status: ${(error as Error).message}`);
    }
  }

  /**
   * Request analytics data
   */
  async getAnalytics(request: AnalyticsRequest): Promise<any> {
    try {
      logger.info('Requesting analytics from AI service', request);

      const response = await this.client.post('/api/v1/analytics/generate', request);
      
      logger.info('Analytics generated successfully', {
        metricsCount: Object.keys(response.data).length,
      });

      return response.data;
    } catch (error) {
      logger.error('Analytics generation failed', error);
      throw new Error(`AI Service analytics failed: ${(error as Error).message}`);
    }
  }

  /**
   * Request ML predictions
   */
  async getPrediction(request: MLPredictionRequest): Promise<any> {
    try {
      logger.info('Requesting ML prediction from AI service', {
        trainsetId: request.trainsetId,
        predictionType: request.predictionType,
      });

      const response = await this.client.post('/api/v1/ml/predict', request);
      
      logger.info('ML prediction completed successfully', {
        trainsetId: request.trainsetId,
        predictionType: request.predictionType,
      });

      return response.data;
    } catch (error) {
      logger.error('ML prediction failed', error);
      throw new Error(`AI Service prediction failed: ${(error as Error).message}`);
    }
  }

  /**
   * Update ML model with new data
   */
  async updateModel(modelType: string, trainingData: any): Promise<any> {
    try {
      logger.info('Updating ML model', { modelType });

      const response = await this.client.post(`/api/v1/ml/models/${modelType}/update`, {
        training_data: trainingData,
      });

      logger.info('ML model updated successfully', { modelType });

      return response.data;
    } catch (error) {
      logger.error('ML model update failed', error);
      throw new Error(`AI Service model update failed: ${(error as Error).message}`);
    }
  }

  /**
   * Get model performance metrics
   */
  async getModelMetrics(modelType: string): Promise<any> {
    try {
      const response = await this.client.get(`/api/v1/ml/models/${modelType}/metrics`);
      return response.data;
    } catch (error) {
      logger.error('Failed to get model metrics', error);
      throw new Error(`Failed to get model metrics: ${(error as Error).message}`);
    }
  }

  /**
   * Validate constraints before optimization
   */
  async validateConstraints(constraints: any): Promise<{ valid: boolean; violations: string[] }> {
    try {
      const response = await this.client.post('/api/v1/optimization/validate', { constraints });
      return response.data;
    } catch (error) {
      logger.error('Constraint validation failed', error);
      throw new Error(`Constraint validation failed: ${(error as Error).message}`);
    }
  }

  /**
   * Get optimization history
   */
  async getOptimizationHistory(limit: number = 10): Promise<any[]> {
    try {
      const response = await this.client.get(`/api/v1/optimization/history?limit=${limit}`);
      return response.data;
    } catch (error) {
      logger.error('Failed to get optimization history', error);
      throw new Error(`Failed to get optimization history: ${(error as Error).message}`);
    }
  }
}

// Export singleton instance
export const aiService = new AIServiceClient();
export default aiService;
