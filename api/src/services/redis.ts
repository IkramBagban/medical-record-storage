import { createClient } from "redis";

export interface RedisConfig {
  REDIS_URL?: string;
}

export class RedisService {
  private client: ReturnType<typeof createClient>;
  private static instance: RedisService;

  private constructor(private config: Required<RedisConfig>) {
    this.client = createClient({ url: this.config.REDIS_URL });
    this.client.on("connect", () => {
      console.log("Redis connected successfully");
    });

    this.client.on("error", (err) => {
      console.error("Redis connection error:", err);
    });

    this.client.on("close", () => {
      console.log("Redis connection closed");
    });
    this.connect();
  }

  static getInstance(config: RedisConfig = {}): RedisService {
    if (!RedisService.instance) {
      const validatedConfig = this.validateConfig(config);
      RedisService.instance = new RedisService(validatedConfig);
    }
    return RedisService.instance;
  }

  private static validateConfig(config: RedisConfig): Required<RedisConfig> {
    const REDIS_URL =
      config.REDIS_URL || process.env.REDIS_URL || "redis://localhost:6379";

    if (!config.REDIS_URL && !process.env.REDIS_URL) {
      console.info(
        "No REDIS_URL provided. Using default redis://localhost:6379"
      );
    }

    return { REDIS_URL };
  }

  async connect(): Promise<void> {
    try {
      if (!this.client.isOpen) {
        await this.client.connect();
      }
      console.log("Connected to Redis");
    } catch (error) {
      console.error("Failed to connect to Redis:", error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    await this.client.disconnect();
  }
  async set(
    key: string,
    value: any,
    options?: { EX?: number; json?: boolean }
  ): Promise<void> {
    try {
      const storeValue =
        options?.json === true ? JSON.stringify(value) : String(value);
      const { json, ...redisOptions } = options || {};

      await this.client.set(key, storeValue, redisOptions);
    } catch (error) {
      console.error("Error setting Redis key:", error);
    }
  }

  async get<T = string>(
    key: string,
    options?: { json?: boolean }
  ): Promise<T | string | null> {
    try {
      const value = await this.client.get(key);
      if (!value) return null;

      return options?.json === true ? JSON.parse(value) : value;
    } catch (error) {
      console.error("Error getting Redis key:", error);
      return null;
    }
  }

  async del(key: string): Promise<boolean> {
    try {
      await this.client.del(key);
      return true;
    } catch (error) {
      console.error(`Failed to delete key "${key}":`, error);
      return false;
    }
  }

  async incr(key: string): Promise<number> {
    try {
      const value = await this.client.incr(key);
      return value;
    } catch (error) {
      console.error(`Failed to increment key "${key}":`, error);
      throw error;
    }
  }

  async deleteKeysByPattern(pattern: string): Promise<void> {
    let cursor = "0";
    let totalDeleted = 0;

    while (true) {
      const { cursor: nextCursor, keys } = await this.client.scan(cursor, {
        MATCH: pattern,
      });

      if (Array.isArray(keys) && keys.length > 0) {
        console.log(`Deleting keys: ${keys.join(", ")}`);
        const deletedCount = await this.client.del(keys);
        console.log(
          `Deleted ${deletedCount} keys matching pattern "${pattern}"`
        );
        totalDeleted += keys.length;
      }

      if (nextCursor === "0") break;
      cursor = nextCursor;
    }

    console.log(
      `🧹 Deleted ${totalDeleted} keys matching pattern "${pattern}"`
    );
  }

  async expire(key: string, seconds: number): Promise<void> {
    await this.client.expire(key, seconds);
  }

  async ping(): Promise<string> {
    return await this.client.ping();
  }

  async isConnected(): Promise<boolean> {
    try {
      await this.ping();
      return true;
    } catch (error) {
      return false;
    }
  }
}

export const redisService = RedisService.getInstance({
  REDIS_URL: process.env.REDIS_URL,
});
