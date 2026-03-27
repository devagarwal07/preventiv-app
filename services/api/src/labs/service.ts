import type { Express } from "express";
import { randomUUID } from "crypto";
import { pool } from "../db/pool";
import { AppError } from "../errors/AppError";
import { invalidatePatientEhrCache } from "../patients/service";
import { labExtractionQueue } from "./queue";
import {
    getSignedLabObjectUrl,
    parseObjectKeyFromUrl,
    putLabObject
} from "./minioClient";

export const uploadLabReport = async (
    file: Express.Multer.File,
    patientId: string,
    uploadedBy: string
): Promise<{ report_id: string; status: "processing" }> => {
    const extension = file.mimetype === "application/pdf" ? "pdf" : file.mimetype === "image/png" ? "png" : "jpg";
    const objectKey = `${patientId}/${randomUUID()}.${extension}`;
    let fileUrl: string;
    try {
        fileUrl = await putLabObject(objectKey, file.buffer, file.mimetype);
    } catch {
        throw new AppError("Lab upload service unavailable. Please try again shortly.", 503);
    }

    const insertResult = await pool.query<{ id: string }>(
        `
      INSERT INTO lab_reports (patient_id, file_url, uploaded_by, status)
      VALUES ($1, $2, $3, 'processing')
      RETURNING id
    `,
        [patientId, fileUrl, uploadedBy]
    );

    const reportId = insertResult.rows[0].id;

    await labExtractionQueue.add(
        {
            reportId,
            patientId,
            objectKey,
            uploadedBy
        },
        {
            attempts: 3,
            backoff: {
                type: "exponential",
                delay: 1000
            },
            removeOnComplete: true,
            removeOnFail: false
        }
    );

    await invalidatePatientEhrCache(patientId);

    return {
        report_id: reportId,
        status: "processing"
    };
};

export const listLabReports = async (patientId: string, page: number, limit: number) => {
    const offset = (page - 1) * limit;

    const [listResult, countResult] = await Promise.all([
        pool.query(
            `
        SELECT id, patient_id, file_url, uploaded_by, uploaded_at, status, extracted_data
        FROM lab_reports
        WHERE patient_id = $1
        ORDER BY uploaded_at DESC
        LIMIT $2 OFFSET $3
      `,
            [patientId, limit, offset]
        ),
        pool.query<{ count: string }>(
            `SELECT COUNT(*)::text AS count FROM lab_reports WHERE patient_id = $1`,
            [patientId]
        )
    ]);

    const total = Number(countResult.rows[0]?.count || 0);
    return {
        rows: listResult.rows,
        meta: {
            page,
            limit,
            total,
            totalPages: Math.max(1, Math.ceil(total / limit))
        }
    };
};

export const getLabReportDetail = async (patientId: string, reportId: string) => {
    const result = await pool.query(
        `
      SELECT id, patient_id, file_url, uploaded_by, uploaded_at, status, extracted_data
      FROM lab_reports
      WHERE id = $1 AND patient_id = $2
      LIMIT 1
    `,
        [reportId, patientId]
    );

    if (!result.rowCount) {
        throw new AppError("Lab report not found", 404);
    }

    const report = result.rows[0];
    const objectKey = parseObjectKeyFromUrl(report.file_url);
    const signedUrl = await getSignedLabObjectUrl(objectKey, 3600);

    return {
        ...report,
        signed_url: signedUrl
    };
};

export const updateManualLabValues = async (
    reportId: string,
    changedBy: string,
    extractedData: Record<string, string | number | boolean | null>
) => {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        const beforeResult = await client.query<{ extracted_data: Record<string, unknown>; patient_id: string }>(
            `SELECT extracted_data, patient_id FROM lab_reports WHERE id = $1 LIMIT 1`,
            [reportId]
        );

        if (!beforeResult.rowCount) {
            throw new AppError("Lab report not found", 404);
        }

        const beforeData = beforeResult.rows[0].extracted_data || {};

        await client.query(
            `
        UPDATE lab_reports
        SET extracted_data = $2::jsonb, updated_at = NOW(), status = 'processed'
        WHERE id = $1
      `,
            [reportId, JSON.stringify(extractedData)]
        );

        await client.query(
            `
        INSERT INTO lab_manual_value_audit (report_id, changed_by, before_data, after_data)
        VALUES ($1, $2, $3::jsonb, $4::jsonb)
      `,
            [reportId, changedBy, JSON.stringify(beforeData), JSON.stringify(extractedData)]
        );

        await client.query("COMMIT");

        await invalidatePatientEhrCache(beforeResult.rows[0].patient_id);
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }

    return { updated: true };
};
