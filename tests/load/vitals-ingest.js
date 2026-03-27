import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
    vus: 100,
    duration: "1m",
    thresholds: {
        http_req_duration: ["p(95)<500"]
    }
};

export default function () {
    const payload = JSON.stringify({
        type: "glucose",
        value: { value: 115, unit: "mg/dL", context: "fasting" },
        timestamp: new Date().toISOString()
    });

    const response = http.post(`${__ENV.K6_API_URL || "http://localhost:3001"}/vitals/manual`, payload, {
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${__ENV.K6_PATIENT_TOKEN || ""}`
        }
    });

    check(response, {
        "status is success": (r) => r.status === 201 || r.status === 401
    });

    sleep(0.2);
}
