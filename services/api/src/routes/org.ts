import { Router } from "express";
import { z } from "zod";
import type { Request, Response } from "express";
import { authenticate, requireRole } from "../middleware/authenticate";
import { AppError } from "../errors/AppError";
import { asyncHandler } from "../utils/asyncHandler";
import { paginated, success } from "../utils/response";
import { pool } from "../db/pool";

const OverviewParamsSchema = z.object({
    orgId: z.string().uuid()
});

const PatientsQuerySchema = z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
    professionalId: z.string().uuid().optional(),
    riskLevel: z.enum(["low", "moderate", "high"]).optional(),
    condition: z.string().optional(),
    lastActiveDays: z.coerce.number().int().positive().optional()
});

const AssignBodySchema = z.object({
    patientId: z.string().uuid(),
    professionalId: z.string().uuid()
});

const orgAccessCheck = async (orgId: string, userId: string, role: string): Promise<void> => {
    if (role === "platform_admin") {
        return;
    }

    const membership = await pool.query(
        `SELECT 1 FROM org_memberships WHERE org_id = $1 AND user_id = $2 LIMIT 1`,
        [orgId, userId]
    );

    if (!membership.rowCount) {
        throw new AppError("Forbidden", 403);
    }
};

export const orgRouter = Router();
orgRouter.use(authenticate);
orgRouter.use(requireRole("org_admin", "platform_admin", "doctor", "dietician", "physiotherapist"));

orgRouter.get(
    "/org/:orgId/overview",
    asyncHandler(async (req: Request, res: Response) => {
        const { orgId } = OverviewParamsSchema.parse(req.params);
        await orgAccessCheck(orgId, req.user!.id, req.user!.role);

        const [kpi, riskDist, adherence, resolvedRate] = await Promise.all([
            pool.query(
                `
          SELECT
            (SELECT COUNT(*)::int FROM org_patient_assignments opa WHERE opa.org_id = $1) AS total_patients,
            (SELECT COUNT(DISTINCT v.patient_id)::int
               FROM vitals v
               JOIN org_patient_assignments opa ON opa.patient_id = v.patient_id
              WHERE opa.org_id = $1
                AND v.recorded_at >= NOW() - INTERVAL '7 days') AS active_patients,
            (SELECT COUNT(*)::int FROM org_memberships om WHERE om.org_id = $1 AND om.role IN ('doctor','dietician','physiotherapist')) AS professionals
        `,
                [orgId]
            ),
            pool.query(
                `
          SELECT rs.score, COUNT(*)::int AS count
          FROM risk_scores rs
          JOIN (
            SELECT patient_id, category, MAX(computed_at) AS computed_at
            FROM risk_scores
            GROUP BY patient_id, category
          ) latest ON latest.patient_id = rs.patient_id AND latest.category = rs.category AND latest.computed_at = rs.computed_at
          JOIN org_patient_assignments opa ON opa.patient_id = rs.patient_id
          WHERE opa.org_id = $1
          GROUP BY rs.score
        `,
                [orgId]
            ),
            pool.query<{ adherence_rate: number }>(
                `
          SELECT COALESCE(ROUND(AVG(CASE WHEN cpa.acknowledged_at IS NOT NULL THEN 100 ELSE 0 END), 2), 0) AS adherence_rate
          FROM care_plans cp
          JOIN org_patient_assignments opa ON opa.patient_id = cp.patient_id
          LEFT JOIN care_plan_acknowledgments cpa ON cpa.care_plan_id = cp.id AND cpa.patient_id = cp.patient_id
          WHERE opa.org_id = $1
        `,
                [orgId]
            ),
            pool.query<{ resolved_rate: number }>(
                `
          SELECT COALESCE(ROUND(AVG(CASE WHEN a.is_read THEN 100 ELSE 0 END), 2), 0) AS resolved_rate
          FROM alerts a
          JOIN org_patient_assignments opa ON opa.patient_id = a.patient_id
          WHERE opa.org_id = $1
        `,
                [orgId]
            )
        ]);

        return success(res, {
            total_patients: kpi.rows[0]?.total_patients || 0,
            active_patients: kpi.rows[0]?.active_patients || 0,
            professionals: kpi.rows[0]?.professionals || 0,
            risk_distribution: riskDist.rows,
            care_plan_adherence_rate: Number(adherence.rows[0]?.adherence_rate || 0),
            alerts_resolved_rate: Number(resolvedRate.rows[0]?.resolved_rate || 0)
        });
    })
);

