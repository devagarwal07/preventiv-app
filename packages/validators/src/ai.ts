import { z } from "zod";
import {
    RiskCategory,
    RiskScoreLevel,
    type Alert,
    type Anomaly,
    type RiskScore
} from "@prevntiv/shared-types";
import { IdSchema } from "./common";

const enumValues = <T extends string>(obj: Record<string, T>) => Object.values(obj) as [T, ...T[]];

export const RiskCategorySchema = z.enum(enumValues(RiskCategory));
export const RiskScoreLevelSchema = z.enum(enumValues(RiskScoreLevel));

export const RiskScoreSchema = z.object({
    id: IdSchema,
    patientId: IdSchema,
    category: RiskCategorySchema,
    score: RiskScoreLevelSchema,
    computedAt: z.string().datetime({ offset: true })
});

export const CreateRiskScoreSchema = RiskScoreSchema.omit({ id: true });
export const UpdateRiskScoreSchema = CreateRiskScoreSchema.partial();

export const AnomalySchema = z.object({
    id: IdSchema,
    patientId: IdSchema,
    vitalId: IdSchema.nullish(),
    description: z.string().min(2).max(1000),
    severity: z.enum(["low", "medium", "high", "critical"]),
    isResolved: z.boolean(),
    detectedAt: z.string().datetime({ offset: true })
});

export const CreateAnomalySchema = AnomalySchema.omit({ id: true, isResolved: true });
export const UpdateAnomalySchema = z.object({
    description: z.string().min(2).max(1000).optional(),
    severity: z.enum(["low", "medium", "high", "critical"]).optional(),
    isResolved: z.boolean().optional()
});

export const AlertSchema = z.object({
    id: IdSchema,
    patientId: IdSchema,
    professionalId: IdSchema.nullish(),
    type: z.string().min(1).max(100),
    message: z.string().min(1).max(2000),
    isRead: z.boolean(),
    createdAt: z.string().datetime({ offset: true })
});

export const CreateAlertSchema = AlertSchema.omit({ id: true, isRead: true, createdAt: true });
export const UpdateAlertSchema = z.object({ isRead: z.boolean().optional(), message: z.string().max(2000).optional() });

export type RiskScoreDTO = z.infer<typeof RiskScoreSchema> & RiskScore;
export type AnomalyDTO = z.infer<typeof AnomalySchema> & Anomaly;
export type AlertDTO = z.infer<typeof AlertSchema> & Alert;
