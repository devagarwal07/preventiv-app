const http = require("http");

const port = Number(process.env.NOTIFICATION_PORT || 3002);

const server = http.createServer((req, res) => {
    if (req.url === "/health") {
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify({ status: "ok" }));
        return;
    }

    res.writeHead(404, { "content-type": "application/json" });
    res.end(JSON.stringify({ success: false, error: "Not found" }));
});

server.listen(port, () => {
    process.stdout.write(`Notification service listening on ${port}\n`);
});
