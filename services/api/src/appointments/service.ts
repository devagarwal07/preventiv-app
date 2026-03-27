import { randomUUID } from "crypto";
import { pool } from "../db/pool";
import { AppError } from "../errors/AppError";
import { canAccessPatient } from "../patients/access";
import { notifyInternal } from "../notifications/client";
import { socketEvents } from "../realtime/socketServer";
import { appointmentReminderQueue } from "./queue";

type AppointmentType = "in-person" | "follow-up";
type AppointmentStatus = "scheduled" | "confirmed" | "cancelled" | "completed";

const canBookProfessional = async (patientId: string, professionalId: string): Promise<boolean> => {
    const result = await pool.query<{ exists: boolean }>(
        `
    SELECT EXISTS (
      SELECT 1
      FROM consultations c
      WHERE c.patient_id = $1 AND c.professional_id = $2
    )
    OR EXISTS (
      SELECT 1
      FROM org_memberships p
      JOIN org_memberships pr ON p.org_id = pr.org_id
      WHERE p.user_id = $1 AND pr.user_id = $2
    ) AS exists
    `,
        [patientId, professionalId]
    );

    return result.rows[0]?.exists ?? false;
};

const scheduleAppointmentReminders = async (
    appointmentId: string,
    patientId: string,
    professionalId: string,
    scheduledAt: string
): Promise<string[]> => {
    const scheduledTime = new Date(scheduledAt).getTime();
    const now = Date.now();

    const reminders = [24 * 60, 60];
    const jobIds: string[] = [];

    for (const minutesBefore of reminders) {
        const runAt = scheduledTime - minutesBefore * 60 * 1000;
        const delay = runAt - now;
        if (delay <= 0) continue;

        const jobId = `appointment:${appointmentId}:${minutesBefore}:${randomUUID()}`;
        jobIds.push(jobId);

        await appointmentReminderQueue.add(
            {
                appointmentId,
                patientId,
                professionalId,
                scheduledAt,
                minutesBefore
            },
            {
                delay,
                attempts: 3,
                backoff: { type: "exponential", delay: 1000 },
                jobId,
                removeOnComplete: true,
                removeOnFail: false
            }
        );
    }

    return jobIds;
};

const cancelReminderJobs = async (jobIds: string[]): Promise<void> => {
    for (const jobId of jobIds) {
        const job = await appointmentReminderQueue.getJob(jobId);
        if (job) {
            await job.remove();
        }
    }
};

export const createAppointment = async (params: {
    patientId: string;
    professionalId: string;
    scheduledAt: string;
    type: AppointmentType;
    notes?: string;
}) => {
    const allowed = await canBookProfessional(params.patientId, params.professionalId);
    if (!allowed) {
        throw new AppError("Professional is not accessible to patient", 403);
    }

    const insertResult = await pool.query<{
        id: string;
        patient_id: string;
        professional_id: string;
        scheduled_at: string;
    }>(
        `
    INSERT INTO appointments (patient_id, professional_id, scheduled_at, status, type, notes)
    VALUES ($1, $2, $3, 'scheduled', $4, $5)
    RETURNING id, patient_id, professional_id, scheduled_at
    `,
        [params.patientId, params.professionalId, params.scheduledAt, params.type, params.notes || null]
    );

    const appointment = insertResult.rows[0];
    const jobIds = await scheduleAppointmentReminders(
        appointment.id,
        appointment.patient_id,
        appointment.professional_id,
        appointment.scheduled_at
    );

    await pool.query(`UPDATE appointments SET reminder_job_ids = $2::jsonb WHERE id = $1`, [
        appointment.id,
        JSON.stringify(jobIds)
    ]);

    const detail = await pool.query(
        `
    SELECT
      a.*,
      up.name AS professional_name,
      up.avatar_url AS professional_avatar
    FROM appointments a
    LEFT JOIN user_profiles up ON up.user_id = a.professional_id
    WHERE a.id = $1
    LIMIT 1
    `,
        [appointment.id]
    );

    return detail.rows[0];
};

