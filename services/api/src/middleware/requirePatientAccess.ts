import type { NextFunction, Request, Response } from "express";
import { AppError } from "../errors/AppError";
import { canAccessPatient } from "../patients/access";

export const requirePatientAccess = async (
    req: Request,
    _res: Response,
    next: NextFunction
): Promise<void> => {
    if (!req.user) {
        throw new AppError("Unauthorized", 401);
    }

    const patientId = req.params.patientId || req.body.patient_id || req.user.id;
    if (!patientId) {
        throw new AppError("Patient id is required", 400);
    }

    const allowed = await canAccessPatient(
        {
            id: req.user.id,
            role: req.user.role,
            orgId: req.user.orgId
        },
        patientId
    );

    if (!allowed) {
        throw new AppError("Forbidden", 403);
    }

    next();
};
