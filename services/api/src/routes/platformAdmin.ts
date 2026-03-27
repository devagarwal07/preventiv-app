import { Router } from "express";
import { z } from "zod";
import type { Request, Response } from "express";
import { authenticate, requireRole } from "../middleware/authenticate";
import { asyncHandler } from "../utils/asyncHandler";
import { paginated, success } from "../utils/response";
import { pool } from "../db/pool";
import { redis } from "../cache/client";

const ListUsersQuerySchema = z.object({
    q: z.string().optional(),
    role: z.string().optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20)
});

const UserStatusSchema = z.object({
    status: z.enum(["active", "suspended"])
});

const OrgCreateSchema = z.object({
    name: z.string().min(2),
    type: z.enum(["hospital", "clinic"]),
    address: z.string().optional(),
    admin_user_id: z.string().uuid(),
    plan: z.string().default("starter")
});

const OrgPatchSchema = z.object({
    name: z.string().min(2).optional(),
    plan: z.string().optional(),
    address: z.string().optional()
});

const ConfigSchema = z.object({
    key: z.string().min(3),
    value_json: z.record(z.unknown())
});

const postModeration = z.object({
    reason: z.string().max(300).optional()
});

export const platformAdminRouter = Router();
platformAdminRouter.use(authenticate);
platformAdminRouter.use(requireRole("platform_admin"));

const getParam = (req: Request, key: string): string => {
    const raw = req.params[key];
    return Array.isArray(raw) ? raw[0] : raw;
};

const audit = async (adminId: string, action: string, entityType: string, entityId: string, metadata: unknown, req: Request) => {
    await pool.query(
        `
      INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, metadata, ip_address)
      VALUES ($1, $2, $3, $4, $5::jsonb, $6)
    `,
        [adminId, action, entityType, entityId, JSON.stringify(metadata || {}), req.ip]
    );
};

