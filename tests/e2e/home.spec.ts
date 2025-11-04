import { test, expect } from "@playwright/test";

import { HomePage } from "./pages/HomePage";

test.describe("Home page", () => {
  test.use({ viewport: { width: 1280, height: 720 } });

  test("displays hero content and primary actions", async ({ page }) => {
    const homePage = new HomePage(page);

    await homePage.goto();

    await expect(homePage.heroHeading).toBeVisible();
    await expect(homePage.loginLink).toBeVisible();
    await expect(homePage.featuresHeading).toBeVisible();

    await expect(homePage.loginLink).toHaveAttribute("href", "/login");

    await expect(page).toHaveScreenshot("home-hero.png");
  });
});
