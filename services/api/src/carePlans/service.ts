import { pool } from "../db/pool";
import { cache } from "../cache/client";
import { AppError } from "../errors/AppError";
import { canAccessPatient } from "../patients/access";
import { notifyInternal } from "../notifications/client";
import { socketEvents } from "../realtime/socketServer";

type CarePlanItemInput = {
    action: string;
    frequency: "daily" | "weekly" | "monthly";
    instructions?: string;
    due_date?: string;
    reminder: boolean;
};

const adherenceCacheKey = (patientId: string): string => `care-plan:adherence:${patientId}`;

export const createCarePlan = async (params: {
    patientId: string;
    createdBy: string;
    type: "medical" | "nutrition" | "rehab";
    title: string;
    items: CarePlanItemInput[];
}) => {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        const planResult = await client.query<{ id: string }>(
            `
      INSERT INTO care_plans (patient_id, created_by, type, title, status)
      VALUES ($1, $2, $3, $4, 'active')
      RETURNING id
      `,
            [params.patientId, params.createdBy, params.type, params.title]
        );

        const planId = planResult.rows[0].id;

        for (const item of params.items) {
            await client.query(
                `
        INSERT INTO care_plan_items (care_plan_id, action, frequency, instructions, due_date, reminder)
        VALUES ($1, $2, $3, $4, $5, $6)
        `,
                [planId, item.action, item.frequency, item.instructions || null, item.due_date || null, item.reminder]
            );
        }

        await client.query("COMMIT");

        const created = await getCarePlanById(planId);

        await notifyInternal({
            userId: params.patientId,
            patientId: params.patientId,
            type: "CARE_PLAN_UPDATED",
            channels: ["inApp", "push"],
            notificationPayload: {
                title: "Care plan created",
                body: params.title,
                message: `A new ${params.type} care plan has been created for you.`
            }
        });

        socketEvents.emitCarePlanUpdated(params.patientId, created);
        await cache.del(adherenceCacheKey(params.patientId));

        return created;
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
};

export const getCarePlanById = async (planId: string) => {
    const result = await pool.query(
        `
    SELECT cp.*, COALESCE(json_agg(cpi.*) FILTER (WHERE cpi.id IS NOT NULL), '[]') AS items
    FROM care_plans cp
    LEFT JOIN care_plan_items cpi ON cpi.care_plan_id = cp.id
    WHERE cp.id = $1
    GROUP BY cp.id
    `,
        [planId]
    );

    if (!result.rowCount) {
        throw new AppError("Care plan not found", 404);
    }

    return result.rows[0];
};

export const listCarePlansByPatient = async (patientId: string) => {
    const result = await pool.query(
        `
    SELECT
      cp.*,
      COALESCE(json_agg(cpi.*) FILTER (WHERE cpi.id IS NOT NULL), '[]') AS items,
      ack.acknowledged_at AS last_acknowledged_at
    FROM care_plans cp
    LEFT JOIN care_plan_items cpi ON cpi.care_plan_id = cp.id
    LEFT JOIN care_plan_acknowledgments ack ON ack.care_plan_id = cp.id AND ack.patient_id = cp.patient_id
    WHERE cp.patient_id = $1
    GROUP BY cp.id, ack.acknowledged_at
    ORDER BY cp.updated_at DESC
    `,
        [patientId]
    );

    return result.rows;
};

