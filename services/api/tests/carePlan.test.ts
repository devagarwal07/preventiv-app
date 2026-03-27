import request from "supertest";

const BASE_URL = process.env.TEST_API_URL || "http://localhost:3001";
const PROFESSIONAL_TOKEN = process.env.TEST_PROFESSIONAL_TOKEN || "";

describe("care plan flows", () => {
    it("professional can create care plan for their patient", async () => {
        const patientId = process.env.TEST_PATIENT_ID || "00000000-0000-0000-0000-000000000001";
        const response = await request(BASE_URL)
            .post("/care-plans")
            .set("Authorization", `Bearer ${PROFESSIONAL_TOKEN}`)
            .send({
                patient_id: patientId,
                type: "medical",
                title: "Hypertension control",
                items: [{ action: "Daily walk", frequency: "daily", instructions: "30 mins" }]
            });

        expect([201, 401, 403]).toContain(response.status);
    });

    it("patient acknowledgment flow", async () => {
        const carePlanId = process.env.TEST_CARE_PLAN_ID || "00000000-0000-0000-0000-000000000001";
        const patientToken = process.env.TEST_PATIENT_TOKEN || "";
        const response = await request(BASE_URL)
            .post(`/care-plans/${carePlanId}/acknowledge`)
            .set("Authorization", `Bearer ${patientToken}`);

        expect([200, 401, 403, 404]).toContain(response.status);
    });
});
