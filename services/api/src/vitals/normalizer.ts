import { AppError } from "../errors/AppError";

export interface NormalizedVitalInput {
    type: "bp" | "glucose" | "hr" | "spo2" | "weight" | "steps" | "hrv" | "sleep" | "temperature";
    value: Record<string, unknown>;
    timestamp: string;
    source: "wearable" | "manual" | "lab";
}

export class VitalsNormalizer {
    normalize(input: NormalizedVitalInput): NormalizedVitalInput {
        const normalized = { ...input, value: { ...input.value } };

        if (normalized.type === "glucose") {
            const unit = String(normalized.value.unit || "mg/dL");
            const value = Number(normalized.value.value || 0);
            if (unit === "mmol/L") {
                normalized.value.value = Number((value * 18).toFixed(2));
                normalized.value.unit = "mg/dL";
            }
        }

        if (normalized.type === "temperature") {
            const unit = String(normalized.value.unit || "C");
            const value = Number(normalized.value.value || 0);
            if (unit === "F") {
                normalized.value.value = Number((((value - 32) * 5) / 9).toFixed(2));
                normalized.value.unit = "C";
            }
        }

        if (!normalized.timestamp) {
            throw new AppError("timestamp is required", 400);
        }

        return normalized;
    }

    normalizeGoogleFitData(payload: unknown[]): NormalizedVitalInput[] {
        return payload
            .map((entry) => {
                const row = entry as Record<string, unknown>;
                return {
                    type: String(row.type) as NormalizedVitalInput["type"],
                    value: (row.value as Record<string, unknown>) || {},
                    timestamp: String(row.timestamp),
                    source: "wearable" as const
                };
            })
            .filter((item) => !!item.type && !!item.timestamp);
    }

    normalizeAppleHealthData(payload: unknown[]): NormalizedVitalInput[] {
        return payload
            .map((entry) => {
                const row = entry as Record<string, unknown>;
                return {
                    type: String(row.type) as NormalizedVitalInput["type"],
                    value: (row.value as Record<string, unknown>) || {},
                    timestamp: String(row.timestamp),
                    source: "wearable" as const
                };
            })
            .filter((item) => !!item.type && !!item.timestamp);
    }
}

export const vitalsNormalizer = new VitalsNormalizer();
