import { createClient } from "redis";

export interface RedisConfig {
  username?: string;
  host: string;
  port: number;
  password: string;
}

export class RedisService {
  private client: ReturnType<typeof createClient>;
  private static instance: RedisService;

  private constructor(config: RedisConfig) {
    const validated = RedisService.validateConfig(config);

    this.client = createClient({
      username: validated.username || "default",
      password: validated.password,
      socket: {
        host: validated.host,
        port: validated.port,
      },
    });

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

  private static validateConfig(config: RedisConfig): Required<RedisConfig> {
    const { host, port, password, username } = config;
    console.log("redis config", config);

    const missing: string[] = [];
    if (!host) missing.push("host");
    if (!port) missing.push("port");
    if (!password) missing.push("password");

    if (missing.length > 0) {
      throw new Error(`Missing Redis config values: ${missing.join(", ")}`);
    }

    return {
      host: host!,
      port: port!,
      password: password!,
      username: username || "default",
    };
  }
  static getInstance(config?: RedisConfig): RedisService {
    console.log("config", config);
    if (!RedisService.instance) {
      if (!config) {
        throw new Error(
          "RedisService: No config provided. Please call getInstance(config) with Redis connection info."
        );
      }
      RedisService.instance = new RedisService(config);
    }
    return RedisService.instance;
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
    value: string,
    options?: { EX?: number }
  ): Promise<void> {
    try {
      await this.client.set(key, value, options);
    } catch (error) {
      console.error("Error setting Redis key:", error);
    }
  }

  async get(key: string): Promise<string | null> {
    try {
      const value = await this.client.get(key);
      return value || null;
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
  host: process.env.REDIS_HOST!,
  port: Number(process.env.REDIS_PORT!),
  password: process.env.REDIS_PASSWORD!,
  username: process.env.REDIS_USERNAME!,
});
