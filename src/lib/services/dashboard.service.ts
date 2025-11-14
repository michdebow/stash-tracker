import type { SupabaseClient } from "@/db/supabase.client";
import type { DashboardStashSummary, DashboardBudgetSummary, DashboardData } from "@/types";

/**
 * Retrieves a summary of all stashes for the dashboard.
 * Returns total count, total balance, and list of stashes.
 *
 * @param supabase - The Supabase client instance
 * @param userId - The authenticated user's ID
 * @returns Dashboard stash summary
 * @throws Error if the database query fails
 */
async function getStashesSummary(supabase: SupabaseClient, userId: string): Promise<DashboardStashSummary> {
  const { data, error } = await supabase
    .from("stashes")
    .select("id, name, current_balance, created_at, updated_at")
    .eq("user_id", userId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching stashes summary:", error);
    throw new Error("Failed to fetch stashes summary");
  }

  const stashes = data || [];
  const totalBalance = stashes.reduce((sum, stash) => sum + Number(stash.current_balance), 0);

  return {
    totalStashes: stashes.length,
    totalBalance,
    stashes,
  };
}

/**
 * Retrieves the budget summary for the current month.
 * Returns budget info and total expenses even if no budget is set.
 *
 * @param supabase - The Supabase client instance
 * @param userId - The authenticated user's ID
 * @param yearMonth - The year-month string in YYYY-MM format (defaults to current month)
 * @returns Dashboard budget summary
 * @throws Error if the database query fails
 */
async function getBudgetSummary(
  supabase: SupabaseClient,
  userId: string,
  yearMonth: string
): Promise<DashboardBudgetSummary> {
  // Fetch budget for the specified month
  const { data: budget, error: budgetError } = await supabase
    .from("month_budget")
    .select("id, year_month, budget_set, current_balance, created_at, updated_at")
    .eq("user_id", userId)
    .eq("year_month", yearMonth)
    .is("deleted_at", null)
    .maybeSingle();

  if (budgetError) {
    console.error("Error fetching budget summary:", budgetError);
    throw new Error("Failed to fetch budget summary");
  }

  // Fetch total expenses for the month
  const { data: expenses, error: expensesError } = await supabase
    .from("expenses")
    .select("amount")
    .eq("user_id", userId)
    .eq("year_month", yearMonth)
    .is("deleted_at", null);

  if (expensesError) {
    console.error("Error fetching expenses for budget summary:", expensesError);
    throw new Error("Failed to fetch expenses summary");
  }

  const totalExpenses = expenses?.reduce((sum, expense) => sum + Number(expense.amount), 0) || 0;

  return {
    yearMonth,
    budgetSet: budget?.budget_set ?? null,
    totalExpenses,
    currentBalance: budget?.current_balance ?? null,
    hasNoBudget: !budget,
  };
}

/**
 * Retrieves complete dashboard data including stashes and budget summaries.
 *
 * @param supabase - The Supabase client instance
 * @param userId - The authenticated user's ID
 * @param yearMonth - Optional year-month string (defaults to current month)
 * @returns Complete dashboard data
 * @throws Error if any database query fails
 */
export async function getDashboardData(
  supabase: SupabaseClient,
  userId: string,
  yearMonth?: string
): Promise<DashboardData> {
  // Use current month if not specified
  const targetYearMonth = yearMonth || new Date().toISOString().slice(0, 7);

  // Fetch both summaries in parallel
  const [stashes, budget] = await Promise.all([
    getStashesSummary(supabase, userId),
    getBudgetSummary(supabase, userId, targetYearMonth),
  ]);

  return {
    stashes,
    budget,
  };
}
