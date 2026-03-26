import jwt from "jsonwebtoken";
import type { UserRole } from "@prevntiv/shared-types";

export interface AuthTokenPayload {
    id: string;
    role: UserRole;
    orgId?: string | null;
}

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || "dev-access-secret";
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "dev-refresh-secret";

export const signAccessToken = (payload: AuthTokenPayload): string => {
    return jwt.sign(payload, ACCESS_SECRET, {
        expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || "15m"
    });
};

export const signRefreshToken = (payload: AuthTokenPayload): string => {
    return jwt.sign(payload, REFRESH_SECRET, {
        expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d"
    });
};

export const verifyAccessToken = (token: string): AuthTokenPayload => {
    return jwt.verify(token, ACCESS_SECRET) as AuthTokenPayload;
};

export const verifyRefreshToken = (token: string): AuthTokenPayload => {
    return jwt.verify(token, REFRESH_SECRET) as AuthTokenPayload;
};
