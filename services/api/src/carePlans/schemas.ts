import { z } from "zod";

export const carePlanTypeSchema = z.enum(["medical", "nutrition", "rehab"]);
export const carePlanStatusSchema = z.enum(["active", "completed", "paused"]);

export const carePlanItemSchema = z.object({
    action: z.string().min(1),
    frequency: z.enum(["daily", "weekly", "monthly"]),
    instructions: z.string().optional(),
    due_date: z.string().date().optional(),
    reminder: z.boolean().default(false)
});

export const createCarePlanSchema = z.object({
    patient_id: z.string().uuid(),
    type: carePlanTypeSchema,
    title: z.string().min(3).max(200),
    items: z.array(carePlanItemSchema).min(1)
});

export const updateCarePlanSchema = z.object({
    title: z.string().min(3).max(200).optional(),
    status: carePlanStatusSchema.optional(),
    items: z.array(carePlanItemSchema).optional()
});

export const carePlanCompletionSchema = z.object({
    notes: z.string().max(1000).optional()
});
