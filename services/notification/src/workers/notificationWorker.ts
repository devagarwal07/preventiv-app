import Queue from "bull";
import { sendPush } from "../channels/push";
import { sendEmail } from "../channels/email";
import { sendInApp } from "../channels/inApp";
import { pool } from "../utils/db";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

export type NotificationJob = {
    mode: "immediate" | "scheduled" | "digest";
    userId: string;
    patientId?: string;
    professionalId?: string;
    type: string;
    channels: Array<"push" | "email" | "inApp">;
    payload: {
        title?: string;
        body?: string;
        message?: string;
        email?: string;
        template?: string;
        templateVars?: Record<string, string | number | boolean | null | undefined>;
    };
};

export const notificationQueue = new Queue<NotificationJob>("notifications", REDIS_URL);

const logDelivery = async (job: NotificationJob, channel: string, status: "sent" | "failed", error?: string) => {
    await pool.query(
        `
      INSERT INTO notifications_log (user_id, type, channel, status, payload, error_message, created_at)
      VALUES ($1, $2, $3, $4, $5::jsonb, $6, NOW())
    `,
        [job.userId, job.type, channel, status, JSON.stringify(job.payload), error || null]
    );
};

export const startNotificationWorker = (): void => {
    notificationQueue.process(3, async (job) => {
        const data = job.data;

        await Promise.all(
            data.channels.map(async (channel) => {
                try {
                    if (channel === "push") {
                        await sendPush(data.userId, {
                            title: data.payload.title || "Prevntiv",
                            body: data.payload.body || data.payload.message || "Health update",
                            data: { type: data.type }
                        });
                    }

                    if (channel === "email" && data.payload.email && data.payload.template) {
                        await sendEmail(
                            data.payload.email,
                            data.payload.title || "Prevntiv update",
                            data.payload.template,
                            data.payload.templateVars || {}
                        );
                    }

                    if (channel === "inApp" && data.patientId) {
                        await sendInApp({
                            patientId: data.patientId,
                            professionalId: data.professionalId || null,
                            type: data.type,
                            message: data.payload.message || data.payload.body || "Health notification"
                        });
                    }

                    await logDelivery(data, channel, "sent");
                } catch (error) {
                    await logDelivery(
                        data,
                        channel,
                        "failed",
                        error instanceof Error ? error.message : "Unknown error"
                    );
                    throw error;
                }
            })
        );
    });
};
