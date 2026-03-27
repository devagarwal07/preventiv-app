import { Pool } from "pg";

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
    throw new Error("DATABASE_URL is required");
}

export const pool = new Pool({
    connectionString: DATABASE_URL,
    max: Number(process.env.PG_MAX_CONNECTIONS || 10)
});

export const closeDb = async (): Promise<void> => {
    await pool.end();
};
