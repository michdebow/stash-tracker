import type { SupabaseClient } from "@/db/supabase.client";
import type {
  ListExpensesQuery,
  ExpenseListItemDTO,
  ApiPaginatedResponse,
  CreateExpenseCommand,
  UpdateExpenseCommand,
} from "@/types";

/**
 * Custom error thrown when a referenced expense category does not exist.
 */
export class CategoryNotFoundError extends Error {
  name = "CategoryNotFoundError";

  constructor(message = "Expense category not found") {
    super(message);
  }
}

/**
 * Custom error thrown when a referenced expense does not exist or doesn't belong to the user.
 */
export class ExpenseNotFoundError extends Error {
  name = "ExpenseNotFoundError";

  constructor(message = "Expense not found") {
    super(message);
  }
}

/**
 * Retrieves a paginated and filterable list of expenses for a user.
 *
 * @param supabase - The Supabase client instance
 * @param userId - The authenticated user's ID
 * @param query - Query parameters for pagination, filtering, and sorting
 * @returns Paginated response containing expenses and pagination metadata
 * @throws Error if the database query fails
 */
export async function listExpenses(
  supabase: SupabaseClient,
  userId: string,
  query: ListExpensesQuery
): Promise<ApiPaginatedResponse<ExpenseListItemDTO>> {
  const { page, limit, from, to, categoryId, yearMonth, search, sort, order } = query;

  // Calculate offset for pagination
  const offset = (page - 1) * limit;

  // Build the base query with required filters
  let queryBuilder = supabase
    .from("expenses")
    .select("id, category_id, amount, expense_date, year_month, description, created_at", { count: "exact" })
    .eq("user_id", userId)
    .is("deleted_at", null);

  // Apply optional filters
  if (categoryId) {
    queryBuilder = queryBuilder.eq("category_id", categoryId);
  }

  // Apply date filtering (mutually exclusive with yearMonth)
  if (yearMonth) {
    queryBuilder = queryBuilder.eq("year_month", yearMonth);
  } else {
    if (from) {
      queryBuilder = queryBuilder.gte("expense_date", from);
    }
    if (to) {
      queryBuilder = queryBuilder.lte("expense_date", to);
    }
  }

  // Apply search filter on description
  if (search) {
    queryBuilder = queryBuilder.ilike("description", `%${search}%`);
  }

  // Apply primary sorting
  queryBuilder = queryBuilder.order(sort, { ascending: order === "asc" });

  // Apply secondary sorting by created_at for stable pagination
  queryBuilder = queryBuilder.order("created_at", { ascending: false });

  // Apply pagination
  queryBuilder = queryBuilder.range(offset, offset + limit - 1);

  // Execute the query
  const { data, error, count } = await queryBuilder;

  if (error) {
    console.error("Error fetching expenses:", error);
    throw new Error("Failed to fetch expenses");
  }

  // Return formatted response
  return {
    data: data || [],
    pagination: {
      page,
      limit,
      total: count || 0,
    },
  };
}

/**
 * Creates a new expense for a user.
 *
 * @param supabase - The Supabase client instance
 * @param userId - The authenticated user's ID
 * @param command - The expense creation command containing amount, expense_date, description, and optional category_id
 * @returns The newly created expense
 * @throws CategoryNotFoundError if the specified category does not exist (when category_id is provided)
 * @throws Error if the database operation fails or validation constraints are violated
 */
export async function createExpense(
  supabase: SupabaseClient,
  userId: string,
  command: CreateExpenseCommand
): Promise<ExpenseListItemDTO> {
  // Pre-check: Verify that the category exists (only if category_id is provided)
  if (command.category_id) {
    const { data: category, error: categoryError } = await supabase
      .from("expense_categories")
      .select("id")
      .eq("id", command.category_id)
      .single();

    if (categoryError || !category) {
      console.error("createExpense service error: Category not found", {
        categoryId: command.category_id,
        error: categoryError,
      });
      throw new CategoryNotFoundError(`Category with ID ${command.category_id} does not exist`);
    }
  }

  // Insert the new expense
  const { data, error } = await supabase
    .from("expenses")
    .insert({
      user_id: userId,
      category_id: command.category_id ?? null,
      amount: command.amount,
      expense_date: command.expense_date,
      description: command.description,
    })
    .select("id, category_id, amount, expense_date, year_month, description, created_at")
    .single();

  if (error) {
    console.error("createExpense service error:", error);

    // Map specific PostgreSQL error codes to custom errors
    if (error.code === "23503") {
      // Foreign key violation (fallback if pre-check somehow missed)
      throw new CategoryNotFoundError(`Category with ID ${command.category_id} does not exist`);
    }

    if (error.code === "23514") {
      // Check constraint violation (e.g., amount <= 0)
      throw new Error("Validation failed: Amount must be greater than 0");
    }

    // Generic error for other cases
    throw new Error("Failed to create expense");
  }

  if (!data) {
    throw new Error("Failed to create expense: No data returned");
  }

  return data;
}

