import winston from "winston";

const { combine, timestamp, errors, json, colorize, printf } = winston.format;

const isProduction = process.env.NODE_ENV === "production";

const consoleFormat = printf(({ level, message, timestamp: ts, ...meta }) => {
    const details = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : "";
    return `${ts} ${level}: ${message}${details}`;
});

export const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || "info",
    format: combine(timestamp(), errors({ stack: true }), json()),
    defaultMeta: { service: "prevntiv-api" },
    transports: [
        new winston.transports.Console({
            format: isProduction
                ? combine(timestamp(), errors({ stack: true }), json())
                : combine(colorize(), timestamp(), consoleFormat)
        })
    ]
});
