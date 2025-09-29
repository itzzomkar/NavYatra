import { RedisClientType } from 'redis';
import { logger, performanceLogger } from '../utils/logger';
import { redisClient } from '../utils/redis';

interface CacheOptions {
  ttl?: number; // Time to live in seconds
  prefix?: string;
  compress?: boolean;
  serialize?: boolean;
}

interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  errors: number;
}

class CacheService {
  private client: RedisClientType;
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
    errors: 0
  };

  constructor(redisClient: RedisClientType) {
    this.client = redisClient;
  }

  // Generic cache get method
  async get<T>(key: string, options: CacheOptions = {}): Promise<T | null> {
    const start = Date.now();
    const fullKey = this.buildKey(key, options.prefix);

    try {
      const cached = await this.client.get(fullKey);
      const duration = Date.now() - start;

      if (cached === null) {
        this.stats.misses++;
        performanceLogger.logCacheOperation('GET', fullKey, duration, false);
        return null;
      }

      this.stats.hits++;
      performanceLogger.logCacheOperation('GET', fullKey, duration, true);

      if (options.serialize !== false) {
        return JSON.parse(cached) as T;
      }
      return cached as T;
    } catch (error) {
      this.stats.errors++;
      logger.error('Cache get error', { key: fullKey, error });
      return null;
    }
  }

  // Generic cache set method
  async set(key: string, value: any, options: CacheOptions = {}): Promise<boolean> {
    const start = Date.now();
    const fullKey = this.buildKey(key, options.prefix);

    try {
      let serializedValue: string;
      if (options.serialize !== false) {
        serializedValue = JSON.stringify(value);
      } else {
        serializedValue = value;
      }

      if (options.ttl) {
        await this.client.setEx(fullKey, options.ttl, serializedValue);
      } else {
        await this.client.set(fullKey, serializedValue);
      }

      const duration = Date.now() - start;
      this.stats.sets++;
      performanceLogger.logCacheOperation('SET', fullKey, duration);
      
      return true;
    } catch (error) {
      this.stats.errors++;
      logger.error('Cache set error', { key: fullKey, error });
      return false;
    }
  }

  // Delete cache entry
  async delete(key: string, options: CacheOptions = {}): Promise<boolean> {
    const start = Date.now();
    const fullKey = this.buildKey(key, options.prefix);

    try {
      const result = await this.client.del(fullKey);
      const duration = Date.now() - start;
      
      this.stats.deletes++;
      performanceLogger.logCacheOperation('DELETE', fullKey, duration);
      
      return result > 0;
    } catch (error) {
      this.stats.errors++;
      logger.error('Cache delete error', { key: fullKey, error });
      return false;
    }
  }

  // Delete multiple keys with pattern
  async deletePattern(pattern: string, options: CacheOptions = {}): Promise<number> {
    const fullPattern = this.buildKey(pattern, options.prefix);
    
    try {
      const keys = await this.client.keys(fullPattern);
      if (keys.length === 0) return 0;

      const result = await this.client.del(keys);
      this.stats.deletes += keys.length;
      
      logger.info(`Deleted ${result} cache keys matching pattern: ${fullPattern}`);
      return result;
    } catch (error) {
      this.stats.errors++;
      logger.error('Cache delete pattern error', { pattern: fullPattern, error });
      return 0;
    }
  }

  // Check if key exists
  async exists(key: string, options: CacheOptions = {}): Promise<boolean> {
    const fullKey = this.buildKey(key, options.prefix);
    
    try {
      const result = await this.client.exists(fullKey);
      return result > 0;
    } catch (error) {
      this.stats.errors++;
      logger.error('Cache exists error', { key: fullKey, error });
      return false;
    }
  }

  // Set with expiration
  async setWithTTL(key: string, value: any, ttlSeconds: number, options: CacheOptions = {}): Promise<boolean> {
    return this.set(key, value, { ...options, ttl: ttlSeconds });
  }

  // Get or set (if not exists, set and return the value)
  async getOrSet<T>(
    key: string, 
    getter: () => Promise<T>, 
    options: CacheOptions = {}
  ): Promise<T | null> {
    const cached = await this.get<T>(key, options);
    
    if (cached !== null) {
      return cached;
    }

    try {
      const value = await getter();
      if (value !== null && value !== undefined) {
        await this.set(key, value, options);
      }
      return value;
    } catch (error) {
      logger.error('Cache getOrSet error', { key, error });
      return null;
    }
  }

  // Increment counter
  async increment(key: string, amount: number = 1, options: CacheOptions = {}): Promise<number> {
    const fullKey = this.buildKey(key, options.prefix);
    
    try {
      const result = await this.client.incrBy(fullKey, amount);
      if (options.ttl) {
        await this.client.expire(fullKey, options.ttl);
      }
      return result;
    } catch (error) {
      this.stats.errors++;
      logger.error('Cache increment error', { key: fullKey, error });
      return 0;
    }
  }

  // Build full key with prefix
  private buildKey(key: string, prefix?: string): string {
    const basePrefix = 'kmrl';
    if (prefix) {
      return `${basePrefix}:${prefix}:${key}`;
    }
    return `${basePrefix}:${key}`;
  }

  // Get cache statistics
  getStats(): CacheStats & { hitRate: number } {
    const total = this.stats.hits + this.stats.misses;
    const hitRate = total > 0 ? (this.stats.hits / total) * 100 : 0;
    
    return {
      ...this.stats,
      hitRate: Math.round(hitRate * 100) / 100
    };
  }

  // Clear all statistics
  clearStats(): void {
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      errors: 0
    };
  }

  // Health check
  async healthCheck(): Promise<{ status: string; latency?: number }> {
    const start = Date.now();
    
    try {
      await this.client.ping();
      const latency = Date.now() - start;
      return { status: 'healthy', latency };
    } catch (error) {
      logger.error('Cache health check failed', error);
      return { status: 'unhealthy' };
    }
  }
}

