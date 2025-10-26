# API Endpoint Implementation Plan: List Expenses (GET /api/expenses)

## 1. Endpoint Overview
- Purpose: Provide a paginated, filterable list of the authenticated user's expenses for reporting and analysis.
- Path: `/api/expenses`
- Method: GET
- Auth: Required (Supabase session via Astro middleware `locals.user` and `locals.supabase`).
- Notes: Enforce RLS-aligned filters and exclude soft-deleted rows (`deleted_at IS NULL`).

## 2. Request Details
- HTTP Method: GET
- URL: `/api/expenses`
- Parameters:
  - Required: none (auth required)
  - Optional (query):
    - `page`: number (default 1, >=1)
    - `limit`: number (default 20, max 100)
    - `from`: date (YYYY-MM-DD)
    - `to`: date (YYYY-MM-DD)
    - `categoryId`: UUID
    - `yearMonth`: string (YYYY-MM)
    - `search`: string (free text, applied to `description` via ILIKE)
    - `sort`: enum [`expense_date`, `amount`] (default `expense_date`)
    - `order`: enum [`asc`, `desc`] (default `desc`)
- Request Body: none
- Validation rules:
  - `page` int >= 1; `limit` int in [1, 100]
  - `from`/`to` must be valid dates; if both provided then `from <= to`
  - `yearMonth` format `YYYY-MM`; if present, `from`/`to` must not be present (mutually exclusive)
  - `categoryId` must be UUID
  - `search` trimmed length 1..200 (optional)
  - `sort` and `order` restricted to enums

## 3. Used Types
- DTOs:
  - `ExpenseListItemDTO` (new):
    - `{ id: string; category_id: string; amount: number; expense_date: string; year_month: string; description: string | null; created_at: string; }`
  - `ApiPaginatedResponse<T>` from `src/types.ts` (already exists)
  - `ErrorResponse`, `ValidationErrorResponse` from `src/types.ts` (already exist)
- Query Models (new in `src/types.ts`):
  - `ListExpensesQuerySchema` (Zod): validates query params listed above
  - `ListExpensesQuery`: `z.infer<typeof ListExpensesQuerySchema>`
- Supabase client type: `SupabaseClient` from `src/db/supabase.client.ts`

## 4. Response Details
- Success 200 OK
  - Shape: `ApiPaginatedResponse<ExpenseListItemDTO>`
  - Example:
    ```json
    {
      "data": [
        {
          "id": "uuid",
          "category_id": "uuid",
          "amount": 123.45,
          "expense_date": "2025-10-01",
          "year_month": "2025-10",
          "description": "Groceries",
          "created_at": "2025-10-10T12:34:56.000Z"
        }
      ],
      "pagination": { "page": 1, "limit": 20, "total": 96 }
    }
    ```
- Errors
  - 400 Bad Request: invalid query params (Zod errors)
  - 401 Unauthorized: no active session (`locals.user` missing)
  - 500 Internal Server Error: unexpected failures (Supabase/network)

## 5. Data Flow
1. Request enters Astro route `src/pages/api/expenses/index.ts`.
2. Auth check using `locals.user` (set by `src/middleware/index.ts`). If missing, return 401.
3. Parse query params from `url.searchParams` and validate with `ListExpensesQuerySchema`.
4. Call service `listExpenses(locals.supabase, locals.user.id, query)` from `src/lib/services/expense.service.ts`.
5. Service builds a PostgREST query against `public.expenses` with:
   - `eq('user_id', userId)`, `is('deleted_at', null)`
   - Optional filters:
     - `eq('category_id', categoryId)`
     - `eq('year_month', yearMonth)` OR range on `expense_date` via `gte('expense_date', from)` / `lte('expense_date', to)`
     - `ilike('description', '%{search}%')` for free-text search
   - Sorting: `.order(sortField, { ascending: order==='asc' })`, secondary tiebreaker `.order('created_at', { ascending: false })`
   - Pagination: `.range(offset, offset + limit - 1)` with `count: 'exact'`
   - Projection: `select('id, category_id, amount, expense_date, year_month, description, created_at', { count: 'exact' })`
