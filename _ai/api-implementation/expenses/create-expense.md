# API Endpoint Implementation Plan: Create Expense (POST /api/expenses)

## 1. Endpoint Overview
- Purpose: Record a new expense for the authenticated user, linked to a system category and a computed month. Insertion triggers database logic to update the monthly budget balance.
- Path: `/api/expenses`
- Method: POST
- Auth: Required (Supabase session via `src/middleware/index.ts` providing `locals.user` and `locals.supabase`).
- Notes:
  - `year_month` is computed by a DB trigger from `expense_date` (no need to pass in request).
  - DB trigger also recalculates `month_budget.current_balance` for that user/month if a budget exists.

## 2. Request Details
- HTTP Method: POST
- URL: `/api/expenses`
- Parameters:
  - Required (body):
    - `category_id`: string (UUID)
    - `amount`: number (> 0, up to 2 decimal places)
    - `expense_date`: string (format `YYYY-MM-DD`)
  - Optional (body):
    - `description`: string (trimmed, max 500 chars)
- Request Body (example):
  ```json
  {
    "category_id": "e7a93d49-2c29-4e18-8f60-417ff9fb7b3d",
    "amount": 120.75,
    "expense_date": "2025-10-22",
    "description": "Groceries at market"
  }
  ```
- Validation rules (Zod in route file):
  - `category_id`: `z.string().uuid()`
  - `amount`: `z.number().positive()` with refine to max 2 fractional digits
  - `expense_date`: `z.string().regex(/^\d{4}-\d{2}-\d{2}$/)` and refine to valid date
  - `description`: `z.string().trim().max(500).optional()`
  - Ignore/disallow unknown properties (whitelist mapping to insert shape)

## 3. Used Types
- DTOs:
  - `ExpenseListItemDTO` (new or reused if already added for List Expenses):
    - `{ id: string; category_id: string; amount: number; expense_date: string; year_month: string; description: string | null; created_at: string; }`
  - `ErrorResponse`, `ValidationErrorResponse` from `src/types.ts` (existing)
- Command Models:
  - `CreateExpenseCommand` from `src/types.ts` (existing)
- Supabase types:
  - `SupabaseClient` from `src/db/supabase.client.ts`

## 4. Response Details
- Success: `201 Created`
  - Shape: `{ data: ExpenseListItemDTO }`
  - Example:
    ```json
    {
      "data": {
        "id": "uuid",
        "category_id": "uuid",
        "amount": 120.75,
        "expense_date": "2025-10-22",
        "year_month": "2025-10",
        "description": "Groceries at market",
        "created_at": "2025-10-24T19:15:21.000Z"
      }
    }
    ```
- Errors:
  - `400 Bad Request`: invalid JSON or general validation errors
  - `401 Unauthorized`: no active session
  - `404 Not Found`: category does not exist
  - `422 Unprocessable Entity`: `amount <= 0` (domain rule), or DB check violation
  - `500 Internal Server Error`: unexpected failures

## 5. Data Flow
1. Astro middleware (`src/middleware/index.ts`) attaches `locals.supabase` and `locals.user`.
2. API route `src/pages/api/expenses/index.ts` exposes `POST`:
   - Check `locals.user` → 401 if missing.
   - Parse JSON body and validate with Zod DTO.
   - Call service `createExpense(locals.supabase, locals.user.id, command)` in `src/lib/services/expense.service.ts`.
3. Service layer:
   - Pre-check category existence in `expense_categories` by `id` (RLS allows select).
   - Insert into `expenses` with `{ user_id, category_id, amount, expense_date, description }`.
   - Select and return projection: `id, category_id, amount, expense_date, year_month, description, created_at`.
   - DB triggers compute `year_month` and update `month_budget.current_balance` if a budget exists for that `user_id` + `year_month`.
4. API maps service result to `{ data: ExpenseListItemDTO }` and returns 201.

## 6. Security Considerations
- Authentication: Require `locals.user`; otherwise 401.
- Authorization/RLS:
  - Use server-side `locals.supabase` so RLS applies.
  - Insert includes `user_id = locals.user.id` to satisfy RLS `with check` policy.
- Input Hardening:
  - Strict Zod validation and whitelist mapping to prevent mass assignment (ignore `user_id`, `year_month` from client input).
  - Sanitize/limit `description` length (500) to mitigate abuse.
