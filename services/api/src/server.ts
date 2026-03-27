import cors from "cors";
import cookieParser from "cookie-parser";
import express from "express";
import type { NextFunction, Request, Response } from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import morgan from "morgan";
import { loadEnv } from "./config/env";
import { closeDb, connectWithRetry } from "./db/pool";
import { cache, closeRedis as closeRedisClient } from "./cache/client";
import { startCarePlanReminderCron } from "./carePlans/cron";
import { startProductionCronJobs } from "./cron/productionCron";
import { errorHandler } from "./middleware/errorHandler";
import { metricsHandler, metricsMiddleware } from "./metrics";
import { requestContext } from "./middleware/requestContext";
import { sanitizeInput } from "./middleware/sanitizeInput";
import { appointmentsRouter } from "./routes/appointments";
import { authRouter } from "./routes/auth";
import { carePlansRouter } from "./routes/carePlans";
import { healthRouter } from "./routes/health";
import { labsRouter } from "./routes/labs";
import { orgRouter } from "./routes/org";
import { patientRouter } from "./routes/patients";
import { platformAdminRouter } from "./routes/platformAdmin";
import { presenceRouter } from "./routes/presence";
import { communityRouter } from "./routes/community";
import { docsRouter } from "./routes/docs";
import { vitalsRouter } from "./routes/vitals";
import { initSocketServer } from "./realtime/socketServer";
import { startAppointmentReminderWorker } from "./workers/appointmentReminderWorker";
import { startLabExtractionWorker } from "./workers/labExtractor";
import { logger } from "./utils/logger";

const PORT = Number(process.env.API_PORT || 3001);
const CORS_ALLOWED_ORIGINS = (
    process.env.CORS_ALLOWED_ORIGINS ||
    "https://app.prevntiv.com,http://localhost:3000,http://localhost:8081"
)
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

const app = express();

loadEnv();

const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
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
app.use(sanitizeInput);
app.use(generalLimiter);
app.use("/auth", authLimiter);
app.use(metricsMiddleware);

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
app.use(patientRouter);
app.use(vitalsRouter);
app.use(labsRouter);
app.use(presenceRouter);
app.use(carePlansRouter);
app.use(appointmentsRouter);
app.use(communityRouter);
app.use(orgRouter);
app.use(platformAdminRouter);
app.use(docsRouter);
app.get("/metrics", (req, res) => {
    void metricsHandler(req, res);
});

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

    if (String(process.env.RUN_LAB_WORKER || "true") === "true") {
        startLabExtractionWorker();
    }
    if (String(process.env.RUN_APPOINTMENT_REMINDER_WORKER || "true") === "true") {
        startAppointmentReminderWorker();
    }
    if (String(process.env.RUN_CARE_PLAN_CRON || "true") === "true") {
        startCarePlanReminderCron();
    }
    if (String(process.env.RUN_PRODUCTION_CRON || "true") === "true") {
        startProductionCronJobs();
    }

    const { httpServer } = initSocketServer(app);

    const server = httpServer.listen(PORT, () => {
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