export const listAppointments = async (params: {
    userId: string;
    role: string;
    from?: string;
    to?: string;
    status?: AppointmentStatus;
    scope?: "today" | "week" | "all";
}) => {
    const where: string[] = [];
    const values: unknown[] = [];

    if (params.role === "patient") {
        values.push(params.userId);
        where.push(`a.patient_id = $${values.length}`);
    } else {
        values.push(params.userId);
        where.push(`a.professional_id = $${values.length}`);
    }

    if (params.from) {
        values.push(params.from);
        where.push(`a.scheduled_at >= $${values.length}`);
    }

    if (params.to) {
        values.push(params.to);
        where.push(`a.scheduled_at <= $${values.length}`);
    }

    if (params.status) {
        values.push(params.status);
        where.push(`a.status = $${values.length}`);
    }

    if (params.scope === "today") {
        where.push(`a.scheduled_at::date = NOW()::date`);
    }

    if (params.scope === "week") {
        where.push(`a.scheduled_at >= date_trunc('week', NOW())`);
        where.push(`a.scheduled_at < date_trunc('week', NOW()) + INTERVAL '7 days'`);
    }

    const result = await pool.query(
        `
    SELECT a.*,
           p.name AS patient_name,
           pr.name AS professional_name
    FROM appointments a
    LEFT JOIN user_profiles p ON p.user_id = a.patient_id
    LEFT JOIN user_profiles pr ON pr.user_id = a.professional_id
    WHERE ${where.join(" AND ")}
    ORDER BY a.scheduled_at DESC
    `,
        values
    );

    return result.rows;
};

export const updateAppointment = async (params: {
    appointmentId: string;
    actorId: string;
    actorRole: string;
    status?: "confirmed" | "cancelled" | "completed";
    outcomeNotes?: string;
    rescheduledAt?: string;
}) => {
    const currentResult = await pool.query<{
        id: string;
        patient_id: string;
        professional_id: string;
        status: string;
        reminder_job_ids: string[] | null;
    }>(
        `
    SELECT id, patient_id, professional_id, status, reminder_job_ids
    FROM appointments
    WHERE id = $1
    LIMIT 1
    `,
        [params.appointmentId]
    );

    if (!currentResult.rowCount) {
        throw new AppError("Appointment not found", 404);
    }

    const current = currentResult.rows[0];
    const canEdit =
        params.actorRole === "platform_admin" ||
        params.actorRole === "org_admin" ||
        current.professional_id === params.actorId ||
        current.patient_id === params.actorId;

    if (!canEdit) {
        throw new AppError("Forbidden", 403);
    }

    const updates: string[] = [];
    const values: unknown[] = [params.appointmentId];

    if (params.status) {
        values.push(params.status);
        updates.push(`status = $${values.length}`);
    }

    if (params.outcomeNotes !== undefined) {
        values.push(params.outcomeNotes);
        updates.push(`outcome_notes = $${values.length}`);
    }

    if (params.rescheduledAt) {
        values.push(params.rescheduledAt);
        updates.push(`rescheduled_at = $${values.length}`);
    }

    if (updates.length > 0) {
        await pool.query(
            `UPDATE appointments SET ${updates.join(", ")}, updated_at = NOW() WHERE id = $1`,
            values
        );
    }

    if (params.status === "cancelled") {
        const ids = Array.isArray(current.reminder_job_ids) ? current.reminder_job_ids : [];
        await cancelReminderJobs(ids);
        await pool.query(`UPDATE appointments SET reminder_job_ids = '[]'::jsonb WHERE id = $1`, [params.appointmentId]);
    }

    if (params.status === "completed") {
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 14);

        await pool.query(
            `
      INSERT INTO follow_ups (appointment_id, due_date, notes)
      VALUES ($1, $2, $3)
      `,
            [params.appointmentId, dueDate.toISOString().slice(0, 10), "Auto-created follow-up suggestion"]
        );
    }

    const refreshed = await pool.query(`SELECT * FROM appointments WHERE id = $1 LIMIT 1`, [params.appointmentId]);
    return refreshed.rows[0];
};

