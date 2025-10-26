import type { SupabaseClient } from "@/db/supabase.client";
import type {
  ApiPaginatedResponse,
  ListBudgetsQuery,
  MonthBudgetListItemDTO,
  MonthBudgetDTO,
  UpsertBudgetCommand,
} from "@/types";

/**
 * Retrieves the total expenses for a specific month and user.
 * Aggregates all non-deleted expenses for the given year_month.
 *
 * @param supabase - The Supabase client instance
 * @param userId - The authenticated user's ID
 * @param yearMonth - The year-month string in YYYY-MM format
 * @returns Total expenses amount (0 if no expenses found)
 * @throws Error if the database query fails
 */
async function getTotalExpensesForMonth(supabase: SupabaseClient, userId: string, yearMonth: string): Promise<number> {
  try {
    const { data, error } = await supabase
      .from("expenses")
      .select("amount")
      .eq("user_id", userId)
      .eq("year_month", yearMonth)
      .is("deleted_at", null);

    if (error) {
      console.error("Error fetching total expenses:", { userId, yearMonth, error });
      throw new Error("Failed to calculate total expenses");
    }

    // Calculate sum manually since Supabase JS client doesn't support aggregate functions directly
    const total = data?.reduce((sum, expense) => sum + Number(expense.amount), 0) || 0;
    return total;
  } catch (e) {
    if (e instanceof Error && e.message === "Failed to calculate total expenses") {
      throw e;
    }
    console.error("Unexpected error in getTotalExpensesForMonth:", e);
    throw new Error("Failed to calculate total expenses");
  }
}

/**
 * Retrieves an existing non-deleted budget for a specific month and user.
 *
 * @param supabase - The Supabase client instance
 * @param userId - The authenticated user's ID
 * @param yearMonth - The year-month string in YYYY-MM format
 * @returns The budget record or null if not found
 * @throws Error if the database query fails
 */
export async function getBudgetByYearMonth(
  supabase: SupabaseClient,
  userId: string,
  yearMonth: string
): Promise<MonthBudgetDTO | null> {
  try {
    const { data, error } = await supabase
      .from("month_budget")
      .select("id, year_month, budget_set, current_balance, created_at, updated_at")
      .eq("user_id", userId)
      .eq("year_month", yearMonth)
      .is("deleted_at", null)
      .single();

    if (error) {
      // PGRST116 means no rows found, which is expected for new budgets
      if (error.code === "PGRST116") {
        return null;
      }
      console.error("Error fetching budget by year_month:", { userId, yearMonth, error });
      throw new Error("Failed to fetch budget");
    }

    return data as MonthBudgetDTO;
  } catch (e) {
    if (e instanceof Error && e.message === "Failed to fetch budget") {
      throw e;
    }
    console.error("Unexpected error in getBudgetByYearMonth:", e);
    throw new Error("Failed to fetch budget");
  }
}

/**
 * Retrieves a paginated list of month budgets for a user with optional year filter.
 * Applies soft-delete filtering and controlled ordering by `year_month`.
 *
 * @param supabase - The Supabase client instance
 * @param userId - The authenticated user's ID
 * @param query - Query parameters for pagination, year filter, and ordering
 * @returns Paginated response containing month budgets and pagination metadata
 * @throws Error if the database query fails
 */
export async function listMonthBudgets(
  supabase: SupabaseClient,
  userId: string,
  query: ListBudgetsQuery
): Promise<ApiPaginatedResponse<MonthBudgetListItemDTO>> {
  const { page, limit, year, order } = query;

  // Calculate offset for pagination
  const offset = (page - 1) * limit;

  try {
    // Build the base query with filters
    let queryBuilder = supabase
      .from("month_budget")
      .select("id, year_month, budget_set, current_balance, created_at, updated_at", { count: "exact" })
      .eq("user_id", userId)
      .is("deleted_at", null);

    // Optional year filter
    if (year) {
      queryBuilder = queryBuilder.like("year_month", `${year}-%`);
    }

    // Apply ordering by year_month only
    queryBuilder = queryBuilder.order("year_month", { ascending: order === "asc" });

    // Apply pagination
    queryBuilder = queryBuilder.range(offset, offset + limit - 1);

    // Execute
    const { data, error, count } = await queryBuilder;

    if (error) {
      console.error("Error fetching month budgets:", error);
      throw new Error("Failed to fetch month budgets");
    }

    return {
      data: (data as MonthBudgetListItemDTO[]) || [],
      pagination: {
        page,
        limit,
        total: count || 0,
      },
    };
  } catch (e) {
    // Re-throw with generic message after logging above
    if (e instanceof Error && e.message === "Failed to fetch month budgets") {
      throw e;
    }
    console.error("Unexpected error in listMonthBudgets:", e);
    throw new Error("Failed to fetch month budgets");
  }
}

