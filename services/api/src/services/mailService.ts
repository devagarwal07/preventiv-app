import nodemailer from "nodemailer";
import { logger } from "../utils/logger";

const transporter = process.env.SMTP_HOST
    ? nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 587),
        secure: false,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASSWORD
        }
    })
    : nodemailer.createTransport({ jsonTransport: true });

export const sendVerificationEmail = async (
    to: string,
    name: string,
    verifyLink: string
): Promise<void> => {
    await transporter.sendMail({
        from: process.env.SMTP_FROM_EMAIL || "no-reply@prevntiv.local",
        to,
        subject: "Welcome to Prevntiv - Verify your account",
        html: `
      <h2>Welcome, ${name}</h2>
      <p>Your Prevntiv account has been created.</p>
      <p>Please verify your email by clicking the link below:</p>
      <a href="${verifyLink}">Verify account</a>
    `
    });

    logger.info("Verification email queued", { to });
};