export const createFollowUp = async (params: {
    appointmentId: string;
    dueDate: string;
    notes?: string;
    actorId: string;
}) => {
    const appointmentResult = await pool.query<{
        id: string;
        patient_id: string;
        professional_id: string;
    }>(
        `SELECT id, patient_id, professional_id FROM appointments WHERE id = $1 LIMIT 1`,
        [params.appointmentId]
    );

    if (!appointmentResult.rowCount) {
        throw new AppError("Appointment not found", 404);
    }

    const appointment = appointmentResult.rows[0];
    const followUpResult = await pool.query<{ id: string }>(
        `
    INSERT INTO follow_ups (appointment_id, due_date, notes)
    VALUES ($1, $2, $3)
    RETURNING id
    `,
        [params.appointmentId, params.dueDate, params.notes || null]
    );

    const runAt = new Date(`${params.dueDate}T09:00:00.000Z`).getTime() - Date.now();
    if (runAt > 0) {
        await appointmentReminderQueue.add(
            {
                followUpId: followUpResult.rows[0].id,
                patientId: appointment.patient_id,
                dueDate: params.dueDate
            },
            {
                delay: runAt,
                attempts: 3,
                backoff: { type: "exponential", delay: 1000 },
                jobId: `followup:${followUpResult.rows[0].id}:${randomUUID()}`,
                removeOnComplete: true,
                removeOnFail: false
            }
        );
    }

    return { id: followUpResult.rows[0].id };
};

export const getProfessionalFollowUps = async (professionalId: string) => {
    const result = await pool.query(
        `
    WITH latest_risk AS (
      SELECT DISTINCT ON (patient_id)
        patient_id,
        score,
        CASE score
          WHEN 'high' THEN 3
          WHEN 'moderate' THEN 2
          ELSE 1
        END AS risk_rank
      FROM risk_scores
      ORDER BY patient_id, computed_at DESC
    )
    SELECT
      f.*,
      a.patient_id,
      a.professional_id,
      up.name AS patient_name,
      lr.score AS patient_risk
    FROM follow_ups f
    JOIN appointments a ON a.id = f.appointment_id
    LEFT JOIN user_profiles up ON up.user_id = a.patient_id
    LEFT JOIN latest_risk lr ON lr.patient_id = a.patient_id
    WHERE a.professional_id = $1
    ORDER BY
      CASE
        WHEN f.due_date < CURRENT_DATE AND f.completed_at IS NULL THEN 0
        WHEN f.due_date = CURRENT_DATE AND f.completed_at IS NULL THEN 1
        ELSE 2
      END,
      COALESCE(lr.risk_rank, 1) DESC,
      f.due_date ASC
    `,
        [professionalId]
    );

    const nowDate = new Date().toISOString().slice(0, 10);
    const weekLater = new Date();
    weekLater.setDate(weekLater.getDate() + 7);
    const week = weekLater.toISOString().slice(0, 10);

    const overdue = result.rows.filter((r) => r.due_date < nowDate && !r.completed_at);
    const dueToday = result.rows.filter((r) => r.due_date === nowDate && !r.completed_at);
    const upcomingWeek = result.rows.filter((r) => r.due_date > nowDate && r.due_date <= week && !r.completed_at);

    return { overdue, dueToday, upcomingWeek };
};

