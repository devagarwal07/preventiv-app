import { Router } from "express";
import { z } from "zod";
import type { Request, Response } from "express";
import { pool } from "../db/pool";
import { authenticate } from "../middleware/authenticate";
import { asyncHandler } from "../utils/asyncHandler";
import { paginated, success } from "../utils/response";
import { hasBlockedKeyword } from "../moderation/keywords";

const CommunityCategorySchema = z.enum([
    "general",
    "nutrition",
    "mental_health",
    "chronic_disease",
    "fitness",
    "symptoms"
]);

const ReactionTypeSchema = z.enum(["helpful", "not_alone", "important"]);

const CreatePostSchema = z.object({
    category: CommunityCategorySchema,
    content: z.string().min(5).max(5000),
    optional_anonymous: z.boolean().optional().default(false)
});

const ListPostsQuerySchema = z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(50).default(20),
    category: CommunityCategorySchema.optional(),
    sort: z.enum(["trending", "recent", "verified_only"]).default("recent")
});

const CommentSchema = z.object({
    content: z.string().min(2).max(2000)
});

const ReactSchema = z.object({
    type: ReactionTypeSchema.optional()
});

const EscalateSchema = z.object({
    professional_id: z.string().uuid().optional(),
    notes: z.string().max(1000).optional()
});

export const communityRouter = Router();
communityRouter.use(authenticate);

communityRouter.post(
    "/community/posts",
    asyncHandler(async (req: Request, res: Response) => {
        const body = CreatePostSchema.parse(req.body);

        const isProfessional = ["doctor", "dietician", "physiotherapist"].includes(req.user!.role);
        const isFlagged = hasBlockedKeyword(body.content);

        const created = await pool.query(
            `
        INSERT INTO community_posts (
          author_id,
          category,
          content,
          optional_anonymous,
          is_verified_professional,
          moderation_status
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, category, content, optional_anonymous, is_verified_professional, moderation_status, created_at
      `,
            [
                req.user!.id,
                body.category,
                body.content,
                body.optional_anonymous,
                isProfessional,
                isFlagged ? "flagged" : "published"
            ]
        );

        return success(res, created.rows[0], 201);
    })
);

communityRouter.get(
    "/community/posts",
    asyncHandler(async (req: Request, res: Response) => {
        const query = ListPostsQuerySchema.parse(req.query);
        const where: string[] = ["cp.moderation_status = 'published'"];
        const values: unknown[] = [];

        if (query.category) {
            values.push(query.category);
            where.push(`cp.category = $${values.length}`);
        }

        if (query.sort === "verified_only") {
            where.push("cp.is_verified_professional = TRUE");
        }

        const offset = (query.page - 1) * query.limit;
        values.push(query.limit);
        const limitIndex = values.length;
        values.push(offset);
        const offsetIndex = values.length;

        const orderBy =
            query.sort === "trending"
                ? `((COALESCE(rx.reaction_count, 0) + COALESCE(cm.comment_count, 0)) / POWER(GREATEST(EXTRACT(EPOCH FROM (NOW() - cp.created_at)) / 3600, 1), 1.5)) DESC`
                : "cp.created_at DESC";

        const rowsResult = await pool.query(
            `
        SELECT
          cp.id,
          cp.category,
          cp.content,
          cp.optional_anonymous,
          cp.is_verified_professional,
          cp.created_at,
          CASE WHEN cp.optional_anonymous AND cp.author_id <> $${offsetIndex + 1}
            THEN NULL
            ELSE cp.author_id
          END AS author_id,
          up.name AS author_name,
          COALESCE(rx.reaction_count, 0) AS reactions,
          COALESCE(cm.comment_count, 0) AS comments
        FROM community_posts cp
        LEFT JOIN user_profiles up ON up.user_id = cp.author_id
        LEFT JOIN (
          SELECT post_id, COUNT(*)::int AS reaction_count
          FROM community_reactions
          GROUP BY post_id
        ) rx ON rx.post_id = cp.id
        LEFT JOIN (
          SELECT post_id, COUNT(*)::int AS comment_count
          FROM community_comments
          GROUP BY post_id
        ) cm ON cm.post_id = cp.id
        WHERE ${where.join(" AND ")}
        ORDER BY ${orderBy}
        LIMIT $${limitIndex} OFFSET $${offsetIndex}
      `,
            [...values, req.user!.id]
        );

        const countResult = await pool.query<{ count: string }>(
            `
        SELECT COUNT(*)::text AS count
        FROM community_posts cp
        WHERE ${where.join(" AND ")}
      `,
            values.slice(0, values.length - 2)
        );

        const total = Number(countResult.rows[0]?.count || 0);
        return paginated(res, rowsResult.rows, {
            page: query.page,
            limit: query.limit,
            total,
            totalPages: Math.max(1, Math.ceil(total / query.limit))
        });
    })
);

