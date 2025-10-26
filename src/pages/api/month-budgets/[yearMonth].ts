import type { APIRoute } from "astro";
import { z } from "zod";
import type { ErrorResponse, ValidationErrorResponse } from "@/types";
import { upsertMonthBudget, getBudgetByYearMonth } from "@/lib/services/budget.service";

export const prerender = false;

/**
 * Zod schema for validating the yearMonth path parameter
 * Format: YYYY-MM with valid month range (01-12)
 */
const YearMonthParamSchema = z
  .string()
  .regex(/^\d{4}-\d{2}$/, "Invalid year-month format. Expected YYYY-MM")
  .refine(
    (value) => {
      const month = Number(value.slice(5, 7));
      return month >= 1 && month <= 12;
    },
    { message: "Invalid month. Month must be between 01 and 12" }
  );

/**
 * Zod schema for validating the request body
 * Requires a positive budget_set value
 */
const UpsertBudgetBodySchema = z.object({
  budget_set: z.coerce
    .number({
      required_error: "budget_set is required",
      invalid_type_error: "budget_set must be a number",
    })
    .positive("budget_set must be greater than 0"),
});

/**
 * GET /api/month-budgets/{yearMonth}
 * Retrieves a specific monthly budget for the authenticated user.
 *
 * Path Parameters:
 * - yearMonth: string (YYYY-MM format, month must be 01-12)
 *
 * Returns:
 * - 200 OK: Budget found
 * - 404 Not Found: No budget exists for this month
 * - 401 Unauthorized: User not authenticated
 * - 422 Unprocessable Entity: Invalid yearMonth format
 * - 500 Internal Server Error: Unexpected error
 */
export const GET: APIRoute = async ({ params, locals }) => {
  try {
    // Guard: Check authentication
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

    // Validate path parameter (yearMonth)
    const yearMonthValidation = YearMonthParamSchema.safeParse(params.yearMonth);

    if (!yearMonthValidation.success) {
      const errors: Record<string, string[]> = {};
      yearMonthValidation.error.errors.forEach((err) => {
        const path = "yearMonth";
        if (!errors[path]) {
          errors[path] = [];
        }
        errors[path].push(err.message);
      });

      const errorResponse: ValidationErrorResponse = {
        error: "Validation failed",
        message: "Invalid year-month parameter",
        errors,
      };

      return new Response(JSON.stringify(errorResponse), {
        status: 422,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Call service to get the budget
    const budget = await getBudgetByYearMonth(
      locals.supabase,
      locals.user.id,
      yearMonthValidation.data
    );

    if (!budget) {
      const errorResponse: ErrorResponse = {
        error: "Not Found",
        message: "No budget found for this month",
      };

      return new Response(JSON.stringify(errorResponse), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ data: budget }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Get month budget endpoint error:", err);

    const errorResponse: ErrorResponse = {
      error: "Internal server error",
      message: "Unable to retrieve month budget. Please try again later.",
    };

    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};

/**
 * PUT /api/month-budgets/{yearMonth}
 * Creates or updates a monthly budget for the authenticated user.
 *
 * Path Parameters:
 * - yearMonth: string (YYYY-MM format, month must be 01-12)
 *
 * Request Body:
 * - budget_set: number (positive, > 0)
 *
 * Returns:
 * - 201 Created: Budget was created (first time for this month)
 * - 200 OK: Budget was updated (already existed)
 * - 400 Bad Request: Invalid request body
 * - 401 Unauthorized: User not authenticated
 * - 422 Unprocessable Entity: Invalid yearMonth format
 * - 500 Internal Server Error: Unexpected error
 */
export const PUT: APIRoute = async ({ params, request, locals }) => {
  try {
    // Guard: Check authentication
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

    // Validate path parameter (yearMonth)
    const yearMonthValidation = YearMonthParamSchema.safeParse(params.yearMonth);

    if (!yearMonthValidation.success) {
      const errors: Record<string, string[]> = {};
      yearMonthValidation.error.errors.forEach((err) => {
        const path = "yearMonth";
        if (!errors[path]) {
          errors[path] = [];
        }
        errors[path].push(err.message);
      });

      const errorResponse: ValidationErrorResponse = {
        error: "Validation failed",
        message: "Invalid year-month parameter",
        errors,
      };

      return new Response(JSON.stringify(errorResponse), {
        status: 422,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Parse and validate request body
    let body;
    try {
      body = await request.json();
    } catch {
      const errorResponse: ErrorResponse = {
        error: "Bad Request",
        message: "Invalid JSON body",
      };

      return new Response(JSON.stringify(errorResponse), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const bodyValidation = UpsertBudgetBodySchema.safeParse(body);

    if (!bodyValidation.success) {
      const errors: Record<string, string[]> = {};
      bodyValidation.error.errors.forEach((err) => {
        const path = err.path.join(".") || "body";
        if (!errors[path]) {
          errors[path] = [];
        }
        errors[path].push(err.message);
      });

      const errorResponse: ValidationErrorResponse = {
        error: "Validation failed",
        message: "Invalid request body",
        errors,
      };

      return new Response(JSON.stringify(errorResponse), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Call service to upsert the budget
    const result = await upsertMonthBudget(
      locals.supabase,
      locals.user.id,
      yearMonthValidation.data,
      bodyValidation.data
    );

    // Return appropriate status code based on whether it was created or updated
    const statusCode = result.created ? 201 : 200;

    return new Response(JSON.stringify({ data: result.item }), {
      status: statusCode,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Upsert month budget endpoint error:", err);

    const errorResponse: ErrorResponse = {
      error: "Internal server error",
      message: "Unable to upsert month budget. Please try again later.",
    };

    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
