import { Pool } from "pg";
import { logger } from "../utils/logger";

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
    throw new Error("DATABASE_URL is required");
}

export const pool = new Pool({
    connectionString: DATABASE_URL,
    max: Number(process.env.PG_MAX_CONNECTIONS || 20)
});

export const verifyDbConnection = async (): Promise<boolean> => {
    const client = await pool.connect();
    try {
        await client.query("SELECT 1");
        return true;
    } finally {
        client.release();
    }
};

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const connectWithRetry = async (maxRetries = 5): Promise<void> => {
    let attempt = 0;

    while (attempt < maxRetries) {
        try {
            await verifyDbConnection();
            logger.info("PostgreSQL connection established");
            return;
        } catch (err) {
            attempt += 1;
            const backoff = Math.min(1000 * 2 ** attempt, 15000);
            logger.warn("PostgreSQL connection attempt failed", {
                attempt,
                maxRetries,
                backoff,
                error: err instanceof Error ? err.message : "Unknown error"
            });

            if (attempt >= maxRetries) {
                throw err;
            }

            await delay(backoff);
        }
    }
};

export const closeDb = async (): Promise<void> => {
    await pool.end();
    logger.info("PostgreSQL pool closed");
};
