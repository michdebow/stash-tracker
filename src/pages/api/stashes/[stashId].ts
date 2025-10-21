import type { APIRoute } from "astro";
import { z } from "zod";
import type { ErrorResponse, ValidationErrorResponse, StashDTO } from "@/types";
import { UpdateStashNameDto } from "@/types";
import { getStashDetails, updateStashName, deleteStash, StashNotFoundError, DuplicateStashError, DatabaseConstraintError } from "@/lib/services/stash.service";

export const prerender = false;

/**
 * Zod schema for validating the GET request parameters
 */
const GetStashParamsSchema = z.object({
  stashId: z.string().uuid("Invalid stash ID format"),
  includeTransactions: z
    .string()
    .optional()
    .transform((val) => val === "true")
    .pipe(z.boolean())
    .default(false as never),
});

/**
 * GET /api/stashes/{stashId}
 * Retrieves detailed information for a specific stash belonging to the authenticated user.
 * 
 * Path Parameters:
 * - stashId: string (UUID) - The unique identifier of the stash
 * 
 * Query Parameters:
 * - includeTransactions: boolean (default: false) - Include 50 most recent transactions
 * 
 * Returns:
 * - 200: Stash details with optional transactions
 * - 400: Invalid stash ID format
 * - 401: User not authenticated
 * - 404: Stash not found
 * - 500: Internal server error
 */
export const GET: APIRoute = async ({ params, url, locals }) => {
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

    // Parse and validate parameters
    const includeTransactionsParam = url.searchParams.get("includeTransactions") || undefined;
    
    const validation = GetStashParamsSchema.safeParse({
      stashId: params.stashId,
      includeTransactions: includeTransactionsParam,
    });

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
        message: "Invalid request parameters",
        errors,
      };

      return new Response(JSON.stringify(errorResponse), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Fetch stash details using the service
    const stashDetails = await getStashDetails(
      locals.supabase,
      locals.user.id,
      validation.data.stashId,
      validation.data.includeTransactions
    );

    // Return success response
    return new Response(JSON.stringify({ data: stashDetails }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    // Handle stash not found error
    if (err instanceof StashNotFoundError) {
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
    console.error("Get stash details endpoint error:", err);

    const errorResponse: ErrorResponse = {
      error: "Internal server error",
      message: "Unable to retrieve stash details. Please try again later.",
    };

    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};

/**
 * PATCH /api/stashes/{stashId}
 * Updates the name of a specific stash belonging to the authenticated user.
 * 
 * Path Parameters:
 * - stashId: string (UUID) - The unique identifier of the stash
 * 
 * Request Body:
 * - name: string (1-100 characters) - The new name for the stash
 * 
 * Returns:
 * - 200: Updated stash data
 * - 400: Invalid stash ID format or validation error
 * - 401: User not authenticated
 * - 404: Stash not found
 * - 409: Duplicate stash name conflict
 * - 500: Internal server error
 */
export const PATCH: APIRoute = async ({ params, request, locals }) => {
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

    // Validate stashId parameter
    const stashIdValidation = z.string().uuid("Invalid stash ID format").safeParse(params.stashId);

    if (!stashIdValidation.success) {
      const errors: Record<string, string[]> = {
        stashId: [stashIdValidation.error.errors[0].message],
      };

      const errorResponse: ValidationErrorResponse = {
        error: "Validation failed",
        message: "Invalid stash ID format",
        errors,
      };

      return new Response(JSON.stringify(errorResponse), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Parse and validate request body
    let requestBody: unknown;
    try {
      requestBody = await request.json();
    } catch {
      const errorResponse: ErrorResponse = {
        error: "Bad Request",
        message: "Invalid JSON in request body",
      };

      return new Response(JSON.stringify(errorResponse), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const bodyValidation = UpdateStashNameDto.safeParse(requestBody);

    if (!bodyValidation.success) {
      const errors: Record<string, string[]> = {};
      bodyValidation.error.errors.forEach((err) => {
        const path = err.path.join(".");
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

    // Update the stash name using the service
    const updatedStash = await updateStashName(
      locals.supabase,
      locals.user.id,
      stashIdValidation.data,
      bodyValidation.data.name
    );

    // Transform to DTO (exclude internal fields)
    const stashDTO: StashDTO = {
      id: updatedStash.id,
      name: updatedStash.name,
      current_balance: updatedStash.current_balance,
      created_at: updatedStash.created_at,
      updated_at: updatedStash.updated_at,
    };

    // Return success response
    return new Response(JSON.stringify({ data: stashDTO }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    // Handle stash not found error
    if (err instanceof StashNotFoundError) {
      const errorResponse: ErrorResponse = {
        error: "Not Found",
        message: err.message,
      };

      return new Response(JSON.stringify(errorResponse), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Handle duplicate stash name error
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
    console.error("Update stash name endpoint error:", err);

    const errorResponse: ErrorResponse = {
      error: "Internal server error",
      message: "Unable to update stash name. Please try again later.",
    };

    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};

/**
 * DELETE /api/stashes/{stashId}
 * Soft-deletes a specific stash belonging to the authenticated user.
 * 
 * Path Parameters:
 * - stashId: string (UUID) - The unique identifier of the stash to delete
 * 
 * Returns:
 * - 204: Stash successfully deleted (no content)
 * - 400: Invalid stash ID format
 * - 401: User not authenticated
 * - 404: Stash not found
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

    // Validate stashId parameter
    const stashIdValidation = z.string().uuid("Invalid stash ID format").safeParse(params.stashId);

    if (!stashIdValidation.success) {
      const errors: Record<string, string[]> = {
        stashId: [stashIdValidation.error.errors[0].message],
      };

      const errorResponse: ValidationErrorResponse = {
        error: "Validation failed",
        message: "Invalid stash ID format",
        errors,
      };

      return new Response(JSON.stringify(errorResponse), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Delete the stash using the service
    await deleteStash(locals.supabase, {
      stashId: stashIdValidation.data,
      userId: locals.user.id,
    });

    // Return 204 No Content on success
    return new Response(null, {
      status: 204,
    });
  } catch (err) {
    // Handle stash not found error
    if (err instanceof StashNotFoundError) {
      const errorResponse: ErrorResponse = {
        error: "Not Found",
        message: err.message,
      };

      return new Response(JSON.stringify(errorResponse), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Handle database constraint violation error
    if (err instanceof DatabaseConstraintError) {
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
    console.error("Delete stash endpoint error:", err);

    const errorResponse: ErrorResponse = {
      error: "Internal server error",
      message: "Unable to delete stash. Please try again later.",
    };

    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
