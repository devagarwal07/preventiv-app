import { notificationSentTotal } from "../metrics";

type NotificationChannel = "push" | "email" | "inApp";
type NotificationMode = "immediate" | "scheduled" | "digest";

const NOTIFICATION_SERVICE_URL = process.env.NOTIFICATION_SERVICE_URL || "http://localhost:3002";
const INTERNAL_SERVICE_KEY = process.env.INTERNAL_SERVICE_KEY || "dev-internal-key";

export const notifyInternal = async (payload: {
    userId: string;
    patientId?: string;
    professionalId?: string;
    type: string;
    mode?: NotificationMode;
    channels: NotificationChannel[];
    notificationPayload: {
        title?: string;
        body?: string;
        message?: string;
        email?: string;
        template?: string;
        templateVars?: Record<string, string | number | boolean | null>;
    };
}): Promise<void> => {
    try {
        await fetch(`${NOTIFICATION_SERVICE_URL}/internal/notify`, {
            method: "POST",
            headers: {
                "content-type": "application/json",
                "x-service-key": INTERNAL_SERVICE_KEY
            },
            body: JSON.stringify({
                userId: payload.userId,
                patientId: payload.patientId,
                professionalId: payload.professionalId,
                type: payload.type,
                mode: payload.mode || "immediate",
                channels: payload.channels,
                payload: payload.notificationPayload
            })
        });

        for (const channel of payload.channels) {
            notificationSentTotal.inc({ channel });
        }
    } catch {
        // Best-effort notifications should not fail core request paths.
    }
};
