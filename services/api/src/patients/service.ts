import { pool } from "../db/pool";
import { cache, redis } from "../cache/client";
import { AppError } from "../errors/AppError";
import type {
    PatientBaselinePatchInput,
    PatientOnboardingInput,
    PatientProfilePatchInput
} from "./schemas";

const EHR_CACHE_TTL_SECONDS = 5 * 60;

const ehrKey = (patientId: string): string => `ehr:${patientId}`;
const patientTagKey = (patientId: string): string => `cachetag:patient:${patientId}`;

const trackCacheKeyForPatient = async (patientId: string, key: string): Promise<void> => {
    await redis.sadd(patientTagKey(patientId), key);
    await redis.expire(patientTagKey(patientId), EHR_CACHE_TTL_SECONDS);
};

export const invalidatePatientEhrCache = async (patientId: string): Promise<void> => {
    const tagKey = patientTagKey(patientId);
    const keys = await redis.smembers(tagKey);

    if (keys.length > 0) {
        await redis.del(...keys);
    }

    await redis.del(tagKey);
};

export const createPatientOnboarding = async (
    patientId: string,
    payload: PatientOnboardingInput
): Promise<{ baseline_id: string }> => {
    const result = await pool.query<{ patient_id: string }>(
        `
      INSERT INTO patient_baselines (
        patient_id,
        height_cm,
        weight_kg,
        blood_type,
        chronic_conditions,
        allergies,
        medications,
        lifestyle
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb)
      ON CONFLICT (patient_id)
      DO UPDATE SET
        height_cm = EXCLUDED.height_cm,
        weight_kg = EXCLUDED.weight_kg,
        blood_type = EXCLUDED.blood_type,
        chronic_conditions = EXCLUDED.chronic_conditions,
        allergies = EXCLUDED.allergies,
        medications = EXCLUDED.medications,
        lifestyle = EXCLUDED.lifestyle,
        updated_at = NOW()
      RETURNING patient_id
    `,
        [
            patientId,
            payload.height,
            payload.weight,
            payload.blood_type,
            payload.chronic_conditions,
            payload.allergies,
            JSON.stringify(payload.medications),
            JSON.stringify(payload.lifestyle)
        ]
    );

    await invalidatePatientEhrCache(patientId);

    return {
        baseline_id: result.rows[0].patient_id
    };
};

export const getPatientProfile = async (patientId: string) => {
    const result = await pool.query(
        `
      SELECT
        u.id,
        u.email,
        u.phone,
        u.role,
        u.is_verified,
        u.created_at,
        p.name,
        p.dob,
        p.gender,
        p.avatar_url,
        p.address,
        pb.height_cm,
        pb.weight_kg,
        pb.blood_type,
        pb.chronic_conditions,
        pb.allergies,
        pb.medications,
        pb.lifestyle,
        pb.updated_at AS baseline_updated_at
      FROM users u
      LEFT JOIN user_profiles p ON p.user_id = u.id
      LEFT JOIN patient_baselines pb ON pb.patient_id = u.id
      WHERE u.id = $1 AND u.role = 'patient' AND u.deleted_at IS NULL
      LIMIT 1
    `,
        [patientId]
    );

    if (!result.rowCount) {
        throw new AppError("Patient not found", 404);
    }

    return result.rows[0];
};

export const patchPatientProfile = async (
    patientId: string,
    payload: PatientProfilePatchInput
): Promise<void> => {
    const updates: string[] = [];
    const values: unknown[] = [];

    if (payload.name !== undefined) {
        values.push(payload.name);
        updates.push(`name = $${values.length}`);
    }
    if (payload.dob !== undefined) {
        values.push(payload.dob);
        updates.push(`dob = $${values.length}`);
    }
    if (payload.gender !== undefined) {
        values.push(payload.gender);
        updates.push(`gender = $${values.length}`);
    }
    if (payload.avatar_url !== undefined) {
        values.push(payload.avatar_url);
        updates.push(`avatar_url = $${values.length}`);
    }

    if (updates.length === 0) {
        return;
    }

    values.push(patientId);
    await pool.query(
        `
      UPDATE user_profiles
      SET ${updates.join(", ")}, updated_at = NOW()
      WHERE user_id = $${values.length}
    `,
        values
    );

    await invalidatePatientEhrCache(patientId);
};

