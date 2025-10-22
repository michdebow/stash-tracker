# API Endpoint Implementation Plan: List Stash Transactions

## 1. Endpoint Overview
This document outlines the implementation plan for the `GET /api/stashes/{stashId}/transactions` endpoint. Its purpose is to retrieve a paginated and filterable list of transactions associated with a specific stash, belonging to the authenticated user.

## 2. Request Details
- **HTTP Method**: `GET`
- **URL Structure**: `/api/stashes/{stashId}/transactions`
- **Parameters**:
  - **Path (Required)**:
    - `stashId` (string, UUID): The unique identifier for the stash.
  - **Query (Optional)**:
    - `page` (number): The page number for pagination. Defaults to `1`.
    - `limit` (number): The number of transactions per page. Defaults to `20`, max `100`.
    - `type` (string): Filter by transaction type. Enum: `deposit`, `withdrawal`.
    - `from` (string): The start date for the filter range (ISO 8601 format). Inclusive.
    - `to` (string): The end date for the filter range (ISO 8601 format). Inclusive.
    - `order` (string): The sorting order of transactions by creation date. Enum: `desc`, `asc`. Defaults to `desc`.

## 3. Used Types
- **`ListTransactionsQuerySchema` (Zod Schema)**: To be created for validating and parsing query parameters. It will handle defaults, type coercion (e.g., string to number), and constraints (e.g., `limit` max value).
- **`StashTransactionDto` (Type Alias)**: A frontend-facing representation of a transaction.
  ```typescript
  type StashTransactionDto = {
    id: string; // UUID
    transaction_type: 'deposit' | 'withdrawal';
    amount: number;
    description: string | null;
    created_at: string; // ISO Timestamp
  };
  ```
- **`PaginatedResponse<StashTransactionDto>` (Generic Type)**: The structure for the final JSON response.
  ```typescript
  type PaginatedResponse<T> = {
    data: T[];
    pagination: {
      page: number;
      limit: number;
      total: number;
    };
  };
  ```

## 4. Response Details
- **Success (200 OK)**: Returns a `PaginatedResponse<StashTransactionDto>` object.
  ```json
  {
    "data": [
      {
        "id": "...",
        "transaction_type": "deposit",
        "amount": 150.00,
        "description": "Monthly savings",
        "created_at": "2024-10-22T10:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 5
    }
  }
  ```
- **Error**: See the Error Handling section for details on `400`, `401`, `404`, and `500` responses.

## 5. Data Flow
1. A `GET` request is made to `/api/stashes/{stashId}/transactions`.
2. The Astro middleware verifies the user's authentication status via JWT from cookies. If unauthorized, it returns `401`.
3. The API route handler (`src/pages/api/stashes/[stashId]/transactions.ts`) receives the request.
4. The handler validates the `stashId` path parameter and all query parameters using the `ListTransactionsQuerySchema` (Zod).
5. If validation fails, a `400 Bad Request` is returned.
6. The handler calls the `listStashTransactions` method in the `TransactionService` (`src/lib/services/transaction.service.ts`), passing the validated parameters.
7. The `TransactionService` constructs a Supabase query to fetch transactions from the `stash_transactions` table.
   - It applies a `where` clause for `stash_id`.
   - It dynamically adds filters for `transaction_type`, `created_at` (using `gte` for `from` and `lte` for `to`).
   - It sets the `order` based on the `created_at` column.
   - It applies pagination using `.range()`.
   - The query automatically respects the RLS policy, ensuring the user can only access their own data.
8. The service also executes a separate `count` query with the same filters to get the total number of records for pagination.
9. The service formats the data into the `PaginatedResponse` structure and returns it to the route handler.
10. The route handler sends the `200 OK` response with the paginated data.

## 6. Security Considerations
- **Authentication**: Handled by Astro middleware, which should already be in place to protect API routes. It will verify the Supabase JWT from the request cookies.
- **Authorization**: Supabase Row Level Security (RLS) is the primary mechanism. An RLS policy must be active on the `stash_transactions` table to ensure that `auth.uid() = user_id`. This prevents users from accessing transactions of other users, even if they guess a valid `stashId`.
- **Input Validation**: All incoming path and query parameters will be strictly validated using Zod to prevent invalid data from being processed and to protect against potential injection attacks.

## 7. Error Handling
- **`400 Bad Request`**: Returned if Zod validation fails on any request parameter (e.g., invalid UUID format, `limit` out of range, invalid `type` enum).
- **`401 Unauthorized`**: Returned by the middleware if the user is not authenticated.
- **`404 Not Found`**: The `TransactionService` will first verify that the requested stash exists and belongs to the user. If not, it will throw a specific error that the handler will catch and convert to a `404` response. This prevents leaking information about the existence of stashes.
- **`500 Internal Server Error`**: Returned for any unexpected exceptions, such as a database connection failure. The error will be logged on the server for debugging.

## 8. Performance Considerations
- **Database Indexing**: To ensure fast query performance, an index should exist on the `(stash_id, created_at)` columns of the `stash_transactions` table. An index on `(user_id)` is also critical for RLS performance.
- **Pagination**: The use of `limit` and `offset` (via Supabase's `.range()` method) is essential to avoid loading large datasets into memory.
- **Query Optimization**: The total count will be fetched with a separate, lightweight `count` query instead of fetching all data at once.

## 9. Implementation Steps
1.  **Create Zod Schema**: In a new file `src/lib/schemas/transaction.schema.ts`, define `ListTransactionsQuerySchema` for validating the query parameters.
2.  **Update Types**: In `src/types.ts`, add the `StashTransactionDto` and `PaginatedResponse<T>` types if they do not already exist.
3.  **Create Service**: Create a new file `src/lib/services/transaction.service.ts`.
4.  **Implement `listStashTransactions` Method**:
    - Inside `transaction.service.ts`, create the `listStashTransactions` function.
    - It will accept an options object with the validated `stashId` and query parameters.
    - Implement logic to check for the stash's existence and ownership first.
    - Build and execute the Supabase query for fetching data and the total count.
    - Return the data in the `PaginatedResponse` format.
5.  **Create API Endpoint**: Create the API route file at `src/pages/api/stashes/[stashId]/transactions.ts`.
6.  **Implement `GET` Handler**:
    - In the new API route file, export a `GET` function that accepts the `APIContext`.
    - Use `context.locals.supabase` for the database client.
    - Parse and validate `context.params.stashId` and `Astro.url.searchParams` using the Zod schema.
    - Call the `transactionService.listStashTransactions` method.
    - Implement a `try...catch` block to handle errors from the service and return appropriate HTTP status codes (404, 500).
    - On success, return a `200 OK` JSON response with the data from the service.
