import type { Tables, TablesInsert, TablesUpdate } from "./db/database.types";

// ============================================================================
// Entity Types (Direct references to database tables)
// ============================================================================

/**
 * Expense Category entity from database
 * Used for read-only category listings
 */
export type ExpenseCategory = Tables<"expense_categories">;

/**
 * Stash entity from database
 */
export type Stash = Tables<"stashes">;

/**
 * Stash Transaction entity from database
 */
export type StashTransaction = Tables<"stash_transactions">;

/**
 * Monthly Budget entity from database
 */
export type MonthBudget = Tables<"month_budget">;

/**
 * Expense entity from database
 */
export type Expense = Tables<"expenses">;

// ============================================================================
// Response DTOs (Data Transfer Objects)
// ============================================================================

/**
 * DTO for expense category responses
 * Exposes all fields as categories are read-only and not user-specific
 */
export type ExpenseCategoryDTO = ExpenseCategory;

/**
 * DTO for stash responses
 * Excludes internal fields (deleted_at, user_id)
 */
export type StashDTO = Omit<Stash, "deleted_at" | "user_id">;

/**
 * DTO for stash transaction responses
 * Excludes internal fields (deleted_at, user_id)
 */
export type StashTransactionDTO = Omit<StashTransaction, "deleted_at" | "user_id">;

/**
 * DTO for monthly budget responses
 * Excludes internal fields (deleted_at, user_id)
 */
export type MonthBudgetDTO = Omit<MonthBudget, "deleted_at" | "user_id">;

/**
 * DTO for expense responses
 * Excludes internal fields (deleted_at, user_id)
 */
export type ExpenseDTO = Omit<Expense, "deleted_at" | "user_id">;

/**
 * DTO for expense summary aggregation
 * Returns category-wise totals for a given month
 */
export interface ExpenseSummaryDTO {
  category_id: string;
  total: number;
}

// ============================================================================
// Command Models (Input payloads for mutations)
// ============================================================================

/**
 * Command to create a new stash
 * Only requires name; other fields are generated server-side
 */
export type CreateStashCommand = Pick<TablesInsert<"stashes">, "name">;

/**
 * Command to update an existing stash
 * Only allows renaming the stash
 */
export type UpdateStashCommand = Pick<TablesUpdate<"stashes">, "name">;

/**
 * Command to create a new stash transaction
 * Requires transaction_type, amount, and optional description
 * stash_id is derived from URL parameter
 */
export type CreateStashTransactionCommand = Pick<
  TablesInsert<"stash_transactions">,
  "transaction_type" | "amount" | "description"
>;

/**
 * Command to update an existing stash transaction
 * All fields are optional for partial updates
 */
export type UpdateStashTransactionCommand = Partial<
  Pick<TablesUpdate<"stash_transactions">, "transaction_type" | "amount" | "description">
>;

/**
 * Command to upsert a monthly budget
 * Only requires budget_set amount; year_month comes from URL
 */
export type UpsertBudgetCommand = Pick<TablesInsert<"month_budget">, "budget_set">;

/**
 * Command to create a new expense
 * Requires amount, category_id, expense_date, and optional description
 * year_month is auto-generated from expense_date
 */
export type CreateExpenseCommand = Pick<
  TablesInsert<"expenses">,
  "amount" | "category_id" | "expense_date" | "description"
>;

/**
 * Command to update an existing expense
 * All fields are optional for partial updates
 */
export type UpdateExpenseCommand = Partial<
  Pick<TablesUpdate<"expenses">, "amount" | "category_id" | "expense_date" | "description">
>;

// ============================================================================
// Pagination & Query Types
// ============================================================================

/**
 * Common pagination parameters for list endpoints
 */
export interface PaginationParams {
  page?: number;
  page_size?: number;
  sort?: string;
}

/**
 * Standardized paginated response wrapper
 * Used by all list endpoints that support pagination
 */
export interface PaginatedResponse<T> {
  data: T[];
  page: number;
  page_size: number;
  total: number;
}

/**
 * Query parameters for expense listing
 * Extends pagination with expense-specific filters
 */
export interface ExpenseQueryParams extends PaginationParams {
  year_month?: string;
  category_id?: string;
  date_from?: string;
  date_to?: string;
}

/**
 * Query parameters for stash transaction listing
 * Extends pagination with transaction-specific filters
 */
export interface StashTransactionQueryParams extends PaginationParams {
  type?: "deposit" | "withdrawal";
}

/**
 * Query parameters for budget listing
 */
export interface BudgetQueryParams {
  year_month?: string;
}

// ============================================================================
// Error Response Types
// ============================================================================

/**
 * Standardized error response structure
 */
export interface ErrorResponse {
  error: string;
  message?: string;
  details?: Record<string, unknown>;
}

/**
 * Validation error response with field-specific errors
 */
export interface ValidationErrorResponse extends ErrorResponse {
  errors: Record<string, string[]>;
}
