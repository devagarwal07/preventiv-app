import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireServiceKey } from "./utils/auth";
import { notificationQueue } from "./workers/notificationWorker";
import { pool } from "./utils/db";

export const router = Router();

const notifySchema = z.object({
    userId: z.string().uuid(),
    patientId: z.string().uuid().optional(),
    professionalId: z.string().uuid().optional(),
    type: z.string().min(1),
    mode: z.enum(["immediate", "scheduled", "digest"]).default("immediate"),
    channels: z.array(z.enum(["push", "email", "inApp"])).min(1),
    payload: z.object({
        title: z.string().optional(),
        body: z.string().optional(),
        message: z.string().optional(),
        email: z.string().email().optional(),
        template: z.string().optional(),
        templateVars: z.record(z.union([z.string(), z.number(), z.boolean(), z.null()])).optional()
    })
});

router.post("/devices/register", requireAuth, async (req, res) => {
    const body = z
        .object({
            userId: z.string().uuid(),
            fcmToken: z.string().min(20),
            platform: z.enum(["android", "ios", "web"])
        })
        .parse(req.body);

    await pool.query(
        `
      INSERT INTO user_device_tokens (user_id, fcm_token, platform, updated_at)
      VALUES ($1, $2, $3, NOW())
      ON CONFLICT (user_id, fcm_token)
      DO UPDATE SET platform = EXCLUDED.platform, updated_at = NOW()
    `,
        [body.userId, body.fcmToken, body.platform]
    );

    res.status(201).json({ success: true, data: { registered: true } });
});

router.post("/internal/notify", requireServiceKey, async (req, res) => {
    const body = notifySchema.parse(req.body);

    await notificationQueue.add(body, {
        attempts: 3,
        backoff: {
            type: "exponential",
            delay: 1500
        }
    });

    res.status(202).json({ success: true, data: { queued: true } });
});

router.get("/notifications", requireAuth, async (req, res) => {
    const user = (req as typeof req & { user: { id: string } }).user;
    const page = Number(req.query.page || 1);
    const limit = Number(req.query.limit || 20);
    const offset = (page - 1) * limit;

    const [rowsResult, countResult] = await Promise.all([
        pool.query(
            `
        SELECT *
        FROM alerts
        WHERE patient_id = $1 OR professional_id = $1
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3
      `,
            [user.id, limit, offset]
        ),
        pool.query<{ count: string }>(
            `SELECT COUNT(*)::text AS count FROM alerts WHERE patient_id = $1 OR professional_id = $1`,
            [user.id]
        )
    ]);

    const total = Number(countResult.rows[0]?.count || 0);

    res.json({
        success: true,
        data: rowsResult.rows,
        meta: {
            page,
            limit,
            total,
            totalPages: Math.max(1, Math.ceil(total / limit))
        }
    });
});

router.patch("/notifications/:id/read", requireAuth, async (req, res) => {
    const user = (req as typeof req & { user: { id: string } }).user;
    await pool.query(
        `
      UPDATE alerts
      SET is_read = TRUE, read_at = NOW()
      WHERE id = $1 AND (patient_id = $2 OR professional_id = $2)
    `,
        [req.params.id, user.id]
    );

    res.json({ success: true, data: { updated: true } });
});

router.patch("/notifications/mark-all-read", requireAuth, async (req, res) => {
    const user = (req as typeof req & { user: { id: string } }).user;
    await pool.query(
        `
      UPDATE alerts
      SET is_read = TRUE, read_at = NOW()
      WHERE (patient_id = $1 OR professional_id = $1) AND is_read = FALSE
    `,
        [user.id]
    );
    res.json({ success: true, data: { updated: true } });
});
