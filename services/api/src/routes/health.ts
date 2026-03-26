import { Router } from "express";
import { verifyDbConnection } from "../db/pool";
import { verifyRedisConnection } from "../cache/client";

export const healthRouter = Router();

const startedAt = Date.now();

healthRouter.get("/health", async (_req, res) => {
    const [dbOk, redisOk] = await Promise.allSettled([verifyDbConnection(), verifyRedisConnection()]);

    const db = dbOk.status === "fulfilled" && dbOk.value ? "up" : "down";
    const redis = redisOk.status === "fulfilled" && redisOk.value ? "up" : "down";
    const status = db === "up" && redis === "up" ? "ok" : "degraded";

    res.status(status === "ok" ? 200 : 503).json({
        status,
        db,
        redis,
        uptime: Math.round((Date.now() - startedAt) / 1000)
    });
});