export const addAppointmentNotes = async (params: {
    appointmentId: string;
    professionalId: string;
    notes: string;
}) => {
    const encryptionKey = process.env.PG_ENCRYPTION_KEY || "dev-notes-key";

    const appointmentResult = await pool.query<{
        patient_id: string;
        professional_id: string;
    }>(
        `SELECT patient_id, professional_id FROM appointments WHERE id = $1 LIMIT 1`,
        [params.appointmentId]
    );

    if (!appointmentResult.rowCount) {
        throw new AppError("Appointment not found", 404);
    }

    const appointment = appointmentResult.rows[0];
    if (appointment.professional_id !== params.professionalId) {
        throw new AppError("Only the appointment professional can add notes", 403);
    }

    await pool.query(
        `
    INSERT INTO consultation_notes (appointment_id, patient_id, professional_id, encrypted_note)
    VALUES ($1, $2, $3, pgp_sym_encrypt($4, $5))
    `,
        [params.appointmentId, appointment.patient_id, params.professionalId, params.notes, encryptionKey]
    );

    await pool.query(
        `
    INSERT INTO health_timeline (patient_id, event_type, summary, related_record_id, occurred_at)
    VALUES ($1, 'consultation_note_added', 'A consultation note was added (encrypted at rest).', $2, NOW())
    `,
        [appointment.patient_id, params.appointmentId]
    );

    return { saved: true };
};

export const upsertProfessionalAvailability = async (params: {
    professionalId: string;
    weekdays: number[];
    hoursFrom: string;
    hoursTo: string;
    slotDurationMinutes: number;
}) => {
    await pool.query(`DELETE FROM professional_availability WHERE professional_id = $1`, [params.professionalId]);

    for (const weekday of params.weekdays) {
        await pool.query(
            `
      INSERT INTO professional_availability (professional_id, weekday, hours_from, hours_to, slot_duration_minutes)
      VALUES ($1, $2, $3, $4, $5)
      `,
            [params.professionalId, weekday, params.hoursFrom, params.hoursTo, params.slotDurationMinutes]
        );
    }

    return { updated: true };
};

export const getProfessionalAvailabilitySlots = async (professionalId: string, date: string) => {
    const dateObj = new Date(`${date}T00:00:00.000Z`);
    const weekday = dateObj.getUTCDay();

    const availabilityResult = await pool.query<{
        hours_from: string;
        hours_to: string;
        slot_duration_minutes: number;
    }>(
        `
    SELECT hours_from, hours_to, slot_duration_minutes
    FROM professional_availability
    WHERE professional_id = $1 AND weekday = $2
    ORDER BY hours_from ASC
    `,
        [professionalId, weekday]
    );

    if (!availabilityResult.rowCount) return [];

    const appointmentsResult = await pool.query<{ scheduled_at: string }>(
        `
    SELECT scheduled_at
    FROM appointments
    WHERE professional_id = $1
      AND scheduled_at::date = $2::date
      AND status IN ('scheduled', 'confirmed')
    `,
        [professionalId, date]
    );

    const bookedSet = new Set(appointmentsResult.rows.map((r) => new Date(r.scheduled_at).toISOString()));

    const slots: string[] = [];
    for (const row of availabilityResult.rows) {
        const from = `${date}T${row.hours_from.slice(0, 5)}:00.000Z`;
        const to = `${date}T${row.hours_to.slice(0, 5)}:00.000Z`;

        let cursor = new Date(from).getTime();
        const end = new Date(to).getTime();
        const step = row.slot_duration_minutes * 60 * 1000;

        while (cursor + step <= end) {
            const slotIso = new Date(cursor).toISOString();
            if (!bookedSet.has(slotIso)) {
                slots.push(slotIso);
            }
            cursor += step;
        }
    }

    return slots;
};

export const ensureAppointmentAccess = async (
    appointmentId: string,
    user: { id: string; role: string; orgId?: string | null }
) => {
    const result = await pool.query<{ patient_id: string; professional_id: string }>(
        `SELECT patient_id, professional_id FROM appointments WHERE id = $1 LIMIT 1`,
        [appointmentId]
    );
    if (!result.rowCount) throw new AppError("Appointment not found", 404);

    const row = result.rows[0];
    if (
        user.role === "platform_admin" ||
        user.role === "org_admin" ||
        row.professional_id === user.id ||
        row.patient_id === user.id
    ) {
        return row;
    }

    const allowed = await canAccessPatient(
        { id: user.id, role: user.role as never, orgId: user.orgId || null },
        row.patient_id
    );

    if (!allowed) throw new AppError("Forbidden", 403);
    return row;
};
