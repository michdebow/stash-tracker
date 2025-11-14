import type { APIRoute } from "astro";
import { z } from "zod";
import { ListStashesQuerySchema } from "@/types";
import type { ErrorResponse, ValidationErrorResponse, StashDTO } from "@/types";
import { listStashes, createStash, DuplicateStashError } from "@/lib/services/stash.service";

export const prerender = false;

/**
 * Zod schema for validating the Create Stash request body
 */
const CreateStashDto = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name must be 100 characters or fewer"),
});

/**
 * GET /api/stashes
 * Retrieves a paginated and sortable list of active stashes for the authenticated user.
 *
 * Query Parameters:
 * - page: number (default: 1) - The page number to retrieve
 * - limit: number (default: 20, max: 100) - The number of items per page
 * - sort: 'created_at' | 'name' (default: 'created_at') - The field to sort by
 * - order: 'asc' | 'desc' (default: 'desc') - The sort order
 *
 * Returns:
 * - 200: Paginated list of stashes
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
      sort: url.searchParams.get("sort") || undefined,
      order: url.searchParams.get("order") || undefined,
    };

    const validation = ListStashesQuerySchema.safeParse(queryParams);

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

    // Fetch stashes using the service
    const result = await listStashes(locals.supabase, locals.user.id, validation.data);

    // Return success response
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("List stashes endpoint error:", err);

    const errorResponse: ErrorResponse = {
      error: "Internal server error",
      message: "Unable to retrieve stashes. Please try again later.",
    };

    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};

/**
 * POST /api/stashes
 * Creates a new stash for the authenticated user.
 *
 * Request Body:
 * - name: string (required, 1-100 characters) - The name of the stash
 *
 * Returns:
 * - 201: Successfully created stash
 * - 400: Invalid request body
 * - 401: User not authenticated
 * - 409: Stash with the same name already exists
 * - 500: Internal server error
 */
export const POST: APIRoute = async ({ request, locals }) => {
  try {
    // Check authentication
    if (!locals.user) {
      const errorResponse: ErrorResponse = {
        error: "Unauthorized",
        message: "You must be logged in to create a stash.",
      };

      return new Response(JSON.stringify(errorResponse), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Parse request body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      const errorResponse: ErrorResponse = {
        error: "Invalid JSON",
        message: "Request body must be valid JSON.",
      };

      return new Response(JSON.stringify(errorResponse), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Validate request body
    const validation = CreateStashDto.safeParse(body);

    if (!validation.success) {
      const errors: Record<string, string[]> = {};
      validation.error.errors.forEach((err) => {
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

    // Create the stash using the service
    const newStash = await createStash(locals.supabase, locals.user.id, validation.data);

    // Map to DTO (exclude user_id and deleted_at)
    const stashDto: StashDTO = {
      id: newStash.id,
      name: newStash.name,
      current_balance: newStash.current_balance,
      created_at: newStash.created_at,
      updated_at: newStash.updated_at,
    };

    // Return success response with 201 Created
    return new Response(JSON.stringify({ data: stashDto }), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    // Handle duplicate stash error
    if (err instanceof DuplicateStashError) {
      const errorResponse: ErrorResponse = {
        error: "Conflict",
        message: err.message,
      };

      return new Response(JSON.stringify(errorResponse), {
        status: 409,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Handle unexpected errors
    console.error("Create stash endpoint error:", err);

    const errorResponse: ErrorResponse = {
      error: "Internal server error",
      message: "Unable to create stash. Please try again later.",
    };

    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