communityRouter.post(
    "/community/posts/:postId/comments",
    asyncHandler(async (req: Request, res: Response) => {
        const body = CommentSchema.parse(req.body);
        const postId = req.params.postId;

        const isProfessional = ["doctor", "dietician", "physiotherapist"].includes(req.user!.role);

        const insert = await pool.query(
            `
        INSERT INTO community_comments (post_id, author_id, content, is_verified_professional)
        VALUES ($1, $2, $3, $4)
        RETURNING id, post_id, author_id, content, is_verified_professional, created_at
      `,
            [postId, req.user!.id, body.content, isProfessional]
        );

        await pool.query(
            `
        INSERT INTO alerts (patient_id, type, message)
        SELECT cp.author_id, 'community_comment', 'New comment on your community post'
        FROM community_posts cp
        WHERE cp.id = $1 AND cp.author_id <> $2
      `,
            [postId, req.user!.id]
        );

        return success(res, insert.rows[0], 201);
    })
);

communityRouter.post(
    "/community/posts/:postId/react",
    asyncHandler(async (req: Request, res: Response) => {
        const body = ReactSchema.parse(req.body);
        const postId = req.params.postId;

        if (!body.type) {
            await pool.query(
                `DELETE FROM community_reactions WHERE post_id = $1 AND user_id = $2`,
                [postId, req.user!.id]
            );
            return success(res, { removed: true });
        }

        await pool.query(
            `
        INSERT INTO community_reactions (post_id, user_id, type)
        VALUES ($1, $2, $3)
        ON CONFLICT (post_id, user_id)
        DO UPDATE SET type = EXCLUDED.type, created_at = NOW()
      `,
            [postId, req.user!.id, body.type]
        );

        return success(res, { upserted: true });
    })
);

communityRouter.post(
    "/community/posts/:postId/escalate",
    asyncHandler(async (req: Request, res: Response) => {
        const body = EscalateSchema.parse(req.body);
        const postId = req.params.postId;

        let professionalId = body.professional_id;

        if (!professionalId) {
            const professionalResult = await pool.query<{ author_id: string }>(
                `
          SELECT cc.author_id
          FROM community_comments cc
          JOIN users u ON u.id = cc.author_id
          WHERE cc.post_id = $1
            AND cc.is_verified_professional = TRUE
            AND u.role IN ('doctor', 'dietician', 'physiotherapist')
          ORDER BY cc.created_at DESC
          LIMIT 1
        `,
                [postId]
            );

            professionalId = professionalResult.rows[0]?.author_id;
        }

        if (!professionalId) {
            return success(res, { escalated: false, reason: "No verified professional found" });
        }

        const consultation = await pool.query(
            `
        INSERT INTO consultations (patient_id, professional_id, notes, diagnosis, occurred_at)
        VALUES ($1, $2, $3, 'community_escalation', NOW())
        RETURNING id, patient_id, professional_id, notes, occurred_at
      `,
            [req.user!.id, professionalId, body.notes || `Escalated from community thread ${postId}`]
        );

        await pool.query(
            `
        INSERT INTO alerts (patient_id, professional_id, type, message)
        VALUES ($1, $2, 'community_escalation', 'A patient escalated a community thread to consultation')
      `,
            [req.user!.id, professionalId]
        );

        return success(res, { escalated: true, consultation: consultation.rows[0] }, 201);
    })
);

communityRouter.get(
    "/community/professionals",
    asyncHandler(async (_req: Request, res: Response) => {
        const rows = await pool.query(
            `
        SELECT
          u.id,
          up.name,
          pv.specialization,
          COUNT(DISTINCT cp.id)::int AS helpful_posts,
          COUNT(DISTINCT cc.id)::int AS comments_count
        FROM users u
        LEFT JOIN user_profiles up ON up.user_id = u.id
        LEFT JOIN professional_verifications pv ON pv.user_id = u.id
        LEFT JOIN community_posts cp ON cp.author_id = u.id AND cp.moderation_status = 'published'
        LEFT JOIN community_comments cc ON cc.author_id = u.id
        WHERE u.role IN ('doctor', 'dietician', 'physiotherapist')
          AND u.is_verified = TRUE
        GROUP BY u.id, up.name, pv.specialization
        ORDER BY helpful_posts DESC, comments_count DESC, up.name ASC
        LIMIT 100
      `
        );

        return success(res, rows.rows);
    })
);