export const updateCarePlan = async (params: {
    planId: string;
    actorId: string;
    title?: string;
    status?: "active" | "completed" | "paused";
    items?: CarePlanItemInput[];
}) => {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        const currentResult = await client.query<{
            id: string;
            patient_id: string;
            created_by: string;
            title: string;
            status: "active" | "completed" | "paused";
        }>(
            `SELECT id, patient_id, created_by, title, status FROM care_plans WHERE id = $1 LIMIT 1`,
            [params.planId]
        );

        if (!currentResult.rowCount) {
            throw new AppError("Care plan not found", 404);
        }

        const current = currentResult.rows[0];
        if (current.created_by !== params.actorId) {
            throw new AppError("Only the creator can edit this care plan", 403);
        }

        const snapshotItems = await client.query(
            `SELECT id, action, frequency, instructions, due_date, reminder FROM care_plan_items WHERE care_plan_id = $1`,
            [params.planId]
        );

        const versionNoResult = await client.query<{ next_version: string }>(
            `SELECT (COALESCE(MAX(version_no), 0) + 1)::text AS next_version FROM care_plan_versions WHERE care_plan_id = $1`,
            [params.planId]
        );

        await client.query(
            `
      INSERT INTO care_plan_versions (care_plan_id, version_no, title, status, snapshot, changed_by)
      VALUES ($1, $2, $3, $4, $5::jsonb, $6)
      `,
            [
                params.planId,
                Number(versionNoResult.rows[0]?.next_version || 1),
                current.title,
                current.status,
                JSON.stringify({ items: snapshotItems.rows }),
                params.actorId
            ]
        );

        const nextTitle = params.title ?? current.title;
        const nextStatus = params.status ?? current.status;

        await client.query(
            `
      UPDATE care_plans
      SET title = $2, status = $3, updated_at = NOW()
      WHERE id = $1
      `,
            [params.planId, nextTitle, nextStatus]
        );

        if (params.items) {
            await client.query(`DELETE FROM care_plan_items WHERE care_plan_id = $1`, [params.planId]);
            for (const item of params.items) {
                await client.query(
                    `
          INSERT INTO care_plan_items (care_plan_id, action, frequency, instructions, due_date, reminder)
          VALUES ($1, $2, $3, $4, $5, $6)
          `,
                    [params.planId, item.action, item.frequency, item.instructions || null, item.due_date || null, item.reminder]
                );
            }
        }

        await client.query("COMMIT");

        const updated = await getCarePlanById(params.planId);
        await notifyInternal({
            userId: current.patient_id,
            patientId: current.patient_id,
            type: "CARE_PLAN_UPDATED",
            channels: ["inApp", "push"],
            notificationPayload: {
                title: "Care plan updated",
                body: nextTitle,
                message: "Your care plan has been updated by your professional."
            }
        });

        socketEvents.emitCarePlanUpdated(current.patient_id, updated);
        await cache.del(adherenceCacheKey(current.patient_id));

        return updated;
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
};

export const acknowledgeCarePlan = async (planId: string, patientId: string) => {
    const planResult = await pool.query<{ patient_id: string }>(
        `SELECT patient_id FROM care_plans WHERE id = $1 LIMIT 1`,
        [planId]
    );

    if (!planResult.rowCount) {
        throw new AppError("Care plan not found", 404);
    }

    if (planResult.rows[0].patient_id !== patientId) {
        throw new AppError("Only the patient can acknowledge this plan", 403);
    }

    await pool.query(
        `
    INSERT INTO care_plan_acknowledgments (care_plan_id, patient_id, acknowledged_at)
    VALUES ($1, $2, NOW())
    ON CONFLICT (care_plan_id, patient_id)
    DO UPDATE SET acknowledged_at = EXCLUDED.acknowledged_at
    `,
        [planId, patientId]
    );

    return { acknowledged: true };
};

export const completeCarePlanItem = async (params: {
    planId: string;
    itemId: string;
    patientId: string;
    notes?: string;
}) => {
    const itemResult = await pool.query<{ id: string; care_plan_id: string; patient_id: string }>(
        `
    SELECT cpi.id, cpi.care_plan_id, cp.patient_id
    FROM care_plan_items cpi
    JOIN care_plans cp ON cp.id = cpi.care_plan_id
    WHERE cpi.id = $1 AND cp.id = $2
    LIMIT 1
    `,
        [params.itemId, params.planId]
    );

    if (!itemResult.rowCount) {
        throw new AppError("Care plan item not found", 404);
    }

    if (itemResult.rows[0].patient_id !== params.patientId) {
        throw new AppError("Only the patient can complete this item", 403);
    }

    const updated = await pool.query(
        `
    UPDATE care_plan_completions
    SET notes = $3, completed_at = NOW()
    WHERE care_plan_item_id = $1
      AND patient_id = $2
      AND DATE(completed_at) = CURRENT_DATE
    `,
        [params.itemId, params.patientId, params.notes || null]
    );

    if (!updated.rowCount) {
        await pool.query(
            `
      INSERT INTO care_plan_completions (care_plan_item_id, patient_id, completed_at, notes)
      VALUES ($1, $2, NOW(), $3)
      `,
            [params.itemId, params.patientId, params.notes || null]
        );
    }

    await cache.del(adherenceCacheKey(params.patientId));

    return { completed: true };
};

