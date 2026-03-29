import { createClient } from "@supabase/supabase-js";
import { AppError } from "../errors/AppError";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const labBucket = process.env.SUPABASE_LAB_BUCKET || "lab-reports";

if (!supabaseUrl || !supabaseKey) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
}

const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
    global: { headers: { "x-client-info": "prevntiv-api" } }
});

export const uploadLabObject = async (objectKey: string, content: Buffer, contentType: string): Promise<string> => {
    const { error } = await supabase.storage.from(labBucket).upload(objectKey, content, {
        contentType,
        upsert: false
    });
    if (error) {
        if (error.message?.includes("already exists")) {
            // Retry with a slightly different key if collision occurs.
            const retryKey = `${objectKey}-${Date.now()}`;
            const retry = await supabase.storage.from(labBucket).upload(retryKey, content, {
                contentType,
                upsert: false
            });
            if (retry.error) {
                throw new AppError("Lab upload service unavailable. Please try again shortly.", 503);
            }
            return retryKey;
        }
        throw new AppError("Lab upload service unavailable. Please try again shortly.", 503);
    }
    return objectKey;
};

export const getSignedLabObjectUrl = async (objectKey: string, expiresInSeconds = 3600): Promise<string> => {
    const { data, error } = await supabase.storage.from(labBucket).createSignedUrl(objectKey, expiresInSeconds);
    if (error || !data?.signedUrl) {
        throw new AppError("Unable to generate download URL", 500);
    }
    return data.signedUrl;
};

export const getLabObject = async (objectKey: string): Promise<Buffer> => {
    const { data, error } = await supabase.storage.from(labBucket).download(objectKey);
    if (error || !data) {
        throw new AppError("Unable to fetch lab report", 500);
    }
    return Buffer.from(await data.arrayBuffer());
};

export const LAB_BUCKET = labBucket;

export const parseObjectKeyFromUrl = (fileUrl: string): string => {
    // Supabase returns public URLs with the bucket path; assume fileUrl stores the object path.
    // If fileUrl is already an object key, return as-is; otherwise, try to strip the public URL prefix.
    if (!fileUrl.includes("/storage/v1/object/public/")) {
        return fileUrl;
    }
    const idx = fileUrl.indexOf(`${labBucket}/`);
    if (idx === -1) {
        throw new AppError("Invalid lab report file url", 500);
    }
    return fileUrl.slice(idx + labBucket.length + 1);
};
