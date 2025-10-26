# API Endpoint Implementation Plan: Upsert Monthly Budget

## 1. Endpoint Overview
- Creates or updates a monthly budget for the authenticated user with UPSERT semantics.
- Path identifies the target month (`YYYY-MM`).
- Returns the created/updated budget item (same shape as list item) and appropriate status code: `201 Created` on insert, `200 OK` on update.

## 2. Request Details
- **HTTP Method:** PUT
- **URL Structure:** `/api/month-budgets/{yearMonth}`
- **Path Parameters:**
  - **Required:**
    - `yearMonth` string in `YYYY-MM`; month must be `01`-`12`.
- **Request Body:**
  - JSON: `{ "budget_set": number }`
  - Validation:
    - `budget_set` required
    - positive number (`> 0`)
    - optionally round to 2 decimal places to match `NUMERIC(12,2)`
- **Headers:**
  - `Content-Type: application/json`
- **Authentication:** required (use `locals.user` and `locals.supabase` from middleware). Set `export const prerender = false` in the route file.

## 3. Used Types
- **Existing (from `src/types.ts`):**
  - `MonthBudget` — `Tables<"month_budget">`
  - `MonthBudgetDTO` — `Omit<MonthBudget, "deleted_at" | "user_id">`
  - `UpsertBudgetCommand` — `Pick<TablesInsert<"month_budget">, "budget_set">`
  - `ErrorResponse`, `ValidationErrorResponse`
  - `ApiPaginatedResponse<T>` (not used directly here but keep response consistency style)
- **Supabase Client Type:**
  - `SupabaseClient` from `src/db/supabase.client.ts`
- **Validation Schemas (define in the route file using zod):**
  - `YearMonthParamSchema` — `z.string().regex(/^\d{4}-\d{2}$/).refine(m => Number(m.slice(5,7)) >= 1 && Number(m.slice(5,7)) <= 12, { message: 'Invalid month' })`
  - `UpsertBudgetBodySchema` — `z.object({ budget_set: z.coerce.number().positive() })`

## 4. Response Details
- **Success (201 Created | 200 OK):**
```json
{
  "data": {
    "id": "uuid",
    "year_month": "YYYY-MM",
    "budget_set": 1500.00,
    "current_balance": 1500.00,
    "created_at": "timestamp",
    "updated_at": "timestamp"
  }
}
```
- **Error Responses:**
  - `400 Bad Request` — invalid JSON body or `budget_set <= 0`/missing
  - `401 Unauthorized` — no authenticated user in `locals`
  - `422 Unprocessable Entity` — invalid `yearMonth` format or invalid month value
  - `500 Internal Server Error` — unexpected server/database error

## 5. Data Flow
1. Request hits `/api/month-budgets/{yearMonth}`.
2. Middleware (`src/middleware/index.ts`) attaches `locals.supabase` and `locals.user`.
3. Route guards:
   - If `!locals.user` → return `401`.
   - Validate `params.yearMonth` via `YearMonthParamSchema`; on failure → return `422` with field errors.
   - Parse and validate JSON body via `UpsertBudgetBodySchema`; on failure → return `400` with field errors.
4. Call service `upsertMonthBudget(supabase, userId, yearMonth, command)` in `src/lib/services/budget.service.ts`.
5. Service behavior:
   - Compute `totalExpenses` for the month via `expenses` table:
     - filters: `eq('user_id', userId)`, `eq('year_month', yearMonth)`, `is('deleted_at', null)`
     - aggregate: `sum(amount)`
   - Check if budget exists for `(userId, yearMonth)` (only non-deleted):
     - If exists → `update month_budget` with:
       - `budget_set = command.budget_set`
       - `current_balance = command.budget_set - totalExpenses`
       - filter by `eq('user_id', userId)`, `eq('year_month', yearMonth)`, `is('deleted_at', null)`
       - Return updated row (projection to DTO fields only).
     - If not exists → `insert` new row with:
       - `user_id`, `year_month`, `budget_set`, `current_balance = budget_set - totalExpenses`
       - Return inserted row.
   - Concurrency note: If insert hits unique violation due to race, retry as update (or use `.upsert` and treat as update for status purposes).
6. Route maps service result to `MonthBudgetDTO` and returns:
   - `201` if created, `200` if updated.

