# API Endpoint Implementation Plan: Update Expense (PATCH /api/expenses/{expenseId})

## 1. Endpoint Overview
- Edit an existing expense belonging to the authenticated user.
- Allows partial updates of `category_id`, `amount`, `expense_date`, and `description`.
- Database triggers will:
  - Recompute `year_month` when `expense_date` changes.
  - Recalculate `month_budget.current_balance` for affected month(s).
- Auth required; use `locals.supabase` and `locals.user` from `src/middleware/index.ts`.

## 2. Request Details
- HTTP Method: PATCH
- URL: `/api/expenses/{expenseId}`
- Parameters:
  - Required Path:
    - `expenseId`: string (UUID)
  - Optional Body (at least one required):
    - `category_id`: string (UUID)
    - `amount`: number (> 0, max 2 decimal places)
    - `expense_date`: string in `YYYY-MM-DD`
    - `description`: string | null (trimmed, max 500 chars)
- Request Body Example:
```json
{
  "amount": 95.0,
  "expense_date": "2025-10-23",
  "description": "corrected receipt total"
}
```
- Validation (Zod in route file):
  - `expenseId`: `z.string().uuid()` (path)
  - Body schema (all optional, at least one present):
    - `category_id`: `z.string().uuid().optional()`
    - `amount`: `z.number().positive().refine(n => Number.isInteger(n * 100), 'Amount must have at most 2 decimal places').optional()`
    - `expense_date`: `z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()` with refine to valid calendar date
    - `description`: `z.string().trim().max(500).nullable().optional()`
  - Enforce “at least one field provided” via `.refine()`
  - Disallow unknown properties by whitelisting mapping to the update shape

## 3. Used Types
- DTOs (from `src/types.ts`):
  - `ExpenseDTO` (existing)
  - `ErrorResponse`, `ValidationErrorResponse` (existing)
  - `ExpenseListItemDTO` (ensure this type exists, same as List Expenses item):
    - `type ExpenseListItemDTO = Pick<ExpenseDTO, 'id' | 'category_id' | 'amount' | 'expense_date' | 'year_month' | 'description' | 'created_at'>`
- Command Models (from `src/types.ts`):
  - `UpdateExpenseCommand` (existing) — `Partial<Pick<TablesUpdate<'expenses'>, 'amount' | 'category_id' | 'expense_date' | 'description'>>`
- Supabase type:
  - `SupabaseClient` from `src/db/supabase.client.ts`

## 4. Response Details
- Success: `200 OK`
  - Body: `{ data: ExpenseListItemDTO }`
  - Example:
```json
{
  "data": {
    "id": "uuid",
    "category_id": "uuid",
    "amount": 95.0,
    "expense_date": "2025-10-23",
    "year_month": "2025-10",
    "description": "corrected receipt total",
    "created_at": "2025-10-24T19:15:21.000Z"
  }
}
```
- Errors:
  - `400 Bad Request`: invalid JSON, invalid parameter format, invalid field format (e.g., >2 decimals), or missing updatable fields
  - `401 Unauthorized`: no active session
  - `404 Not Found`: expense not found (or category not found when provided)
  - `422 Unprocessable Entity`: domain constraint violation (e.g., amount <= 0); DB check violation (23514)
  - `500 Internal Server Error`: unexpected failures

## 5. Data Flow
1. `src/middleware/index.ts` sets `locals.supabase` and `locals.user`.
2. Route `src/pages/api/expenses/[expenseId].ts` defines `export const prerender = false` and `PATCH` handler.
3. Handler steps:
   - Auth check: `if (!locals.user) → 401`.
   - Validate `expenseId` (UUID) and parse JSON body with Zod (see schema above). If no valid updatable fields → `400`.
   - Call service: `updateExpense(locals.supabase, locals.user.id, expenseId, command)` from `src/lib/services/expense.service.ts`.
4. Service logic:
   - Optional pre-check: if `category_id` provided, verify it exists in `expense_categories` (RLS allows select); if missing → throw `CategoryNotFoundError`.
   - Build `updates` with only provided fields; normalize `description` to `null` when `null` provided.
   - Update row in `expenses` with filters `.eq('id', expenseId).eq('user_id', userId).is('deleted_at', null)` and `.select('id, category_id, amount, expense_date, year_month, description, created_at').single()`.
   - If no row returned → throw `ExpenseNotFoundError`.
   - DB triggers handle `year_month` recomputation and `month_budget` balance update.
5. Route maps service result to `{ data }` and returns `200`.

## 6. Security Considerations
- **Authentication**: Require `locals.user` (middleware-provided). Reject anonymous with `401`.
- **Authorization/RLS**: Use `locals.supabase` so PostgREST RLS enforces `user_id = auth.uid()`; include `.eq('user_id', userId)` on updates for defense-in-depth.
- **Mass assignment protection**: Whitelist-only mapping from validated DTO to `updates` object. Never accept `user_id`, `year_month`, `id`, `deleted_at`, `created_at`, `updated_at` from client.
- **Input validation hardening**: Strict Zod validation, trim strings, enforce decimal precision, and validate dates.
- **Enum/FK safety**: On `category_id` change, pre-check existence; fallback map FK violation (23503) to 404.
- **Error disclosure**: Return generic messages; log details server-side to avoid leaking internals.

