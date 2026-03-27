import express from "express";
import cors from "cors";
import { router } from "./router";
import { startNotificationWorker } from "./workers/notificationWorker";
import { startVitalEventSubscriber } from "./workers/vitalEventSubscriber";
import { closeDb } from "./utils/db";
import { closeRedis } from "./utils/redis";

const app = express();
const port = Number(process.env.NOTIFICATION_PORT || 3002);

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
});

app.use(router);

const server = app.listen(port, () => {
    process.stdout.write(`Notification service listening on ${port}\n`);
    startNotificationWorker();
    startVitalEventSubscriber();
});

const shutdown = async (): Promise<void> => {
    server.close(async () => {
        await Promise.all([closeDb(), closeRedis()]);
        process.exit(0);
    });
};

process.on("SIGTERM", () => {
    void shutdown();
});
