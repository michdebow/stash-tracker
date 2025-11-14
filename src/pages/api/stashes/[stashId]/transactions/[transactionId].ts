import type { APIRoute } from "astro";
import { z } from "zod";
import type { ErrorResponse, ValidationErrorResponse } from "@/types";
import { softDeleteTransaction, TransactionNotFoundError } from "@/lib/services/transaction.service";

export const prerender = false;

/**
 * Zod schema for validating the stashId path parameter
 */
const StashIdParamSchema = z.string().uuid("Invalid stash ID format");

/**
 * Zod schema for validating the transactionId path parameter
 */
const TransactionIdParamSchema = z.string().uuid("Invalid transaction ID format");

/**
 * DELETE /api/stashes/{stashId}/transactions/{transactionId}
 * Soft-deletes a specific transaction by setting its deleted_at timestamp.
 * This action reverses the transaction's impact on the stash balance.
 *
 * Path Parameters:
 * - stashId: string (UUID) - The unique identifier of the stash
 * - transactionId: string (UUID) - The unique identifier of the transaction to delete
 *
 * Returns:
 * - 204: Transaction deleted successfully (no content)
 * - 400: Invalid path parameters
 * - 401: User not authenticated
 * - 404: Transaction not found or doesn't belong to user
 * - 500: Internal server error
 */
export const DELETE: APIRoute = async ({ params, locals }) => {
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

    // Validate stashId path parameter
    const stashIdValidation = StashIdParamSchema.safeParse(params.stashId);

    if (!stashIdValidation.success) {
      const errors: Record<string, string[]> = {};
      stashIdValidation.error.errors.forEach((err) => {
        errors["stashId"] = [err.message];
      });

      const errorResponse: ValidationErrorResponse = {
        error: "Validation failed",
        message: "Invalid stash ID",
        errors,
      };

      return new Response(JSON.stringify(errorResponse), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Validate transactionId path parameter
    const transactionIdValidation = TransactionIdParamSchema.safeParse(params.transactionId);

    if (!transactionIdValidation.success) {
      const errors: Record<string, string[]> = {};
      transactionIdValidation.error.errors.forEach((err) => {
        errors["transactionId"] = [err.message];
      });

      const errorResponse: ValidationErrorResponse = {
        error: "Validation failed",
        message: "Invalid transaction ID",
        errors,
      };

      return new Response(JSON.stringify(errorResponse), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Soft-delete the transaction using the service
    await softDeleteTransaction(locals.supabase, locals.user.id, stashIdValidation.data, transactionIdValidation.data);

    // Return success response with 204 No Content
    return new Response(null, {
      status: 204,
    });
  } catch (err) {
    // Handle transaction not found error
    if (err instanceof TransactionNotFoundError) {
      const errorResponse: ErrorResponse = {
        error: "Not Found",
        message: err.message,
      };

      return new Response(JSON.stringify(errorResponse), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Handle unexpected errors
    console.error("Delete transaction endpoint error:", err);

    const errorResponse: ErrorResponse = {
      error: "Internal server error",
      message: "Unable to delete transaction. Please try again later.",
    };

    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
