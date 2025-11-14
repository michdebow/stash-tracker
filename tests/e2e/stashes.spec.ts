import { test, expect } from "@playwright/test";
import { StashesPage } from "./pages/StashesPage";
import { LoginPage } from "./pages/LoginPage";
import { testUsers } from "./fixtures/testUsers";

test.describe("Stashes Management", () => {
  test.use({ viewport: { width: 1280, height: 720 } });

  // Setup: Login before each test
  test.beforeEach(async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login(testUsers.valid.email, testUsers.valid.password);
    await page.waitForURL("**/app/dashboard", { waitUntil: "networkidle" });
  });

  test.describe("List Stashes", () => {
    test("should display stashes list page", async ({ page }) => {
      const stashesPage = new StashesPage(page);
      await stashesPage.goto();

      await expect(stashesPage.pageHeading).toBeVisible();
      await expect(stashesPage.createButton).toBeVisible();
      // await expect(page).toHaveScreenshot("stashes-list-page.png");
    });

    test("should display empty state when no stashes exist", async ({ page }) => {
      const stashesPage = new StashesPage(page);
      await stashesPage.goto();

      // Check if empty state or list is visible
      const stashCount = await stashesPage.getStashCount();

      if (stashCount === 0) {
        await expect(stashesPage.emptyState).toBeVisible();
        // await expect(page).toHaveScreenshot("stashes-empty-state.png");
      }
    });

    test("should display stashes in a grid layout", async ({ page }) => {
      const stashesPage = new StashesPage(page);
      await stashesPage.goto();

      const stashCount = await stashesPage.getStashCount();

      if (stashCount > 0) {
        // Verify stashes are displayed
        const stashCards = page.locator("a[href*='/app/stashes/']");
        await expect(stashCards.first()).toBeVisible();
        // await expect(page).toHaveScreenshot("stashes-grid-layout.png");
      }
    });
  });

  test.describe("Integration Tests", () => {
    test("should create, view, and delete stash in sequence", async ({ page }) => {
      const stashesPage = new StashesPage(page);
      await stashesPage.goto();

      const stashName = `Full Lifecycle ${Date.now()}`;

      // Create
      await stashesPage.createStash(stashName);
      await stashesPage.expectStashExists(stashName);

      // View (navigate to detail page)
      const stashLink = await stashesPage.getStashCard(stashName);
      await stashLink.click();
      await page.waitForLoadState("networkidle");

      // Verify we're on the detail page
      await expect(page).toHaveURL(/\/app\/stashes\/[a-f0-9-]+/);

      // Go back to list
      await page.goBack();
      await stashesPage.expectLoaded();

      // Delete
      await stashesPage.deleteStash(stashName);
      await stashesPage.expectStashNotExists(stashName);

      // await expect(page).toHaveScreenshot("stash-full-lifecycle.png");
    });
  });
});
