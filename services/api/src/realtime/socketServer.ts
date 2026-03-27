import { createServer } from "http";
import type { Express } from "express";
import { Server } from "socket.io";
import type { Socket } from "socket.io";
import { verifyAccessToken } from "../utils/tokens";
import type { ClientToServerEvents, ServerToClientEvents } from "./socketTypes";
import { redis } from "../cache/client";
import { createManualVital } from "../vitals/service";
import { pool } from "../db/pool";
import { wsConnectionsActive } from "../metrics";

type UserPayload = {
    id: string;
    role: string;
    orgId?: string | null;
};

let ioRef: Server<ClientToServerEvents, ServerToClientEvents> | null = null;

export const initSocketServer = (app: Express) => {
    const httpServer = createServer(app);

    const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
        cors: {
            origin: (process.env.CORS_ALLOWED_ORIGINS || "http://localhost:3000").split(",")
        }
    });

    io.use((socket, next) => {
        try {
            const token = String(socket.handshake.auth?.token || socket.handshake.query?.token || "");
            if (!token) return next(new Error("Missing token"));
            const user = verifyAccessToken(token);
            socket.data.user = user as unknown as UserPayload;
            next();
        } catch (error) {
            next(new Error(error instanceof Error ? error.message : "Auth failed"));
        }
    });

    io.on("connection", async (socket: Socket<ClientToServerEvents, ServerToClientEvents>) => {
        wsConnectionsActive.inc();
        const user = socket.data.user;
        if (!user) {
            socket.disconnect(true);
            return;
        }

        if (user.role === "patient") {
            socket.join(`patient:${user.id}`);
        }
        socket.join(`professional:${user.id}`);
        if (user.orgId) {
            socket.join(`org:${user.orgId}`);
        }

        await redis.hset(`online:${user.id}`, "last_seen", new Date().toISOString());

        socket.on("vital:submit", async (payload) => {
            if (user.role !== "patient") return;
            const vital = await createManualVital(user.id, payload.type as never, payload.value, payload.timestamp);
            io.to(`patient:${user.id}`).emit("vital:added", { vital });
        });

        socket.on("notification:read", async (payload) => {
            await pool.query(
                `
          UPDATE alerts
          SET is_read = TRUE, read_at = NOW()
          WHERE id = $1 AND (patient_id = $2 OR professional_id = $2)
        `,
                [payload.notificationId, user.id]
            );
        });

        socket.on("disconnect", async () => {
            wsConnectionsActive.dec();
            await redis.hset(`online:${user.id}`, "last_seen", new Date().toISOString());
        });
    });

    const subscriber = redis.duplicate();
    void subscriber.connect();
    void subscriber.subscribe("realtime:alerts");
    subscriber.on("message", (channel, message) => {
        if (channel !== "realtime:alerts") return;

        try {
            const data = JSON.parse(message) as { event: string; payload: { patientId?: string; professionalId?: string } };
            if (data.event === "alert:new") {
                if (data.payload.patientId) {
                    io.to(`patient:${data.payload.patientId}`).emit("alert:new", { alert: data.payload });
                }
                if (data.payload.professionalId) {
                    io.to(`professional:${data.payload.professionalId}`).emit("alert:new", { alert: data.payload });
                }
            }
        } catch {
            return;
        }
    });

    ioRef = io;
    return { io, httpServer };
};

export const socketEvents = {
    emitVitalAdded(patientId: string, vital: unknown) {
        ioRef?.to(`patient:${patientId}`).emit("vital:added", { vital });
    },
    emitAnomalyDetected(patientId: string, anomaly: unknown, vital: unknown) {
        ioRef?.to(`patient:${patientId}`).emit("anomaly:detected", { anomaly, vital });
    },
    emitCarePlanUpdated(patientId: string, carePlan: unknown) {
        ioRef?.to(`patient:${patientId}`).emit("care-plan:updated", { carePlan });
    },
    emitLabReportProcessed(patientId: string, reportId: string, extractedData: unknown) {
        ioRef?.to(`patient:${patientId}`).emit("lab-report:processed", { reportId, extractedData });
    },
    emitRiskScoreUpdated(patientId: string, riskScores: unknown, assignedDoctorId?: string) {
        ioRef?.to(`patient:${patientId}`).emit("risk-score:updated", { riskScores });
        if (assignedDoctorId) {
            ioRef?.to(`professional:${assignedDoctorId}`).emit("risk-score:updated", { riskScores });
        }
    },
    emitFollowUpReminder(patientId: string, appointment: unknown) {
        ioRef?.to(`patient:${patientId}`).emit("follow-up:reminder", { appointment });
    }
};
