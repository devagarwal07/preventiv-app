import { pool } from "../utils/db";
import { redis } from "../utils/redis";
import { notificationQueue } from "./notificationWorker";

const AI_ENGINE_URL = process.env.AI_ENGINE_URL || "http://ai-engine:8000";
const INTERNAL_SERVICE_KEY = process.env.INTERNAL_SERVICE_KEY || "dev-internal-key";

const createAlertForProfessionals = async (patientId: string, message: string): Promise<void> => {
    const professionals = await pool.query<{ professional_id: string }>(
        `SELECT professional_id FROM org_patient_assignments WHERE patient_id = $1`,
        [patientId]
    );

    for (const row of professionals.rows) {
        await pool.query(
            `
        INSERT INTO alerts (patient_id, professional_id, type, message)
        VALUES ($1, $2, 'anomaly_detected', $3)
      `,
            [patientId, row.professional_id, message]
        );

        await notificationQueue.add({
            mode: "immediate",
            userId: row.professional_id,
            patientId,
            professionalId: row.professional_id,
            type: "anomaly_detected",
            channels: ["push", "inApp"],
            payload: {
                title: "Patient anomaly detected",
                body: message,
                message
            }
        });
    }
};

export const startVitalEventSubscriber = (): void => {
    const subscriber = redis.duplicate();

    subscriber.on("error", (error) => {
        process.stderr.write(`vital event subscriber error: ${error.message}\n`);
    });

    void subscriber.subscribe("vital:new", (error) => {
        if (error) {
            process.stderr.write(`subscribe failed: ${error.message}\n`);
        }
    });

    subscriber.on("message", async (channel, payload) => {
        if (channel !== "vital:new") {
            return;
        }

        try {
            const event = JSON.parse(payload) as {
                vitalId: string;
                patientId: string;
                type: string;
                value: Record<string, unknown>;
            };

            const response = await fetch(`${AI_ENGINE_URL}/ai/anomaly-detect`, {
                method: "POST",
                headers: {
                    "content-type": "application/json",
                    "x-service-key": INTERNAL_SERVICE_KEY
                },
                body: JSON.stringify({ patient_id: event.patientId, type: event.type, value: event.value })
            });

            if (!response.ok) {
                await redis.lpush("queue:anomaly-retry", payload);
                return;
            }

            const anomaly = (await response.json()) as {
                is_anomaly?: boolean;
                severity?: string;
                explanation?: string;
            };

            if (!anomaly.is_anomaly) {
                return;
            }

            const message = String(anomaly.explanation || "Potential anomaly detected");

            await pool.query(
                `
          UPDATE vitals
          SET is_anomaly = TRUE
          WHERE id = $1
        `,
                [event.vitalId]
            );

            await pool.query(
                `
          INSERT INTO anomalies (patient_id, vital_id, description, severity, detected_at)
          VALUES ($1, $2, $3, $4, NOW())
        `,
                [event.patientId, event.vitalId, message, anomaly.severity || "medium"]
            );

            await createAlertForProfessionals(event.patientId, message);

            await notificationQueue.add({
                mode: "immediate",
                userId: event.patientId,
                patientId: event.patientId,
                type: "anomaly_detected",
                channels: ["push", "inApp"],
                payload: {
                    title: "Health alert",
                    body: message,
                    message
                }
            });
        } catch (error) {
            process.stderr.write(`vital event handling failed: ${error instanceof Error ? error.message : "unknown"}\n`);
        }
    });
};
