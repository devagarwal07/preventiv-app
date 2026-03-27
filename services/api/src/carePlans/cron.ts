import cron from "node-cron";
import { pool } from "../db/pool";
import { cache } from "../cache/client";
import { notifyInternal } from "../notifications/client";

const reminderKey = (patientId: string, itemId: string, day: string): string =>
    `care-plan-reminder:${patientId}:${itemId}:${day}`;

const sendDailyReminders = async (): Promise<void> => {
    const result = await pool.query<{
        patient_id: string;
        item_id: string;
        action: string;
        title: string;
        timezone: string | null;
    }>(
        `
    SELECT
      cp.patient_id,
      cpi.id AS item_id,
      cpi.action,
      cp.title,
      up.timezone
    FROM care_plans cp
    JOIN care_plan_items cpi ON cpi.care_plan_id = cp.id
    LEFT JOIN user_profiles up ON up.user_id = cp.patient_id
    WHERE cp.status = 'active'
      AND cpi.reminder = TRUE
      AND (cpi.due_date IS NULL OR cpi.due_date <= (NOW() AT TIME ZONE COALESCE(up.timezone, 'UTC'))::date)
      AND EXTRACT(HOUR FROM (NOW() AT TIME ZONE COALESCE(up.timezone, 'UTC'))) = 8
      AND EXTRACT(MINUTE FROM (NOW() AT TIME ZONE COALESCE(up.timezone, 'UTC'))) BETWEEN 0 AND 14
    `
    );

    for (const row of result.rows) {
        const localDay = new Date().toISOString().slice(0, 10);
        const key = reminderKey(row.patient_id, row.item_id, localDay);
        const already = await cache.get<string>(key);
        if (already) continue;

        await notifyInternal({
            userId: row.patient_id,
            patientId: row.patient_id,
            type: "CARE_PLAN_DUE",
            channels: ["push", "inApp"],
            notificationPayload: {
                title: "Care plan reminder",
                body: row.action,
                message: `Reminder: ${row.action} from your plan \"${row.title}\" is due.`
            }
        });

        await cache.set(key, "1", 60 * 60 * 24);
    }
};

export const startCarePlanReminderCron = (): void => {
    cron.schedule("*/15 * * * *", () => {
        void sendDailyReminders();
    });
};
