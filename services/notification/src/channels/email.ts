import fs from "fs";
import path from "path";
import nodemailer from "nodemailer";
import { renderTemplate } from "../utils/templates";

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: false,
    auth: process.env.SMTP_USER
        ? {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASSWORD
        }
        : undefined
});

const templateDir = path.join(process.cwd(), "src", "templates", "email");

export const sendEmail = async (
    to: string,
    subject: string,
    htmlTemplate: string,
    variables: Record<string, string | number | boolean | null | undefined>
): Promise<void> => {
    const templatePath = path.join(templateDir, htmlTemplate);
    const rawTemplate = fs.readFileSync(templatePath, "utf8");
    const html = renderTemplate(rawTemplate, variables);

    await transporter.sendMail({
        from: process.env.SMTP_FROM_EMAIL || "no-reply@prevntiv.local",
        to,
        subject,
        html
    });
};
