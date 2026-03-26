import type { NextFunction, Request, Response } from "express";
import { AppError } from "../errors/AppError";
import { verifyAccessToken } from "../utils/tokens";
import { pool } from "../db/pool";

export const authenticate = (req: Request, _res: Response, next: NextFunction): void => {
    const authHeader = req.header("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        throw new AppError("Missing bearer token", 401);
    }

    const token = authHeader.replace("Bearer ", "").trim();
    const payload = verifyAccessToken(token);

    req.user = {
        id: payload.id,
        role: payload.role,
        orgId: payload.orgId ?? null
    };

    next();
};

export const requireRole =
    (...roles: string[]) =>
        (req: Request, _res: Response, next: NextFunction): void => {
            if (!req.user) {
                throw new AppError("Unauthorized", 401);
            }

            if (!roles.includes(req.user.role)) {
                throw new AppError("Forbidden", 403);
            }

            next();
        };

export const requireVerified = async (
    req: Request,
    _res: Response,
    next: NextFunction
): Promise<void> => {
    if (!req.user) {
        throw new AppError("Unauthorized", 401);
    }

    const result = await pool.query<{ is_verified: boolean }>(
        `SELECT is_verified FROM users WHERE id = $1 LIMIT 1`,
        [req.user.id]
    );

    if (!result.rowCount || !result.rows[0].is_verified) {
        throw new AppError("Professional is not verified", 403);
    }

    next();
};
