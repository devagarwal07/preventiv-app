import type { NextFunction, Request, Response } from "express";
import sanitizeHtml from "sanitize-html";

const sanitizeValue = (value: unknown): unknown => {
    if (typeof value === "string") {
        return sanitizeHtml(value, {
            allowedTags: [],
            allowedAttributes: {}
        }).trim();
    }

    if (Array.isArray(value)) {
        return value.map((item) => sanitizeValue(item));
    }

    if (value && typeof value === "object") {
        const entries = Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, sanitizeValue(v)]);
        return Object.fromEntries(entries);
    }

    return value;
};

export const sanitizeInput = (req: Request, _res: Response, next: NextFunction): void => {
    req.body = sanitizeValue(req.body) as typeof req.body;
    req.query = sanitizeValue(req.query) as typeof req.query;
    next();
};
