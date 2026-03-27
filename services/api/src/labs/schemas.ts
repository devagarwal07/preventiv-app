import { z } from "zod";

export const LabUploadBodySchema = z.object({
    patient_id: z.string().uuid()
});

export const LabListQuerySchema = z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20)
});

export const ManualLabValuesSchema = z.object({
    extracted_data: z.record(z.union([z.number(), z.string(), z.boolean(), z.null()]))
});

export const allowedLabMimeTypes = ["application/pdf", "image/jpeg", "image/png"];
