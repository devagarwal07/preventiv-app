type ReferenceRange = {
    min: number;
    max: number;
    borderline_max: number;
    unit: string;
};

const referenceRanges = require("@/src/data/reference_ranges.json") as Record<string, ReferenceRange>;

const aliases: Record<string, string> = {
    hba1c: "HbA1c",
    fasting_glucose: "Fasting Glucose",
    fastingglucose: "Fasting Glucose",
    glucose_fasting: "Fasting Glucose",
    pp_glucose: "Postprandial Glucose",
    postprandial_glucose: "Postprandial Glucose",
    total_cholesterol: "Total Cholesterol",
    cholesterol: "Total Cholesterol",
    ldl: "LDL",
    hdl: "HDL",
    triglycerides: "Triglycerides",
    hemoglobin: "Hemoglobin",
    wbc: "WBC",
    platelets: "Platelets",
    creatinine: "Creatinine",
    urea: "Urea",
    tsh: "TSH",
    vitamin_d: "Vitamin D",
    alt: "ALT"
};

const normalize = (name: string): string => name.toLowerCase().replace(/[^a-z0-9]/g, "_").replace(/_+/g, "_").replace(/^_|_$/g, "");

export const resolveReferenceRange = (testName: string): { key: string; range: ReferenceRange } | null => {
    const normalized = normalize(testName);
    const canonical = aliases[normalized] || testName;
    const found = referenceRanges[canonical];
    if (!found) {
        return null;
    }

    return {
        key: canonical,
        range: found
    };
};

export const parseNumericValue = (value: unknown): number | null => {
    if (typeof value === "number" && Number.isFinite(value)) {
        return value;
    }

    if (typeof value !== "string") {
        return null;
    }

    const match = value.match(/-?\d+(\.\d+)?/);
    if (!match) {
        return null;
    }

    const parsed = Number(match[0]);
    return Number.isFinite(parsed) ? parsed : null;
};

export type ValueFlag = "normal" | "borderline" | "abnormal" | "unknown";

export const classifyLabValue = (testName: string, value: unknown): ValueFlag => {
    const resolved = resolveReferenceRange(testName);
    const numeric = parseNumericValue(value);

    if (!resolved || numeric === null) {
        return "unknown";
    }

    const { min, max, borderline_max } = resolved.range;

    if (numeric >= min && numeric <= max) {
        return "normal";
    }

    if (numeric > max && numeric <= Math.max(max, borderline_max)) {
        return "borderline";
    }

    if (numeric < min && numeric >= Math.min(min, borderline_max)) {
        return "borderline";
    }

    return "abnormal";
};

export const getRangeText = (testName: string): string => {
    const resolved = resolveReferenceRange(testName);
    if (!resolved) {
        return "No local range";
    }

    const { min, max, unit } = resolved.range;
    return `${min}-${max} ${unit}`;
};
