export const VitalType = {
    BP: "bp",
    Glucose: "glucose",
    HR: "hr",
    SpO2: "spo2",
    Weight: "weight",
    Steps: "steps",
    HRV: "hrv",
    Sleep: "sleep",
    Temperature: "temperature"
} as const;

export type VitalType = (typeof VitalType)[keyof typeof VitalType];

export const VitalSource = {
    Wearable: "wearable",
    Manual: "manual",
    Lab: "lab"
} as const;

export type VitalSource = (typeof VitalSource)[keyof typeof VitalSource];

export interface MedicationEntry {
    name: string;
    dosage: string;
    frequency: string;
}

export interface PatientLifestyle {
    smoking?: boolean;
    alcohol?: "none" | "occasional" | "moderate" | "frequent";
    exerciseFrequency?: string;
    dietType?: string;
}

export interface PatientBaseline {
    patientId: string;
    heightCm?: number | null;
    weightKg?: number | null;
    bloodType?: string | null;
    chronicConditions: string[];
    allergies: string[];
    medications: MedicationEntry[];
    lifestyle?: PatientLifestyle;
}

export interface Vital {
    id: string;
    patientId: string;
    type: VitalType;
    value: Record<string, unknown>;
    source: VitalSource;
    timestamp: string;
    isAnomaly: boolean;
}

export interface LabReport {
    id: string;
    patientId: string;
    fileUrl: string;
    extractedData: Record<string, unknown>;
    uploadedBy: string;
    uploadedAt: string;
    status: "processing" | "processed" | "extraction_failed";
}
