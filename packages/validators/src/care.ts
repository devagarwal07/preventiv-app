import { z } from "zod";
import {
    CarePlanStatus,
    CarePlanType,
    type Appointment,
    type CarePlan,
    type CarePlanItem,
    type Consultation
} from "@prevntiv/shared-types";
import { IdSchema } from "./common";

const enumValues = <T extends string>(obj: Record<string, T>) => Object.values(obj) as [T, ...T[]];

export const CarePlanTypeSchema = z.enum(enumValues(CarePlanType));
export const CarePlanStatusSchema = z.enum(enumValues(CarePlanStatus));

export const ConsultationSchema = z.object({
    id: IdSchema,
    patientId: IdSchema,
    professionalId: IdSchema,
    notes: z.string().max(5000).nullish(),
    diagnosis: z.string().max(1000).nullish(),
    occurredAt: z.string().datetime({ offset: true })
});

export const CreateConsultationSchema = ConsultationSchema.omit({ id: true });
export const UpdateConsultationSchema = CreateConsultationSchema.partial();

export const CarePlanSchema = z.object({
    id: IdSchema,
    patientId: IdSchema,
    createdBy: IdSchema,
    type: CarePlanTypeSchema,
    title: z.string().min(3).max(200),
    status: CarePlanStatusSchema,
    createdAt: z.string().datetime({ offset: true })
});

export const CreateCarePlanSchema = CarePlanSchema.omit({ id: true, createdAt: true });
export const UpdateCarePlanSchema = CreateCarePlanSchema.partial();

export const CarePlanItemSchema = z.object({
    id: IdSchema,
    carePlanId: IdSchema,
    action: z.string().min(2).max(200),
    frequency: z.enum(["daily", "weekly", "monthly"]),
    instructions: z.string().max(1000).nullish(),
    dueDate: z.string().date().nullish()
});

export const CreateCarePlanItemSchema = CarePlanItemSchema.omit({ id: true });
export const UpdateCarePlanItemSchema = CreateCarePlanItemSchema.partial();

export const AppointmentSchema = z.object({
    id: IdSchema,
    patientId: IdSchema,
    professionalId: IdSchema,
    scheduledAt: z.string().datetime({ offset: true }),
    status: z.enum(["scheduled", "confirmed", "cancelled", "completed"]),
    outcomeNotes: z.string().max(2000).nullish()
});

export const CreateAppointmentSchema = AppointmentSchema.omit({ id: true, status: true });
export const UpdateAppointmentSchema = AppointmentSchema
    .pick({ status: true, outcomeNotes: true, scheduledAt: true })
    .partial();

export type ConsultationDTO = z.infer<typeof ConsultationSchema> & Consultation;
export type CarePlanDTO = z.infer<typeof CarePlanSchema> & CarePlan;
export type CarePlanItemDTO = z.infer<typeof CarePlanItemSchema> & CarePlanItem;
export type AppointmentDTO = z.infer<typeof AppointmentSchema> & Appointment;
