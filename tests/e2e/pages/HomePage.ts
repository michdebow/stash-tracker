import type { Locator, Page } from "@playwright/test";

export class HomePage {
  readonly page: Page;
  readonly heroHeading: Locator;
  readonly loginLink: Locator;
  readonly featuresHeading: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heroHeading = page.getByRole("heading", { name: "Control your finances with simplicity" });
    this.loginLink = page.getByRole("link", { name: "Log In" });
    this.featuresHeading = page.getByRole("heading", { name: "Everything you need" });
  }

  async goto() {
    await this.page.goto("/");
    await this.expectLoaded();
  }

  async expectLoaded() {
    await this.heroHeading.waitFor({ state: "visible" });
    await Promise.all([this.loginLink.waitFor({ state: "visible" })]);
  }
}
