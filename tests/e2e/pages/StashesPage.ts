import type { Locator, Page } from "@playwright/test";

export class StashesPage {
  readonly page: Page;
  readonly pageHeading: Locator;
  readonly createButton: Locator;
  readonly stashList: Locator;
  readonly emptyState: Locator;
  readonly loadingSpinner: Locator;

  constructor(page: Page) {
    this.page = page;
    this.pageHeading = page.getByRole("heading", { name: "Your Stashes" });
    this.createButton = page.getByRole("button", { name: "Create Stash" });
    this.stashList = page.locator("[class*='grid']").filter({ has: page.locator("[class*='md:grid-cols']") });
    this.emptyState = page.getByText("No stashes yet");
    this.loadingSpinner = page.locator("[role='status']");
  }

  async goto() {
    await this.page.goto("/app/stashes");
    await this.expectLoaded();
  }

  async expectLoaded() {
    await this.pageHeading.waitFor({ state: "visible" });
    await this.createButton.waitFor({ state: "visible" });
    // Wait for either loading to complete or content to be visible
    await this.page.waitForLoadState("networkidle");
  }

  async openCreateDialog() {
    await this.createButton.click();
    await this.page.getByRole("dialog").waitFor({ state: "visible" });
  }

  async createStash(name: string) {
    await this.openCreateDialog();
    await this.page.getByLabel("Stash Name").fill(name);
    await this.page.getByRole("button", { name: "Create Stash", exact: true }).click();
    // Wait for dialog to close and network to settle
    await this.page.waitForLoadState("networkidle");
  }

  async getStashCard(stashName: string): Promise<Locator> {
    return this.page
      .locator("a")
      .filter({ has: this.page.getByText(stashName) })
      .first();
  }

  async getStashByName(stashName: string): Promise<Locator> {
    return this.page.getByText(stashName, { exact: true }).first();
  }

  async deleteStash(stashName: string) {
    // Find the stash card and click the delete button
    const stashCard = await this.getStashCard(stashName);

    // Look for the delete button within or near the stash card
    const deleteButton = stashCard
      .locator("button")
      .filter({ has: this.page.locator("svg") })
      .last();
    await deleteButton.click();

    await this.page.getByTestId("open-delete-stash-dialog").click();
    // Wait for delete dialog to appear
    //await this.page.getByTestId("delete-stash-dialog").waitFor({ state: "visible" });

    // Click the delete confirmation button
    await this.page.getByRole("button", { name: "Delete", exact: true }).click();

    // Wait for dialog to close and network to settle
    await this.page.waitForLoadState("networkidle");
  }

  async expectStashExists(stashName: string) {
    const stash = await this.getStashByName(stashName);
    await stash.waitFor({ state: "visible" });
  }

  async expectStashNotExists(stashName: string) {
    const stash = await this.getStashByName(stashName);
    await stash.waitFor({ state: "hidden" });
  }

  async expectEmptyState() {
    await this.emptyState.waitFor({ state: "visible" });
  }

  async getStashCount(): Promise<number> {
    const stashes = await this.page.locator("a[href*='/app/stashes/']").count();
    return stashes;
  }

  async expectStashCount(count: number) {
    const actualCount = await this.getStashCount();
    if (actualCount !== count) {
      throw new Error(`Expected ${count} stashes, but found ${actualCount}`);
    }
  }
}
