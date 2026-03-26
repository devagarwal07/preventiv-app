export const CarePlanType = {
    Medical: "medical",
    Nutrition: "nutrition",
    Rehab: "rehab"
} as const;

export type CarePlanType = (typeof CarePlanType)[keyof typeof CarePlanType];

export const CarePlanStatus = {
    Active: "active",
    Completed: "completed",
    Paused: "paused"
} as const;

export type CarePlanStatus = (typeof CarePlanStatus)[keyof typeof CarePlanStatus];

export interface Consultation {
    id: string;
    patientId: string;
    professionalId: string;
    notes?: string | null;
    diagnosis?: string | null;
    occurredAt: string;
}

export interface CarePlan {
    id: string;
    patientId: string;
    createdBy: string;
    type: CarePlanType;
    title: string;
    status: CarePlanStatus;
    createdAt: string;
}

export interface CarePlanItem {
    id: string;
    carePlanId: string;
    action: string;
    frequency: "daily" | "weekly" | "monthly";
    instructions?: string | null;
    dueDate?: string | null;
}

export interface Appointment {
    id: string;
    patientId: string;
    professionalId: string;
    scheduledAt: string;
    status: "scheduled" | "confirmed" | "cancelled" | "completed";
    outcomeNotes?: string | null;
}