const streakForItem = async (itemId: string, patientId: string): Promise<number> => {
    const result = await pool.query<{ day: string }>(
        `
    SELECT DISTINCT DATE(completed_at)::text AS day
    FROM care_plan_completions
    WHERE care_plan_item_id = $1 AND patient_id = $2
    ORDER BY day DESC
    `,
        [itemId, patientId]
    );

    let streak = 0;
    let cursor = new Date();
    for (const row of result.rows) {
        const d = new Date(`${row.day}T00:00:00Z`);
        if (d.toISOString().slice(0, 10) === cursor.toISOString().slice(0, 10)) {
            streak += 1;
            cursor.setUTCDate(cursor.getUTCDate() - 1);
        } else {
            break;
        }
    }

    return streak;
};

export const getCarePlanAdherence = async (patientId: string) => {
    const key = adherenceCacheKey(patientId);
    const cached = await cache.get<unknown>(key);
    if (cached) return cached;

    const plansResult = await pool.query<{ id: string; title: string }>(
        `SELECT id, title FROM care_plans WHERE patient_id = $1 ORDER BY created_at DESC`,
        [patientId]
    );

    const plans = [] as Array<{
        planId: string;
        title: string;
        completionRate7d: number;
        completionRate30d: number;
        items: Array<{ itemId: string; action: string; streak: number }>;
    }>;

    let weightedTotal = 0;
    let weightedCount = 0;

    for (const plan of plansResult.rows) {
        const itemsResult = await pool.query<{ id: string; action: string; frequency: string }>(
            `SELECT id, action, frequency FROM care_plan_items WHERE care_plan_id = $1`,
            [plan.id]
        );

        const itemIds = itemsResult.rows.map((r) => r.id);
        if (!itemIds.length) continue;

        const completionResult = await pool.query<{ c7: string; c30: string }>(
            `
      SELECT
        SUM(CASE WHEN completed_at >= NOW() - INTERVAL '7 days' THEN 1 ELSE 0 END)::text AS c7,
        SUM(CASE WHEN completed_at >= NOW() - INTERVAL '30 days' THEN 1 ELSE 0 END)::text AS c30
      FROM care_plan_completions
      WHERE patient_id = $1 AND care_plan_item_id = ANY($2::uuid[])
      `,
            [patientId, itemIds]
        );

        const expected7 = itemIds.length * 7;
        const expected30 = itemIds.length * 30;
        const c7 = Number(completionResult.rows[0]?.c7 || 0);
        const c30 = Number(completionResult.rows[0]?.c30 || 0);

        const rate7 = expected7 === 0 ? 0 : Number(((c7 / expected7) * 100).toFixed(2));
        const rate30 = expected30 === 0 ? 0 : Number(((c30 / expected30) * 100).toFixed(2));

        weightedTotal += rate30;
        weightedCount += 1;

        const items = await Promise.all(
            itemsResult.rows.map(async (item) => ({
                itemId: item.id,
                action: item.action,
                streak: await streakForItem(item.id, patientId)
            }))
        );

        plans.push({
            planId: plan.id,
            title: plan.title,
            completionRate7d: rate7,
            completionRate30d: rate30,
            items
        });
    }

    const payload = {
        plans,
        overallAdherenceScore: weightedCount ? Number((weightedTotal / weightedCount).toFixed(2)) : 0
    };

    await cache.set(key, payload, 60 * 60);
    return payload;
};

export const ensurePatientPlanAccess = async (planId: string, user: { id: string; role: string; orgId?: string | null }) => {
    const result = await pool.query<{ patient_id: string }>(`SELECT patient_id FROM care_plans WHERE id = $1 LIMIT 1`, [planId]);
    if (!result.rowCount) throw new AppError("Care plan not found", 404);

    const patientId = result.rows[0].patient_id;
    const allowed = await canAccessPatient(
        { id: user.id, role: user.role as never, orgId: user.orgId || null },
        patientId
    );

    if (!allowed) {
        throw new AppError("Forbidden", 403);
    }

    return patientId;
};