/**
 * Creates or updates a monthly budget for a user with UPSERT semantics.
 * Recalculates current_balance based on budget_set and total expenses for the month.
 *
 * @param supabase - The Supabase client instance
 * @param userId - The authenticated user's ID
 * @param yearMonth - The year-month string in YYYY-MM format
 * @param command - The budget data containing budget_set
 * @returns Object containing the budget item and a flag indicating if it was created
 * @throws Error if the database operation fails
 */
export async function upsertMonthBudget(
  supabase: SupabaseClient,
  userId: string,
  yearMonth: string,
  command: UpsertBudgetCommand
): Promise<{ item: MonthBudgetDTO; created: boolean }> {
  try {
    // Step 1: Get total expenses for the month
    const totalExpenses = await getTotalExpensesForMonth(supabase, userId, yearMonth);

    // Step 2: Calculate current balance
    const currentBalance = Number(command.budget_set) - totalExpenses;

    // Step 3: Check if budget already exists
    const existingBudget = await getBudgetByYearMonth(supabase, userId, yearMonth);

    if (existingBudget) {
      // Update existing budget
      const { data, error } = await supabase
        .from("month_budget")
        .update({
          budget_set: command.budget_set,
          current_balance: currentBalance,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId)
        .eq("year_month", yearMonth)
        .is("deleted_at", null)
        .select("id, year_month, budget_set, current_balance, created_at, updated_at")
        .single();

      if (error) {
        console.error("Error updating month budget:", { userId, yearMonth, error });
        throw new Error("Failed to upsert month budget");
      }

      return {
        item: data as MonthBudgetDTO,
        created: false,
      };
    } else {
      // Insert new budget
      const { data, error } = await supabase
        .from("month_budget")
        .insert({
          user_id: userId,
          year_month: yearMonth,
          budget_set: command.budget_set,
          current_balance: currentBalance,
        })
        .select("id, year_month, budget_set, current_balance, created_at, updated_at")
        .single();

      if (error) {
        // Handle potential race condition: unique constraint violation
        if (error.code === "23505") {
          // Retry as update
          console.log("Unique constraint violation, retrying as update:", { userId, yearMonth });
          const { data: retryData, error: retryError } = await supabase
            .from("month_budget")
            .update({
              budget_set: command.budget_set,
              current_balance: currentBalance,
              updated_at: new Date().toISOString(),
            })
            .eq("user_id", userId)
            .eq("year_month", yearMonth)
            .is("deleted_at", null)
            .select("id, year_month, budget_set, current_balance, created_at, updated_at")
            .single();

          if (retryError) {
            console.error("Error on retry update:", { userId, yearMonth, retryError });
            throw new Error("Failed to upsert month budget");
          }

          return {
            item: retryData as MonthBudgetDTO,
            created: false,
          };
        }

        console.error("Error inserting month budget:", { userId, yearMonth, error });
        throw new Error("Failed to upsert month budget");
      }

      return {
        item: data as MonthBudgetDTO,
        created: true,
      };
    }
  } catch (e) {
    if (e instanceof Error && e.message === "Failed to upsert month budget") {
      throw e;
    }
    console.error("Unexpected error in upsertMonthBudget:", { userId, yearMonth, error: e });
    throw new Error("Failed to upsert month budget");
  }
}
