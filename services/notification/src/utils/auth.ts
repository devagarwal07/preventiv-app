import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || "dev-access-secret";

export interface AuthUser {
    id: string;
    role: string;
    orgId?: string | null;
}

export const parseBearerUser = (req: Request): AuthUser | null => {
    const header = req.header("authorization");
    if (!header?.startsWith("Bearer ")) return null;
    const token = header.replace("Bearer ", "").trim();
    try {
        return jwt.verify(token, ACCESS_SECRET) as AuthUser;
    } catch {
        return null;
    }
};

export const requireAuth = (req: Request, res: Response, next: NextFunction): void => {
    const user = parseBearerUser(req);
    if (!user) {
        res.status(401).json({ success: false, error: "Unauthorized" });
        return;
    }
    (req as Request & { user?: AuthUser }).user = user;
    next();
};

export const requireServiceKey = (req: Request, res: Response, next: NextFunction): void => {
    const incoming = req.header("x-service-key");
    const expected = process.env.INTERNAL_SERVICE_KEY || "dev-internal-key";
    if (!incoming || incoming !== expected) {
        res.status(401).json({ success: false, error: "Invalid service key" });
        return;
    }
    next();
};
