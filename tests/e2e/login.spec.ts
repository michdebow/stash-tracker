import { test, expect } from "@playwright/test";

import { LoginPage } from "./pages/LoginPage";
import { testUsers } from "./fixtures/testUsers";

test.describe("Login", () => {
  test.use({ viewport: { width: 1280, height: 720 } });

  test.beforeEach(async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
  });

  test("successful login redirects to dashboard", async ({ page, baseURL }) => {
    if (!baseURL) {
      throw new Error("baseURL is not configured in Playwright. Set PLAYWRIGHT_BASE_URL or baseURL in config.");
    }

    const loginPage = new LoginPage(page);

    await loginPage.login(testUsers.valid.email, testUsers.valid.password);

    await page.waitForURL("**/app/dashboard", { waitUntil: "networkidle" });

    await expect(page).toHaveURL(/\/app\/dashboard/);
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  });

  test("shows error for invalid credentials", async ({ page, baseURL }) => {
    if (!baseURL) {
      throw new Error("baseURL is not configured in Playwright. Set PLAYWRIGHT_BASE_URL or baseURL in config.");
    }

    const loginPage = new LoginPage(page);
    await loginPage.login(testUsers.invalid.email, testUsers.invalid.password);

    await loginPage.expectErrorMessage("Unable to sign in. Check your email and password.");
    await expect(page).toHaveURL(/\/login$/);
    //await expect(page).toHaveScreenshot("login-invalid-credentials.png");
  });
});
