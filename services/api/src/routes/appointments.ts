import { Router } from "express";
import type { Request, Response } from "express";
import { authenticate, requireRole } from "../middleware/authenticate";
import { asyncHandler } from "../utils/asyncHandler";
import { success } from "../utils/response";
import {
    addAppointmentNotes,
    createAppointment,
    createFollowUp,
    ensureAppointmentAccess,
    getProfessionalAvailabilitySlots,
    getProfessionalFollowUps,
    listAppointments,
    updateAppointment,
    upsertProfessionalAvailability
} from "../appointments/service";
import {
    appointmentCreateSchema,
    appointmentNotesSchema,
    appointmentPatchSchema,
    appointmentQuerySchema,
    availabilityUpsertSchema,
    followUpCreateSchema
} from "../appointments/schemas";

export const appointmentsRouter = Router();
appointmentsRouter.use(authenticate);

appointmentsRouter.post(
    "/appointments",
    requireRole("patient", "doctor", "dietician", "physiotherapist", "org_admin", "platform_admin"),
    asyncHandler(async (req: Request, res: Response) => {
        const body = appointmentCreateSchema.parse(req.body);
        const created = await createAppointment({
            patientId: body.patient_id,
            professionalId: body.professional_id,
            scheduledAt: body.scheduled_at,
            type: body.type,
            notes: body.notes
        });

        return success(res, created, 201);
    })
);

appointmentsRouter.get(
    "/appointments",
    asyncHandler(async (req: Request, res: Response) => {
        const query = appointmentQuerySchema.parse(req.query);
        const result = await listAppointments({
            userId: req.user!.id,
            role: req.user!.role,
            from: query.from,
            to: query.to,
            status: query.status,
            scope: query.scope
        });

        return success(res, result);
    })
);

appointmentsRouter.patch(
    "/appointments/:id",
    asyncHandler(async (req: Request, res: Response) => {
        const appointmentId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        await ensureAppointmentAccess(appointmentId, req.user!);

        const body = appointmentPatchSchema.parse(req.body);
        const updated = await updateAppointment({
            appointmentId,
            actorId: req.user!.id,
            actorRole: req.user!.role,
            status: body.status,
            outcomeNotes: body.outcome_notes,
            rescheduledAt: body.rescheduled_at
        });

        return success(res, updated);
    })
);

appointmentsRouter.post(
    "/appointments/:id/follow-up",
    requireRole("doctor", "dietician", "physiotherapist", "org_admin", "platform_admin"),
    asyncHandler(async (req: Request, res: Response) => {
        const appointmentId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        await ensureAppointmentAccess(appointmentId, req.user!);

        const body = followUpCreateSchema.parse(req.body);
        const result = await createFollowUp({
            appointmentId,
            dueDate: body.due_date,
            notes: body.notes,
            actorId: req.user!.id
        });

        return success(res, result, 201);
    })
);

appointmentsRouter.get(
    "/follow-ups/professional/:professionalId",
    requireRole("doctor", "dietician", "physiotherapist", "org_admin", "platform_admin"),
    asyncHandler(async (req: Request, res: Response) => {
        const professionalId = Array.isArray(req.params.professionalId)
            ? req.params.professionalId[0]
            : req.params.professionalId;

        if (req.user!.role !== "platform_admin" && req.user!.role !== "org_admin" && req.user!.id !== professionalId) {
            return res.status(403).json({ success: false, error: "Forbidden" });
        }

        const result = await getProfessionalFollowUps(professionalId);
        return success(res, result);
    })
);

appointmentsRouter.post(
    "/appointments/:id/notes",
    requireRole("doctor", "dietician", "physiotherapist", "org_admin", "platform_admin"),
    asyncHandler(async (req: Request, res: Response) => {
        const appointmentId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        await ensureAppointmentAccess(appointmentId, req.user!);

        const body = appointmentNotesSchema.parse(req.body);
        const result = await addAppointmentNotes({
            appointmentId,
            professionalId: req.user!.id,
            notes: body.notes
        });

        return success(res, result, 201);
    })
);

appointmentsRouter.post(
    "/professionals/:id/availability",
    requireRole("doctor", "dietician", "physiotherapist", "org_admin", "platform_admin"),
    asyncHandler(async (req: Request, res: Response) => {
        const professionalId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        if (req.user!.role !== "platform_admin" && req.user!.role !== "org_admin" && req.user!.id !== professionalId) {
            return res.status(403).json({ success: false, error: "Forbidden" });
        }

        const body = availabilityUpsertSchema.parse(req.body);
        const result = await upsertProfessionalAvailability({
            professionalId,
            weekdays: body.weekdays,
            hoursFrom: body.hours_from,
            hoursTo: body.hours_to,
            slotDurationMinutes: body.slot_duration_minutes
        });

        return success(res, result);
    })
);

appointmentsRouter.get(
    "/appointments/professional/:id/availability",
    asyncHandler(async (req: Request, res: Response) => {
        const professionalId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const date = typeof req.query.date === "string" ? req.query.date : new Date().toISOString().slice(0, 10);
        const slots = await getProfessionalAvailabilitySlots(professionalId, date);
        return success(res, { date, slots });
    })
);
