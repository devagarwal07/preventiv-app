import { Router } from "express";
import multer from "multer";
import { fileTypeFromBuffer } from "file-type";
import type { Request, Response } from "express";
import { authenticate, requireRole, requireVerified } from "../middleware/authenticate";
import { requirePatientAccess } from "../middleware/requirePatientAccess";
import { userRateLimit } from "../middleware/userRateLimit";
import { asyncHandler } from "../utils/asyncHandler";
import { paginated, success } from "../utils/response";
import {
    allowedLabMimeTypes,
    LabListQuerySchema,
    LabUploadBodySchema,
    ManualLabValuesSchema
} from "../labs/schemas";
import {
    getLabReportDetail,
    listLabReports,
    updateManualLabValues,
    uploadLabReport
} from "../labs/service";

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }
});

export const labsRouter = Router();
labsRouter.use(authenticate);

labsRouter.post(
    "/labs/upload",
    userRateLimit({ keyPrefix: "rate:labs:upload", max: 10, windowSeconds: 60 * 60 }),
    upload.single("file"),
    requirePatientAccess,
    asyncHandler(async (req: Request, res: Response) => {
        const body = LabUploadBodySchema.parse(req.body);

        if (!req.file) {
            return res.status(400).json({ success: false, error: "file is required" });
        }

        if (!allowedLabMimeTypes.includes(req.file.mimetype)) {
            return res.status(400).json({ success: false, error: "Unsupported file type" });
        }

        const signature = await fileTypeFromBuffer(req.file.buffer);
        if (!signature || !allowedLabMimeTypes.includes(signature.mime)) {
            return res.status(400).json({ success: false, error: "Invalid file signature" });
        }

        const result = await uploadLabReport(req.file, body.patient_id, req.user!.id);
        return success(res, result, 201);
    })
);

labsRouter.get(
    "/labs/:patientId",
    requirePatientAccess,
    asyncHandler(async (req: Request, res: Response) => {
        const patientId = Array.isArray(req.params.patientId) ? req.params.patientId[0] : req.params.patientId;
        const query = LabListQuerySchema.parse(req.query);
        const data = await listLabReports(patientId, query.page, query.limit);
        return paginated(res, data.rows, data.meta);
    })
);

labsRouter.get(
    "/labs/:patientId/:reportId",
    requirePatientAccess,
    asyncHandler(async (req: Request, res: Response) => {
        const patientId = Array.isArray(req.params.patientId) ? req.params.patientId[0] : req.params.patientId;
        const reportId = Array.isArray(req.params.reportId) ? req.params.reportId[0] : req.params.reportId;
        const data = await getLabReportDetail(patientId, reportId);
        return success(res, data);
    })
);

labsRouter.post(
    "/labs/:reportId/manual-values",
    requireRole("doctor", "dietician", "physiotherapist", "org_admin", "platform_admin"),
    requireVerified,
    asyncHandler(async (req: Request, res: Response) => {
        const reportId = Array.isArray(req.params.reportId) ? req.params.reportId[0] : req.params.reportId;
        const body = ManualLabValuesSchema.parse(req.body);
        const result = await updateManualLabValues(reportId, req.user!.id, body.extracted_data);
        return success(res, result);
    })
);
