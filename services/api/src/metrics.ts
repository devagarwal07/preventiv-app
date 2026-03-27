import type { NextFunction, Request, Response } from "express";
import {
    Counter,
    Gauge,
    Histogram,
    Registry,
    collectDefaultMetrics
} from "prom-client";

const register = new Registry();
collectDefaultMetrics({ register, prefix: "prevntiv_" });

export const httpRequestsTotal = new Counter({
    name: "http_requests_total",
    help: "Total number of HTTP requests",
    labelNames: ["method", "route", "status"] as const,
    registers: [register]
});

export const httpRequestDurationSeconds = new Histogram({
    name: "http_request_duration_seconds",
    help: "HTTP request duration in seconds",
    labelNames: ["method", "route", "status"] as const,
    buckets: [0.05, 0.1, 0.2, 0.4, 0.8, 1.5, 3, 5],
    registers: [register]
});

export const wsConnectionsActive = new Gauge({
    name: "ws_connections_active",
    help: "Current active websocket connections",
    registers: [register]
});

export const vitalsIngestedTotal = new Counter({
    name: "vitals_ingested_total",
    help: "Total number of ingested vitals",
    labelNames: ["source", "type"] as const,
    registers: [register]
});

export const aiAnalysisRequestsTotal = new Counter({
    name: "ai_analysis_requests_total",
    help: "Total number of AI analysis requests",
    labelNames: ["status"] as const,
    registers: [register]
});

export const notificationSentTotal = new Counter({
    name: "notification_sent_total",
    help: "Total number of notification send requests",
    labelNames: ["channel"] as const,
    registers: [register]
});

export const labExtractionDurationSeconds = new Histogram({
    name: "lab_extraction_duration_seconds",
    help: "Lab extraction duration in seconds",
    buckets: [0.1, 0.3, 0.8, 1.5, 3, 5, 10, 20],
    registers: [register]
});

export const metricsMiddleware = (req: Request, res: Response, next: NextFunction): void => {
    const start = process.hrtime.bigint();

    res.on("finish", () => {
        const route = req.route?.path || req.path || "unknown";
        const status = String(res.statusCode);
        const method = req.method;

        const elapsedSeconds = Number(process.hrtime.bigint() - start) / 1_000_000_000;

        httpRequestsTotal.inc({ method, route, status });
        httpRequestDurationSeconds.observe({ method, route, status }, elapsedSeconds);
    });

    next();
};

export const metricsHandler = async (_req: Request, res: Response): Promise<void> => {
    res.setHeader("Content-Type", register.contentType);
    res.end(await register.metrics());
};
