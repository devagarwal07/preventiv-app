import { z } from "zod";

export const RegisterSchema = z.object({
    name: z.string().min(2).max(120),
    email: z.string().email(),
    phone: z.string().regex(/^\+?[1-9]\d{7,14}$/),
    password: z.string().min(8).max(128),
    role: z.enum([
        "patient",
        "doctor",
        "dietician",
        "physiotherapist",
        "org_admin",
        "platform_admin"
    ])
});

export const LoginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(8)
});

export const OTPRequestSchema = z.object({
    phone: z.string().regex(/^\+?[1-9]\d{7,14}$/)
});

export const OTPVerifySchema = z.object({
    phone: z.string().regex(/^\+?[1-9]\d{7,14}$/),
    otp: z.string().regex(/^\d{6}$/)
});

export type RegisterInput = z.infer<typeof RegisterSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