export const patchPatientBaseline = async (
    patientId: string,
    changedBy: string,
    payload: PatientBaselinePatchInput
): Promise<void> => {
    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        const baselineResult = await client.query(
            `SELECT * FROM patient_baselines WHERE patient_id = $1 LIMIT 1`,
            [patientId]
        );

        if (!baselineResult.rowCount) {
            throw new AppError("Patient baseline not found", 404);
        }

        await client.query(
            `
        INSERT INTO patient_baseline_history (patient_id, snapshot, changed_by)
        VALUES ($1, $2::jsonb, $3)
      `,
            [patientId, JSON.stringify(baselineResult.rows[0]), changedBy]
        );

        const updates: string[] = [];
        const values: unknown[] = [];

        if (payload.height !== undefined) {
            values.push(payload.height);
            updates.push(`height_cm = $${values.length}`);
        }
        if (payload.weight !== undefined) {
            values.push(payload.weight);
            updates.push(`weight_kg = $${values.length}`);
        }
        if (payload.blood_type !== undefined) {
            values.push(payload.blood_type);
            updates.push(`blood_type = $${values.length}`);
        }
        if (payload.chronic_conditions !== undefined) {
            values.push(payload.chronic_conditions);
            updates.push(`chronic_conditions = $${values.length}`);
        }
        if (payload.allergies !== undefined) {
            values.push(payload.allergies);
            updates.push(`allergies = $${values.length}`);
        }
        if (payload.medications !== undefined) {
            values.push(JSON.stringify(payload.medications));
            updates.push(`medications = $${values.length}::jsonb`);
        }
        if (payload.lifestyle !== undefined) {
            values.push(JSON.stringify(payload.lifestyle));
            updates.push(`lifestyle = $${values.length}::jsonb`);
        }

        if (updates.length > 0) {
            values.push(patientId);
            await client.query(
                `
          UPDATE patient_baselines
          SET ${updates.join(", ")}, updated_at = NOW()
          WHERE patient_id = $${values.length}
        `,
                values
            );
        }

        await client.query("COMMIT");
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }

    await invalidatePatientEhrCache(patientId);
};

export const getPatientEhr = async (patientId: string) => {
    const key = ehrKey(patientId);
    const cached = await cache.get<unknown>(key);
    if (cached) {
        return cached;
    }

    const [
        profile,
        vitalsByType,
        labReports,
        carePlans,
        consultations,
        riskScores,
        anomalies
    ] = await Promise.all([
        getPatientProfile(patientId),
        pool.query(
            `
        SELECT *
        FROM (
          SELECT
            v.*,
            ROW_NUMBER() OVER (PARTITION BY v.type ORDER BY v.recorded_at DESC) AS rn
          FROM vitals v
          WHERE v.patient_id = $1
        ) ranked
        WHERE rn <= 30
        ORDER BY recorded_at DESC
      `,
            [patientId]
        ),
        pool.query(
            `
        SELECT id, patient_id, file_url, uploaded_by, uploaded_at, status
        FROM lab_reports
        WHERE patient_id = $1
        ORDER BY uploaded_at DESC
      `,
            [patientId]
        ),
        pool.query(
            `
        SELECT cp.*, COALESCE(json_agg(cpi.*) FILTER (WHERE cpi.id IS NOT NULL), '[]') AS items
        FROM care_plans cp
        LEFT JOIN care_plan_items cpi ON cpi.care_plan_id = cp.id
        WHERE cp.patient_id = $1 AND cp.status = 'active'
        GROUP BY cp.id
        ORDER BY cp.updated_at DESC
      `,
            [patientId]
        ),
        pool.query(
            `
        SELECT *
        FROM consultations
        WHERE patient_id = $1
        ORDER BY occurred_at DESC
        LIMIT 5
      `,
            [patientId]
        ),
        pool.query(
            `
        SELECT DISTINCT ON (category) *
        FROM risk_scores
        WHERE patient_id = $1
        ORDER BY category, computed_at DESC
      `,
            [patientId]
        ),
        pool.query(
            `
        SELECT *
        FROM anomalies
        WHERE patient_id = $1 AND is_resolved = FALSE
        ORDER BY detected_at DESC
      `,
            [patientId]
        )
    ]);

    const payload = {
        profile,
        vitals: vitalsByType.rows,
        labReports: labReports.rows,
        carePlans: carePlans.rows,
        consultations: consultations.rows,
        riskScores: riskScores.rows,
        anomalies: anomalies.rows
    };

    await cache.set(key, payload, EHR_CACHE_TTL_SECONDS);
    await trackCacheKeyForPatient(patientId, key);

    return payload;
};