/**
 * Updates an existing expense for a user.
 * Allows partial updates of category_id, amount, expense_date, and description.
 *
 * @param supabase - The Supabase client instance
 * @param userId - The authenticated user's ID
 * @param expenseId - The ID of the expense to update
 * @param command - The expense update command containing optional fields to update
 * @returns The updated expense
 * @throws ExpenseNotFoundError if the expense does not exist or doesn't belong to the user
 * @throws CategoryNotFoundError if the specified category does not exist (when category_id is provided)
 * @throws Error if the database operation fails or validation constraints are violated
 */
export async function updateExpense(
  supabase: SupabaseClient,
  userId: string,
  expenseId: string,
  command: UpdateExpenseCommand
): Promise<ExpenseListItemDTO> {
  // Pre-check: If category_id is being updated, verify it exists
  if (command.category_id) {
    const { data: category, error: categoryError } = await supabase
      .from("expense_categories")
      .select("id")
      .eq("id", command.category_id)
      .single();

    if (categoryError || !category) {
      console.error("updateExpense service error: Category not found", {
        categoryId: command.category_id,
        error: categoryError,
      });
      throw new CategoryNotFoundError(`Category with ID ${command.category_id} does not exist`);
    }
  }

  // Build the updates object with only provided fields
  const updates: Record<string, unknown> = {};

  if (command.category_id !== undefined) {
    updates.category_id = command.category_id;
  }
  if (command.amount !== undefined) {
    updates.amount = command.amount;
  }
  if (command.expense_date !== undefined) {
    updates.expense_date = command.expense_date;
  }
  if (command.description !== undefined) {
    updates.description = command.description;
  }

  // Update the expense
  const { data, error } = await supabase
    .from("expenses")
    .update(updates)
    .eq("id", expenseId)
    .eq("user_id", userId)
    .is("deleted_at", null)
    .select("id, category_id, amount, expense_date, year_month, description, created_at")
    .single();

  if (error) {
    console.error("updateExpense service error:", error);

    // Map specific PostgreSQL error codes to custom errors
    if (error.code === "23503") {
      // Foreign key violation (fallback if pre-check somehow missed)
      throw new CategoryNotFoundError(`Category with ID ${command.category_id} does not exist`);
    }

    if (error.code === "23514") {
      // Check constraint violation (e.g., amount <= 0)
      throw new Error("Validation failed: Amount must be greater than 0");
    }

    // Generic error for other cases
    throw new Error("Failed to update expense");
  }

  if (!data) {
    console.error("updateExpense service error: Expense not found", {
      expenseId,
      userId,
    });
    throw new ExpenseNotFoundError(`Expense with ID ${expenseId} does not exist`);
  }

  return data;
}

/**
 * Soft-deletes an expense for a user by setting the deleted_at timestamp.
 * The database trigger will automatically recalculate the month_budget.current_balance.
 *
 * @param supabase - The Supabase client instance
 * @param userId - The authenticated user's ID
 * @param expenseId - The ID of the expense to delete
 * @returns Promise that resolves when the expense is deleted
 * @throws ExpenseNotFoundError if the expense does not exist, doesn't belong to the user, or is already deleted
 * @throws Error if the database operation fails
 */
export async function softDeleteExpense(supabase: SupabaseClient, userId: string, expenseId: string): Promise<void> {
  const { data, error } = await supabase
    .from("expenses")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", expenseId)
    .eq("user_id", userId)
    .is("deleted_at", null)
    .select("id")
    .single();

  if (error) {
    console.error("softDeleteExpense service error:", {
      userId,
      expenseId,
      code: error.code,
      message: error.message,
    });

    // Handle PGRST116 error (no rows returned) as expense not found
    if (error.code === "PGRST116") {
      throw new ExpenseNotFoundError();
    }

    throw new Error("Failed to delete expense");
  }

  if (!data) {
    throw new ExpenseNotFoundError();
  }
}
