import type { Response } from "express";
import type { PaginationMeta } from "@prevntiv/shared-types";

export const success = <T>(res: Response, data: T, statusCode = 200): Response => {
    return res.status(statusCode).json({ success: true, data });
};

export const paginated = <T>(res: Response, data: T, meta: PaginationMeta): Response => {
    return res.status(200).json({ success: true, data, meta });
};

export const error = (res: Response, message: string, statusCode = 500): Response => {
    return res.status(statusCode).json({ success: false, error: message });
};
