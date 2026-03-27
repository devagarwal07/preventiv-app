import { Router } from "express";
import { authenticate } from "../middleware/authenticate";
import { requireRole } from "../middleware/authenticate";
import { asyncHandler } from "../utils/asyncHandler";
import { success } from "../utils/response";
import { pool } from "../db/pool";
import { redis } from "../cache/client";

export const presenceRouter = Router();
presenceRouter.use(authenticate);

presenceRouter.get(
    "/presence/patients/:professionalId",
    requireRole("doctor", "dietician", "physiotherapist", "org_admin", "platform_admin"),
    asyncHandler(async (req, res) => {
        const professionalId = Array.isArray(req.params.professionalId)
            ? req.params.professionalId[0]
            : req.params.professionalId;

        const rows = await pool.query<{ patient_id: string }>(
            `
        SELECT DISTINCT patient_id
        FROM (
          SELECT patient_id FROM consultations WHERE professional_id = $1
          UNION ALL
          SELECT patient_id FROM appointments WHERE professional_id = $1
          UNION ALL
          SELECT patient_id FROM care_plans WHERE created_by = $1
        ) q
      `,
            [professionalId]
        );

        const statuses = await Promise.all(
            rows.rows.map(async (r) => {
                const lastSeen = await redis.hget(`online:${r.patient_id}`, "last_seen");
                return {
                    patientId: r.patient_id,
                    online: Boolean(lastSeen),
                    lastSeen
                };
            })
        );

        return success(res, statuses);
    })
);
