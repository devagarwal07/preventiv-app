export const RiskCategory = {
    Cardiovascular: "cardiovascular",
    Glycemic: "glycemic",
    Lifestyle: "lifestyle"
} as const;

export type RiskCategory = (typeof RiskCategory)[keyof typeof RiskCategory];

export const RiskScoreLevel = {
    Low: "low",
    Moderate: "moderate",
    High: "high"
} as const;

export type RiskScoreLevel = (typeof RiskScoreLevel)[keyof typeof RiskScoreLevel];

export interface RiskScore {
    id: string;
    patientId: string;
    category: RiskCategory;
    score: RiskScoreLevel;
    computedAt: string;
}

export interface Anomaly {
    id: string;
    patientId: string;
    vitalId?: string | null;
    description: string;
    severity: "low" | "medium" | "high" | "critical";
    isResolved: boolean;
    detectedAt: string;
}

export interface Alert {
    id: string;
    patientId: string;
    professionalId?: string | null;
    type: string;
    message: string;
    isRead: boolean;
    createdAt: string;
}
