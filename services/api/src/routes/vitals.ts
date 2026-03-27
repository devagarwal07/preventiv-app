import { Router } from "express";
import type { Request, Response } from "express";
import { authenticate } from "../middleware/authenticate";
import { requirePatientAccess } from "../middleware/requirePatientAccess";
import { userRateLimit } from "../middleware/userRateLimit";
import { asyncHandler } from "../utils/asyncHandler";
import { paginated, success } from "../utils/response";
import {
    AppleHealthSyncSchema,
    GoogleFitSyncSchema,
    ManualVitalSchema,
    VitalsQuerySchema
} from "../vitals/schemas";
import {
    createManualVital,
    getVitals,
    getVitalsSummary,
    syncAppleHealthVitals,
    syncGoogleFitVitals
} from "../vitals/service";

export const vitalsRouter = Router();
vitalsRouter.use(authenticate);

const getPatientIdParam = (req: Request): string => {
    const raw = req.params.patientId;
    return Array.isArray(raw) ? raw[0] : raw;
};

vitalsRouter.post(
    "/vitals/manual",
    userRateLimit({ keyPrefix: "rate:vitals:manual", max: 30, windowSeconds: 60 * 60 }),
    asyncHandler(async (req: Request, res: Response) => {
        const payload = ManualVitalSchema.parse(req.body);
        const vital = await createManualVital(req.user!.id, payload.type, payload.value, payload.timestamp);
        return success(res, vital, 201);
    })
);

vitalsRouter.post(
    "/vitals/sync/google-fit",
    asyncHandler(async (req: Request, res: Response) => {
        const payload = GoogleFitSyncSchema.parse(req.body);
        const result = await syncGoogleFitVitals(req.user!.id, payload.access_token, payload.from, payload.to);
        return success(res, result);
    })
);

vitalsRouter.post(
    "/vitals/sync/apple-health",
    asyncHandler(async (req: Request, res: Response) => {
        const payload = AppleHealthSyncSchema.parse(req.body);
        const result = await syncAppleHealthVitals(req.user!.id, payload.readings);
        return success(res, result);
    })
);

vitalsRouter.get(
    "/vitals/:patientId",
    requirePatientAccess,
    asyncHandler(async (req: Request, res: Response) => {
        const patientId = getPatientIdParam(req);
        const query = VitalsQuerySchema.parse(req.query);
        const result = await getVitals(patientId, query);
        return paginated(res, { rows: result.data, trend: result.trend }, result.meta);
    })
);

vitalsRouter.get(
    "/vitals/:patientId/summary",
    requirePatientAccess,
    asyncHandler(async (req: Request, res: Response) => {
        const patientId = getPatientIdParam(req);
        const summary = await getVitalsSummary(patientId);
        return success(res, summary);
    })
);
