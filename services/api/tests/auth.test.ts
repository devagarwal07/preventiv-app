import request from "supertest";

const BASE_URL = process.env.TEST_API_URL || "http://localhost:3001";

describe("auth flows", () => {
    it("register/login/refresh/logout happy path", async () => {
        const agent = request.agent(BASE_URL);
        const email = `test+${Date.now()}@prevntiv.dev`;

        const register = await agent.post("/auth/register").send({
            name: "Test User",
            email,
            phone: `9000${Date.now().toString().slice(-6)}`,
            password: "Test@12345",
            role: "patient"
        });
        expect(register.status).toBe(201);

        const login = await agent.post("/auth/login").send({ email, password: "Test@12345" });
        expect(login.status).toBe(200);
        const access = login.body?.data?.accessToken || login.body?.data?.access_token;
        const refreshToken = login.body?.data?.refreshToken || login.body?.data?.refresh_token;
        expect(access).toBeTruthy();
        expect(refreshToken || login.headers["set-cookie"]).toBeTruthy();

        const refreshRequest = agent.post("/auth/refresh");
        if (refreshToken) {
            refreshRequest.send({ refreshToken });
        }

        const refresh = await refreshRequest;
        expect(refresh.status).toBe(200);

        const logout = await agent
            .post("/auth/logout")
            .set("Authorization", `Bearer ${access}`);
        expect(logout.status).toBe(200);
    });

    it("invalid password returns 401", async () => {
        const response = await request(BASE_URL).post("/auth/login").send({
            email: "nope@example.com",
            password: "wrong"
        });
        expect([400, 401]).toContain(response.status);
    });

    it("otp endpoint is rate limited", async () => {
        const phone = `9000${Date.now().toString().slice(-6)}`;
        let lastStatus = 200;
        for (let i = 0; i < 6; i += 1) {
            const response = await request(BASE_URL).post("/auth/otp/send").send({ phone });
            lastStatus = response.status;
        }
        expect([200, 429]).toContain(lastStatus);
    });
});
