import Queue from "bull";

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

export type AppointmentReminderJob = {
    appointmentId: string;
    patientId: string;
    professionalId: string;
    scheduledAt: string;
    minutesBefore: number;
};

export type FollowUpReminderJob = {
    followUpId: string;
    patientId: string;
    dueDate: string;
};

export const appointmentReminderQueue = new Queue<AppointmentReminderJob | FollowUpReminderJob>(
    "appointment-reminders",
    redisUrl
);
