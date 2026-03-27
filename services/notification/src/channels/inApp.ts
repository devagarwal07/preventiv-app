import { pool } from "../utils/db";
import { redis } from "../utils/redis";

export const sendInApp = async (params: {
    patientId: string;
    professionalId?: string | null;
    type: string;
    message: string;
}): Promise<{ alertId: string }> => {
    const result = await pool.query<{ id: string }>(
        `
      INSERT INTO alerts (patient_id, professional_id, type, message, is_read, created_at)
      VALUES ($1, $2, $3, $4, FALSE, NOW())
      RETURNING id
    `,
        [params.patientId, params.professionalId || null, params.type, params.message]
    );

    const alertId = result.rows[0].id;

    await redis.publish(
        "realtime:alerts",
        JSON.stringify({
            event: "alert:new",
            payload: {
                id: alertId,
                patientId: params.patientId,
                professionalId: params.professionalId || null,
                type: params.type,
                message: params.message
            }
        })
    );

    return { alertId };
};
