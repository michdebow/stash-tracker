# API Endpoint Implementation Plan: Soft Delete Expense (DELETE /api/expenses/{expenseId})

## 1. Endpoint Overview
- Soft-delete an expense belonging to the authenticated user by setting `deleted_at`.
- Database trigger `trigger_update_month_budget_balance` recalculates `month_budget.current_balance` to reflect removal.
- Auth is required; use `locals.supabase` and `locals.user` set by middleware.

## 2. Request Details
- **HTTP Method:** DELETE
- **URL Structure:** `/api/expenses/{expenseId}`
- **Parameters:**
  - **Required:**
    - `expenseId` (path): string UUID
  - **Optional:** None
- **Request Body:** None

## 3. Used Types
- **DTOs:**
  - `ErrorResponse`, `ValidationErrorResponse` from `src/types.ts`
- **Command Models (new):**
  - `DeleteExpenseCommand` (add to `src/types.ts`)
    - ```ts
      export interface DeleteExpenseCommand {
        expenseId: string;
        userId: string;
      }
      ```
- **Supabase Type:**
  - `SupabaseClient` from `src/db/supabase.client.ts`

## 4. Response Details
- **Success:** `204 No Content`
  - Body: none (aligns with existing deletion endpoints and HTTP 204 semantics)
- **Errors:**
  - `400 Bad Request`: invalid `expenseId` (non-UUID)
  - `401 Unauthorized`: missing/expired session
  - `404 Not Found`: expense does not exist, belongs to another user, or already soft-deleted
  - `500 Internal Server Error`: unexpected failures
- **Error Payload Shape:** `{ error: string, message?: string, details?: object }`

## 5. Data Flow
1. `src/middleware/index.ts` ensures `locals.user` and `locals.supabase` are present when authenticated.
2. API route `src/pages/api/expenses/[expenseId].ts` defines `export const prerender = false` and `DELETE` handler.
3. Handler flow:
   - Guard: if `!locals.user` → `401` JSON error.
   - Validate `params.expenseId` with Zod `z.string().uuid()` → on fail `400` with field errors.
   - Call service: `softDeleteExpense(locals.supabase, locals.user.id, expenseId)`.
   - On success respond `204` with no body.
4. Service `src/lib/services/expense.service.ts`:
   - `softDeleteExpense` performs `update expenses set deleted_at = now()` with filters:
     - `.eq('id', expenseId).eq('user_id', userId).is('deleted_at', null)`
     - Use `.select('id', { count: 'exact', head: true })` to get affected row count without payload.
   - If count `0` → throw `ExpenseNotFoundError`.
   - Triggers recalc `month_budget.current_balance` for the affected `year_month`.

## 6. Security Considerations
- **Authentication:** Require `locals.user`; reject anonymous with `401`.
- **Authorization/RLS:** Use `locals.supabase` to leverage RLS (`user_id = auth.uid()`), and include `.eq('user_id', userId)` in the update for defense-in-depth.
- **Soft-delete integrity:** Include `.is('deleted_at', null)` to prevent double-deletes and ensure idempotency semantics map to `404`.
- **Input Validation:** Strict Zod UUID validation for `expenseId`. No request body accepted.
- **Information Disclosure:** Return generic error messages; log detailed errors server-side only.
- **Abuse Mitigation:** Rate limiting via middleware (IP + user) consistent with project conventions.

## 7. Error Handling
- **Validation:**
  - Invalid UUID → `400` with `ValidationErrorResponse` containing `stashId`-like path key `expenseId`.
- **Not Found:**
  - 0 rows updated (nonexistent, not owned, or already deleted) → `404`.
- **Auth:**
  - Missing `locals.user` → `401` with standard error payload.
- **Database/Other:**
  - Unexpected Supabase/DB error → log and return `500` with generic message.
- **Logging Conventions:**
  - Route: `Delete expense endpoint error:`
  - Service: `softDeleteExpense service error:`
  - Include minimal context `{ userId, expenseId, code }`.
- **Error Table:** Not present in schema; keep structured console logs for now.

## 8. Performance Considerations
- Single-row update; O(1) per request.
- Trigger recalculation uses indexed lookup on `expenses(user_id, year_month)`; efficient aggregation by month.
- Use `head: true` select to avoid fetching row data and minimize payload.

## 9. Implementation Steps
1. **Types (`src/types.ts`)**
   - Add `DeleteExpenseCommand` interface as shown above.
2. **Service (new: `src/lib/services/expense.service.ts`)**
   - Define error:
     - `export class ExpenseNotFoundError extends Error { constructor(message = 'Expense not found') { super(message); this.name = 'ExpenseNotFoundError'; } }`
   - Implement soft delete:
     - ```ts
       export async function softDeleteExpense(
         supabase: SupabaseClient,
         userId: string,
         expenseId: string
       ): Promise<void> {
         const { error, count } = await supabase
           .from('expenses')
           .update({ deleted_at: new Date().toISOString() })
           .eq('id', expenseId)
           .eq('user_id', userId)
           .is('deleted_at', null)
           .select('id', { count: 'exact', head: true });
         if (error) {
           console.error('softDeleteExpense service error:', { userId, expenseId, code: error.code, message: error.message });
           throw new Error('Failed to delete expense');
         }
         if (!count) {
           throw new ExpenseNotFoundError();
         }
       }
       ```
3. **API Route (new or extend): `src/pages/api/expenses/[expenseId].ts`**
   - `export const prerender = false;`
   - `DELETE: APIRoute` handler:
     - Auth guard → `401` JSON.
     - Validate `expenseId` via Zod → `400` with `ValidationErrorResponse` on fail.
     - Call `softDeleteExpense(locals.supabase, locals.user.id, expenseId)`.
     - Catch `ExpenseNotFoundError` → `404` JSON.
     - Other errors → log and `500` JSON.
     - Success → `204` with no body and no `Content-Type` header.
4. **Conventions & Rules**
   - Use `locals.supabase`; do not instantiate a new client.
   - Type Supabase client with `SupabaseClient` from `src/db/supabase.client.ts`.
   - Early returns for error paths; happy path last.
   - Do not accept or pass `year_month`; DB trigger derives/uses it.
5. **Testing (manual/integration)**
   - Happy path: delete an existing expense; verify response `204`; confirm expense hidden in list views; verify `month_budget.current_balance` increases appropriately.
   - Idempotency: delete same `expenseId` again → `404`.
   - Auth: request without session → `401`.
   - Validation: malformed UUID → `400` with field errors.
   - Ownership: attempt to delete another user’s expense → `404` via RLS + filters.