## 7. Error Handling
- Validation errors:
  - JSON parse fail → `400 { error, message }`.
  - Field-level errors → `400 ValidationErrorResponse`.
  - `amount <= 0` domain rule → `422 ValidationErrorResponse`.
- Not found:
  - Expense not found (no row updated/selected) → `404`.
  - Category not found (when provided) → `404`.
- Database errors:
  - `23503` (FK) → `404` (category)
  - `23514` (check) → `422`
  - Other → `500` with generic message.
- Logging: use `console.error` with consistent prefixes:
  - Route: `Update expense endpoint error:`
  - Service: `updateExpense service error:`
- Error table: none in schema; keep structured console logs for now.

## 8. Performance Considerations
- Single-row update; O(1) per request.
- Optional category pre-check adds one indexed lookup; can skip and rely on FK + error mapping if needed.
- Select only required columns in `.select(...)`.
- Indexes already exist on `expenses(user_id, expense_date)`, `expenses(user_id, year_month)`, and `expenses(user_id, category_id)`.

## 9. Implementation Steps
1. Types (`src/types.ts`)
   - Ensure `ExpenseListItemDTO` exists:
     - `export type ExpenseListItemDTO = Pick<ExpenseDTO, 'id' | 'category_id' | 'amount' | 'expense_date' | 'year_month' | 'description' | 'created_at'>;`
2. Service (new: `src/lib/services/expense.service.ts`)
   - Define errors:
     - `export class ExpenseNotFoundError extends Error { name = 'ExpenseNotFoundError' }`
     - `export class CategoryNotFoundError extends Error { name = 'CategoryNotFoundError' }`
   - `export async function updateExpense(supabase: SupabaseClient, userId: string, expenseId: string, command: UpdateExpenseCommand): Promise<ExpenseListItemDTO>`
     - If `command` has `category_id`, pre-check in `expense_categories` (throw `CategoryNotFoundError` if missing).
     - Build `updates` with only provided fields; `description: command.description ?? undefined` (and map explicit `null` to `null`).
     - Execute update:
       - `.from('expenses').update(updates)`
       - `.eq('id', expenseId).eq('user_id', userId).is('deleted_at', null)`
       - `.select('id, category_id, amount, expense_date, year_month, description, created_at').single()`
     - If error:
       - Map `23503` → `CategoryNotFoundError`; `23514` → throw `Error('Validation')` (route maps to 422); otherwise rethrow.
     - If no data → throw `ExpenseNotFoundError`.
     - Return selected projection.
3. API Route (new: `src/pages/api/expenses/[expenseId].ts`)
   - `export const prerender = false;`
   - `PATCH: APIRoute` handler pattern consistent with `src/pages/api/stashes/[stashId].ts`:
     - Auth check (`401`).
     - Validate `expenseId` (UUID) and parse/validate body with Zod schema:
```ts
const UpdateExpenseDto = z.object({
  category_id: z.string().uuid().optional(),
  amount: z.number().positive().refine(n => Number.isInteger(n * 100), 'Amount must have at most 2 decimal places').optional(),
  expense_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  description: z.string().trim().max(500).nullable().optional(),
}).refine((v) => Object.keys(v).length > 0 && Object.values(v).some((x) => x !== undefined), {
  message: 'At least one updatable field must be provided',
});
```
     - On validation error: map `amount <= 0` to `422`; others to `400` with field errors.
     - Call `updateExpense(locals.supabase, locals.user.id, expenseId, dto)`.
     - Catch `ExpenseNotFoundError` → `404`.
     - Catch `CategoryNotFoundError` → `404`.
     - Catch DB check `23514` fallback → `422`.
     - Success: `200 { data: ExpenseListItemDTO }`.
     - Set `Content-Type: application/json` on all responses.
4. Conventions & Rules
   - Use `locals.supabase` (do not instantiate new client); `SupabaseClient` type from `src/db/supabase.client.ts`.
   - Early returns for error paths; keep happy path last.
   - Do not accept or pass `year_month`; DB trigger computes it from `expense_date`.
   - Include `.is('deleted_at', null)` in updates to avoid modifying soft-deleted rows.
5. Testing (manual/integration)
   - Happy path: update any single or multiple fields; verify `year_month` changes when `expense_date` moves across months; verify `month_budget.current_balance` adjusts accordingly when budgets exist.
   - Validation: bad UUID in path (400), invalid JSON (400), `amount` 0 or negative (422), >2 decimals (400), invalid date format (400), `description` > 500 (400), empty body (400).
   - Not found: unknown `expenseId` (404); category not found on update (404).
   - Auth: unauthenticated requests (401).
6. Observability
   - Consistent log prefixes: `Update expense endpoint error:` and `updateExpense service error:`.
   - Include `error.code` and minimal context (expenseId, userId) in logs for debugging.
