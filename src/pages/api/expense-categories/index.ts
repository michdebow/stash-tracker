import type { APIRoute } from "astro";
import type { ErrorResponse } from "@/types";
import { listExpenseCategories } from "@/lib/services/expense-category.service";

export const prerender = false;

/**
 * GET /api/expense-categories
 * Retrieves all expense categories available in the system.
 * Categories are system-wide and available to all users.
 * 
 * Returns:
 * - 200: List of expense categories
 * - 401: User not authenticated
 * - 500: Internal server error
 */
export const GET: APIRoute = async ({ locals }) => {
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

    // Fetch expense categories using the service
    const categories = await listExpenseCategories(locals.supabase);

    // Return success response
    return new Response(JSON.stringify({ data: categories }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("List expense categories endpoint error:", err);

    const errorResponse: ErrorResponse = {
      error: "Internal server error",
      message: "Unable to retrieve expense categories. Please try again later.",
    };

    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
