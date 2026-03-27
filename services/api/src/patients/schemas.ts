import { z } from "zod";

const MedicationSchema = z.object({
    name: z.string().min(1).max(100),
    dosage: z.string().min(1).max(60),
    frequency: z.string().min(1).max(60)
});

const LifestyleSchema = z.object({
    smoking: z.boolean().optional(),
    alcohol: z.enum(["none", "occasional", "moderate", "frequent"]).optional(),
    exercise_frequency: z.string().max(100).optional(),
    diet_type: z.string().max(100).optional()
});

export const PatientOnboardingSchema = z.object({
    height: z.number().min(50).max(260),
    weight: z.number().min(10).max(500),
    blood_type: z.string().max(5),
    chronic_conditions: z.array(z.string().min(1)).default([]),
    allergies: z.array(z.string().min(1)).default([]),
    medications: z.array(MedicationSchema).default([]),
    lifestyle: LifestyleSchema.default({})
});

export const PatientProfilePatchSchema = z.object({
    name: z.string().min(2).max(120).optional(),
    dob: z.string().date().optional(),
    gender: z.enum(["male", "female", "other", "prefer_not_to_say"]).optional(),
    avatar_url: z.string().url().optional()
});

export const PatientBaselinePatchSchema = z
    .object({
        height: z.number().min(50).max(260).optional(),
        weight: z.number().min(10).max(500).optional(),
        blood_type: z.string().max(5).optional(),
        chronic_conditions: z.array(z.string().min(1)).optional(),
        allergies: z.array(z.string().min(1)).optional(),
        medications: z.array(MedicationSchema).optional(),
        lifestyle: LifestyleSchema.optional()
    })
    .partial();

export const PatientListQuerySchema = z.object({
    type: z.string().optional(),
    from: z.string().datetime({ offset: true }).optional(),
    to: z.string().datetime({ offset: true }).optional(),
    limit: z.coerce.number().int().positive().max(100).default(30),
    page: z.coerce.number().int().positive().default(1)
});

export type PatientOnboardingInput = z.infer<typeof PatientOnboardingSchema>;
export type PatientProfilePatchInput = z.infer<typeof PatientProfilePatchSchema>;
export type PatientBaselinePatchInput = z.infer<typeof PatientBaselinePatchSchema>;
