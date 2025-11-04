import type { Locator, Page } from "@playwright/test";

export class BudgetPage {
  readonly page: Page;
  readonly pageHeading: Locator;
  readonly setEditBudgetButton: Locator;
  readonly addExpenseButton: Locator;
  readonly monthSelector: Locator;
  readonly budgetAmountInput: Locator;
  readonly submitBudgetButton: Locator;
  readonly budgetDetailsCard: Locator;
  readonly expenseListCard: Locator;
  readonly loadingSpinner: Locator;

  constructor(page: Page) {
    this.page = page;
    this.pageHeading = page.getByTestId("main-budget-heading");
    this.setEditBudgetButton = page.getByRole("button", { name: "Set/Edit Budget" });
    this.addExpenseButton = page.getByRole("button", { name: "Add Expense" });
    this.monthSelector = page.locator("select");
    this.budgetAmountInput = page.locator("#budget-amount");
    this.submitBudgetButton = page.getByRole("button", { name: /Set Budget|Update Budget/ });
    this.budgetDetailsCard = page.locator("text=Budget for").first();
    this.expenseListCard = page.locator("text=Expenses").first();
    this.loadingSpinner = page.locator("[role='status']");
  }

  async goto() {
    await this.page.goto("/app/budget");
    await this.expectLoaded();
  }

  async expectLoaded() {
    await this.pageHeading.waitFor({ state: "visible" });
    await this.setEditBudgetButton.waitFor({ state: "visible" });
    await this.addExpenseButton.waitFor({ state: "visible" });
    await this.page.waitForLoadState("networkidle");
  }

  async openSetBudgetDialog() {
    await this.setEditBudgetButton.click();
    await this.page.getByRole("dialog").waitFor({ state: "visible" });
  }

  async setBudget(amount: string) {
    await this.openSetBudgetDialog();

    await this.page.waitForTimeout(300);

    const budgetAmountInput = this.page.locator("#budget-amount");

    budgetAmountInput.fill(amount);
    // Trigger change event to ensure React state updates
    await budgetAmountInput.evaluate((input: HTMLInputElement) => {
      input.dispatchEvent(new Event("change", { bubbles: true }));
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    // Add a small delay to ensure React state updates
    await this.page.waitForTimeout(300);
    // Click the submit button
    await this.submitBudgetButton.click();
    // Wait for dialog to close and network to settle

    await this.page.waitForTimeout(300);

    await this.page.waitForLoadState("networkidle");
  }

  async updateBudget(amount: string) {
    await this.setBudget(amount);
  }

  async getBudgetAmount(): Promise<string | null> {
    await this.page.waitForTimeout(1000);
    const budgetText = await this.page.getByTestId("set-budget-amount").textContent();

    return budgetText;
  }

  async expectBudgetExists() {
    await this.page.waitForTimeout(1000);
    await this.budgetDetailsCard.waitFor({ state: "visible" });
  }

  async expectBudgetNotSet() {
    const errorText = await this.page.locator("text=No budget set for this month").isVisible();
    return errorText;
  }

  async openAddExpenseDialog() {
    await this.addExpenseButton.click();
    await this.page.getByRole("dialog").waitFor({ state: "visible" });
  }

  async addExpense(description: string, amount: string, category?: string) {
    await this.openAddExpenseDialog();
    await this.page.getByLabel("Description").fill(description);
    await this.page.locator("input[type='number']").first().fill(amount);

    if (category) {
      const categorySelect = this.page.locator("select").first();
      await categorySelect.selectOption(category);
    }

    await this.page.getByRole("button", { name: "Add Expense", exact: true }).click();
    // Wait for dialog to close and network to settle
    await this.page.waitForLoadState("networkidle");
  }

  async deleteExpense(expenseDescription: string) {
    // Find the expense row and click the delete button
    const expenseRow = this.page
      .locator("div")
      .filter({ has: this.page.getByText(expenseDescription, { exact: true }) })
      .first();

    // Find the delete button (trash icon button) in the row
    const deleteButton = expenseRow.locator("button").last();
    await deleteButton.click();

    // Wait for delete confirmation dialog
    await this.page.getByRole("alertdialog").waitFor({ state: "visible" });

    // Click the delete confirmation button
    await this.page.getByRole("button", { name: "Delete", exact: true }).click();

    // Wait for dialog to close and network to settle
    await this.page.waitForLoadState("networkidle");
  }

  async expectExpenseExists(expenseDescription: string) {
    const expense = this.page.getByText(expenseDescription, { exact: true }).first();
    await expense.waitFor({ state: "visible" });
  }

  async expectExpenseNotExists(expenseDescription: string) {
    const expense = this.page.getByText(expenseDescription, { exact: true }).first();
    await expense.waitFor({ state: "hidden" });
  }

  async getExpenseCount(): Promise<number> {
    const expenseRows = await this.page
      .locator("div")
      .filter({ has: this.page.locator("svg") })
      .count();
    return expenseRows;
  }

  async selectMonth(yearMonth: string) {
    const [year, month] = yearMonth.split("-");
    const monthSelector = this.page.locator("select").first();
    await monthSelector.selectOption(`${year}-${month}`);
    await this.page.waitForLoadState("networkidle");
  }

  async getSpentAmount(): Promise<string | null> {
    const spentText = await this.page.locator("text=Spent").locator("..").locator("p").last().textContent();
    return spentText;
  }

  async getRemainingAmount(): Promise<string | null> {
    const remainingText = await this.page.locator("text=Remaining").locator("..").locator("p").last().textContent();
    return remainingText;
  }
}
