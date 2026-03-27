import type { NextFunction, Request, Response } from "express";
import { pool } from "../db/pool";

export const auditPatientDataAccess = (action: string) => {
    return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
        if (req.user?.id) {
            const patientId = Array.isArray(req.params.patientId) ? req.params.patientId[0] : req.params.patientId;
            if (patientId) {
                await pool.query(
                    `
            INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, metadata, ip_address)
            VALUES ($1, $2, 'patient', $3, $4::jsonb, $5)
          `,
                    [req.user.id, action, patientId, JSON.stringify({ path: req.path, method: req.method }), req.ip]
                );
            }
        }

        next();
    };
};