export const exportPatientData = async (patientId: string) => {
    const [
        profile,
        vitals,
        labs,
        carePlans,
        consultations,
        appointments,
        riskScores,
        anomalies,
        alerts,
        consents
    ] = await Promise.all([
        getPatientProfile(patientId),
        pool.query(`SELECT * FROM vitals WHERE patient_id = $1 ORDER BY recorded_at DESC`, [patientId]),
        pool.query(`SELECT * FROM lab_reports WHERE patient_id = $1 ORDER BY uploaded_at DESC`, [patientId]),
        pool.query(`SELECT * FROM care_plans WHERE patient_id = $1 ORDER BY created_at DESC`, [patientId]),
        pool.query(`SELECT * FROM consultations WHERE patient_id = $1 ORDER BY occurred_at DESC`, [patientId]),
        pool.query(`SELECT * FROM appointments WHERE patient_id = $1 ORDER BY scheduled_at DESC`, [patientId]),
        pool.query(`SELECT * FROM risk_scores WHERE patient_id = $1 ORDER BY computed_at DESC`, [patientId]),
        pool.query(`SELECT * FROM anomalies WHERE patient_id = $1 ORDER BY detected_at DESC`, [patientId]),
        pool.query(`SELECT * FROM alerts WHERE patient_id = $1 ORDER BY created_at DESC`, [patientId]),
        pool.query(`SELECT * FROM patient_consents WHERE patient_id = $1 LIMIT 1`, [patientId])
    ]);

    return {
        exported_at: new Date().toISOString(),
        patient_id: patientId,
        profile,
        vitals: vitals.rows,
        labs: labs.rows,
        care_plans: carePlans.rows,
        consultations: consultations.rows,
        appointments: appointments.rows,
        risk_scores: riskScores.rows,
        anomalies: anomalies.rows,
        alerts: alerts.rows,
        consent: consents.rows[0] || null
    };
};

export const softDeletePatient = async (patientId: string): Promise<void> => {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        await client.query(
            `
                            UPDATE users
                            SET
                                status = 'suspended',
                                deleted_at = NOW(),
                                email = CONCAT('deleted+', id::text, '@redacted.local'),
                                phone = NULL,
                                updated_at = NOW()
                            WHERE id = $1
                        `,
            [patientId]
        );

        await client.query(
            `
                            UPDATE user_profiles
                            SET
                                name = 'Deleted User',
                                address = NULL,
                                avatar_url = NULL,
                                updated_at = NOW()
                            WHERE user_id = $1
                        `,
            [patientId]
        );

        await client.query("COMMIT");
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }

    await invalidatePatientEhrCache(patientId);
};

export const getPatientConsent = async (patientId: string) => {
    const row = await pool.query(
        `
                    SELECT patient_id, terms_accepted, terms_accepted_at, data_sharing, data_sharing_updated_at, marketing, marketing_updated_at, updated_at
                    FROM patient_consents
                    WHERE patient_id = $1
                    LIMIT 1
                `,
        [patientId]
    );

    return row.rows[0] || null;
};

export const upsertPatientConsent = async (
    patientId: string,
    payload: { terms_accepted?: boolean; data_sharing?: boolean; marketing?: boolean }
) => {
    await pool.query(
        `
                    INSERT INTO patient_consents (
                        patient_id,
                        terms_accepted,
                        terms_accepted_at,
                        data_sharing,
                        data_sharing_updated_at,
                        marketing,
                        marketing_updated_at,
                        updated_at
                    )
                    VALUES (
                        $1,
                        COALESCE($2, FALSE),
                        CASE WHEN COALESCE($2, FALSE) THEN NOW() ELSE NULL END,
                        COALESCE($3, FALSE),
                        NOW(),
                        COALESCE($4, FALSE),
                        NOW(),
                        NOW()
                    )
                    ON CONFLICT (patient_id)
                    DO UPDATE SET
                        terms_accepted = COALESCE($2, patient_consents.terms_accepted),
                        terms_accepted_at = CASE
                            WHEN $2 IS TRUE THEN NOW()
                            ELSE patient_consents.terms_accepted_at
                        END,
                        data_sharing = COALESCE($3, patient_consents.data_sharing),
                        data_sharing_updated_at = CASE WHEN $3 IS NULL THEN patient_consents.data_sharing_updated_at ELSE NOW() END,
                        marketing = COALESCE($4, patient_consents.marketing),
                        marketing_updated_at = CASE WHEN $4 IS NULL THEN patient_consents.marketing_updated_at ELSE NOW() END,
                        updated_at = NOW()
                `,
        [patientId, payload.terms_accepted ?? null, payload.data_sharing ?? null, payload.marketing ?? null]
    );

    return getPatientConsent(patientId);
};
