import Redis from "ioredis";
import { logger } from "../utils/logger";

const REDIS_URL = process.env.REDIS_URL;

if (!REDIS_URL) {
    throw new Error("REDIS_URL is required");
}

export const redis = new Redis(REDIS_URL, {
    retryStrategy: (times) => {
        const delay = Math.min(times * 200, 3000);
        return delay;
    }
});

redis.on("connect", () => {
    logger.info("Redis connected");
});

redis.on("error", (error) => {
    logger.error("Redis error", { error: error.message });
});

export const cache = {
    async get<T>(key: string): Promise<T | null> {
        const raw = await redis.get(key);
        if (!raw) return null;
        return JSON.parse(raw) as T;
    },

    async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
        const payload = JSON.stringify(value);
        if (ttlSeconds && ttlSeconds > 0) {
            await redis.set(key, payload, "EX", ttlSeconds);
            return;
        }
        await redis.set(key, payload);
    },

    async del(key: string): Promise<void> {
        await redis.del(key);
    },

    async hget<T>(key: string, field: string): Promise<T | null> {
        const raw = await redis.hget(key, field);
        if (!raw) return null;
        return JSON.parse(raw) as T;
    },

    async hset<T>(key: string, field: string, value: T): Promise<void> {
        await redis.hset(key, field, JSON.stringify(value));
    }
};

export const verifyRedisConnection = async (): Promise<boolean> => {
    const pong = await redis.ping();
    return pong === "PONG";
};

export const closeRedis = async (): Promise<void> => {
    await redis.quit();
    logger.info("Redis client closed");
};
