import { Router } from "express";
import type { Request, Response } from "express";
import cookieParser from "cookie-parser";
import {
    LoginSchema,
    OTPRequestSchema,
    OTPVerifySchema,
    RegisterSchema
} from "../auth/schemas";
import {
    login,
    logout,
    refresh,
    register,
    sendOtp,
    verifyOtp
} from "../services/authService";
import { authenticate } from "../middleware/authenticate";
import { userRateLimit } from "../middleware/userRateLimit";
import { asyncHandler } from "../utils/asyncHandler";
import { success } from "../utils/response";

export const authRouter = Router();
authRouter.use(cookieParser());

const refreshCookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge: 7 * 24 * 60 * 60 * 1000
};

authRouter.post("/auth/register", asyncHandler(async (req: Request, res: Response) => {
    const payload = RegisterSchema.parse(req.body);
    const user = await register(payload);
    return success(res, user, 201);
}));

authRouter.post("/auth/login", asyncHandler(async (req: Request, res: Response) => {
    const payload = LoginSchema.parse(req.body);
    const result = await login(payload);

    res.cookie("refreshToken", result.refreshToken, refreshCookieOptions);
    return success(res, {
        user: result.user,
        accessToken: result.accessToken
    });
}));

authRouter.post("/auth/refresh", asyncHandler(async (req: Request, res: Response) => {
    const refreshToken = req.cookies?.refreshToken as string | undefined;
    if (!refreshToken) {
        return res.status(401).json({ success: false, error: "Missing refresh token" });
    }

    const tokenPair = await refresh(refreshToken);
    res.cookie("refreshToken", tokenPair.refreshToken, refreshCookieOptions);

    return success(res, {
        accessToken: tokenPair.accessToken
    });
}));

authRouter.post("/auth/logout", authenticate, asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
        return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    await logout(req.user.id);
    res.clearCookie("refreshToken", refreshCookieOptions);
    return success(res, { loggedOut: true });
}));

authRouter.post(
    "/auth/otp/send",
    userRateLimit({
        keyPrefix: "rate:auth:otp",
        max: 5,
        windowSeconds: 60 * 60,
        extractor: (req) => {
            const phone = (req.body as { phone?: string } | undefined)?.phone;
            return typeof phone === "string" ? phone : null;
        }
    }),
    asyncHandler(async (req: Request, res: Response) => {
        const payload = OTPRequestSchema.parse(req.body);
        await sendOtp(payload.phone);
        return success(res, { sent: true });
    })
);

authRouter.post("/auth/otp/verify", asyncHandler(async (req: Request, res: Response) => {
    const payload = OTPVerifySchema.parse(req.body);
    await verifyOtp(payload.phone, payload.otp);
    return success(res, { verified: true });
}));

authRouter.get("/auth/me", authenticate, asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
        return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    return success(res, { user: req.user });
}));
