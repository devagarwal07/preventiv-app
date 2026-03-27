export type VitalType =
    | "bp"
    | "glucose"
    | "hr"
    | "spo2"
    | "weight"
    | "steps"
    | "sleep"
    | "temperature"
    | "hrv";

export type RiskCategory = "cardiovascular" | "glycemic" | "lifestyle";

export interface Vital {
    id?: string;
    type: VitalType;
    value: Record<string, unknown>;
    source?: "wearable" | "manual" | "lab";
    recorded_at: string;
    is_anomaly?: boolean;
}

export type BaselineValue = number;

export interface VitalsSummary {
    [key: string]: {
        currentValue: number;
        unit: string;
        trend: "up" | "down" | "stable";
        changePercent: number;
        status: "normal" | "borderline" | "abnormal";
    };
}

export interface CarePlan {
    id: string;
    title: string;
    items: Array<{ id: string; action: string }>;
}

export interface AdherenceData {
    last7dPercent: number;
    streakByItem: Record<string, number>;
}

export interface TimelineEvent {
    id: string;
    event_type: string;
    summary: string;
    occurred_at: string;
}
