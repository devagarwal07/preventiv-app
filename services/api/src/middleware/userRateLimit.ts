import type { NextFunction, Request, Response } from "express";
import { redis } from "../cache/client";

export const userRateLimit = (options: {
    keyPrefix: string;
    max: number;
    windowSeconds: number;
    extractor?: (req: Request) => string | null;
}) => {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        const identity = options.extractor ? options.extractor(req) : req.user?.id || null;

        if (!identity) {
            next();
            return;
        }

        const key = `${options.keyPrefix}:${identity}`;
        const count = await redis.incr(key);
        if (count === 1) {
            await redis.expire(key, options.windowSeconds);
        }

        if (count > options.max) {
            res.status(429).json({
                success: false,
                error: `Rate limit exceeded. Try again later.`
            });
            return;
        }

        next();
    };
};
