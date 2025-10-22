import type { APIRoute } from "astro";
import { z } from "zod";
import { ListTransactionsQuerySchema } from "@/types";
import type { ErrorResponse, ValidationErrorResponse, CreateStashTransactionCommand } from "@/types";
import { listStashTransactions, createTransaction, StashNotFoundError, InsufficientBalanceError } from "@/lib/services/transaction.service";

export const prerender = false;

/**
 * Zod schema for validating the stashId path parameter
 */
const StashIdParamSchema = z.string().uuid("Invalid stash ID format");

/**
 * Zod schema for validating the request body when creating a transaction
 * 
 * Validation rules:
 * - transaction_type: Must be either 'deposit' or 'withdrawal'
 * - amount: Must be a positive number (database stores as numeric(12,2))
 * - description: Optional text field for transaction notes
 */
const CreateTransactionDto = z.object({
  transaction_type: z.enum(['deposit', 'withdrawal'], {
    errorMap: () => ({ message: "Transaction type must be either 'deposit' or 'withdrawal'" })
  }),
  amount: z
    .number({
      required_error: "Amount is required",
      invalid_type_error: "Amount must be a number"
    })
    .positive("Amount must be greater than zero")
    .finite("Amount must be a finite number"),
  description: z.string().max(1000, "Description cannot exceed 1000 characters").optional(),
});

/**
 * GET /api/stashes/{stashId}/transactions
 * Retrieves a paginated and filterable list of transactions for a specific stash.
 * 
 * Path Parameters:
 * - stashId: string (UUID) - The unique identifier of the stash
 * 
 * Query Parameters:
 * - page: number (default: 1) - The page number to retrieve
 * - limit: number (default: 20, max: 100) - The number of items per page
 * - type: 'deposit' | 'withdrawal' (optional) - Filter by transaction type
 * - from: string (ISO 8601, optional) - Start date for filtering (inclusive)
 * - to: string (ISO 8601, optional) - End date for filtering (inclusive)
 * - order: 'asc' | 'desc' (default: 'desc') - Sort order by created_at
 * 
 * Returns:
 * - 200: Paginated list of transactions
 * - 400: Invalid path or query parameters
 * - 401: User not authenticated
 * - 404: Stash not found or doesn't belong to user
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

    // Parse and validate query parameters
    const queryParams = {
      page: url.searchParams.get("page") || undefined,
      limit: url.searchParams.get("limit") || undefined,
      type: url.searchParams.get("type") || undefined,
      from: url.searchParams.get("from") || undefined,
      to: url.searchParams.get("to") || undefined,
      order: url.searchParams.get("order") || undefined,
    };

    const queryValidation = ListTransactionsQuerySchema.safeParse(queryParams);

    if (!queryValidation.success) {
      const errors: Record<string, string[]> = {};
      queryValidation.error.errors.forEach((err) => {
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

    // Fetch transactions using the service
    const result = await listStashTransactions(
      locals.supabase,
      locals.user.id,
      stashIdValidation.data,
      queryValidation.data
    );

    // Return success response
    return new Response(JSON.stringify(result), {
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
    console.error("List transactions endpoint error:", err);

    const errorResponse: ErrorResponse = {
      error: "Internal server error",
      message: "Unable to retrieve transactions. Please try again later.",
    };

    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};

/**
 * POST /api/stashes/{stashId}/transactions
 * Creates a new transaction (deposit or withdrawal) for a specific stash.
 * 
 * Path Parameters:
 * - stashId: string (UUID) - The unique identifier of the stash
 * 
 * Request Body:
 * - transaction_type: 'deposit' | 'withdrawal' (required) - The type of transaction
 * - amount: number (required) - The transaction amount (must be positive)
 * - description: string (optional) - An optional note for the transaction
 * 
 * Returns:
 * - 201: Transaction created successfully
 * - 400: Invalid path parameter or request body
 * - 401: User not authenticated
 * - 403: Insufficient balance for withdrawal
 * - 404: Stash not found or doesn't belong to user
 * - 500: Internal server error
 */
export const POST: APIRoute = async ({ params, request, locals }) => {
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

    // Parse request body
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

    // Validate request body
    const bodyValidation = CreateTransactionDto.safeParse(requestBody);

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

    // Create the transaction using the service
    const transaction = await createTransaction(
      locals.supabase,
      locals.user.id,
      stashIdValidation.data,
      bodyValidation.data as CreateStashTransactionCommand
    );

    // Return success response with 201 Created
    return new Response(JSON.stringify(transaction), {
      status: 201,
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

    // Handle insufficient balance error
    if (err instanceof InsufficientBalanceError) {
      const errorResponse: ErrorResponse = {
        error: "Forbidden",
        message: err.message,
      };

      return new Response(JSON.stringify(errorResponse), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Handle unexpected errors
    console.error("Create transaction endpoint error:", err);

    const errorResponse: ErrorResponse = {
      error: "Internal server error",
      message: "Unable to create transaction. Please try again later.",
    };

    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