orgRouter.get(
    "/org/:orgId/patients",
    asyncHandler(async (req: Request, res: Response) => {
        const { orgId } = OverviewParamsSchema.parse(req.params);
        const query = PatientsQuerySchema.parse(req.query);
        await orgAccessCheck(orgId, req.user!.id, req.user!.role);

        const where: string[] = ["opa.org_id = $1"];
        const values: unknown[] = [orgId];

        if (query.professionalId) {
            values.push(query.professionalId);
            where.push(`opa.professional_id = $${values.length}`);
        }

        if (query.riskLevel) {
            values.push(query.riskLevel);
            where.push(`latest_risk.score = $${values.length}`);
        }

        if (query.condition) {
            values.push(`%${query.condition}%`);
            where.push(`EXISTS (SELECT 1 FROM unnest(pb.chronic_conditions) AS cc WHERE cc ILIKE $${values.length})`);
        }

        if (query.lastActiveDays) {
            values.push(query.lastActiveDays);
            where.push(`COALESCE(last_vital.recorded_at, NOW() - INTERVAL '100 years') >= NOW() - ($${values.length} || ' days')::interval`);
        }

        const offset = (query.page - 1) * query.limit;
        values.push(query.limit);
        const limitIndex = values.length;
        values.push(offset);
        const offsetIndex = values.length;

        const rows = await pool.query(
            `
        WITH latest_risk AS (
          SELECT DISTINCT ON (patient_id) patient_id, score
          FROM risk_scores
          ORDER BY patient_id, computed_at DESC
        ),
        last_vital AS (
          SELECT patient_id, MAX(recorded_at) AS recorded_at
          FROM vitals
          GROUP BY patient_id
        )
        SELECT
          u.id,
          up.name,
          latest_risk.score AS risk_score,
          opa.professional_id,
          pb.chronic_conditions,
          last_vital.recorded_at AS last_active
        FROM org_patient_assignments opa
        JOIN users u ON u.id = opa.patient_id
        LEFT JOIN user_profiles up ON up.user_id = u.id
        LEFT JOIN patient_baselines pb ON pb.patient_id = u.id
        LEFT JOIN latest_risk ON latest_risk.patient_id = u.id
        LEFT JOIN last_vital ON last_vital.patient_id = u.id
        WHERE ${where.join(" AND ")}
        ORDER BY COALESCE(last_vital.recorded_at, u.created_at) DESC
        LIMIT $${limitIndex} OFFSET $${offsetIndex}
      `,
            values
        );

        const count = await pool.query<{ count: string }>(
            `
        SELECT COUNT(*)::text AS count
        FROM org_patient_assignments opa
        JOIN users u ON u.id = opa.patient_id
        LEFT JOIN patient_baselines pb ON pb.patient_id = u.id
        LEFT JOIN (
          SELECT DISTINCT ON (patient_id) patient_id, score
          FROM risk_scores
          ORDER BY patient_id, computed_at DESC
        ) latest_risk ON latest_risk.patient_id = u.id
        LEFT JOIN (
          SELECT patient_id, MAX(recorded_at) AS recorded_at
          FROM vitals
          GROUP BY patient_id
        ) last_vital ON last_vital.patient_id = u.id
        WHERE ${where.join(" AND ")}
      `,
            values.slice(0, values.length - 2)
        );

        const total = Number(count.rows[0]?.count || 0);

        return paginated(res, rows.rows, {
            page: query.page,
            limit: query.limit,
            total,
            totalPages: Math.max(1, Math.ceil(total / query.limit))
        });
    })
);

