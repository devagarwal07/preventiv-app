import { test, expect } from "@playwright/test";

test("professional flow creates care plan", async ({ page }) => {
    await page.goto(process.env.E2E_WEB_URL || "http://localhost:3000/login");
    await page.fill('input[type="email"]', process.env.E2E_PRO_EMAIL || "doctor@example.com");
    await page.fill('input[type="password"]', process.env.E2E_PRO_PASSWORD || "password");
    await page.click('button[type="submit"]');

    await page.goto((process.env.E2E_WEB_URL || "http://localhost:3000") + "/patients");
    await page.getByText("Create Care Plan").first().click();
    await page.fill('input[name="title"]', "E2E care plan");
    await page.click('button:has-text("Save")');

    await expect(page.getByText("E2E care plan")).toBeVisible();
});