// Specialized cache services for different domains
export class TrainsetCacheService extends CacheService {
  private readonly prefix = 'trainset';
  private readonly defaultTTL = 300; // 5 minutes

  async getTrainsetData(trainsetId: string) {
    return this.get(`data:${trainsetId}`, { prefix: this.prefix, ttl: this.defaultTTL });
  }

  async setTrainsetData(trainsetId: string, data: any) {
    return this.set(`data:${trainsetId}`, data, { prefix: this.prefix, ttl: this.defaultTTL });
  }

  async getTrainsetList(filters?: any) {
    const filterKey = filters ? btoa(JSON.stringify(filters)) : 'all';
    return this.get(`list:${filterKey}`, { prefix: this.prefix, ttl: 60 });
  }

  async setTrainsetList(data: any, filters?: any) {
    const filterKey = filters ? btoa(JSON.stringify(filters)) : 'all';
    return this.set(`list:${filterKey}`, data, { prefix: this.prefix, ttl: 60 });
  }

  async invalidateTrainset(trainsetId: string) {
    await Promise.all([
      this.delete(`data:${trainsetId}`, { prefix: this.prefix }),
      this.deletePattern('list:*', { prefix: this.prefix })
    ]);
  }
}

export class ScheduleCacheService extends CacheService {
  private readonly prefix = 'schedule';
  private readonly defaultTTL = 1800; // 30 minutes

  async getOptimizedSchedule(date: string, constraints?: any) {
    const constraintKey = constraints ? btoa(JSON.stringify(constraints)) : 'default';
    return this.get(`optimized:${date}:${constraintKey}`, { prefix: this.prefix, ttl: this.defaultTTL });
  }

  async setOptimizedSchedule(date: string, data: any, constraints?: any) {
    const constraintKey = constraints ? btoa(JSON.stringify(constraints)) : 'default';
    return this.set(`optimized:${date}:${constraintKey}`, data, { prefix: this.prefix, ttl: this.defaultTTL });
  }

  async getScheduleConflicts(date: string) {
    return this.get(`conflicts:${date}`, { prefix: this.prefix, ttl: 300 });
  }

  async setScheduleConflicts(date: string, conflicts: any) {
    return this.set(`conflicts:${date}`, conflicts, { prefix: this.prefix, ttl: 300 });
  }

  async invalidateScheduleDate(date: string) {
    await this.deletePattern(`*:${date}:*`, { prefix: this.prefix });
  }
}

export class OptimizationCacheService extends CacheService {
  private readonly prefix = 'optimization';
  private readonly defaultTTL = 3600; // 1 hour

  async getOptimizationResult(algorithm: string, parameters: any) {
    const paramKey = btoa(JSON.stringify(parameters));
    return this.get(`result:${algorithm}:${paramKey}`, { prefix: this.prefix, ttl: this.defaultTTL });
  }

  async setOptimizationResult(algorithm: string, parameters: any, result: any) {
    const paramKey = btoa(JSON.stringify(parameters));
    return this.set(`result:${algorithm}:${paramKey}`, result, { prefix: this.prefix, ttl: this.defaultTTL });
  }

