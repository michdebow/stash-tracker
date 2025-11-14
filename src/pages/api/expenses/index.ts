import type { APIRoute } from "astro";
import { z } from "zod";
import { ListExpensesQuerySchema } from "@/types";
import type { ErrorResponse, ValidationErrorResponse } from "@/types";
import { listExpenses, createExpense, CategoryNotFoundError } from "@/lib/services/expense.service";

export const prerender = false;

/**
 * Zod schema for validating the Create Expense request body.
 */
const CreateExpenseDto = z.object({
  category_id: z.string().uuid("Invalid category ID format").optional(),
  amount: z
    .number()
    .positive("Amount must be greater than 0")
    .refine((n) => Number.isInteger(n * 100), "Amount must have at most 2 decimal places"),
  expense_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format. Use YYYY-MM-DD")
    .refine((dateStr) => {
      const date = new Date(dateStr);
      return !isNaN(date.getTime()) && dateStr === date.toISOString().split("T")[0];
    }, "Invalid date value"),
  description: z.string().trim().min(1, "Description is required").max(500, "Description cannot exceed 500 characters"),
});

/**
 * GET /api/expenses
 * Retrieves a paginated and filterable list of expenses for the authenticated user.
 *
 * Query Parameters:
 * - page: number (default: 1) - The page number to retrieve
 * - limit: number (default: 20, max: 100) - The number of items per page
 * - from: string (YYYY-MM-DD) - Filter expenses from this date (inclusive)
 * - to: string (YYYY-MM-DD) - Filter expenses to this date (inclusive)
 * - categoryId: string (UUID) - Filter by expense category
 * - yearMonth: string (YYYY-MM) - Filter by year-month (mutually exclusive with from/to)
 * - search: string (1-200 chars) - Search in expense descriptions
 * - sort: 'expense_date' | 'amount' (default: 'expense_date') - The field to sort by
 * - order: 'asc' | 'desc' (default: 'desc') - The sort order
 *
 * Returns:
 * - 200: Paginated list of expenses
 * - 400: Invalid query parameters
 * - 401: User not authenticated
 * - 500: Internal server error
 */
export const GET: APIRoute = async ({ url, locals }) => {
  try {
    // Check authentication
    if (!locals.user) {
      const errorResponse: ErrorResponse = {
        error: "Unauthorized",
        message: "You must be logged in to access this resource.",
      };

      return new Response(JSON.stringify(errorResponse), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Parse and validate query parameters
    const queryParams = {
      page: url.searchParams.get("page") || undefined,
      limit: url.searchParams.get("limit") || undefined,
      from: url.searchParams.get("from") || undefined,
      to: url.searchParams.get("to") || undefined,
      categoryId: url.searchParams.get("categoryId") || undefined,
      yearMonth: url.searchParams.get("yearMonth") || undefined,
      search: url.searchParams.get("search") || undefined,
      sort: url.searchParams.get("sort") || undefined,
      order: url.searchParams.get("order") || undefined,
    };

    const validation = ListExpensesQuerySchema.safeParse(queryParams);

    if (!validation.success) {
      const errors: Record<string, string[]> = {};
      validation.error.errors.forEach((err) => {
        const path = err.path.join(".");
        if (!errors[path]) {
          errors[path] = [];
        }
        errors[path].push(err.message);
      });

      const errorResponse: ValidationErrorResponse = {
        error: "Validation failed",
        message: "Invalid query parameters",
        errors,
      };

      return new Response(JSON.stringify(errorResponse), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Fetch expenses using the service
    const result = await listExpenses(locals.supabase, locals.user.id, validation.data);

    // Return success response
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("List expenses endpoint error:", err);

    const errorResponse: ErrorResponse = {
      error: "Internal server error",
      message: "Unable to retrieve expenses. Please try again later.",
    };

    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};

/**
 * POST /api/expenses
 * Creates a new expense for the authenticated user.
 *
 * Request Body:
 * - description: string (required, max 500 chars) - What the expense was for
 * - amount: number (positive, max 2 decimal places) - The expense amount
 * - expense_date: string (YYYY-MM-DD) - The date of the expense
 * - category_id: string (UUID, optional) - The expense category ID
 *
 * Returns:
 * - 201: Expense created successfully
 * - 400: Invalid request body or validation errors
 * - 401: User not authenticated
 * - 404: Category not found
 * - 422: Unprocessable entity (domain validation failed)
 * - 500: Internal server error
 */
export const POST: APIRoute = async ({ request, locals }) => {
  try {
    // Check authentication
    if (!locals.user) {
      const errorResponse: ErrorResponse = {
        error: "Unauthorized",
        message: "You must be logged in to create an expense.",
      };

      return new Response(JSON.stringify(errorResponse), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Parse request body
    let body;

    //prettier-ignore
    try {
      body = await request.json();
    }
     
    catch (parseError) {
      const errorResponse: ErrorResponse = {
        error: "Bad Request",
        message: "Invalid JSON in request body.",
      };

      return new Response(JSON.stringify(errorResponse), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Validate request body
    const validation = CreateExpenseDto.safeParse(body);

    if (!validation.success) {
      const errors: Record<string, string[]> = {};
      validation.error.errors.forEach((err) => {
        const path = err.path.join(".");
        if (!errors[path]) {
          errors[path] = [];
        }
        errors[path].push(err.message);
      });

      // Check if the error is specifically about amount being non-positive (domain rule)
      const hasAmountError = validation.error.errors.some(
        (err) => err.path.includes("amount") && err.message.includes("greater than 0")
      );

      const errorResponse: ValidationErrorResponse = {
        error: "Validation failed",
        message: "Invalid request body",
        errors,
      };

      return new Response(JSON.stringify(errorResponse), {
        status: hasAmountError ? 422 : 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Create the expense using the service
    const expense = await createExpense(locals.supabase, locals.user.id, validation.data);

    // Return success response
    return new Response(JSON.stringify({ data: expense }), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    // Handle CategoryNotFoundError
    if (err instanceof CategoryNotFoundError) {
      const errorResponse: ErrorResponse = {
        error: "Not Found",
        message: err.message,
      };

      return new Response(JSON.stringify(errorResponse), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Handle validation errors from service (e.g., constraint violations)
    if (err instanceof Error && err.message.includes("Validation failed")) {
      const errorResponse: ErrorResponse = {
        error: "Unprocessable Entity",
        message: err.message,
      };

      return new Response(JSON.stringify(errorResponse), {
        status: 422,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Log and handle unexpected errors
    console.error("Create expense endpoint error:", err);

    const errorResponse: ErrorResponse = {
      error: "Internal server error",
      message: "Unable to create expense. Please try again later.",
    };

    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
