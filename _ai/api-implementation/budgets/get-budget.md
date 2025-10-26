# API Endpoint Implementation Plan: List Month Budgets

## 1. Endpoint Overview
- Provides a paginated list of monthly budgets for the authenticated user.
- Supports optional filtering by year and ordering by `year_month`.
- Excludes soft-deleted records (`deleted_at IS NULL`).

## 2. Request Details
- **HTTP Method:** GET
- **URL Structure:** `/api/month-budgets`
- **Query Parameters:**
  - **Required:** none
  - **Optional:**
    - `page` number (default: 1, min: 1)
    - `limit` number (default: 12, min: 1, max: 60)
    - `year` string matching `YYYY` (optional)
    - `order` enum: `asc` | `desc` (default: `desc`) — applied to `year_month`
- **Request Body:** none

- **Authentication:** required. Use `locals.user` and `locals.supabase` from middleware. Set `export const prerender = false`.

## 3. Used Types
- **Existing:**
  - `MonthBudget` (entity) — `Tables<"month_budget">`
  - `MonthBudgetDTO` — `Omit<MonthBudget, "deleted_at" | "user_id">`
  - `ApiPaginatedResponse<T>` — `{ data: T[]; pagination: { page: number; limit: number; total: number } }`
  - `ErrorResponse`, `ValidationErrorResponse`
  - `SupabaseClient` from `src/db/supabase.client.ts`
- **New (to add in `src/types.ts`):**
  - `ListBudgetsQuerySchema` (zod):
    - `page`: coerce number, int, min 1, default 1
    - `limit`: coerce number, int, min 1, max 60, default 12
    - `year`: optional string regex `/^\d{4}$/`
    - `order`: enum `['asc','desc']`, default `'desc'`
  - `ListBudgetsQuery` = `z.infer<typeof ListBudgetsQuerySchema>`
  - `MonthBudgetListItemDTO` = `MonthBudgetDTO`

## 4. Response Details
- **Success (200):**
```json
{
  "data": [
    {
      "id": "uuid",
      "year_month": "YYYY-MM",
      "budget_set": 0,
      "current_balance": 0,
      "created_at": "timestamp",
      "updated_at": "timestamp"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 12,
    "total": 18
  }
}
```
- **Errors:**
  - 400 Bad Request — invalid query params (zod validation)
  - 401 Unauthorized — no authenticated user in `locals`
  - 500 Internal Server Error — unexpected server/database error

## 5. Data Flow
1. Request hits `/api/month-budgets`.
2. Astro middleware (`src/middleware/index.ts`) attaches `locals.supabase` and `locals.user`.
3. API route validates query with `ListBudgetsQuerySchema`.
4. Calls service `listMonthBudgets(supabase, userId, query)` in `src/lib/services/budget.service.ts`.
5. Service queries `public.month_budget` with filters:
   - `eq('user_id', userId)`
   - `is('deleted_at', null)`
   - Optional year filter: `like('year_month', `${year}-%`)`
   - Ordering: `.order('year_month', { ascending: query.order === 'asc' })`
   - Pagination via `.range(offset, offset + limit - 1)` with `count: 'exact'`
6. Service returns `{ data, pagination }` matching `ApiPaginatedResponse<MonthBudgetListItemDTO>`.
7. API route returns `200` with the response on success.

## 6. Security Considerations
- **Authentication:**
  - Require `locals.user`; return `401` if absent.
- **Authorization & RLS:**
  - Query constrained to `user_id = locals.user.id` and `deleted_at IS NULL`.
  - Supabase RLS policies on `month_budget` (select for authenticated) further enforce isolation.
- **Input Validation:**
  - Use zod schema to whitelist and constrain `page`, `limit`, `year`, `order`.
  - Avoid dynamic field sorting; only `year_month` is sortable to prevent injection.
- **Error Surfaces:**
  - Return generic messages for `500` to avoid leaking internals.
- **Transport:**
  - Assume HTTPS in deployment (handled by platform configuration).

## 7. Error Handling
- **Validation errors (400):** Map zod errors into `ValidationErrorResponse.errors` keyed by field.
- **Unauthorized (401):** Standard `ErrorResponse` with message.
- **Server errors (500):** Log via `console.error` in both route and service.
- **Error Table:** No explicit application error log table detected in schema; not applicable. Consider future enhancement for structured server-side logging if needed.

## 8. Performance Considerations
- **Indexes:** `idx_month_budget_user_month` supports user + month lookups and ordering.
- **Counting:** Using `count: 'exact'` may be slower on very large datasets; acceptable for this scope. Consider `planned`/estimated counts if needed.
- **Pagination Limits:** Cap `limit` at 60 as per spec to bound response size.
- **Projection:** Select only required columns (`id, year_month, budget_set, current_balance, created_at, updated_at`).
- **Ordering:** Lexical ordering on `YYYY-MM` matches chronological order; no casting needed.

## 9. Implementation Steps
1. **Types (`src/types.ts`):**
   - Add `ListBudgetsQuerySchema` and `ListBudgetsQuery`.
   - Add `MonthBudgetListItemDTO` type alias.
2. **Service (`src/lib/services/budget.service.ts`):**
   - Export `listMonthBudgets(supabase: SupabaseClient, userId: string, query: ListBudgetsQuery): Promise<ApiPaginatedResponse<MonthBudgetListItemDTO>>`.
   - Build query:
     - Compute `offset = (page - 1) * limit`.
     - Base: `.from('month_budget').select('id, year_month, budget_set, current_balance, created_at, updated_at', { count: 'exact' })`
     - Filters: `.eq('user_id', userId).is('deleted_at', null)`
     - Optional year: `.like('year_month', `${year}-%`)`
     - Order: `.order('year_month', { ascending: order === 'asc' })`
     - Range: `.range(offset, offset + limit - 1)`
     - On error: `console.error` and throw `new Error('Failed to fetch month budgets')`.
     - Return `{ data: data || [], pagination: { page, limit, total: count || 0 } }`.
3. **API Route (`src/pages/api/month-budgets/index.ts`):**
   - `export const prerender = false;`
   - `GET` handler:
     - Check `locals.user`; return `401` if absent.
     - Parse query from `url.searchParams` and validate with `ListBudgetsQuerySchema`.
     - On zod failure: map to `ValidationErrorResponse` and return `400`.
     - Call `listMonthBudgets(locals.supabase, locals.user.id, validation.data)`.
     - Return `200` with JSON result as-is (`ApiPaginatedResponse<MonthBudgetListItemDTO>`).
     - Catch-all: `console.error` and return `500` with `ErrorResponse`.
4. **Docs & Consistency:**
   - Ensure response field names match spec (`data`, `pagination` with `page`, `limit`, `total`).
   - Ensure soft-deleted budgets are excluded.
5. **Testing (manual/QA):**
   - Authenticated request with no params → default page 1, limit 12, `order=desc`.
   - `?year=2025` → only `2025-*` rows.
   - `?page=2&limit=5` → correct range and `pagination.total` correct.
   - `?limit=120` → 400.
   - `?year=25` or `?year=2025-01` → 400.
   - Unauthenticated request → 401.
   - Ensure ordering consistency with both `asc` and `desc`.

## 10. Acceptance Criteria
- Returns only budgets for the authenticated user, excluding soft-deleted.
- Validates and enforces `page`, `limit`, `year`, and `order` as specified.
- Response strictly matches the documented shape and codes.
- Follows project rules: Astro API route conventions, zod validation, `locals.supabase`, and `SupabaseClient` typing.