- Category Validation:
  - Pre-check `expense_categories` existence; return 404 when missing (or map `23503` FK violation to 404 as fallback).
- Secrets & Keys:
  - Use `SupabaseClient` type from `src/db/supabase.client.ts`. Do not import clients directly in route; use `locals.supabase`.

## 7. Error Handling
- Parsing errors: return `400` with `ErrorResponse { error, message }`.
- Validation errors:
  - If failure is specifically `amount` not positive → `422` with `ValidationErrorResponse`.
  - Other validation errors → `400` with `ValidationErrorResponse` (field-level errors included).
- Category missing:
  - Pre-check miss → `404` with `ErrorResponse`.
  - DB FK violation (`23503`) fallback → map to `404`.
- DB constraint violation (`23514` amount > 0): map to `422`.
- Unexpected errors: log `console.error('Create expense endpoint error:', err)` and return `500` with generic `ErrorResponse`.
- Error table: None in schema; keep logs simple for now (future: structured logging).

## 8. Performance Considerations
- Single-row insert; category pre-check adds one lightweight indexed lookup.
- Triggers run server-side; no additional application round-trips.
- No heavy joins/aggregations; endpoint is O(1) per request.
- Optional future optimization: skip pre-check and map `23503` to 404 to save one query if needed.

## 9. Implementation Steps
1. Types (`src/types.ts`)
   - Ensure `ExpenseListItemDTO` exists (added by List Expenses plan). If missing, add:
     - `export type ExpenseListItemDTO = Pick<ExpenseDTO, 'id' | 'category_id' | 'amount' | 'expense_date' | 'year_month' | 'description' | 'created_at'>;`
2. Service (`src/lib/services/expense.service.ts` – new)
   - Export `class CategoryNotFoundError extends Error { name = 'CategoryNotFoundError' }`.
   - `export async function createExpense(supabase: SupabaseClient, userId: string, command: CreateExpenseCommand): Promise<ExpenseListItemDTO>`
     - Pre-check `expense_categories` by `id`; throw `CategoryNotFoundError` if not found.
     - Insert into `expenses` with `{ user_id: userId, category_id, amount, expense_date, description: command.description ?? null }`.
     - `.select('id, category_id, amount, expense_date, year_month, description, created_at').single()` and return.
     - On error: map `23503` → `CategoryNotFoundError`; map `23514` → throw `Error('Validation')` and let route convert to 422; otherwise rethrow generic error.
3. API Route (`src/pages/api/expenses/index.ts`)
   - `export const prerender = false;`
   - `POST: APIRoute` handler:
     - Auth check via `locals.user`.
     - Parse body; validate with Zod schema:
       ```ts
       const CreateExpenseDto = z.object({
         category_id: z.string().uuid(),
         amount: z.number().positive().refine((n) => Number.isInteger(n * 100), 'Amount must have at most 2 decimal places'),
         expense_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
         description: z.string().trim().max(500).optional(),
       });
       ```
     - On validation error: map amount-nonpositive to 422; others to 400.
     - Call `createExpense(locals.supabase, locals.user.id, validation.data)`.
     - Catch `CategoryNotFoundError` → 404.
     - Catch DB constraint `23514` as fallback → 422.
     - Success: return 201 `{ data: ExpenseListItemDTO }`.
     - Headers: `Content-Type: application/json`.
4. Conventions & Rules
   - Use `SupabaseClient` type from `src/db/supabase.client.ts`.
   - Use `locals.supabase` in API route (per backend rules), not a new client instance.
   - Keep early returns for errors; avoid nested conditionals; log via `console.error`.
5. Testing (manual/integration)
   - Happy path: valid category, amount 0.01–9999999999.99, valid date, optional description.
   - Validation: bad UUID, amount 0 or negative (422), >2 decimals (400), invalid date format (400), description >500 (400).
   - Category: non-existent category (404).
   - Auth: unauthenticated request (401).
   - Budget trigger: with an existing `month_budget`, confirm `current_balance` decreases appropriately.
6. Observability
   - Ensure consistent log prefixes in route and service for quick grep: `Create expense endpoint error:`, `createExpense service error:`.
