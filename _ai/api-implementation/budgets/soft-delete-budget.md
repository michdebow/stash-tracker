# API Endpoint Implementation Plan: Soft Delete Monthly Budget

## 1. Endpoint Overview
- Soft-deletes a monthly budget for the authenticated user by setting `deleted_at` for the specified month.
- Target month is identified by the path parameter `yearMonth` in `YYYY-MM` format.
- Returns `204 No Content` on success (no response body) to align with existing deletion patterns (e.g., `stashes` DELETE) and HTTP semantics.

## 2. Request Details
- **HTTP Method:** DELETE
- **URL Structure:** `/api/month-budgets/{yearMonth}`
- **Path Parameters:**
  - **Required:**
    - `yearMonth`: string in `YYYY-MM` (month must be `01`–`12`)
- **Request Body:** None
- **Headers:** None specific (JSON not required because there is no body)
- **Authentication:** Required. Use `locals.user` and `locals.supabase` from middleware. Set `export const prerender = false` in the route file per Astro rules.

## 3. Used Types
- **Existing (from `src/types.ts`):**
  - `MonthBudget` — `Tables<"month_budget">`
  - `MonthBudgetDTO` — `Omit<MonthBudget, "deleted_at" | "user_id">` (not returned by this endpoint but useful in services consistency)
  - `ErrorResponse`, `ValidationErrorResponse`
- **Supabase Client Type:**
  - `SupabaseClient` from `src/db/supabase.client.ts`
- **Validation Schemas (define in the route file using zod):**
  - `YearMonthParamSchema` — `z.string().regex(/^\d{4}-\d{2}$/,'Invalid yearMonth format').refine(m => { const mm = Number(m.slice(5,7)); return mm >= 1 && mm <= 12; }, { message: 'Invalid month value' })`
- **New (to add in `src/types.ts`, optional but keeps parity with delete patterns):**
  - `DeleteBudgetCommand`:
    ```ts
    export interface DeleteBudgetCommand {
      yearMonth: string;
      userId: string;
    }
    ```

## 4. Response Details
- **Success:**
  - `204 No Content`
  - Body: none
- **Errors:**
  - `400 Bad Request` — invalid `yearMonth` (format or month range), or malformed request
  - `401 Unauthorized` — no authenticated user in `locals`
  - `404 Not Found` — budget for `(userId, yearMonth)` does not exist or is already soft-deleted
  - `500 Internal Server Error` — unexpected server/database error

## 5. Data Flow
1. Request hits `DELETE /api/month-budgets/{yearMonth}`.
2. Astro middleware (`src/middleware/index.ts`) attaches `locals.supabase` and `locals.user`.
3. Route guards:
   - If `!locals.user` → return `401` with `ErrorResponse`.
   - Validate `params.yearMonth` via `YearMonthParamSchema`; on failure → return `400` with `ValidationErrorResponse` (errors keyed by `yearMonth`).
4. Call service `softDeleteMonthBudget(supabase, userId, yearMonth)` defined in `src/lib/services/budget.service.ts`.
5. Service behavior:
   - Perform soft delete via update:
     - `from('month_budget')`
     - `.update({ deleted_at: new Date().toISOString() })`
     - `.eq('user_id', userId)`
     - `.eq('year_month', yearMonth)`
     - `.is('deleted_at', null)`
     - `.select('id', { head: true, count: 'exact' })`
   - If `error`: log via `console.error` with context and throw generic `Error('Failed to delete month budget')`.
   - If `count === 0`: throw `BudgetNotFoundError` (custom service error) → API maps to `404`.
   - Else: success (void).
6. API returns `204` on success with no body.

## 6. Security Considerations
- **Authentication:**
  - Require `locals.user`; early return `401` if absent.
- **Authorization & RLS:**
  - All queries filter by `user_id = locals.user.id` and `deleted_at IS NULL`.
  - RLS policies on `month_budget` (update/delete for authenticated) further enforce isolation; this endpoint uses an `UPDATE` (soft delete).
- **Input Validation:**
  - Strictly validate `yearMonth` (regex and month range) with zod; return `400` on failure.
- **Data Exposure:**
  - Do not include internal fields (`user_id`, `deleted_at`) in any responses.
  - Use generic messages for `500` errors to avoid leaking internals.
- **Transport & CSRF:**
  - Supabase SSR cookies are `httpOnly`, `secure`, `sameSite: 'lax'` (see `src/db/supabase.client.ts`). For API calls from the SPA, CSRF risk is mitigated by same-site cookies and authenticated checks. If future cross-site POST/DELETE is introduced, consider CSRF tokens.

## 7. Error Handling
- **Validation errors (400):** Map zod errors to `ValidationErrorResponse.errors` keyed by `yearMonth`.
- **Not Found (404):** When no matching non-deleted budget exists for `(userId, yearMonth)`.
- **Database errors:**
  - Unexpected errors mapped to `500` with `ErrorResponse`. Log with details: `{ userId, yearMonth, error }`.
  - Constraint violations are unlikely here (single-row update); handle generically as `500`.
- **Error Table:** No dedicated error log table in schema; use `console.error` consistently in both service and route.

## 8. Performance Considerations
- **Indexes:**
  - `idx_month_budget_user_month` supports targeted updates by `(user_id, year_month, deleted_at is null)`.
- **Round trips:**
  - Single `UPDATE ... SELECT HEAD` round-trip; no prior existence check required.
- **Projection:**
  - Use `head: true` and `count: 'exact'` to avoid retrieving row payload on delete.
- **Scale:**
  - Operation is O(1) with proper index; acceptable for expected load.

## 9. Implementation Steps
1. **Service (`src/lib/services/budget.service.ts`):**
   - Create file if not present.
   - Export `class BudgetNotFoundError extends Error { constructor(message = 'Budget not found') { super(message); this.name = 'BudgetNotFoundError'; } }`.
   - Export `async function softDeleteMonthBudget(supabase: SupabaseClient, userId: string, yearMonth: string): Promise<void>` implementing the update pattern described above. On `count === 0`, throw `BudgetNotFoundError`. On errors, `console.error` and throw `new Error('Failed to delete month budget')`.

2. **API Route (`src/pages/api/month-budgets/[yearMonth].ts`):**
   - `export const prerender = false;`
   - `DELETE` handler:
     - Guard `locals.user`; return `401` if absent.
     - Validate `params.yearMonth` with `YearMonthParamSchema`; return `400` on failure (map to `ValidationErrorResponse`).
     - Call `softDeleteMonthBudget(locals.supabase, locals.user.id, validation.data.yearMonth)`.
     - Return `204` with no body on success.
     - Catch errors:
       - `BudgetNotFoundError` → `404` with `ErrorResponse`.
       - Default → `500` with `ErrorResponse`.

3. **Types (`src/types.ts`):**
   - Optionally add `DeleteBudgetCommand` interface (parity with stash delete patterns). Not strictly required if service uses positional args.

4. **Testing (manual/QA):**
   - Authenticated DELETE where budget exists and not deleted → `204`.
   - DELETE same `yearMonth` again → `404`.
   - Invalid `yearMonth` (`2025-13`, `2025-1`, `2025/01`) → `400`.
   - Unauthenticated DELETE → `401`.
   - Attempt to delete another user’s budget (via crafted request) → `404` due to RLS and filters.

5. **Consistency & Docs:**
   - Ensure responses follow shared types (`ErrorResponse`, `ValidationErrorResponse`).
   - Keep naming and error mapping consistent with `stashes` delete route to reduce cognitive load.
