import type { APIRoute } from "astro";
import { z } from "zod";
import type { ErrorResponse, ValidationErrorResponse } from "@/types";
import { updateExpense, softDeleteExpense, ExpenseNotFoundError, CategoryNotFoundError } from "@/lib/services/expense.service";

export const prerender = false;

/**
 * Zod schema for validating the Update Expense request body.
 * All fields are optional, but at least one must be provided.
 */
const UpdateExpenseDto = z.object({
  category_id: z.string().uuid("Invalid category ID format").nullable().optional(),
  amount: z
    .number()
    .positive("Amount must be greater than 0")
    .refine(
      (n) => Number.isInteger(n * 100),
      "Amount must have at most 2 decimal places"
    )
    .optional(),
  expense_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format. Use YYYY-MM-DD")
    .refine(
      (dateStr) => {
        const date = new Date(dateStr);
        return !isNaN(date.getTime()) && dateStr === date.toISOString().split("T")[0];
      },
      "Invalid date value"
    )
    .optional(),
  description: z
    .string()
    .trim()
    .max(500, "Description cannot exceed 500 characters")
    .nullable()
    .optional(),
}).refine(
  (data) => {
    // At least one field must be provided
    const keys = Object.keys(data);
    return keys.length > 0 && Object.values(data).some((value) => value !== undefined);
  },
  {
    message: "At least one updatable field must be provided",
  }
);

/**
 * PATCH /api/expenses/{expenseId}
 * Updates an existing expense for the authenticated user.
 * Allows partial updates of category_id, amount, expense_date, and description.
 * 
 * Path Parameters:
 * - expenseId: string (UUID) - The ID of the expense to update
 * 
 * Request Body (at least one required):
 * - category_id: string (UUID) - The expense category ID
 * - amount: number (positive, max 2 decimal places) - The expense amount
 * - expense_date: string (YYYY-MM-DD) - The date of the expense
 * - description: string | null (max 500 chars) - Additional details about the expense
 * 
 * Returns:
 * - 200: Expense updated successfully
 * - 400: Invalid request body, path parameter, or validation errors
 * - 401: User not authenticated
 * - 404: Expense or category not found
 * - 422: Unprocessable entity (domain validation failed)
 * - 500: Internal server error
 */
export const PATCH: APIRoute = async ({ params, request, locals }) => {
  try {
    // Check authentication
    if (!locals.user) {
      const errorResponse: ErrorResponse = {
        error: "Unauthorized",
        message: "You must be logged in to update an expense.",
      };

      return new Response(JSON.stringify(errorResponse), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Validate expenseId path parameter
    const expenseId = params.expenseId;
    const expenseIdValidation = z.string().uuid("Invalid expense ID format").safeParse(expenseId);

    if (!expenseIdValidation.success) {
      const errorResponse: ErrorResponse = {
        error: "Bad Request",
        message: "Invalid expense ID format",
      };

      return new Response(JSON.stringify(errorResponse), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Parse request body
    let body;
    try {
      body = await request.json();
    } catch (parseError) {
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
    const validation = UpdateExpenseDto.safeParse(body);

    if (!validation.success) {
      const errors: Record<string, string[]> = {};
      validation.error.errors.forEach((err) => {
        const path = err.path.join(".") || "body";
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

    // Update the expense using the service
    const expense = await updateExpense(
      locals.supabase,
      locals.user.id,
      expenseIdValidation.data,
      validation.data
    );

    // Return success response
    return new Response(JSON.stringify({ data: expense }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    // Handle ExpenseNotFoundError
    if (err instanceof ExpenseNotFoundError) {
      const errorResponse: ErrorResponse = {
        error: "Not Found",
        message: err.message,
      };

      return new Response(JSON.stringify(errorResponse), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

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
    console.error("Update expense endpoint error:", err);

    const errorResponse: ErrorResponse = {
      error: "Internal server error",
      message: "Unable to update expense. Please try again later.",
    };

    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};

/**
 * DELETE /api/expenses/{expenseId}
 * Soft-deletes an expense for the authenticated user.
 * Sets the deleted_at timestamp and triggers automatic recalculation of month_budget.current_balance.
 * 
 * Path Parameters:
 * - expenseId: string (UUID) - The ID of the expense to delete
 * 
 * Returns:
 * - 204: Expense deleted successfully (no content)
 * - 400: Invalid expense ID format
 * - 401: User not authenticated
 * - 404: Expense not found, already deleted, or doesn't belong to user
 * - 500: Internal server error
 */
export const DELETE: APIRoute = async ({ params, locals }) => {
  try {
    // Check authentication
    if (!locals.user) {
      const errorResponse: ErrorResponse = {
        error: "Unauthorized",
        message: "You must be logged in to delete an expense.",
      };

      return new Response(JSON.stringify(errorResponse), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Validate expenseId path parameter
    const expenseId = params.expenseId;
    const expenseIdValidation = z.string().uuid("Invalid expense ID format").safeParse(expenseId);

    if (!expenseIdValidation.success) {
      const errors: Record<string, string[]> = {};
      expenseIdValidation.error.errors.forEach((err) => {
        errors.expenseId = [err.message];
      });

      const errorResponse: ValidationErrorResponse = {
        error: "Bad Request",
        message: "Invalid expense ID format",
        errors,
      };

      return new Response(JSON.stringify(errorResponse), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Soft-delete the expense using the service
    await softDeleteExpense(
      locals.supabase,
      locals.user.id,
      expenseIdValidation.data
    );

    // Return 204 No Content on success
    return new Response(null, {
      status: 204,
    });
  } catch (err) {
    // Handle ExpenseNotFoundError
    if (err instanceof ExpenseNotFoundError) {
      const errorResponse: ErrorResponse = {
        error: "Not Found",
        message: err.message,
      };

      return new Response(JSON.stringify(errorResponse), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Log and handle unexpected errors
    console.error("Delete expense endpoint error:", err);

    const errorResponse: ErrorResponse = {
      error: "Internal server error",
      message: "Unable to delete expense. Please try again later.",
    };

    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
