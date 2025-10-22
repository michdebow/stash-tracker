# API Endpoint Implementation Plan: Soft Delete Transaction

## 1. Endpoint Overview
This document outlines the implementation plan for the `DELETE /api/stashes/{stashId}/transactions/{transactionId}` endpoint. Its purpose is to soft-delete a specific stash transaction by setting its `deleted_at` timestamp. This action effectively reverses the transaction's impact on the stash balance while preserving the record for auditing purposes.

## 2. Request Details
- **HTTP Method:** `DELETE`
- **URL Structure:** `/api/stashes/{stashId}/transactions/{transactionId}`
- **Parameters:**
  - **Required (from path):**
    - `stashId` (UUID): The unique identifier for the parent stash.
    - `transactionId` (UUID): The unique identifier for the transaction to be deleted.
- **Request Body:** None.

## 3. Used Types
- **`DeleteTransactionParams` (derived from Zod schema):**
  ```typescript
  {
    stashId: string; // UUID
    transactionId: string; // UUID
  }
  ```

## 4. Response Details
- **Success:**
  - **Status Code:** `204 No Content`
  - **Body:** Empty. The client should interpret this as a successful deletion.
- **Error:**
  - **Status Codes:** `400 Bad Request`, `401 Unauthorized`, `404 Not Found`, `500 Internal Server Error`.
  - **Body:** 
    ```json
    {
      "message": "Error description"
    }
    ```

## 5. Data Flow
1. A `DELETE` request is sent to `/api/stashes/{stashId}/transactions/{transactionId}`.
2. The Astro middleware verifies the user's authentication status. If the user is not logged in, it returns a `401 Unauthorized` error.
3. The API route handler extracts `stashId` and `transactionId` from the URL parameters.
4. A Zod schema validates that both parameters are valid UUID strings. If validation fails, a `400 Bad Request` error is returned.
5. The handler calls the `softDeleteTransaction` method in the `TransactionService` (`src/lib/services/transactionService.ts`), passing the `supabase` client instance, `userId`, `stashId`, and `transactionId`.
6. The `softDeleteTransaction` service method executes a Supabase query to update the `stash_transactions` table. It sets the `deleted_at` column to the current timestamp (`now()`) for the row matching the `id` (transactionId), `stash_id`, and `user_id`.
7. If the query affects zero rows (meaning no matching transaction was found for that user and stash), the service returns a result indicating failure, and the handler responds with a `404 Not Found` error.
8. If the database update is successful, the handler responds with `204 No Content`.
9. If a database error occurs, the service layer catches it and the handler returns a `500 Internal Server Error`.

## 6. Security Considerations
- **Authentication:** The endpoint will be protected by the existing authentication middleware, ensuring only logged-in users can access it.
- **Authorization:** The business logic will enforce authorization by including the `user_id` (from `context.locals.user.id`) and `stash_id` in the `WHERE` clause of the database query. This prevents a user from deleting another user's transactions (mitigating IDOR vulnerabilities).
- **Input Validation:** Zod will be used to strictly validate that `stashId` and `transactionId` are well-formed UUIDs, preventing potential injection attacks or malformed queries.

## 7. Performance Considerations
- The operation is a simple `UPDATE` on a single row, indexed by its primary key (`id`), which is highly performant.
- The database table `stash_transactions` should have indexes on `user_id` and `stash_id` to ensure efficient lookups.
- The trigger responsible for updating `stashes.current_balance` upon transaction modification should be optimized to minimize overhead.

## 8. Implementation Steps
1.  **Create Zod Schema:** In the API route file (`src/pages/api/stashes/[stashId]/transactions/[transactionId].ts`), define a Zod schema to validate that `stashId` and `transactionId` are strings in UUID format.

2.  **Create Service Method:** Create a new file `src/lib/services/transactionService.ts` if it doesn't exist. Add an async method `softDeleteTransaction({ supabase, userId, stashId, transactionId })`.
    - This method will take a Supabase client instance, `userId`, `stashId`, and `transactionId` as arguments.
    - It will perform the `UPDATE` query on the `stash_transactions` table, setting `deleted_at` where `id`, `user_id`, and `stash_id` match.
    - It should return an object indicating success or failure (e.g., `{ success: true }` or `{ success: false, error: 'Not Found' }`).

3.  **Implement API Route Handler:** Create the file `src/pages/api/stashes/[stashId]/transactions/[transactionId].ts`.
    - Export a `DELETE` function that accepts the `APIContext`.
    - Ensure `export const prerender = false;` is set.
    - Retrieve the `supabase` client and `user` from `context.locals`.
    - Perform input validation on `context.params` using the Zod schema.
    - Call the `softDeleteTransaction` service method with the required parameters.
    - Based on the service method's return value, send the appropriate HTTP response (`204`, `404`, or `500`).

4.  **Add Unit/Integration Tests (Optional but Recommended):**
    - Write a test case to verify that a transaction is correctly soft-deleted.
    - Write a test case to ensure a `404` is returned for a non-existent transaction.
    - Write a test case to ensure a user cannot delete another user's transaction.
