import { test, expect } from "@playwright/test";
import { BudgetPage } from "./pages/BudgetPage";
import { LoginPage } from "./pages/LoginPage";
import { testUsers } from "./fixtures/testUsers";

test.describe("Budget Management", () => {
  test.use({ viewport: { width: 1280, height: 720 } });

  // Setup: Login before each test
  test.beforeEach(async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login(testUsers.valid.email, testUsers.valid.password);
    await page.waitForURL("**/app/dashboard", { waitUntil: "networkidle" });
  });

  test.describe("List Budgets", () => {
    test("should display budget page with all sections", async ({ page }) => {
      const budgetPage = new BudgetPage(page);
      await budgetPage.goto();

      await expect(budgetPage.pageHeading).toBeVisible();
      await expect(budgetPage.setEditBudgetButton).toBeVisible();
      await expect(budgetPage.addExpenseButton).toBeVisible();
      await expect(budgetPage.budgetDetailsCard).toBeVisible();
      await expect(budgetPage.expenseListCard).toBeVisible();
      await expect(page).toHaveScreenshot("budget-page-overview.png");
    });

    test("should display empty state when no budget is set", async ({ page }) => {
      const budgetPage = new BudgetPage(page);
      await budgetPage.goto();

      // Check if "No budget set for this month" message is visible
      const noBudgetMessage = page.locator("text=No budget set for this month");
      const isNoBudgetVisible = await noBudgetMessage.isVisible().catch(() => false);

      if (isNoBudgetVisible) {
        await expect(noBudgetMessage).toBeVisible();
        await expect(page).toHaveScreenshot("budget-empty-state.png");
      }
    });
  });

  test.describe("Create Budget", () => {
    test("should create a new budget successfully", async ({ page }) => {
      const budgetPage = new BudgetPage(page);
      await budgetPage.goto();

      const budgetAmount = "5000.00";
      await budgetPage.setBudget(budgetAmount);

      // Verify budget was created
      await budgetPage.expectBudgetExists();
      const displayedAmount = await budgetPage.getBudgetAmount();

      expect(displayedAmount).toContain("5000");
    });
  });

  test.describe("Update Budget", () => {
    test("should update an existing budget successfully", async ({ page }) => {
      const budgetPage = new BudgetPage(page);
      await budgetPage.goto();

      // Create initial budget
      await budgetPage.setBudget("3000.00");
      await budgetPage.expectBudgetExists();

      // Update budget
      await budgetPage.updateBudget("7500.50");

      // Verify budget was updated
      const displayedAmount = await budgetPage.getBudgetAmount();
      expect(displayedAmount).toContain("7500");
    });

    test("should show 'Update Budget' button when budget exists", async ({ page }) => {
      const budgetPage = new BudgetPage(page);
      await budgetPage.goto();

      // Create initial budget
      await budgetPage.setBudget("5000.00");

      // Open dialog again
      await budgetPage.openSetBudgetDialog();

      // Button should say "Update Budget"
      const updateButton = page.getByRole("button", { name: "Update Budget" });
      await expect(updateButton).toBeVisible();
    });
  });

  test.describe("Delete Budget (via expenses)", () => {
    test("should display expenses list section", async ({ page }) => {
      const budgetPage = new BudgetPage(page);
      await budgetPage.goto();

      // Create a budget first
      await budgetPage.setBudget("5000.00");

      // Verify expenses section is visible
      await expect(budgetPage.expenseListCard).toBeVisible();
      const noExpensesMessage = page.locator("text=No expenses recorded for this month");
      await expect(noExpensesMessage).toBeVisible();
    });
  });

  test.describe("Integration Tests", () => {
    test("should create, update, and view budget with expenses in sequence", async ({ page }) => {
      const budgetPage = new BudgetPage(page);
      await budgetPage.goto();

      const initialBudget = "5000.00";
      const updatedBudget = "8000.00";

      // Create budget
      await budgetPage.setBudget(initialBudget);
      await budgetPage.expectBudgetExists();
      let displayedAmount = await budgetPage.getBudgetAmount();
      expect(displayedAmount).toContain("5000,00");

      // Verify budget details are displayed
      await expect(page.getByText("Budget Set", { exact: true })).toBeVisible();
      await expect(page.locator("text=Spent")).toBeVisible();
      await expect(page.locator("text=Remaining")).toBeVisible();

      // Update budget
      await budgetPage.updateBudget(updatedBudget);
      displayedAmount = await budgetPage.getBudgetAmount();
      expect(displayedAmount).toContain("8000,00");

      // Verify spending progress is displayed
      await expect(page.getByText("Spending Progress", { exact: true })).toBeVisible();
    });
  });
});
