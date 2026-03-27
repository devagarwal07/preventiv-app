import { z } from "zod";

export const appointmentCreateSchema = z.object({
    patient_id: z.string().uuid(),
    professional_id: z.string().uuid(),
    scheduled_at: z.string().datetime({ offset: true }),
    type: z.enum(["in-person", "follow-up"]),
    notes: z.string().max(2000).optional()
});

export const appointmentQuerySchema = z.object({
    from: z.string().datetime({ offset: true }).optional(),
    to: z.string().datetime({ offset: true }).optional(),
    status: z.enum(["scheduled", "confirmed", "cancelled", "completed"]).optional(),
    scope: z.enum(["today", "week", "all"]).optional()
});

export const appointmentPatchSchema = z.object({
    status: z.enum(["confirmed", "cancelled", "completed"]).optional(),
    outcome_notes: z.string().max(4000).optional(),
    rescheduled_at: z.string().datetime({ offset: true }).optional()
});

export const followUpCreateSchema = z.object({
    due_date: z.string().date(),
    notes: z.string().max(2000).optional()
});

export const appointmentNotesSchema = z.object({
    notes: z.string().min(1).max(10000)
});

export const availabilityUpsertSchema = z.object({
    weekdays: z.array(z.number().int().min(0).max(6)).min(1),
    hours_from: z.string().regex(/^\d{2}:\d{2}$/),
    hours_to: z.string().regex(/^\d{2}:\d{2}$/),
    slot_duration_minutes: z.number().int().min(10).max(240)
});
