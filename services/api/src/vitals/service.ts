import { pool } from "../db/pool";
import { redis } from "../cache/client";
import { AppError } from "../errors/AppError";
import { invalidatePatientEhrCache } from "../patients/service";
import { socketEvents } from "../realtime/socketServer";
import { aiAnalysisRequestsTotal, vitalsIngestedTotal } from "../metrics";
import { notifyInternal } from "../notifications/client";
import { vitalsNormalizer } from "./normalizer";
import { validateVitalValueByType } from "./schemas";
import CircuitBreaker from "opossum";

const AI_ENGINE_URL = process.env.AI_ENGINE_URL || "http://localhost:8000";
const INTERNAL_SERVICE_KEY = process.env.INTERNAL_SERVICE_KEY || "dev-internal-key";

const anomalyBreaker = new CircuitBreaker(
    async (args: { patientId: string; type: string; value: Record<string, unknown> }) => {
        const res = await fetch(`${AI_ENGINE_URL}/ai/anomaly-detect`, {
            method: "POST",
            headers: {
                "content-type": "application/json",
                "x-service-key": INTERNAL_SERVICE_KEY
            },
            body: JSON.stringify({ patient_id: args.patientId, type: args.type, value: args.value })
        });

        if (!res.ok) {
            throw new Error(`AI engine returned ${res.status}`);
        }

        return (await res.json()) as { is_anomaly?: boolean; severity?: string; explanation?: string };
    },
    {
        timeout: 3000,
        errorThresholdPercentage: 50,
        resetTimeout: 10000
    }
);

const callAnomalyDetection = async (patientId: string, type: string, value: Record<string, unknown>) => {
    try {
        const res = await anomalyBreaker.fire({ patientId, type, value });
        aiAnalysisRequestsTotal.inc({ status: "ok" });
        return res;
    } catch (error) {
        aiAnalysisRequestsTotal.inc({ status: "failed" });
        await redis.lpush(
            "queue:anomaly-retry",
            JSON.stringify({ patient_id: patientId, type, value, reason: error instanceof Error ? error.message : "unknown" })
        );
        return { is_anomaly: false };
    }
};

export const createManualVital = async (
    patientId: string,
    type: "bp" | "glucose" | "hr" | "spo2" | "weight" | "steps" | "hrv" | "sleep" | "temperature",
    value: Record<string, unknown>,
    timestamp: string
) => {
    validateVitalValueByType(type, value);
    const normalized = vitalsNormalizer.normalize({ type, value, timestamp, source: "manual" });

    const anomaly = await callAnomalyDetection(patientId, normalized.type, normalized.value);

    const result = await pool.query(
        `
      INSERT INTO vitals (patient_id, type, value, source, recorded_at, is_anomaly)
      VALUES ($1, $2, $3::jsonb, $4, $5, $6)
      RETURNING id, patient_id, type, value, source, recorded_at, is_anomaly
    `,
        [
            patientId,
            normalized.type,
            JSON.stringify(normalized.value),
            normalized.source,
            normalized.timestamp,
            Boolean(anomaly.is_anomaly)
        ]
    );

    await invalidatePatientEhrCache(patientId);
    vitalsIngestedTotal.inc({ source: "manual", type: normalized.type });
    await redis.publish(
        "vital:new",
        JSON.stringify({ vitalId: result.rows[0].id, patientId, type: normalized.type, value: normalized.value })
    );

    if (Boolean(anomaly.is_anomaly)) {
        const anomalyRow = await pool.query(
            `
              INSERT INTO anomalies (patient_id, vital_id, description, severity, detected_at)
              VALUES ($1, $2, $3, $4, NOW())
              RETURNING id, patient_id, vital_id, description, severity, detected_at
            `,
            [
                patientId,
                result.rows[0].id,
                String(anomaly.explanation || "Vital deviates from baseline"),
                String(anomaly.severity || "medium")
            ]
        );

        const assignedProfessionals = await pool.query<{ professional_id: string }>(
            `SELECT professional_id FROM org_patient_assignments WHERE patient_id = $1`,
            [patientId]
        );

        for (const row of assignedProfessionals.rows) {
            await pool.query(
                `
                  INSERT INTO alerts (patient_id, professional_id, type, message)
                  VALUES ($1, $2, 'anomaly_detected', $3)
                `,
                [patientId, row.professional_id, String(anomaly.explanation || "Potential anomaly detected")]
            );

            await notifyInternal({
                userId: row.professional_id,
                patientId,
                professionalId: row.professional_id,
                type: "anomaly_detected",
                channels: ["push", "inApp"],
                notificationPayload: {
                    title: "Patient anomaly detected",
                    body: String(anomaly.explanation || "A new anomaly needs review")
                }
            });
        }

        await notifyInternal({
            userId: patientId,
            patientId,
            type: "anomaly_detected",
            channels: ["push", "inApp"],
            notificationPayload: {
                title: "Health alert",
                body: String(anomaly.explanation || "A vital reading needs attention")
            }
        });

        socketEvents.emitAnomalyDetected(patientId, anomalyRow.rows[0], result.rows[0]);
    }

    socketEvents.emitVitalAdded(patientId, result.rows[0]);

    return result.rows[0];
};

