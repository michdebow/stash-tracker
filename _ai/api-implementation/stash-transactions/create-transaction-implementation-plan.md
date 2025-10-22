# API Endpoint Implementation Plan: Create Stash Transaction

## 1. Endpoint Overview

This document outlines the implementation plan for the `POST /api/stashes/{stashId}/transactions` endpoint. This endpoint allows authenticated users to add a new transaction (either a deposit or a withdrawal) to one of their existing stashes. The operation updates the stash's balance through database triggers and returns the newly created transaction record.

## 2. Request Details

-   **HTTP Method**: `POST`
-   **URL Structure**: `/api/stashes/{stashId}/transactions`
-   **Parameters**:
    -   **Path**: `stashId` (UUID, required) - The unique identifier of the stash to add the transaction to.
    -   **Body**:
        -   `transaction_type` (string, required) - Must be either `'deposit'` or `'withdrawal'`.
        -   `amount` (number, required) - The transaction amount. Must be a positive value.
        -   `description` (string, optional) - An optional note for the transaction.
-   **Request Body Example**:

    ```json
    {
      "transaction_type": "deposit",
      "amount": 150.75,
      "description": "Monthly savings contribution"
    }
    ```

## 3. Used Types

-   **`StashTransaction` (Entity)**: Represents a transaction record in the database. To be defined in `src/types.ts`.

    ```typescript
    export type StashTransaction = {
      id: string; // UUID
      stash_id: string; // UUID
      user_id: string; // UUID
      transaction_type: 'deposit' | 'withdrawal';
      amount: number;
      description: string | null;
      created_at: string; // ISO 8601
    };
    ```

-   **`CreateTransactionDto` (Zod Schema)**: For validating the incoming request body. To be defined within the API route file.

    ```typescript
    import { z } from 'zod';

    export const CreateTransactionDto = z.object({
      transaction_type: z.enum(['deposit', 'withdrawal']),
      amount: z.number().positive('Amount must be greater than zero'),
      description: z.string().optional(),
    });
    ```

## 4. Data Flow

1.  A `POST` request is sent to `/api/stashes/{stashId}/transactions`.
2.  Astro middleware verifies the user's authentication status via Supabase session.
3.  The API route handler extracts the `stashId` from the URL and the JSON body from the request.
4.  The `stashId` is validated to be a proper UUID.
5.  The request body is validated against the `CreateTransactionDto` Zod schema.
6.  The route handler calls the `StashTransactionService.createTransaction()` method, passing the Supabase client instance, user ID, `stashId`, and validated DTO.
7.  The service attempts to insert a new record into the `stash_transactions` table with the provided data and the user's ID.
8.  Database triggers on the `stash_transactions` table automatically update the `current_balance` on the parent `stashes` record.
9.  If the insertion is successful, the service returns the newly created `StashTransaction` object.
10. The API route handler sends the `StashTransaction` object back to the client with a `201 Created` status.

## 5. Security Considerations

-   **Authentication**: The endpoint will be protected by middleware that ensures only authenticated users can access it. The user's session will be retrieved from `Astro.locals.session`.
-   **Authorization**: Authorization will be enforced at the database level using Supabase's Row Level Security (RLS). Policies on the `stash_transactions` table will ensure that a user can only insert a transaction for a `stash_id` that they own. This prevents users from creating transactions in other users' stashes.
-   **Input Validation**: All incoming data (`stashId` and request body) will be strictly validated to prevent malformed data from reaching the database, mitigating risks like SQL injection or data corruption.

## 6. Error Handling

The endpoint will return specific HTTP status codes for different error scenarios:

-   **`400 Bad Request`**:
    -   If the `stashId` path parameter is not a valid UUID.
    -   If the request body fails validation against the `CreateTransactionDto` schema (e.g., missing fields, invalid `transaction_type`, non-positive `amount`).
-   **`401 Unauthorized`**:
    -   If the request is made without a valid authentication token (handled by middleware).
-   **`403 Forbidden`**:
    -   If a database trigger prevents the transaction (e.g., a withdrawal that would result in a negative balance). The Supabase error will be mapped to this status.
-   **`404 Not Found`**:
    -   If the `stashId` provided in the URL does not correspond to an existing stash. The database foreign key constraint will raise an error that will be mapped to this status.
-   **`500 Internal Server Error`**:
    -   For any other unexpected server-side or database errors.

## 7. Performance Considerations

-   The operation involves a single `INSERT` query, which is highly performant.
-   Database triggers will execute synchronously, adding a small overhead, but this is expected to be negligible.
-   Indexing on `stash_transactions(stash_id)` and `stash_transactions(user_id)` is crucial for RLS and query performance and should be confirmed.

## 8. Implementation Steps

1.  **Update Types**: Add the `StashTransaction` type definition to `src/types.ts`.
2.  **Create Service Directory**: If it doesn't exist, create the directory `src/lib/services/`.
3.  **Create Service File**: Create a new file `src/lib/services/stash-transaction.service.ts`.
4.  **Implement Service Logic**: Implement the `createTransaction` method in `StashTransactionService`. This function will take the Supabase client, user ID, stash ID, and DTO as arguments, perform the database `INSERT`, and handle any resulting errors.
5.  **Create API Route File**: Create the API endpoint file at `src/pages/api/stashes/[stashId]/transactions.ts`.
6.  **Implement Route Handler**: In the new file, implement the `POST` handler.
    -   Set `export const prerender = false;`.
    -   Retrieve the session from `Astro.locals`.
    -   Get `stashId` from `Astro.params` and validate it's a UUID.
    -   Parse and validate the request body using the `CreateTransactionDto` Zod schema.
    -   Call the `StashTransactionService.createTransaction()` method.
    -   Implement error handling to map service/database errors to the correct HTTP status codes.
    -   Return the successful response with a `201` status.