  async getAlgorithmPerformance(algorithm: string) {
    return this.get(`performance:${algorithm}`, { prefix: this.prefix, ttl: 7200 });
  }

  async setAlgorithmPerformance(algorithm: string, performance: any) {
    return this.set(`performance:${algorithm}`, performance, { prefix: this.prefix, ttl: 7200 });
  }
}

export class AnalyticsCacheService extends CacheService {
  private readonly prefix = 'analytics';
  private readonly defaultTTL = 900; // 15 minutes

  async getPerformanceMetrics(dateRange: string, metrics: string[]) {
    const key = `performance:${dateRange}:${metrics.sort().join(',')}`;
    return this.get(key, { prefix: this.prefix, ttl: this.defaultTTL });
  }

  async setPerformanceMetrics(dateRange: string, metrics: string[], data: any) {
    const key = `performance:${dateRange}:${metrics.sort().join(',')}`;
    return this.set(key, data, { prefix: this.prefix, ttl: this.defaultTTL });
  }

  async getDashboardData(userId: string) {
    return this.get(`dashboard:${userId}`, { prefix: this.prefix, ttl: 300 });
  }

  async setDashboardData(userId: string, data: any) {
    return this.set(`dashboard:${userId}`, data, { prefix: this.prefix, ttl: 300 });
  }
}

// Cache warming service
export class CacheWarmingService {
  private trainsetCache: TrainsetCacheService;
  private scheduleCache: ScheduleCacheService;
  private analyticsCache: AnalyticsCacheService;

  constructor(cacheService: CacheService) {
    this.trainsetCache = new TrainsetCacheService(redisClient);
    this.scheduleCache = new ScheduleCacheService(redisClient);
    this.analyticsCache = new AnalyticsCacheService(redisClient);
  }

  async warmupTrainsetData() {
    logger.info('Starting trainset cache warmup');
    
    try {
      // This would typically fetch from database and cache frequently accessed data
      const trainsets: any[] = []; // await trainsetService.getAllActive();
      
      for (const trainset of trainsets) {
        await this.trainsetCache.setTrainsetData(trainset.id, trainset);
      }
      
      logger.info(`Warmed up ${trainsets.length} trainset records`);
    } catch (error) {
      logger.error('Trainset cache warmup failed', error);
    }
  }

  async warmupScheduleData() {
    logger.info('Starting schedule cache warmup');
    
    try {
      const today = new Date().toISOString().split('T')[0];
      const dates = [today]; // Add more dates as needed
      
      for (const date of dates) {
        // Warm up common optimization scenarios
        const commonConstraints = [
          { prioritizeBranding: true, energyEfficiencyWeight: 0.3 },
          { prioritizeBranding: false, energyEfficiencyWeight: 0.5 }
        ];
        
        for (const constraints of commonConstraints) {
          // This would typically run optimization and cache results
          // const result = await optimizationService.optimize(date, constraints);
          // await this.scheduleCache.setOptimizedSchedule(date, result, constraints);
        }
      }
      
      logger.info('Schedule cache warmup completed');
    } catch (error) {
      logger.error('Schedule cache warmup failed', error);
    }
  }

  async warmupAnalyticsData() {
    logger.info('Starting analytics cache warmup');
    
    try {
      const commonMetrics = ['punctuality', 'availability', 'energy_efficiency'];
      const commonDateRanges = ['last_7_days', 'last_30_days'];
      
      for (const dateRange of commonDateRanges) {
        // This would typically fetch analytics data and cache it
        // const data = await analyticsService.getPerformanceMetrics(dateRange, commonMetrics);
        // await this.analyticsCache.setPerformanceMetrics(dateRange, commonMetrics, data);
      }
      
      logger.info('Analytics cache warmup completed');
    } catch (error) {
      logger.error('Analytics cache warmup failed', error);
    }
  }

  async warmupAll() {
    logger.info('Starting complete cache warmup');
    
    await Promise.all([
      this.warmupTrainsetData(),
      this.warmupScheduleData(),
      this.warmupAnalyticsData()
    ]);
    
    logger.info('Complete cache warmup finished');
  }
}

// Export singleton instances
export const cacheService = new CacheService(redisClient);
export const trainsetCache = new TrainsetCacheService(redisClient);
export const scheduleCache = new ScheduleCacheService(redisClient);
export const optimizationCache = new OptimizationCacheService(redisClient);
export const analyticsCache = new AnalyticsCacheService(redisClient);
export const cacheWarming = new CacheWarmingService(cacheService);

export default cacheService;