const bulkInsertWearableVitals = async (
    patientId: string,
    rows: Array<{ type: string; value: Record<string, unknown>; timestamp: string }>
) => {
    if (!rows.length) {
        return { synced_count: 0, skipped_count: 0 };
    }

    let inserted = 0;
    for (const row of rows) {
        validateVitalValueByType(row.type as never, row.value);
        const normalized = vitalsNormalizer.normalize({
            type: row.type as never,
            value: row.value,
            timestamp: row.timestamp,
            source: "wearable"
        });

        const insertResult = await pool.query(
            `
        INSERT INTO vitals (patient_id, type, value, source, recorded_at, is_anomaly)
        VALUES ($1, $2, $3::jsonb, 'wearable', $4, FALSE)
        ON CONFLICT (patient_id, type, source, recorded_at)
        DO NOTHING
        RETURNING id
      `,
            [patientId, normalized.type, JSON.stringify(normalized.value), normalized.timestamp]
        );

        if (insertResult.rowCount) inserted += 1;
        if (insertResult.rowCount) {
            vitalsIngestedTotal.inc({ source: "wearable", type: normalized.type });
        }
    }

    await invalidatePatientEhrCache(patientId);
    return { synced_count: inserted, skipped_count: rows.length - inserted };
};

export const syncGoogleFitVitals = async (
    patientId: string,
    accessToken: string,
    from: string,
    to: string
) => {
    let normalizedRows: Array<{ type: string; value: Record<string, unknown>; timestamp: string }> = [];

    try {
        const dataset = await Promise.all([
            fetch(
                `https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
                {
                    headers: { Authorization: `Bearer ${accessToken}` }
                }
            )
        ]);

        const payloads = await Promise.all(dataset.map(async (r) => (r.ok ? ((await r.json()) as unknown) : null)));
        const flattened = payloads.filter(Boolean) as unknown[];
        normalizedRows = vitalsNormalizer.normalizeGoogleFitData(flattened).map((row) => ({
            type: row.type,
            value: row.value,
            timestamp: row.timestamp
        }));
    } catch {
        normalizedRows = [];
    }

    return bulkInsertWearableVitals(patientId, normalizedRows);
};

export const syncAppleHealthVitals = async (
    patientId: string,
    readings: Array<{ type: string; value: Record<string, unknown>; timestamp: string }>
) => {
    const normalizedRows = vitalsNormalizer.normalizeAppleHealthData(readings).map((row) => ({
        type: row.type,
        value: row.value,
        timestamp: row.timestamp
    }));

    return bulkInsertWearableVitals(patientId, normalizedRows);
};

export const getVitals = async (
    patientId: string,
    options: {
        type?: string;
        from?: string;
        to?: string;
        limit: number;
        page: number;
    }
) => {
    const where: string[] = ["patient_id = $1"];
    const values: unknown[] = [patientId];

    if (options.type) {
        values.push(options.type);
        where.push(`type = $${values.length}`);
    }
    if (options.from) {
        values.push(options.from);
        where.push(`recorded_at >= $${values.length}`);
    }
    if (options.to) {
        values.push(options.to);
        where.push(`recorded_at <= $${values.length}`);
    }

    const offset = (options.page - 1) * options.limit;
    values.push(options.limit, offset);

    const listQuery = await pool.query(
        `
      SELECT id, patient_id, type, value, source, recorded_at, is_anomaly
      FROM vitals
      WHERE ${where.join(" AND ")}
      ORDER BY recorded_at DESC
      LIMIT $${values.length - 1} OFFSET $${values.length}
    `,
        values
    );

    const countValues = values.slice(0, values.length - 2);
    const countQuery = await pool.query<{ count: string }>(
        `SELECT COUNT(*)::text AS count FROM vitals WHERE ${where.join(" AND ")}`,
        countValues
    );

    const trendType = options.type;
    let trend = null;
    if (trendType) {
        const trendResult = await pool.query<{ avg_current: string | null; avg_previous: string | null }>(
            `
        WITH current_7d AS (
          SELECT AVG((value->>'value')::numeric) AS avg_current
          FROM vitals
          WHERE patient_id = $1
            AND type = $2
            AND recorded_at >= NOW() - INTERVAL '7 days'
        ),
        previous_7d AS (
          SELECT AVG((value->>'value')::numeric) AS avg_previous
          FROM vitals
          WHERE patient_id = $1
            AND type = $2
            AND recorded_at < NOW() - INTERVAL '7 days'
            AND recorded_at >= NOW() - INTERVAL '14 days'
        )
        SELECT
          (SELECT avg_current FROM current_7d)::text AS avg_current,
          (SELECT avg_previous FROM previous_7d)::text AS avg_previous
      `,
            [patientId, trendType]
        );

        const current = Number(trendResult.rows[0]?.avg_current || 0);
        const previous = Number(trendResult.rows[0]?.avg_previous || 0);
        const deltaPercent = previous === 0 ? 0 : Number((((current - previous) / previous) * 100).toFixed(2));

        trend = {
            avg_7d: current,
            delta_percent: deltaPercent,
            trend: deltaPercent > 2 ? "up" : deltaPercent < -2 ? "down" : "stable"
        };
    }

    const total = Number(countQuery.rows[0]?.count || 0);

    return {
        data: listQuery.rows,
        meta: {
            page: options.page,
            limit: options.limit,
            total,
            totalPages: Math.max(1, Math.ceil(total / options.limit))
        },
        trend
    };
};

export const getVitalsSummary = async (patientId: string) => {
    const latestPerType = await pool.query(
        `
      SELECT DISTINCT ON (type)
        type,
        value,
        recorded_at,
        source,
        is_anomaly
      FROM vitals
      WHERE patient_id = $1
      ORDER BY type, recorded_at DESC
    `,
        [patientId]
    );

    const averages7d = await pool.query(
        `
      SELECT
        type,
        AVG((value->>'value')::numeric) AS avg_7d
      FROM vitals
      WHERE patient_id = $1
        AND recorded_at >= NOW() - INTERVAL '7 days'
      GROUP BY type
    `,
        [patientId]
    );

    return {
        latest: latestPerType.rows,
        averages7d: averages7d.rows
    };
};
