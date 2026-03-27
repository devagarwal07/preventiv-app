import admin from "firebase-admin";
import { pool } from "../utils/db";

const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

let initialized = false;
if (serviceAccountJson) {
    try {
        const serviceAccount = JSON.parse(serviceAccountJson);
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
        initialized = true;
    } catch {
        initialized = false;
    }
}

const getUserTokens = async (userId: string): Promise<string[]> => {
    const result = await pool.query<{ fcm_token: string }>(
        `SELECT fcm_token FROM user_device_tokens WHERE user_id = $1`,
        [userId]
    );
    return result.rows.map((r) => r.fcm_token);
};

export const sendPush = async (
    userId: string,
    payload: { title: string; body: string; data?: Record<string, string> }
): Promise<{ sent: number }> => {
    if (!initialized) {
        return { sent: 0 };
    }

    const tokens = await getUserTokens(userId);
    if (!tokens.length) return { sent: 0 };

    const message: admin.messaging.MulticastMessage = {
        tokens,
        notification: { title: payload.title, body: payload.body },
        data: payload.data || {}
    };

    const result = await admin.messaging().sendEachForMulticast(message);
    return { sent: result.successCount };
};

export const sendBulkPush = async (
    userIds: string[],
    payload: { title: string; body: string; data?: Record<string, string> }
): Promise<{ sent: number }> => {
    let sent = 0;
    for (const userId of userIds) {
        const result = await sendPush(userId, payload);
        sent += result.sent;
    }
    return { sent };
};