orgRouter.post(
    "/org/:orgId/assign",
    asyncHandler(async (req: Request, res: Response) => {
        const { orgId } = OverviewParamsSchema.parse(req.params);
        const body = AssignBodySchema.parse(req.body);
        await orgAccessCheck(orgId, req.user!.id, req.user!.role);

        const validation = await pool.query(
            `
        SELECT
          EXISTS (SELECT 1 FROM org_memberships WHERE org_id = $1 AND user_id = $2) AS patient_member,
          EXISTS (
            SELECT 1 FROM org_memberships
            WHERE org_id = $1
              AND user_id = $3
              AND role IN ('doctor','dietician','physiotherapist')
          ) AS professional_member
      `,
            [orgId, body.patientId, body.professionalId]
        );

        if (!validation.rows[0]?.patient_member || !validation.rows[0]?.professional_member) {
            return success(res, { assigned: false, error: "Patient/professional not in org" }, 400);
        }

        await pool.query(
            `
        INSERT INTO org_patient_assignments (org_id, patient_id, professional_id, assigned_by)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (org_id, patient_id)
        DO UPDATE SET professional_id = EXCLUDED.professional_id, assigned_by = EXCLUDED.assigned_by, updated_at = NOW()
      `,
            [orgId, body.patientId, body.professionalId, req.user!.id]
        );

        await pool.query(
            `
        INSERT INTO alerts (patient_id, professional_id, type, message)
        VALUES ($1, $2, 'patient_assigned', 'A new patient has been assigned to you')
      `,
            [body.patientId, body.professionalId]
        );

        return success(res, { assigned: true });
    })
);

orgRouter.get(
    "/org/:orgId/professionals",
    asyncHandler(async (req: Request, res: Response) => {
        const { orgId } = OverviewParamsSchema.parse(req.params);
        await orgAccessCheck(orgId, req.user!.id, req.user!.role);

        const rows = await pool.query(
            `
        SELECT
          u.id,
          up.name,
          om.role,
          COUNT(DISTINCT opa.patient_id)::int AS patients_count,
          COALESCE(ROUND(AVG(EXTRACT(EPOCH FROM (COALESCE(a.read_at, NOW()) - a.created_at)) / 60), 2), 0) AS avg_alert_response_minutes,
          COUNT(DISTINCT cp.id)::int AS care_plans_active
        FROM org_memberships om
        JOIN users u ON u.id = om.user_id
        LEFT JOIN user_profiles up ON up.user_id = u.id
        LEFT JOIN org_patient_assignments opa ON opa.org_id = om.org_id AND opa.professional_id = u.id
        LEFT JOIN alerts a ON a.professional_id = u.id
        LEFT JOIN care_plans cp ON cp.created_by = u.id AND cp.status = 'active'
        WHERE om.org_id = $1
          AND om.role IN ('doctor', 'dietician', 'physiotherapist')
        GROUP BY u.id, up.name, om.role
        ORDER BY patients_count DESC, up.name ASC
      `,
            [orgId]
        );

        return success(res, rows.rows);
    })
);

orgRouter.get(
    "/org/:orgId/risk-distribution",
    asyncHandler(async (req: Request, res: Response) => {
        const { orgId } = OverviewParamsSchema.parse(req.params);
        await orgAccessCheck(orgId, req.user!.id, req.user!.role);

        const rows = await pool.query(
            `
        SELECT score, COUNT(*)::int AS count
        FROM (
          SELECT DISTINCT ON (rs.patient_id, rs.category)
            rs.patient_id,
            rs.category,
            rs.score,
            rs.computed_at
          FROM risk_scores rs
          JOIN org_patient_assignments opa ON opa.patient_id = rs.patient_id
          WHERE opa.org_id = $1
          ORDER BY rs.patient_id, rs.category, rs.computed_at DESC
        ) latest
        GROUP BY score
        ORDER BY score
      `,
            [orgId]
        );

        return success(res, rows.rows);
    })
);
