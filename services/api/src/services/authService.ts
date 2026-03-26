import bcrypt from "bcrypt";
import { pool } from "../db/pool";
import { cache } from "../cache/client";
import { AppError } from "../errors/AppError";
import { sendVerificationEmail } from "./mailService";
import type { LoginInput, RegisterInput } from "../auth/schemas";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../utils/tokens";

const BCRYPT_ROUNDS = Number(process.env.BCRYPT_ROUNDS || 12);

interface UserRecord {
    id: string;
    email: string;
    phone: string | null;
    role: "patient" | "doctor" | "dietician" | "physiotherapist" | "org_admin" | "platform_admin";
    is_verified: boolean;
    password_hash: string;
    name: string;
}

const userWithoutSensitive = (user: UserRecord) => ({
    id: user.id,
    email: user.email,
    phone: user.phone,
    role: user.role,
    isVerified: user.is_verified,
    name: user.name
});

export const register = async (payload: RegisterInput) => {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        const passwordHash = await bcrypt.hash(payload.password, BCRYPT_ROUNDS);
        const isVerified =
            payload.role === "doctor" || payload.role === "dietician" || payload.role === "physiotherapist"
                ? false
                : true;

        const userResult = await client.query<{
            id: string;
            email: string;
            phone: string;
            role: UserRecord["role"];
            is_verified: boolean;
            created_at: string;
        }>(
            `
        INSERT INTO users (email, phone, role, is_verified, password_hash)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, email, phone, role, is_verified, created_at
      `,
            [payload.email, payload.phone, payload.role, isVerified, passwordHash]
        );

        await client.query(
            `
        INSERT INTO user_profiles (user_id, name)
        VALUES ($1, $2)
      `,
            [userResult.rows[0].id, payload.name]
        );

        await client.query("COMMIT");

        const verifyLink = `${process.env.WEB_URL || "http://localhost:3000"}/verify?email=${encodeURIComponent(payload.email)}`;
        await sendVerificationEmail(payload.email, payload.name, verifyLink);

        return {
            id: userResult.rows[0].id,
            email: userResult.rows[0].email,
            phone: userResult.rows[0].phone,
            role: userResult.rows[0].role,
            isVerified: userResult.rows[0].is_verified,
            name: payload.name
        };
    } catch (error) {
        await client.query("ROLLBACK");
        if (error instanceof Error && /duplicate key/.test(error.message)) {
            throw new AppError("Email or phone already exists", 409);
        }
        throw error;
    } finally {
        client.release();
    }
};

export const login = async (payload: LoginInput) => {
    const result = await pool.query<UserRecord>(
        `
      SELECT u.id, u.email, u.phone, u.role, u.is_verified, u.password_hash, p.name
      FROM users u
      INNER JOIN user_profiles p ON p.user_id = u.id
      WHERE u.email = $1 AND u.deleted_at IS NULL
      LIMIT 1
    `,
        [payload.email]
    );

    if (!result.rowCount) {
        throw new AppError("Invalid credentials", 401);
    }

    const user = result.rows[0];
    const passwordValid = await bcrypt.compare(payload.password, user.password_hash);

    if (!passwordValid) {
        throw new AppError("Invalid credentials", 401);
    }

    const tokenPayload = { id: user.id, role: user.role, orgId: null };
    const accessToken = signAccessToken(tokenPayload);
    const refreshToken = signRefreshToken(tokenPayload);

    await cache.hset(`refresh:${user.id}`, refreshToken, {
        issuedAt: new Date().toISOString()
    });

    return {
        user: userWithoutSensitive(user),
        accessToken,
        refreshToken
    };
};

export const refresh = async (refreshToken: string) => {
    const payload = verifyRefreshToken(refreshToken);
    const tokenInStore = await cache.hget<{ issuedAt: string }>(`refresh:${payload.id}`, refreshToken);

    if (!tokenInStore) {
        throw new AppError("Invalid refresh token", 401);
    }

    const newAccessToken = signAccessToken(payload);
    const newRefreshToken = signRefreshToken(payload);

    await cache.del(`refresh:${payload.id}`);
    await cache.hset(`refresh:${payload.id}`, newRefreshToken, {
        issuedAt: new Date().toISOString()
    });

    return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken
    };
};

export const logout = async (userId: string) => {
    await cache.del(`refresh:${userId}`);
};

export const sendOtp = async (phone: string): Promise<void> => {
    const otp = `${Math.floor(100000 + Math.random() * 900000)}`;
    await cache.set(`otp:${phone}`, { otp }, 10 * 60);
    // eslint-disable-next-line no-console
    console.log(`OTP for ${phone}: ${otp}`);
};

export const verifyOtp = async (phone: string, otp: string): Promise<void> => {
    const stored = await cache.get<{ otp: string }>(`otp:${phone}`);

    if (!stored || stored.otp !== otp) {
        throw new AppError("Invalid or expired OTP", 400);
    }

    await pool.query(
        `
      UPDATE users
      SET is_verified = TRUE, updated_at = NOW()
      WHERE phone = $1
    `,
        [phone]
    );

    await cache.del(`otp:${phone}`);
};
