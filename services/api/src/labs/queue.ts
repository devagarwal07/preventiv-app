import Queue from "bull";

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

export interface LabExtractionJobData {
    reportId: string;
    patientId: string;
    objectKey: string;
    uploadedBy: string;
}

export const labExtractionQueue = new Queue<LabExtractionJobData>("lab-extraction", redisUrl);
