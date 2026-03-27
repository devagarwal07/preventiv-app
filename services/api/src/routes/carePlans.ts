import { Router } from "express";
import type { Request, Response } from "express";
import { authenticate, requireRole } from "../middleware/authenticate";
import { requirePatientAccess } from "../middleware/requirePatientAccess";
import { asyncHandler } from "../utils/asyncHandler";
import { success } from "../utils/response";
import {
    acknowledgeCarePlan,
    completeCarePlanItem,
    createCarePlan,
    ensurePatientPlanAccess,
    getCarePlanAdherence,
    listCarePlansByPatient,
    updateCarePlan
} from "../carePlans/service";
import {
    carePlanCompletionSchema,
    createCarePlanSchema,
    updateCarePlanSchema
} from "../carePlans/schemas";

export const carePlansRouter = Router();
carePlansRouter.use(authenticate);

carePlansRouter.post(
    "/care-plans",
    requireRole("doctor", "dietician", "physiotherapist"),
    asyncHandler(async (req: Request, res: Response) => {
        const body = createCarePlanSchema.parse(req.body);
        const created = await createCarePlan({
            patientId: body.patient_id,
            createdBy: req.user!.id,
            type: body.type,
            title: body.title,
            items: body.items
        });

        return success(res, created, 201);
    })
);

carePlansRouter.get(
    "/care-plans/:patientId",
    requirePatientAccess,
    asyncHandler(async (req: Request, res: Response) => {
        const patientId = Array.isArray(req.params.patientId) ? req.params.patientId[0] : req.params.patientId;
        const rows = await listCarePlansByPatient(patientId);
        return success(res, rows);
    })
);

carePlansRouter.patch(
    "/care-plans/:planId",
    requireRole("doctor", "dietician", "physiotherapist"),
    asyncHandler(async (req: Request, res: Response) => {
        const planId = Array.isArray(req.params.planId) ? req.params.planId[0] : req.params.planId;
        await ensurePatientPlanAccess(planId, req.user!);

        const body = updateCarePlanSchema.parse(req.body);
        const updated = await updateCarePlan({
            planId,
            actorId: req.user!.id,
            title: body.title,
            status: body.status,
            items: body.items
        });

        return success(res, updated);
    })
);

carePlansRouter.post(
    "/care-plans/:planId/acknowledge",
    asyncHandler(async (req: Request, res: Response) => {
        const planId = Array.isArray(req.params.planId) ? req.params.planId[0] : req.params.planId;
        await ensurePatientPlanAccess(planId, req.user!);
        const result = await acknowledgeCarePlan(planId, req.user!.id);
        return success(res, result);
    })
);

carePlansRouter.post(
    "/care-plans/:planId/items/:itemId/complete",
    asyncHandler(async (req: Request, res: Response) => {
        const planId = Array.isArray(req.params.planId) ? req.params.planId[0] : req.params.planId;
        const itemId = Array.isArray(req.params.itemId) ? req.params.itemId[0] : req.params.itemId;
        await ensurePatientPlanAccess(planId, req.user!);

        const body = carePlanCompletionSchema.parse(req.body || {});
        const result = await completeCarePlanItem({
            planId,
            itemId,
            patientId: req.user!.id,
            notes: body.notes
        });

        return success(res, result);
    })
);

carePlansRouter.get(
    "/care-plans/:patientId/adherence",
    requirePatientAccess,
    asyncHandler(async (req: Request, res: Response) => {
        const patientId = Array.isArray(req.params.patientId) ? req.params.patientId[0] : req.params.patientId;
        const result = await getCarePlanAdherence(patientId);
        return success(res, result);
    })
);
