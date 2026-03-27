import { Client } from "minio";
import { AppError } from "../errors/AppError";

const endPoint = process.env.MINIO_ENDPOINT || "localhost";
const port = Number(process.env.MINIO_PORT || 9000);
const useSSL = String(process.env.MINIO_USE_SSL || "false") === "true";
const accessKey = process.env.MINIO_ACCESS_KEY || "minioadmin";
const secretKey = process.env.MINIO_SECRET_KEY || "minioadmin";

export const minioClient = new Client({
    endPoint,
    port,
    useSSL,
    accessKey,
    secretKey
});

export const LAB_BUCKET = process.env.MINIO_BUCKET_LAB_REPORTS || "lab-reports";

export const ensureLabBucket = async (): Promise<void> => {
    const exists = await minioClient.bucketExists(LAB_BUCKET);
    if (!exists) {
        await minioClient.makeBucket(LAB_BUCKET, "us-east-1");
    }
};

export const putLabObject = async (
    objectKey: string,
    content: Buffer,
    contentType: string
): Promise<string> => {
    await ensureLabBucket();
    await minioClient.putObject(LAB_BUCKET, objectKey, content, undefined, {
        "Content-Type": contentType
    });

    return `s3://${LAB_BUCKET}/${objectKey}`;
};

export const getSignedLabObjectUrl = async (objectKey: string, expiresInSeconds = 3600) => {
    await ensureLabBucket();
    return minioClient.presignedGetObject(LAB_BUCKET, objectKey, expiresInSeconds);
};

export const parseObjectKeyFromUrl = (fileUrl: string): string => {
    const prefix = `s3://${LAB_BUCKET}/`;
    if (!fileUrl.startsWith(prefix)) {
        throw new AppError("Invalid lab report file url", 500);
    }
    return fileUrl.replace(prefix, "");
};
