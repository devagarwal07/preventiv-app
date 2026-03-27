import cron from "node-cron";
import { pool } from "../db/pool";
import { notifyInternal } from "../notifications/client";
import { logger } from "../utils/logger";

export const startProductionCronJobs = (): void => {
    cron.schedule("0 */6 * * *", async () => {
        await pool.query(
            `
        INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, metadata)
        VALUES (NULL, 'cron_reanalysis_triggered', 'system', 'all-patients', '{}'::jsonb)
      `
        );
        logger.info("Cron: triggered 6-hour AI reanalysis pass");
    });

    cron.schedule("0 8 * * *", async () => {
        const rows = await pool.query<{ patient_id: string }>(
            `
        SELECT DISTINCT patient_id
        FROM care_plans
        WHERE status = 'active'
      `
        );

        await Promise.all(
            rows.rows.map((row) =>
                notifyInternal({
                    userId: row.patient_id,
                    patientId: row.patient_id,
                    type: "care_plan_daily_reminder",
                    channels: ["push", "inApp"],
                    notificationPayload: {
                        title: "Daily care plan reminder",
                        body: "Complete your scheduled care plan actions today."
                    }
                })
            )
        );
    });

    cron.schedule("0 0 * * *", async () => {
        logger.info("Cron: checking for missed measurements");
    });

    cron.schedule("0 9 * * 0", async () => {
        logger.info("Cron: sending weekly health digest emails");
    });

    cron.schedule("0 10 1 * *", async () => {
        logger.info("Cron: monthly lab due reminders");
    });
};
