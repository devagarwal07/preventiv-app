import jwt from "jsonwebtoken";
import type { UserRole } from "@prevntiv/shared-types";

export interface AuthTokenPayload {
    id: string;
    role: UserRole;
    orgId?: string | null;
}

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET || "dev-access-secret";
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET || "dev-refresh-secret";
const ACCESS_VERIFY_SECRETS = (process.env.JWT_ACCESS_SECRETS || process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET || "dev-access-secret")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
const REFRESH_VERIFY_SECRETS = (process.env.JWT_REFRESH_SECRETS || process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET || "dev-refresh-secret")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
const ACCESS_EXPIRES_IN = (process.env.JWT_ACCESS_EXPIRES_IN || "15m") as jwt.SignOptions["expiresIn"];
const REFRESH_EXPIRES_IN = (process.env.JWT_REFRESH_EXPIRES_IN || "7d") as jwt.SignOptions["expiresIn"];

export const signAccessToken = (payload: AuthTokenPayload): string => {
    return jwt.sign(payload, ACCESS_SECRET, {
        expiresIn: ACCESS_EXPIRES_IN
    });
};

export const signRefreshToken = (payload: AuthTokenPayload): string => {
    return jwt.sign(payload, REFRESH_SECRET, {
        expiresIn: REFRESH_EXPIRES_IN
    });
};

export const verifyAccessToken = (token: string): AuthTokenPayload => {
    for (const secret of ACCESS_VERIFY_SECRETS) {
        try {
            return jwt.verify(token, secret) as AuthTokenPayload;
        } catch {
            continue;
        }
    }

    throw new Error("Invalid access token");
};

export const verifyRefreshToken = (token: string): AuthTokenPayload => {
    for (const secret of REFRESH_VERIFY_SECRETS) {
        try {
            return jwt.verify(token, secret) as AuthTokenPayload;
        } catch {
            continue;
        }
    }

    throw new Error("Invalid refresh token");
};
