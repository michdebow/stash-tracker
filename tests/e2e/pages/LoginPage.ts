import type { Locator, Page } from "@playwright/test";

export class LoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly errorAlert: Locator;
  readonly heroHeading: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.getByTestId("email");
    this.passwordInput = page.getByTestId("password");
    this.submitButton = page.getByRole("button", { name: "Sign in" });
    this.errorAlert = page.getByRole("alert");
    this.heroHeading = page.getByRole("heading", { name: "Sign in to manage your stash" });
  }

  async goto() {
    await this.page.goto("/login");
    await this.expectLoaded();
  }

  async expectLoaded() {
    await this.heroHeading.waitFor({ state: "visible" });
    await Promise.all([
      this.emailInput.waitFor({ state: "visible" }),
      this.passwordInput.waitFor({ state: "visible" }),
      this.submitButton.waitFor({ state: "visible" }),
    ]);
    await this.page.waitForTimeout(2000);
  }

  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }

  async expectErrorMessage(message: string) {
    await this.errorAlert.waitFor({ state: "visible" });
    await this.page.getByText(message, { exact: true }).waitFor({ state: "visible" });
  }
}
