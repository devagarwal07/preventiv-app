import request from "supertest";

const BASE_URL = process.env.TEST_API_URL || "http://localhost:3001";
const TOKEN = process.env.TEST_PATIENT_TOKEN || "";

if (!TOKEN) {
    // Skip this suite when no auth token is configured to avoid false positives.
    // eslint-disable-next-line no-undef
    describe.skip("vitals routes", () => {
        it("skipped because TEST_PATIENT_TOKEN is missing", () => {
            expect(true).toBe(true);
        });
    });
} else {
    describe("vitals routes", () => {
        it("manual vital submission with valid type", async () => {
            const response = await request(BASE_URL)
                .post("/vitals/manual")
                .set("Authorization", `Bearer ${TOKEN}`)
                .send({
                    type: "glucose",
                    value: { value: 112, unit: "mg/dL", context: "fasting" },
                    timestamp: new Date().toISOString()
                });

            expect(response.status).toBe(201);
        });

        it("manual vital submission with invalid type returns validation error", async () => {
            const response = await request(BASE_URL)
                .post("/vitals/manual")
                .set("Authorization", `Bearer ${TOKEN}`)
                .send({ type: "invalid", value: { value: 1 }, timestamp: new Date().toISOString() });

            expect(response.status).toBe(400);
        });

        it("vitals list supports pagination", async () => {
            const patientId = process.env.TEST_PATIENT_ID || "00000000-0000-0000-0000-000000000001";
            const response = await request(BASE_URL)
                .get(`/vitals/${patientId}?page=1&limit=5`)
                .set("Authorization", `Bearer ${TOKEN}`);

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty("data.items");
            expect(response.body).toHaveProperty("data.meta.page");
            expect(response.body).toHaveProperty("data.meta.limit");
        });
    });
}