6. Service returns `{ data, pagination: { page, limit, total } }`.
7. API returns 200 with JSON and `Content-Type: application/json`.

## 6. Security Considerations
- Authentication: Require `locals.user`; otherwise 401.
- Authorization/RLS:
  - Use `locals.supabase` (server-side client) so RLS applies.
  - Always filter by `user_id = locals.user.id` and `deleted_at IS NULL`.
- Input hardening:
  - Zod schema restricts enums and formats (UUID, dates, `YYYY-MM`).
  - Reject invalid ranges and incompatible filters (yearMonth vs from/to).
- Data minimization: Select only fields required by the response spec; exclude `user_id`, `deleted_at`, `updated_at`.
- Injection safety: Supabase query builder parameterizes values.

## 7. Error Handling
- Validation errors (400): Return `ValidationErrorResponse` with field-level messages from Zod.
- Unauthorized (401): Return `ErrorResponse` with a clear message.
- Unexpected (500): Log with `console.error('List expenses endpoint error:', err)` and return generic `ErrorResponse`.
- Not Found (404): Not applicable for list; empty result returns 200 with `data: []`.
- Database errors: Service catches and rethrows as generic errors to avoid leaking internals.
- Error table: None defined in schema; keep server logs. Future: integrate structured logging provider.

## 8. Performance Considerations
- Indexes available per migration `supabase/migrations/20251010150749_initial_schema.sql`:
  - `idx_expenses_user_date (user_id, expense_date desc)`
  - `idx_expenses_user_year_month (user_id, year_month)`
  - `idx_expenses_user_category (user_id, category_id)`
- Filtering strategy uses these indexes (user_id + date/month/category) to stay sargable.
- Count strategy: `count: 'exact'` provides accurate totals but can be costly at scale.
  - If needed later, consider `count: 'planned'` or cached totals for large datasets.
- Search via `ilike` on `description` is sequential; consider trigram/GIN index in a future migration if slow.
- Secondary ordering by `created_at desc` ensures stable pagination when primary sort has ties.

## 9. Implementation Steps
1. Types (`src/types.ts`)
   - Add `ExpenseListItemDTO` for list responses.
   - Add Zod `ListExpensesQuerySchema`:
     - `page`, `limit`, `from`, `to`, `categoryId`, `yearMonth`, `search`, `sort`, `order`.
     - Refinements: mutual exclusivity (`yearMonth` vs `from`/`to`) and `from <= to`.
   - Export `ListExpensesQuery` type.
2. Service (`src/lib/services/expense.service.ts`)
   - Export `async function listExpenses(supabase: SupabaseClient, userId: string, query: ListExpensesQuery): Promise<ApiPaginatedResponse<ExpenseListItemDTO>>`.
   - Build query with filters, projection, sorting, pagination, and `count: 'exact'`.
   - Log and throw generic `Error` on Supabase error.
3. API Route (`src/pages/api/expenses/index.ts`)
   - `export const prerender = false`.
   - `GET` handler:
     - Auth check via `locals.user`; 401 if missing.
     - Parse `url.searchParams`, validate with `ListExpensesQuerySchema`.
     - On validation failure: 400 with `ValidationErrorResponse`.
     - Call `listExpenses()` and return 200 with JSON.
     - On catch-all: 500 with generic error.
   - Response headers: `Content-Type: application/json`.
4. Consistency & Conventions
   - Follow patterns in `src/pages/api/stashes/index.ts` and services for error handling and response shaping.
   - Use `SupabaseClient` type from `src/db/supabase.client.ts` and `locals.supabase` as per backend rules.
5. Testing (manual/integration)
   - Authenticated calls with combinations:
     - Default (no filters)
     - `yearMonth=YYYY-MM`
     - `from=YYYY-MM-DD&to=YYYY-MM-DD`
     - `categoryId=<uuid>`
     - `search=...`
     - `sort=amount&order=asc`
     - Pagination boundaries: `page=1`, last page, `limit=100`
   - Invalid inputs: bad UUID, invalid dates, `limit>100`, conflicting filters, `from>to`.
6. Observability
   - Ensure consistent `console.error` messages in route and service.
   - Consider adding request ID correlation in logs later.
