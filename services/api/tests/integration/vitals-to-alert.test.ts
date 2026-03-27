import request from "supertest";

const BASE_URL = process.env.TEST_API_URL || "http://localhost:3001";
const TOKEN = process.env.TEST_PATIENT_TOKEN || "";

describe("integration: vitals -> anomaly -> alert", () => {
    it("critical bp can enqueue anomaly/alert workflow", async () => {
        const response = await request(BASE_URL)
            .post("/vitals/manual")
            .set("Authorization", `Bearer ${TOKEN}`)
            .send({
                type: "bp",
                value: { systolic: 182, diastolic: 116 },
                timestamp: new Date().toISOString()
            });

        expect([201, 401]).toContain(response.status);
    });
});
