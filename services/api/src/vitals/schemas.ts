import { z } from "zod";

const bpSchema = z.object({ systolic: z.number().min(40).max(260), diastolic: z.number().min(30).max(180) });
const glucoseSchema = z.object({
    value: z.number().min(20).max(700),
    unit: z.enum(["mg/dL", "mmol/L"]),
    context: z.enum(["fasting", "post_meal", "random"])
});
const hrSchema = z.object({ bpm: z.number().min(20).max(260) });
const spo2Schema = z.object({ percent: z.number().min(50).max(100) });
const weightSchema = z.object({ kg: z.number().min(10).max(500) });
const sleepSchema = z.object({
    duration_minutes: z.number().min(0).max(1440),
    deep_sleep_minutes: z.number().min(0).max(1000),
    rem_minutes: z.number().min(0).max(1000),
    quality_score: z.number().min(0).max(100)
});
const stepsSchema = z.object({ count: z.number().int().min(0).max(150000) });
const hrvSchema = z.object({ ms: z.number().min(1).max(500) });
const temperatureSchema = z.object({ value: z.number().min(30).max(45), unit: z.enum(["C", "F"]) });

export const vitalTypeEnum = z.enum([
    "bp",
    "glucose",
    "hr",
    "spo2",
    "weight",
    "steps",
    "hrv",
    "sleep",
    "temperature"
]);

export const ManualVitalSchema = z.object({
    type: vitalTypeEnum,
    value: z.record(z.unknown()),
    timestamp: z.string().datetime({ offset: true })
});

export const GoogleFitSyncSchema = z.object({
    access_token: z.string().min(10),
    from: z.string().datetime({ offset: true }),
    to: z.string().datetime({ offset: true })
});

export const AppleHealthSyncSchema = z.object({
    from: z.string().datetime({ offset: true }).optional(),
    to: z.string().datetime({ offset: true }).optional(),
    readings: z.array(
        z.object({
            type: vitalTypeEnum,
            value: z.record(z.unknown()),
            timestamp: z.string().datetime({ offset: true })
        })
    )
});

export const VitalsQuerySchema = z.object({
    type: vitalTypeEnum.optional(),
    from: z.string().datetime({ offset: true }).optional(),
    to: z.string().datetime({ offset: true }).optional(),
    limit: z.coerce.number().int().positive().max(100).default(20),
    page: z.coerce.number().int().positive().default(1)
});

export const validateVitalValueByType = (type: z.infer<typeof vitalTypeEnum>, value: unknown): void => {
    const map = {
        bp: bpSchema,
        glucose: glucoseSchema,
        hr: hrSchema,
        spo2: spo2Schema,
        weight: weightSchema,
        sleep: sleepSchema,
        steps: stepsSchema,
        hrv: hrvSchema,
        temperature: temperatureSchema
    } as const;

    map[type].parse(value);
};
