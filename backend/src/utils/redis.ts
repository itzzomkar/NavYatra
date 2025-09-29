import { createClient, RedisClientType } from 'redis';
import { logger } from './logger';

class RedisService {
  private static instance: RedisService;
  private client: RedisClientType;
  private isConnected: boolean = false;

  private constructor() {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    
    this.client = createClient({
      url: redisUrl,
      socket: {
        reconnectStrategy: (retries) => {
          if (retries > 10) {
            logger.error('Redis: Maximum reconnection attempts reached');
            return new Error('Redis: Maximum reconnection attempts reached');
          }
          return Math.min(retries * 100, 3000);
        },
      },
    });

    this.setupEventHandlers();
  }

  public static getInstance(): RedisService {
    if (!RedisService.instance) {
      RedisService.instance = new RedisService();
    }
    return RedisService.instance;
  }

  private setupEventHandlers(): void {
    this.client.on('connect', () => {
      logger.info('✅ Redis connecting...');
    });

    this.client.on('ready', () => {
      logger.info('✅ Redis connected and ready');
      this.isConnected = true;
    });

    this.client.on('error', (error) => {
      logger.error('❌ Redis connection error:', error);
      this.isConnected = false;
    });

    this.client.on('end', () => {
      logger.info('🔌 Redis connection ended');
      this.isConnected = false;
    });

    this.client.on('reconnecting', () => {
      logger.info('🔄 Redis reconnecting...');
    });
  }

  public async connect(): Promise<void> {
    try {
      if (!this.isConnected) {
        await this.client.connect();
      }
    } catch (error) {
      logger.error('Failed to connect to Redis:', error);
      logger.warn('Running without Redis caching - this may impact performance');
      // Don't throw error - allow app to run without Redis
    }
  }

  public async disconnect(): Promise<void> {
    try {
      if (this.isConnected) {
        await this.client.disconnect();
      }
    } catch (error) {
      logger.error('Failed to disconnect from Redis:', error);
      throw error;
    }
  }

  public getClient(): RedisClientType {
    return this.client;
  }

  public isClientConnected(): boolean {
    return this.isConnected;
  }

  // Cache operations
  public async get(key: string): Promise<string | null> {
    if (!this.isConnected) return null;
    try {
      return await this.client.get(key);
    } catch (error) {
      logger.error(`Redis GET error for key ${key}:`, error);
      return null;
    }
  }

  public async set(
    key: string, 
    value: string, 
    expiration?: number
  ): Promise<boolean> {
    if (!this.isConnected) return false;
    try {
      if (expiration) {
        await this.client.setEx(key, expiration, value);
      } else {
        await this.client.set(key, value);
      }
      return true;
    } catch (error) {
      logger.error(`Redis SET error for key ${key}:`, error);
      return false;
    }
  }

  public async del(key: string): Promise<boolean> {
    try {
      await this.client.del(key);
      return true;
    } catch (error) {
      logger.error(`Redis DEL error for key ${key}:`, error);
      return false;
    }
  }

  public async exists(key: string): Promise<boolean> {
    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      logger.error(`Redis EXISTS error for key ${key}:`, error);
      return false;
    }
  }

  public async expire(key: string, seconds: number): Promise<boolean> {
    try {
      const result = await this.client.expire(key, seconds);
      return result;
    } catch (error) {
      logger.error(`Redis EXPIRE error for key ${key}:`, error);
      return false;
    }
  }

  // Hash operations
  public async hGet(key: string, field: string): Promise<string | null> {
    try {
      return await this.client.hGet(key, field) || null;
    } catch (error) {
      logger.error(`Redis HGET error for key ${key}, field ${field}:`, error);
      return null;
    }
  }

  public async hSet(
    key: string, 
    field: string, 
    value: string
  ): Promise<boolean> {
    try {
      await this.client.hSet(key, field, value);
      return true;
    } catch (error) {
      logger.error(`Redis HSET error for key ${key}, field ${field}:`, error);
      return false;
    }
  }

  public async hGetAll(key: string): Promise<Record<string, string> | null> {
    try {
      return await this.client.hGetAll(key);
    } catch (error) {
      logger.error(`Redis HGETALL error for key ${key}:`, error);
      return null;
    }
  }

  // List operations
  public async lPush(key: string, ...values: string[]): Promise<number | null> {
    try {
      return await this.client.lPush(key, values);
    } catch (error) {
      logger.error(`Redis LPUSH error for key ${key}:`, error);
      return null;
    }
  }

  public async lPop(key: string): Promise<string | null> {
    try {
      return await this.client.lPop(key);
    } catch (error) {
      logger.error(`Redis LPOP error for key ${key}:`, error);
      return null;
    }
  }

  public async lRange(
    key: string, 
    start: number, 
    stop: number
  ): Promise<string[] | null> {
    try {
      return await this.client.lRange(key, start, stop);
    } catch (error) {
      logger.error(`Redis LRANGE error for key ${key}:`, error);
      return null;
    }
  }

  // Set operations
  public async sAdd(key: string, ...members: string[]): Promise<number | null> {
    try {
      return await this.client.sAdd(key, members);
    } catch (error) {
      logger.error(`Redis SADD error for key ${key}:`, error);
      return null;
    }
  }

  public async sMembers(key: string): Promise<string[] | null> {
    try {
      return await this.client.sMembers(key);
    } catch (error) {
      logger.error(`Redis SMEMBERS error for key ${key}:`, error);
      return null;
    }
  }

  // Pattern-based operations
  public async keys(pattern: string): Promise<string[]> {
    try {
      return await this.client.keys(pattern);
    } catch (error) {
      logger.error(`Redis KEYS error for pattern ${pattern}:`, error);
      return [];
    }
  }

  public async ping(): Promise<string> {
    try {
      return await this.client.ping();
    } catch (error) {
      logger.error('Redis PING error:', error);
      throw error;
    }
  }

  // JSON operations (for complex data structures)
  public async setJson(
    key: string, 
    value: any, 
    expiration?: number
  ): Promise<boolean> {
    return this.set(key, JSON.stringify(value), expiration);
  }

  public async getJson<T>(key: string): Promise<T | null> {
    const value = await this.get(key);
    if (value === null) return null;
    
    try {
      return JSON.parse(value) as T;
    } catch (error) {
      logger.error(`JSON parse error for key ${key}:`, error);
      return null;
    }
  }
}

// Export singleton instance
const redisService = RedisService.getInstance();

// Initialize connection
redisService.connect().catch((error) => {
  logger.error('Failed to initialize Redis connection:', error);
});

export const redisClient = redisService.getClient();
export default redisService;