## 6. Security Considerations
- **Authentication:** Require `locals.user`; early return `401` if absent.
- **Authorization & RLS:**
  - All queries filtered by `user_id = locals.user.id` and `deleted_at IS NULL`.
  - Table `month_budget` has RLS policies for `select/insert/update/delete` to authenticated users with `auth.uid()` checks (see migration).
- **Input Validation:**
  - Strict validate `yearMonth` (`YYYY-MM` + month range) → `422` on failure.
  - Validate `budget_set` as positive number → `400` on failure.
  - Only accept JSON body.
- **Data Integrity:**
  - Recalculate `current_balance` on upsert to reflect new `budget_set` even if no expense change (triggers only fire on `expenses`).
- **Attack Surface:**
  - Prevent path traversal/injection via zod validation and Supabase parameterized filters.
  - Do not expose internal fields (`user_id`, `deleted_at`).

## 7. Error Handling
- **Validation errors:**
  - Map zod errors into `ValidationErrorResponse.errors` keyed by `yearMonth` or `budget_set`.
- **Database errors:**
  - Check constraint (`budget_set > 0`) should be prevented by validation; if surfaced, map to `400`.
  - Unique constraint race on insert → retry as update; if still fails, return `500`.
- **Unexpected errors:**
  - `console.error` in both route and service with context: `{ userId, yearMonth, error }`.
- **Error table:** None present in schema; skip DB error logging.

## 8. Performance Considerations
- **Indexes:**
  - `idx_expenses_user_year_month` supports `totalExpenses` aggregation lookup.
  - `month_budget_user_month_unique_idx` supports existence check and targeted update.
- **Query shaping:**
  - Select only required fields: `id, year_month, budget_set, current_balance, created_at, updated_at`.
- **Round trips:**
  - One read for existence + one aggregate + one write. Acceptable for low QPS; optimize later using RPC if necessary.
- **Aggregation:**
  - Sum over filtered month and user; relies on index to keep fast.

## 9. Implementation Steps
1. **Service (`src/lib/services/budget.service.ts`):**
   - Export `upsertMonthBudget(
       supabase: SupabaseClient,
       userId: string,
       yearMonth: string,
       command: UpsertBudgetCommand
     ): Promise<{ item: MonthBudgetDTO; created: boolean }>`.
   - Implement helpers:
     - `getBudgetByYearMonth(...)` → returns existing non-deleted row or `null`.
     - `getTotalExpensesForMonth(...)` → returns number (0 if none).
   - Implement upsert logic with concurrency handling (retry-on-conflict path).
   - Log and throw generic errors: `new Error('Failed to upsert month budget')`.

2. **API Route (`src/pages/api/month-budgets/[yearMonth].ts`):**
   - `export const prerender = false;`
   - `PUT` handler:
     - Guard `locals.user` → `401`.
     - Validate `params.yearMonth` via `YearMonthParamSchema` → `422` on failure.
     - Parse/validate body via `UpsertBudgetBodySchema` → `400` on failure.
     - Call `upsertMonthBudget(locals.supabase, locals.user.id, yearMonth, { budget_set })`.
     - On success: return `{ data: item }` with status `201` if `created`, else `200`.
     - On errors: map to `400/422/500` per above; `console.error` unexpected errors.

3. **Types (`src/types.ts`):**
   - Reuse existing `UpsertBudgetCommand` and `MonthBudgetDTO`; no new shared types required.

4. **Testing (manual/QA):**
   - Authenticated PUT with valid body when no budget exists → `201` and correct `current_balance`.
   - PUT again with different `budget_set` → `200` and updated `current_balance`.
   - Invalid `yearMonth` (`2025-13`, `2025-1`, `2025/01`) → `422`.
   - Missing/invalid body (`{}`, `{ "budget_set": 0 }`, non-JSON) → `400`.
   - Unauthenticated request → `401`.
   - Concurrency scenario: two parallel inserts → one succeeds as create, the other updates or returns as update without 409.

5. **Consistency & Docs:**
   - Ensure response fields and wrapper match other endpoints (e.g., `stashes` routes return `{ data: ... }`).
   - Document in README or API docs if necessary; keep `_ai/api-implementation/budgets/` plans aligned.