platformAdminRouter.get(
    "/platform-admin/users",
    asyncHandler(async (req: Request, res: Response) => {
        const query = ListUsersQuerySchema.parse(req.query);
        const where: string[] = ["1=1"];
        const values: unknown[] = [];

        if (query.q) {
            values.push(`%${query.q}%`);
            where.push(`(u.email ILIKE $${values.length} OR up.name ILIKE $${values.length})`);
        }

        if (query.role) {
            values.push(query.role);
            where.push(`u.role = $${values.length}`);
        }

        const offset = (query.page - 1) * query.limit;
        values.push(query.limit);
        const limitIndex = values.length;
        values.push(offset);
        const offsetIndex = values.length;

        const rows = await pool.query(
            `
        SELECT u.id, u.email, u.phone, u.role, u.is_verified, u.created_at, u.deleted_at, u.status, up.name
        FROM users u
        LEFT JOIN user_profiles up ON up.user_id = u.id
        WHERE ${where.join(" AND ")}
        ORDER BY u.created_at DESC
        LIMIT $${limitIndex} OFFSET $${offsetIndex}
      `,
            values
        );

        const count = await pool.query<{ count: string }>(
            `SELECT COUNT(*)::text AS count FROM users u LEFT JOIN user_profiles up ON up.user_id = u.id WHERE ${where.join(" AND ")}`,
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

platformAdminRouter.patch(
    "/platform-admin/users/:id/status",
    asyncHandler(async (req: Request, res: Response) => {
        const body = UserStatusSchema.parse(req.body);
        const userId = getParam(req, "id");

        await pool.query(`UPDATE users SET status = $2, updated_at = NOW() WHERE id = $1`, [userId, body.status]);
        await audit(req.user!.id, "user_status_changed", "user", userId, body, req);

        return success(res, { updated: true });
    })
);

platformAdminRouter.post(
    "/platform-admin/professionals/:id/verify",
    asyncHandler(async (req: Request, res: Response) => {
        const professionalId = getParam(req, "id");

        await pool.query(`UPDATE users SET is_verified = TRUE, updated_at = NOW() WHERE id = $1`, [professionalId]);
        await pool.query(
            `
        INSERT INTO professional_verifications (user_id, license_no, specialization, verified_at)
        VALUES ($1, 'verified-by-platform-admin', NULL, NOW())
        ON CONFLICT (user_id) DO UPDATE SET verified_at = NOW()
      `,
            [professionalId]
        );

        await audit(req.user!.id, "professional_verified", "user", professionalId, {}, req);
        return success(res, { verified: true });
    })
);

platformAdminRouter.get(
    "/platform-admin/professionals/pending",
    asyncHandler(async (_req: Request, res: Response) => {
        const rows = await pool.query(
            `
        SELECT u.id, u.email, u.role, up.name, pv.license_no, pv.specialization, u.created_at
        FROM users u
        LEFT JOIN user_profiles up ON up.user_id = u.id
        LEFT JOIN professional_verifications pv ON pv.user_id = u.id
        WHERE u.role IN ('doctor','dietician','physiotherapist')
          AND u.is_verified = FALSE
        ORDER BY u.created_at ASC
      `
        );

        return success(res, rows.rows);
    })
);

platformAdminRouter.get(
    "/platform-admin/orgs",
    asyncHandler(async (_req: Request, res: Response) => {
        const rows = await pool.query(
            `
        SELECT o.id, o.name, o.type, o.address, o.plan, o.created_at, up.name AS admin_name
        FROM organizations o
        LEFT JOIN user_profiles up ON up.user_id = o.admin_user_id
        ORDER BY o.created_at DESC
      `
        );

        return success(res, rows.rows);
    })
);

platformAdminRouter.post(
    "/platform-admin/orgs",
    asyncHandler(async (req: Request, res: Response) => {
        const body = OrgCreateSchema.parse(req.body);
        const created = await pool.query(
            `
        INSERT INTO organizations (name, type, address, admin_user_id, plan)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `,
            [body.name, body.type, body.address || null, body.admin_user_id, body.plan]
        );

        await audit(req.user!.id, "org_created", "organization", created.rows[0].id, body, req);
        return success(res, created.rows[0], 201);
    })
);

platformAdminRouter.patch(
    "/platform-admin/orgs/:id",
    asyncHandler(async (req: Request, res: Response) => {
        const body = OrgPatchSchema.parse(req.body);
        const orgId = getParam(req, "id");

        await pool.query(
            `
        UPDATE organizations
        SET
          name = COALESCE($2, name),
          plan = COALESCE($3, plan),
          address = COALESCE($4, address),
          updated_at = NOW()
        WHERE id = $1
      `,
            [orgId, body.name || null, body.plan || null, body.address || null]
        );

        await audit(req.user!.id, "org_updated", "organization", orgId, body, req);
        return success(res, { updated: true });
    })
);

platformAdminRouter.get(
    "/platform-admin/orgs/:id/stats",
    asyncHandler(async (req: Request, res: Response) => {
        const orgId = getParam(req, "id");

        const result = await pool.query(
            `
        SELECT
          (SELECT COUNT(*)::int FROM org_memberships WHERE org_id = $1) AS members,
          (SELECT COUNT(*)::int FROM org_patient_assignments WHERE org_id = $1) AS assigned_patients,
          (SELECT COUNT(*)::int FROM alerts a JOIN org_patient_assignments opa ON opa.patient_id = a.patient_id WHERE opa.org_id = $1) AS alerts_count
      `,
            [orgId]
        );

        return success(res, result.rows[0] || { members: 0, assigned_patients: 0, alerts_count: 0 });
    })
);

platformAdminRouter.get(
    "/platform-admin/thresholds",
    asyncHandler(async (_req: Request, res: Response) => {
        const rows = await pool.query(
            `SELECT key, value_json, updated_by, updated_at FROM platform_config WHERE scope = 'threshold' ORDER BY key ASC`
        );

        return success(res, rows.rows);
    })
);

platformAdminRouter.put(
    "/platform-admin/thresholds",
    asyncHandler(async (req: Request, res: Response) => {
        const body = ConfigSchema.parse(req.body);

        await pool.query(
            `
        INSERT INTO platform_config (scope, key, value_json, updated_by)
        VALUES ('threshold', $1, $2::jsonb, $3)
        ON CONFLICT (scope, key)
        DO UPDATE SET value_json = EXCLUDED.value_json, updated_by = EXCLUDED.updated_by, updated_at = NOW()
      `,
            [body.key, JSON.stringify(body.value_json), req.user!.id]
        );

        await audit(req.user!.id, "threshold_updated", "platform_config", body.key, body.value_json, req);
        return success(res, { updated: true });
    })
);

platformAdminRouter.get(
    "/platform-admin/audit-logs",
    asyncHandler(async (req: Request, res: Response) => {
        const q = String(req.query.q || "").trim();
        const actorId = String(req.query.actorId || "").trim();
        const action = String(req.query.action || "").trim();
        const limit = Math.min(100, Math.max(1, Number(req.query.limit || 50)));

        const where: string[] = ["1=1"];
        const values: unknown[] = [];

        if (q) {
            values.push(`%${q}%`);
            where.push(`(al.action ILIKE $${values.length} OR al.entity_type ILIKE $${values.length})`);
        }

        if (actorId) {
            values.push(actorId);
            where.push(`al.actor_id = $${values.length}`);
        }

        if (action) {
            values.push(action);
            where.push(`al.action = $${values.length}`);
        }

        values.push(limit);

        const rows = await pool.query(
            `
        SELECT al.*, up.name AS actor_name
        FROM audit_logs al
        LEFT JOIN user_profiles up ON up.user_id = al.actor_id
        WHERE ${where.join(" AND ")}
        ORDER BY al.created_at DESC
        LIMIT $${values.length}
      `,
            values
        );

        return success(res, rows.rows);
    })
);

platformAdminRouter.get(
    "/platform-admin/risk-model-weights",
    asyncHandler(async (_req: Request, res: Response) => {
        const row = await pool.query(
            `SELECT key, value_json, updated_at FROM platform_config WHERE scope = 'risk_model' AND key = 'weights' LIMIT 1`
        );

        return success(res, row.rows[0] || { key: "weights", value_json: { cardiovascular: 0.4, glycemic: 0.35, lifestyle: 0.25 } });
    })
);

platformAdminRouter.put(
    "/platform-admin/risk-model-weights",
    asyncHandler(async (req: Request, res: Response) => {
        const body = z.object({ value_json: z.record(z.number()) }).parse(req.body);

        await pool.query(
            `
        INSERT INTO platform_config (scope, key, value_json, updated_by)
        VALUES ('risk_model', 'weights', $1::jsonb, $2)
        ON CONFLICT (scope, key)
        DO UPDATE SET value_json = EXCLUDED.value_json, updated_by = EXCLUDED.updated_by, updated_at = NOW()
      `,
            [JSON.stringify(body.value_json), req.user!.id]
        );

        await redis.publish(
            "ai:model-config",
            JSON.stringify({ type: "risk_model_weights", value: body.value_json, updatedBy: req.user!.id })
        );

        await audit(req.user!.id, "risk_model_weights_updated", "platform_config", "risk_model:weights", body.value_json, req);
        return success(res, { updated: true });
    })
);

platformAdminRouter.get(
    "/platform-admin/flagged-posts",
    asyncHandler(async (_req: Request, res: Response) => {
        const rows = await pool.query(
            `
        SELECT cp.*, up.name AS author_name
        FROM community_posts cp
        LEFT JOIN user_profiles up ON up.user_id = cp.author_id
        WHERE cp.moderation_status = 'flagged'
        ORDER BY cp.created_at DESC
      `
        );

        return success(res, rows.rows);
    })
);

platformAdminRouter.get(
    "/admin/flagged-posts",
    asyncHandler(async (_req: Request, res: Response) => {
        const rows = await pool.query(
            `
        SELECT cp.*, up.name AS author_name
        FROM community_posts cp
        LEFT JOIN user_profiles up ON up.user_id = cp.author_id
        WHERE cp.moderation_status = 'flagged'
        ORDER BY cp.created_at DESC
      `
        );

        return success(res, rows.rows);
    })
);

platformAdminRouter.post(
    "/platform-admin/posts/:id/approve",
    asyncHandler(async (req: Request, res: Response) => {
        const postId = getParam(req, "id");
        const body = postModeration.parse(req.body || {});

        await pool.query(`UPDATE community_posts SET moderation_status = 'published', updated_at = NOW() WHERE id = $1`, [postId]);
        await audit(req.user!.id, "post_approved", "community_post", postId, body, req);

        return success(res, { approved: true });
    })
);

platformAdminRouter.post(
    "/platform-admin/posts/:id/remove",
    asyncHandler(async (req: Request, res: Response) => {
        const postId = getParam(req, "id");
        const body = postModeration.parse(req.body || {});

        await pool.query(`UPDATE community_posts SET moderation_status = 'removed', updated_at = NOW() WHERE id = $1`, [postId]);
        await audit(req.user!.id, "post_removed", "community_post", postId, body, req);

        return success(res, { removed: true });
    })
);
