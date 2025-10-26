import type { APIRoute } from "astro";
import type { ErrorResponse, ValidationErrorResponse } from "@/types";
import { ListBudgetsQuerySchema } from "@/types";
import { listMonthBudgets } from "@/lib/services/budget.service";

export const prerender = false;

/**
 * GET /api/month-budgets
 * Provides a paginated list of monthly budgets for the authenticated user.
 *
 * Query Parameters:
 * - page: number (default: 1, min: 1)
 * - limit: number (default: 12, min: 1, max: 60)
 * - year: string (optional, format YYYY) - filters budgets by year
 * - order: 'asc' | 'desc' (default: 'desc') - applied to year_month
 *
 * Returns:
 * - 200: { data: MonthBudgetListItemDTO[], pagination: { page, limit, total } }
 * - 400: Invalid query parameters
 * - 401: User not authenticated
 * - 500: Internal server error
 */
export const GET: APIRoute = async ({ url, locals }) => {
  try {
    // Authentication check
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
      year: url.searchParams.get("year") || undefined,
      order: url.searchParams.get("order") || undefined,
    };

    const validation = ListBudgetsQuerySchema.safeParse(queryParams);

    if (!validation.success) {
      const errors: Record<string, string[]> = {};
      validation.error.errors.forEach((err) => {
        const path = err.path.join(".") || "query";
        if (!errors[path]) errors[path] = [];
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

    // Invoke service
    const result = await listMonthBudgets(locals.supabase, locals.user.id, validation.data);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("List month budgets endpoint error:", err);

    const errorResponse: ErrorResponse = {
      error: "Internal server error",
      message: "Unable to retrieve month budgets. Please try again later.",
    };

    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
