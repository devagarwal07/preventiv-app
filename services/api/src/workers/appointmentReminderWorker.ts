import { appointmentReminderQueue } from "../appointments/queue";
import { pool } from "../db/pool";
import { notifyInternal } from "../notifications/client";
import { socketEvents } from "../realtime/socketServer";

export const startAppointmentReminderWorker = (): void => {
    appointmentReminderQueue.process(5, async (job) => {
        const data = job.data as Record<string, unknown>;

        if ("appointmentId" in data) {
            const appointmentId = String(data.appointmentId);
            const patientId = String(data.patientId);
            const scheduledAt = String(data.scheduledAt);
            const minutesBefore = Number(data.minutesBefore);

            const appointmentResult = await pool.query<{ status: string }>(
                `SELECT status FROM appointments WHERE id = $1 LIMIT 1`,
                [appointmentId]
            );

            if (!appointmentResult.rowCount || appointmentResult.rows[0].status === "cancelled") {
                return;
            }

            await notifyInternal({
                userId: patientId,
                patientId,
                type: "FOLLOW_UP_REMINDER",
                channels: ["push", "inApp"],
                notificationPayload: {
                    title: "Appointment reminder",
                    message: `You have an appointment in ${minutesBefore} minutes at ${scheduledAt}.`
                }
            });

            socketEvents.emitFollowUpReminder(patientId, {
                appointmentId,
                scheduledAt,
                minutesBefore
            });

            return;
        }

        if ("followUpId" in data) {
            const followUpId = String(data.followUpId);
            const patientId = String(data.patientId);

            await notifyInternal({
                userId: patientId,
                patientId,
                type: "FOLLOW_UP_DUE",
                channels: ["push", "inApp"],
                notificationPayload: {
                    title: "Follow-up due",
                    message: "A follow-up action is due today."
                }
            });

            socketEvents.emitFollowUpReminder(patientId, { followUpId, dueDate: String(data.dueDate) });
        }
    });
};
