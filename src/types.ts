import type { Tables, TablesInsert, TablesUpdate } from "./db/database.types";
import { z } from "zod";

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
 * DTO for expense list item responses
 * Used by the GET /api/expenses endpoint for listing expenses
 */
export interface ExpenseListItemDTO {
  id: string;
  category_id: string | null;
  amount: number;
  expense_date: string;
  year_month: string;
  description: string;
  created_at: string;
}

/**
 * DTO for a single stash with optional recent transactions.
 * Used by the GET /api/stashes/{stashId} endpoint
 */
export interface StashDetailsDTO extends StashDTO {
  transactions?: StashTransactionDTO[];
}

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
 * Command to delete a stash
 * Contains stashId and userId for authorization
 */
export interface DeleteStashCommand {
  stashId: string;
  userId: string;
}

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
 * Requires amount, expense_date, description, and optional category_id
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

/**
 * Command to delete an expense
 * Contains expenseId and userId for authorization
 */
export interface DeleteExpenseCommand {
  expenseId: string;
  userId: string;
}

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
 * Zod schema for validating the query parameters of the List Stashes endpoint.
 */
export const ListStashesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.enum(["created_at", "name"]).default("created_at"),
  order: z.enum(["asc", "desc"]).default("desc"),
});

/**
 * Type derived from the Zod schema for use in the service layer.
 */
export type ListStashesQuery = z.infer<typeof ListStashesQuerySchema>;

/**
 * Zod schema for validating the query parameters of the List Stash Transactions endpoint.
 */
export const ListTransactionsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  type: z.enum(["deposit", "withdrawal"]).optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  order: z.enum(["asc", "desc"]).default("desc"),
});

/**
 * Type derived from the ListTransactionsQuerySchema for use in the service layer.
 */
export type ListTransactionsQuery = z.infer<typeof ListTransactionsQuerySchema>;

/**
 * Zod schema for validating the query parameters of the List Month Budgets endpoint.
 */
export const ListBudgetsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(60).default(12),
  year: z
    .string()
    .regex(/^\d{4}$/)
    .optional(),
  order: z.enum(["asc", "desc"]).default("desc"),
});

/**
 * Type derived from the ListBudgetsQuerySchema for use in the service layer.
 */
export type ListBudgetsQuery = z.infer<typeof ListBudgetsQuerySchema>;

/**
 * Zod schema for validating the query parameters of the List Expenses endpoint.
 * Includes mutual exclusivity validation between yearMonth and from/to filters.
 */
export const ListExpensesQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    from: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format. Use YYYY-MM-DD")
      .optional(),
    to: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format. Use YYYY-MM-DD")
      .optional(),
    categoryId: z.string().uuid("Invalid category ID format").optional(),
    yearMonth: z
      .string()
      .regex(/^\d{4}-\d{2}$/, "Invalid year-month format. Use YYYY-MM")
      .optional(),
    search: z.string().trim().min(1).max(200).optional(),
    sort: z.enum(["expense_date", "amount"]).default("expense_date"),
    order: z.enum(["asc", "desc"]).default("desc"),
  })
  .refine(
    (data) => {
      // yearMonth and from/to are mutually exclusive
      const hasYearMonth = !!data.yearMonth;
      const hasDateRange = !!data.from || !!data.to;
      return !(hasYearMonth && hasDateRange);
    },
    {
      message: "Cannot use yearMonth filter together with from/to date range",
      path: ["yearMonth"],
    }
  )
  .refine(
    (data) => {
      // If both from and to are provided, from must be <= to
      if (data.from && data.to) {
        return data.from <= data.to;
      }
      return true;
    },
    {
      message: "from date must be less than or equal to to date",
      path: ["from"],
    }
  );

/**
 * Type derived from the ListExpensesQuerySchema for use in the service layer.
 */
export type ListExpensesQuery = z.infer<typeof ListExpensesQuerySchema>;

/**
 * Zod schema for validating the request body of the Update Stash Name endpoint.
 */
export const UpdateStashNameDto = z.object({
  name: z.string().min(1, "Name cannot be empty.").max(100, "Name cannot exceed 100 characters."),
});

/**
 * DTO for the items in the stash list response.
 * Reuses the existing StashDTO.
 */
export type StashListItemDTO = StashDTO;

/**
 * DTO for the items in the month budgets list response.
 * Reuses the existing MonthBudgetDTO.
 */
export type MonthBudgetListItemDTO = MonthBudgetDTO;

/**
 * Standardized paginated API response structure.
 */
export interface ApiPaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
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

// ============================================================================
// Dashboard Types
// ============================================================================

/**
 * DTO for dashboard stash summary
 */
export interface DashboardStashSummary {
  totalStashes: number;
  totalBalance: number;
  stashes: StashDTO[];
}

/**
 * DTO for dashboard budget summary
 */
export interface DashboardBudgetSummary {
  yearMonth: string;
  budgetSet: number | null;
  totalExpenses: number;
  currentBalance: number | null;
  hasNoBudget: boolean;
}

/**
 * DTO for complete dashboard data
 */
export interface DashboardData {
  stashes: DashboardStashSummary;
  budget: DashboardBudgetSummary;
}
