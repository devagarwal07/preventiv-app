import { Router } from "express";
import { z } from "zod";
import type { Request, Response } from "express";
import { authenticate } from "../middleware/authenticate";
import { auditPatientDataAccess } from "../middleware/auditAccess";
import { requirePatientAccess } from "../middleware/requirePatientAccess";
import { asyncHandler } from "../utils/asyncHandler";
import { success } from "../utils/response";
import {
    PatientBaselinePatchSchema,
    PatientOnboardingSchema,
    PatientProfilePatchSchema
} from "../patients/schemas";
import {
    createPatientOnboarding,
    exportPatientData,
    getPatientConsent,
    getPatientEhr,
    getPatientProfile,
    patchPatientBaseline,
    patchPatientProfile,
    softDeletePatient,
    upsertPatientConsent
} from "../patients/service";

export const patientRouter = Router();
patientRouter.use(authenticate);

const ConsentPatchSchema = z.object({
    terms_accepted: z.boolean().optional(),
    data_sharing: z.boolean().optional(),
    marketing: z.boolean().optional()
});

const getPatientIdParam = (req: Request): string => {
    const raw = req.params.patientId;
    return Array.isArray(raw) ? raw[0] : raw;
};

patientRouter.post(
    "/patients/onboarding",
    asyncHandler(async (req: Request, res: Response) => {
        const payload = PatientOnboardingSchema.parse(req.body);
        const baseline = await createPatientOnboarding(req.user!.id, payload);
        return success(res, baseline, 201);
    })
);

patientRouter.get(
    "/patients/:patientId/profile",
    requirePatientAccess,
    asyncHandler(async (req: Request, res: Response) => {
        const data = await getPatientProfile(getPatientIdParam(req));
        return success(res, data);
    })
);

patientRouter.patch(
    "/patients/:patientId/profile",
    requirePatientAccess,
    asyncHandler(async (req: Request, res: Response) => {
        const payload = PatientProfilePatchSchema.parse(req.body);
        await patchPatientProfile(getPatientIdParam(req), payload);
        return success(res, { updated: true });
    })
);

patientRouter.patch(
    "/patients/:patientId/baseline",
    requirePatientAccess,
    asyncHandler(async (req: Request, res: Response) => {
        const payload = PatientBaselinePatchSchema.parse(req.body);
        await patchPatientBaseline(getPatientIdParam(req), req.user!.id, payload);
        return success(res, { updated: true });
    })
);

patientRouter.get(
    "/patients/:patientId/ehr",
    requirePatientAccess,
    asyncHandler(async (req: Request, res: Response) => {
        const ehr = await getPatientEhr(getPatientIdParam(req));
        return success(res, ehr);
    })
);

patientRouter.get(
    "/patients/:patientId/export",
    requirePatientAccess,
    auditPatientDataAccess("patient_export"),
    asyncHandler(async (req: Request, res: Response) => {
        const data = await exportPatientData(getPatientIdParam(req));
        return success(res, data);
    })
);

patientRouter.delete(
    "/patients/:patientId",
    requirePatientAccess,
    auditPatientDataAccess("patient_soft_delete"),
    asyncHandler(async (req: Request, res: Response) => {
        await softDeletePatient(getPatientIdParam(req));
        return success(res, {
            deleted: true,
            anonymized: true,
            message: "Patient soft-deleted. PII anonymized now; downstream records retained for continuity."
        });
    })
);

patientRouter.get(
    "/patients/:patientId/consent",
    requirePatientAccess,
    asyncHandler(async (req: Request, res: Response) => {
        const consent = await getPatientConsent(getPatientIdParam(req));
        return success(res, consent || {
            terms_accepted: false,
            data_sharing: false,
            marketing: false
        });
    })
);

patientRouter.patch(
    "/patients/:patientId/consent",
    requirePatientAccess,
    asyncHandler(async (req: Request, res: Response) => {
        const payload = ConsentPatchSchema.parse(req.body);
        const consent = await upsertPatientConsent(getPatientIdParam(req), payload);
        return success(res, consent);
    })
);
