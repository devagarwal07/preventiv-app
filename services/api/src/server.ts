import cors from "cors";
import cookieParser from "cookie-parser";
import express from "express";
import type { NextFunction, Request, Response } from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import morgan from "morgan";
import { closeDb, connectWithRetry } from "./db/pool";
import { cache, closeRedis as closeRedisClient } from "./cache/client";
import { errorHandler } from "./middleware/errorHandler";
import { requestContext } from "./middleware/requestContext";
import { authRouter } from "./routes/auth";
import { healthRouter } from "./routes/health";
import { logger } from "./utils/logger";

const PORT = Number(process.env.API_PORT || 3001);
const CORS_ALLOWED_ORIGINS = (process.env.CORS_ALLOWED_ORIGINS || "http://localhost:3000")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

const app = express();

const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false
});

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false
});

app.use(helmet());
app.use(
    cors({
        origin: (origin, callback) => {
            if (!origin || CORS_ALLOWED_ORIGINS.includes(origin)) {
                callback(null, true);
                return;
            }
            callback(new Error("Origin not allowed by CORS"));
        },
        credentials: true
    })
);
app.use(requestContext);
app.use(cookieParser());
app.use(express.json({ limit: "10mb" }));
app.use(generalLimiter);
app.use("/auth", authLimiter);

const activeRequests = new Set<symbol>();
app.use((req: Request, res: Response, next: NextFunction) => {
    const requestToken = Symbol(req.requestId);
    activeRequests.add(requestToken);
    res.on("finish", () => activeRequests.delete(requestToken));
    next();
});

app.use(
    morgan("combined", {
        stream: {
            write: (message: string) => {
                logger.info(message.trim());
            }
        }
    })
);

app.use(healthRouter);
app.use(authRouter);

app.use(errorHandler);

let isShuttingDown = false;

const closeServer = async (server: ReturnType<typeof app.listen>): Promise<void> => {
    if (isShuttingDown) return;
    isShuttingDown = true;

    logger.info("SIGTERM received, starting graceful shutdown");

    server.close(async () => {
        try {
            const drainStart = Date.now();
            while (activeRequests.size > 0 && Date.now() - drainStart < 20000) {
                await new Promise((resolve) => setTimeout(resolve, 200));
            }

            await Promise.all([closeDb(), closeRedisClient()]);
            logger.info("Graceful shutdown completed");
            process.exit(0);
        } catch (error) {
            logger.error("Error during graceful shutdown", {
                error: error instanceof Error ? error.message : "Unknown error"
            });
            process.exit(1);
        }
    });
};

const start = async (): Promise<void> => {
    await connectWithRetry();
    await cache.set("startup:ping", { ok: true }, 10);

    const server = app.listen(PORT, () => {
        logger.info(`Prevntiv API listening on port ${PORT}`);
    });

    process.on("SIGTERM", () => {
        void closeServer(server);
    });
};

start().catch((error) => {
    logger.error("Failed to start API service", {
        error: error instanceof Error ? error.message : "Unknown error"
    });
    process.exit(1);
});
