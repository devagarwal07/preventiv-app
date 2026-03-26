import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { AppError } from "../errors/AppError";
import { logger } from "../utils/logger";

export const errorHandler = (
    error: Error,
    req: Request,
    res: Response,
    _next: NextFunction
): Response => {
    if (error instanceof ZodError) {
        return res.status(400).json({
            success: false,
            requestId: req.requestId,
            error: "Validation failed",
            fields: error.issues.map((issue) => ({
                path: issue.path.join("."),
                message: issue.message
            }))
        });
    }

    if (error instanceof AppError) {
        return res.status(error.statusCode).json({
            success: false,
            requestId: req.requestId,
            error: error.message
        });
    }

    logger.error("Unhandled API error", {
        requestId: req.requestId,
        method: req.method,
        path: req.originalUrl,
        message: error.message,
        stack: process.env.NODE_ENV === "production" ? undefined : error.stack
    });

    return res.status(500).json({
        success: false,
        requestId: req.requestId,
        error: "Internal server error"
    });
};
