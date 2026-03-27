import pdfParse from "pdf-parse";
import { pool } from "../db/pool";
import { minioClient, LAB_BUCKET } from "../labs/minioClient";
import { labExtractionQueue } from "../labs/queue";
import { invalidatePatientEhrCache } from "../patients/service";
import { socketEvents } from "../realtime/socketServer";
import { logger } from "../utils/logger";
import { labExtractionDurationSeconds, vitalsIngestedTotal } from "../metrics";
import { redis } from "../cache/client";
import { notifyInternal } from "../notifications/client";

const metricPatterns: Record<string, RegExp> = {
    hba1c: /HbA1c[\s:]*([0-9.]+)\s*%/i,
    fasting_glucose: /Fasting[\s\w]*Glucose[\s:]*([0-9.]+)/i,
    total_cholesterol: /Total[\s]*Cholesterol[\s:]*([0-9.]+)/i,
    hdl: /HDL[\s:]*([0-9.]+)/i,
    ldl: /LDL[\s:]*([0-9.]+)/i,
    triglycerides: /Triglycerides[\s:]*([0-9.]+)/i,
    creatinine: /Creatinine[\s:]*([0-9.]+)/i,
    hemoglobin: /Hemoglobin[\s:]*([0-9.]+)/i,
    tsh: /TSH[\s:]*([0-9.]+)/i,
    vitamin_d: /Vitamin\s*D[\s:]*([0-9.]+)/i,
    b12: /B12[\s:]*([0-9.]+)/i
};

const extractLabMetrics = (text: string): Record<string, number> => {
    const result: Record<string, number> = {};

    for (const [key, regex] of Object.entries(metricPatterns)) {
        const match = text.match(regex);
        if (match?.[1]) {
            result[key] = Number(match[1]);
        }
    }

    return result;
};

const upsertVitalsFromLabs = async (patientId: string, metrics: Record<string, number>) => {
    const now = new Date().toISOString();

    const mappedEntries: Array<{ type: "glucose"; value: Record<string, unknown> }> = [];
    if (metrics.fasting_glucose !== undefined) {
        mappedEntries.push({
            type: "glucose",
            value: { value: metrics.fasting_glucose, unit: "mg/dL", context: "fasting", lab_metric: "fasting_glucose" }
        });
    }
    if (metrics.hba1c !== undefined) {
        mappedEntries.push({
            type: "glucose",
            value: { value: metrics.hba1c, unit: "%", context: "lab", lab_metric: "hba1c" }
        });
    }

    for (const row of mappedEntries) {
        await pool.query(
            `
        INSERT INTO vitals (patient_id, type, value, source, recorded_at, is_anomaly)
        VALUES ($1, $2, $3::jsonb, 'lab', $4, FALSE)
      `,
            [patientId, row.type, JSON.stringify(row.value), now]
        );
        vitalsIngestedTotal.inc({ source: "lab", type: row.type });
    }
};

export const startLabExtractionWorker = (): void => {
    labExtractionQueue.process(3, async (job) => {
        const { reportId, patientId, objectKey } = job.data;
        const endTimer = labExtractionDurationSeconds.startTimer();

        try {
            const stream = await minioClient.getObject(LAB_BUCKET, objectKey);
            const chunks: Buffer[] = [];
            await new Promise<void>((resolve, reject) => {
                stream.on("data", (chunk) => chunks.push(chunk));
                stream.on("end", () => resolve());
                stream.on("error", (error) => reject(error));
            });

            const buffer = Buffer.concat(chunks);
            const parsed = await pdfParse(buffer);
            const metrics = extractLabMetrics(parsed.text || "");

            await pool.query(
                `
          UPDATE lab_reports
          SET extracted_data = $2::jsonb,
              status = 'processed',
              updated_at = NOW()
          WHERE id = $1
        `,
                [reportId, JSON.stringify(metrics)]
            );

            await upsertVitalsFromLabs(patientId, metrics);
            await invalidatePatientEhrCache(patientId);
            await redis.publish("lab:processed", JSON.stringify({ reportId, patientId, extractedData: metrics }));

            await notifyInternal({
                userId: patientId,
                patientId,
                type: "lab_report_processed",
                channels: ["push", "inApp"],
                notificationPayload: {
                    title: "Lab report processed",
                    body: `Extracted ${Object.keys(metrics).length} values from your latest report`,
                    message: JSON.stringify(metrics)
                }
            });

            socketEvents.emitLabReportProcessed(patientId, reportId, metrics);

            logger.info("Lab extraction completed", { reportId, patientId });
        } catch (error) {
            await pool.query(
                `
          UPDATE lab_reports
          SET status = 'extraction_failed', updated_at = NOW()
          WHERE id = $1
        `,
                [reportId]
            );

            logger.error("Lab extraction failed", {
                reportId,
                patientId,
                error: error instanceof Error ? error.message : "Unknown error"
            });

            throw error;
        } finally {
            endTimer();
        }
    });
};
