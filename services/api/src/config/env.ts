import { z } from "zod";
import { logger } from "../utils/logger";

const EnvSchema = z.object({
    DATABASE_URL: z.string().min(1),
    REDIS_URL: z.string().min(1),
    JWT_SECRET: z.string().min(8),
    MINIO_ENDPOINT: z.string().min(1),
    MINIO_ACCESS_KEY: z.string().min(1),
    MINIO_SECRET_KEY: z.string().min(1),
    FIREBASE_SERVICE_ACCOUNT_JSON: z.string().min(1),
    INTERNAL_SERVICE_KEY: z.string().min(1),
    AI_ENGINE_URL: z.string().url(),
    CORS_ALLOWED_ORIGINS: z.string().default("http://localhost:3000"),
    API_PORT: z.string().default("3001")
});

export type RuntimeEnv = z.infer<typeof EnvSchema>;

export const loadEnv = (): RuntimeEnv => {
    const parsed = EnvSchema.safeParse(process.env);
    if (!parsed.success) {
        logger.error("Environment validation failed", {
            issues: parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`)
        });
        process.exit(1);
    }

    return parsed.data;
};
