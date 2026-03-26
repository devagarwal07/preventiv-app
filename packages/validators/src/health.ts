import { z } from "zod";
import {
    VitalSource,
    VitalType,
    type LabReport,
    type MedicationEntry,
    type PatientBaseline,
    type PatientLifestyle,
    type Vital
} from "@prevntiv/shared-types";
import { IdSchema } from "./common";

const enumValues = <T extends string>(obj: Record<string, T>) => Object.values(obj) as [T, ...T[]];

export const VitalTypeSchema = z.enum(enumValues(VitalType));
export const VitalSourceSchema = z.enum(enumValues(VitalSource));

export const MedicationEntrySchema = z.object({
    name: z.string().min(1).max(100),
    dosage: z.string().min(1).max(50),
    frequency: z.string().min(1).max(50)
});

export const PatientLifestyleSchema = z.object({
    smoking: z.boolean().optional(),
    alcohol: z.enum(["none", "occasional", "moderate", "frequent"]).optional(),
    exerciseFrequency: z.string().max(80).optional(),
    dietType: z.string().max(80).optional()
});

export const PatientBaselineSchema = z.object({
    patientId: IdSchema,
    heightCm: z.number().min(50).max(260).nullish(),
    weightKg: z.number().min(10).max(500).nullish(),
    bloodType: z.string().max(5).nullish(),
    chronicConditions: z.array(z.string().min(1)).default([]),
    allergies: z.array(z.string().min(1)).default([]),
    medications: z.array(MedicationEntrySchema).default([]),
    lifestyle: PatientLifestyleSchema.optional()
});

export const CreatePatientBaselineSchema = PatientBaselineSchema.omit({ patientId: true });
export const UpdatePatientBaselineSchema = CreatePatientBaselineSchema.partial();

export const VitalSchema = z.object({
    id: IdSchema,
    patientId: IdSchema,
    type: VitalTypeSchema,
    value: z.record(z.unknown()),
    source: VitalSourceSchema,
    timestamp: z.string().datetime({ offset: true }),
    isAnomaly: z.boolean()
});

export const CreateVitalSchema = VitalSchema.omit({ id: true, isAnomaly: true });
export const UpdateVitalSchema = CreateVitalSchema.partial();

export const LabReportSchema = z.object({
    id: IdSchema,
    patientId: IdSchema,
    fileUrl: z.string().url(),
    extractedData: z.record(z.unknown()),
    uploadedBy: IdSchema,
    uploadedAt: z.string().datetime({ offset: true }),
    status: z.enum(["processing", "processed", "extraction_failed"])
});

export const CreateLabReportSchema = LabReportSchema.omit({
    id: true,
    extractedData: true,
    status: true,
    uploadedAt: true
});
export const UpdateLabReportSchema = CreateLabReportSchema.partial();

export type MedicationEntryDTO = z.infer<typeof MedicationEntrySchema> & MedicationEntry;
export type PatientLifestyleDTO = z.infer<typeof PatientLifestyleSchema> & PatientLifestyle;
export type PatientBaselineDTO = z.infer<typeof PatientBaselineSchema> & PatientBaseline;
export type VitalDTO = z.infer<typeof VitalSchema> & Vital;
export type LabReportDTO = z.infer<typeof LabReportSchema> & LabReport;
